import type { CallToolResult, McpServer } from '@modelcontextprotocol/server';
import type { SerializableAgentState } from '@n8n/agents';
import { APPROVAL_RESUME_SCHEMA } from '@n8n/agents/tool';
import { AGENT_MCP_INTEGRATION_TYPE } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { UrlService } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import { UserError } from '@n8n/errors';
import { ResourceAdmission } from '@n8n/inbound-auth';
import type { SecurityContext } from '@n8n/permissions';
import { lazyImport } from '@n8n/utils/lazy-import';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { sanitizeErrorDetail } from '@n8n/utils/redaction/sanitize-error-detail';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { shapeToStandardSchema } from '@/modules/mcp/tool-schema.util';

import { AgentChatExecutionService } from '../../../agent-chat-execution.service';
import { AgentExecutionOrchestratorService } from '../../../agent-execution-orchestrator.service';
import { AgentExecutionService } from '../../../agent-execution.service';
import { hashAgentSandboxPrincipal } from '../../../agent-sandbox-principal';
import { AgentTurnAlreadyRunningError } from '../../../agent-turn-already-running.error';
import type { ProjectAgent } from '../../../entities/agent.entity';
import {
	findPendingStandardApproval,
	parseStandardApprovalSuspension,
} from '../../../standard-approval';
import type { AgentExecutionStreamChunk } from '../../../types/agent-steering';
import { integrationMemoryResourceId } from '../../../utils/agent-memory-scope';
import { N8NCheckpointStorage } from '../../n8n-checkpoint-storage';
import { McpServerResourceResolver } from './mcp-server-resource.resolver';

const MAX_LOGGED_ERROR_LENGTH = 500;

const REALM = 'n8n Agent MCP Server';

const SEND_MESSAGE_TOOL = 'send_message';

const DECIDE_APPROVAL_TOOL = 'decide_approval';

/** Splits the approval ID that `send_message` returns into the run and the tool call. */
const APPROVAL_ID_SEPARATOR = ':';

const sendMessageInput = {
	message: z.string().min(1).describe('The message to send to the agent.'),
	conversationId: z
		.string()
		.min(1)
		.optional()
		.describe(
			'The conversation ID from an earlier reply. Leave it out to start a new conversation.',
		),
};

const decideApprovalInput = {
	conversationId: z.string().min(1).describe('The conversation ID of the reply that asked.'),
	approvalId: z.string().min(1).describe('The approval ID from the reply that asked.'),
	approved: z.boolean().describe('True to run the action. False to decline it.'),
	scope: APPROVAL_RESUME_SCHEMA.shape.scope.describe(
		'Use "session" to approve this action for the rest of the conversation, if the approval allows it.',
	),
	reason: APPROVAL_RESUME_SCHEMA.shape.reason.describe(
		'Why the action was declined. The agent reads it.',
	),
};

interface McpConversation {
	id: string;
	threadId: string;
	sessionMode: 'new' | 'existing';
	memory: { threadId: string; resourceId: string };
}

interface McpCaller {
	id: string;
	name: string;
}

interface PendingApproval {
	approvalId: string;
	action: string;
	arguments: unknown;
	supportsSessionApproval: boolean;
}

/** An error the tool returns to the MCP client as text. */
class McpChannelToolError extends Error {}

/**
 * Serves one published agent as an MCP server. A caller signs in with their n8n
 * account over OAuth, and the token is valid for this agent's URL only. Each
 * request builds a new server, as the instance MCP server does, so requests share
 * no state. Conversations belong to the caller who started them.
 */
@Service()
export class McpServerChannelService {
	constructor(
		private readonly resolver: McpServerResourceResolver,
		private readonly admission: ResourceAdmission,
		private readonly executionService: AgentExecutionService,
		private readonly orchestrator: AgentExecutionOrchestratorService,
		private readonly chatExecution: AgentChatExecutionService,
		private readonly checkpointStorage: N8NCheckpointStorage,
		private readonly urlService: UrlService,
		private readonly logger: Logger,
	) {}

	/** Answers a request without a token with the challenge, so the client can start OAuth. */
	async challenge(agentId: string, res: Response) {
		const agent = await this.resolver.findServedAgent(agentId);
		if (!agent) return this.notFound(res);
		// An empty token is refused with `no-credential`, which gives the challenge without an error.
		const refused = await this.admission.admitBearer(
			this.resolver.resourceFor(agent),
			{ method: 'HEAD', url: this.urlService.getAgentMcpUrl(agent.id), ip: '' },
			'',
		);
		if (refused.ok) return this.notFound(res);
		res.header('WWW-Authenticate', this.withRealm(await this.admission.challenge(refused)));
		res.status(401).end();
	}

	async handle(agentId: string, req: Request, res: Response) {
		const agent = await this.resolver.findServedAgent(agentId);
		if (!agent) return this.notFound(res);

		const caller = await this.authenticate(agent, req, res);
		if (!caller) return;

		const { createMcpHandler } = await lazyImport<typeof import('@modelcontextprotocol/server')>(
			async () => await import('@modelcontextprotocol/server'),
		);
		const { toNodeHandler } = await lazyImport<typeof import('@modelcontextprotocol/node')>(
			async () => await import('@modelcontextprotocol/node'),
		);
		const abortSignal = abortOnClose(res);
		const handler = createMcpHandler(
			async () => await this.buildServer(agent, caller, abortSignal),
			{
				legacy: 'stateless',
				onerror: (error) => this.logger.warn('Agent MCP request failed', { error: error.message }),
			},
		);
		await toNodeHandler(handler)(req, res, req.body);
	}

	/** Returns the caller, or writes the refusal and returns `undefined`. */
	private async authenticate(
		agent: ProjectAgent,
		req: Request,
		res: Response,
	): Promise<McpCaller | undefined> {
		const resource = this.resolver.resourceFor(agent);
		const token = bearerToken(req.headers.authorization);
		const admitted = await this.admission.admitBearer(
			resource,
			{ method: req.method, url: req.originalUrl, ip: req.ip ?? '' },
			token,
		);
		if (!admitted.ok) {
			res.header('WWW-Authenticate', this.withRealm(await this.admission.challenge(admitted)));
			res.status(admitted.reason === 'insufficient_scope' ? 403 : 401).end();
			return undefined;
		}
		return toCaller(admitted.context);
	}

	private async buildServer(agent: ProjectAgent, caller: McpCaller, abortSignal: AbortSignal) {
		const { McpServer } = await lazyImport<typeof import('@modelcontextprotocol/server')>(
			async () => await import('@modelcontextprotocol/server'),
		);
		const server = new McpServer(
			{ name: agent.name, version: '1.0.0' },
			{ instructions: this.instructions(agent) },
		);
		this.registerTools(server, agent, caller, abortSignal);
		return server;
	}

	private instructions(agent: ProjectAgent) {
		const description = agentDescription(agent);
		return [
			`This server is the n8n agent "${agent.name}".`,
			description ? `What the agent does: ${description}` : undefined,
			`Use ${SEND_MESSAGE_TOOL} to talk to the agent. Send the conversationId back to continue a conversation.`,
			`When a reply lists approvals, ask the user, then call ${DECIDE_APPROVAL_TOOL} for each one.`,
		]
			.filter(Boolean)
			.join('\n');
	}

	private registerTools(
		server: McpServer,
		agent: ProjectAgent,
		caller: McpCaller,
		abortSignal: AbortSignal,
	) {
		const description = agentDescription(agent);
		server.registerTool(
			SEND_MESSAGE_TOOL,
			{
				title: `Message ${agent.name}`,
				description: description
					? `Send a message to the agent "${agent.name}" and get its reply. ${description}`
					: `Send a message to the agent "${agent.name}" and get its reply.`,
				inputSchema: shapeToStandardSchema(sendMessageInput),
				annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
			},
			async (input) =>
				await this.toToolResult(
					async () => await this.sendMessage(agent, caller, input, abortSignal),
				),
		);
		server.registerTool(
			DECIDE_APPROVAL_TOOL,
			{
				title: 'Decide an approval',
				description: `Approve or decline an action that the agent "${agent.name}" waits for. Ask the user first.`,
				inputSchema: shapeToStandardSchema(decideApprovalInput),
				annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
			},
			async (input) =>
				await this.toToolResult(
					async () => await this.decideApproval(agent, caller, input, abortSignal),
				),
		);
	}

	private async sendMessage(
		agent: ProjectAgent,
		caller: McpCaller,
		input: { message: string; conversationId?: string },
		abortSignal: AbortSignal,
	) {
		const conversation = await this.resolveConversation(agent.id, caller, input.conversationId);
		// The client has no other way to answer a waiting action, so new input drops it.
		if (conversation.sessionMode === 'existing') {
			await this.cancelSuspension(agent.id, conversation.threadId);
		}
		const stream = this.orchestrator.executeForChatPublished({
			agentId: agent.id,
			projectId: agent.projectId,
			message: input.message,
			author: caller,
			memory: conversation.memory,
			integrationType: AGENT_MCP_INTEGRATION_TYPE,
			sessionMode: conversation.sessionMode,
			sandboxPrincipalHash: hashAgentSandboxPrincipal({
				type: 'project-session',
				projectId: agent.projectId,
				sessionId: conversation.threadId,
			}),
			// A background job wake has no way to reach the client.
			allowBackgroundTasks: false,
			abortSignal,
		});
		return await this.finishTurn(agent.id, conversation, stream);
	}

	private async decideApproval(
		agent: ProjectAgent,
		caller: McpCaller,
		input: {
			conversationId: string;
			approvalId: string;
			approved: boolean;
			scope?: 'once' | 'session';
			reason?: string;
		},
		abortSignal: AbortSignal,
	) {
		const conversation = await this.resolveConversation(agent.id, caller, input.conversationId);
		const [runId, toolCallId] = splitApprovalId(input.approvalId);
		const pending = await this.findPendingApproval(agent.id, conversation, runId, toolCallId);
		if (!pending) throw approvalNotFound();
		if (input.scope === 'session' && pending.supportsSessionApproval !== true) {
			throw new McpChannelToolError('This action cannot be approved for the conversation.');
		}
		const stream = this.orchestrator.resumeForChat({
			agentId: agent.id,
			projectId: agent.projectId,
			runId,
			toolCallId,
			resumeData: { approved: input.approved, scope: input.scope, reason: input.reason },
			integrationType: AGENT_MCP_INTEGRATION_TYPE,
			// The resume rejects a run of another conversation.
			expectedMemory: conversation.memory,
			allowBackgroundTasks: false,
			abortSignal,
		});
		return await this.finishTurn(agent.id, conversation, stream);
	}

	/** Runs `turn` and renders its reply, or the error, as a tool result. */
	private async toToolResult(
		turn: () => Promise<{ conversationId: string; text: string; approvals: PendingApproval[] }>,
	): Promise<CallToolResult> {
		try {
			const reply = await turn();
			const text = reply.approvals.length
				? `${reply.text}\n\nThe agent waits for approval. Ask the user, then call ${DECIDE_APPROVAL_TOOL}.`
				: reply.text;
			return {
				content: [{ type: 'text', text: text || '(The agent sent no text.)' }],
				structuredContent: { ...reply },
			};
		} catch (error) {
			return { isError: true, content: [{ type: 'text', text: this.toErrorMessage(error) }] };
		}
	}

	private async resolveConversation(
		agentId: string,
		caller: McpCaller,
		conversationId: string | undefined,
	): Promise<McpConversation> {
		const id = conversationId ?? randomUUID();
		// The caller is part of the thread ID, so one user cannot continue another user's conversation.
		const threadId = `${agentId}:${AGENT_MCP_INTEGRATION_TYPE}:${caller.id}:${id}`;
		if (conversationId && !(await this.executionService.findThreadById(threadId))) {
			throw new McpChannelToolError('Unknown conversation. Leave out conversationId to start one.');
		}
		return {
			id,
			threadId,
			sessionMode: conversationId ? 'existing' : 'new',
			memory: {
				threadId,
				resourceId: integrationMemoryResourceId(AGENT_MCP_INTEGRATION_TYPE, `${caller.id}:${id}`),
			},
		};
	}

	/** Reads the run to its end or its suspension, and lists the approvals it waits for. */
	private async finishTurn(
		agentId: string,
		conversation: McpConversation,
		stream: AsyncIterable<AgentExecutionStreamChunk>,
	) {
		let text = '';
		const approvals: PendingApproval[] = [];
		for await (const chunk of stream) {
			if (chunk.type === 'error') throw ensureError(chunk.error);
			if (chunk.type === 'tool-call') text = '';
			if (chunk.type === 'text-delta') text += chunk.delta;
			if (chunk.type !== 'tool-call-suspended') continue;
			const payload = parseStandardApprovalSuspension(chunk);
			if (!payload) {
				await this.cancelSuspension(agentId, conversation.threadId);
				throw new McpChannelToolError(
					'The agent waits for input that the MCP server channel cannot give.',
				);
			}
			approvals.push({
				approvalId: [chunk.runId, chunk.toolCallId].join(APPROVAL_ID_SEPARATOR),
				action: payload.displayName ?? payload.toolName,
				arguments: payload.args ?? {},
				supportsSessionApproval: payload.supportsSessionApproval === true,
			});
		}
		return { conversationId: conversation.id, text, approvals };
	}

	/** Only a standard approval of this conversation qualifies, so the ID cannot resume other input. */
	private async findPendingApproval(
		agentId: string,
		conversation: McpConversation,
		runId: string,
		toolCallId: string,
	) {
		let checkpoint: SerializableAgentState | undefined;
		try {
			checkpoint = await this.checkpointStorage.load(runId, agentId);
		} catch (error) {
			// The run expired or was already handled.
			if (!(error instanceof UserError)) throw error;
		}
		return findPendingStandardApproval(checkpoint, { runId, toolCallId, ...conversation.memory });
	}

	private async cancelSuspension(agentId: string, threadId: string) {
		const execution = await this.executionService.findLatestSuspendedRun(threadId);
		if (execution) {
			await this.chatExecution.cancelSessionSuspension(agentId, threadId, execution.id);
		}
	}

	private toErrorMessage(error: unknown) {
		if (error instanceof McpChannelToolError) return error.message;
		if (error instanceof AgentTurnAlreadyRunningError) {
			return 'The agent is still busy in this conversation. Decide its pending approval or wait, then try again.';
		}
		// A provider error can carry secrets, for example in a request URL.
		this.logger.error('Agent MCP turn failed', {
			error: sanitizeErrorDetail(ensureError(error).message, MAX_LOGGED_ERROR_LENGTH),
		});
		return 'The agent could not answer.';
	}

	private withRealm(challenge: string) {
		return challenge.replace(/^Bearer\s+/i, `Bearer realm="${REALM}", `);
	}

	private notFound(res: Response) {
		res.status(404).json({
			jsonrpc: '2.0',
			error: { code: -32000, message: 'No published agent with an MCP server at this URL' },
			id: null,
		});
	}
}

/** The published description, so clients see what the running version does. */
function agentDescription(agent: ProjectAgent): string | undefined {
	const description = (agent.activeVersion?.schema ?? agent.schema)?.description?.trim();
	return description || undefined;
}

function bearerToken(header: string | undefined): string {
	const [scheme, token] = header?.split(' ') ?? [];
	return scheme?.toLowerCase() === 'bearer' && token ? token : '';
}

function toCaller(context: SecurityContext): McpCaller {
	const { subject } = context;
	const name = [subject.firstName, subject.lastName].filter(Boolean).join(' ');
	return { id: subject.id, name: name || subject.email || subject.id };
}

function splitApprovalId(approvalId: string): [string, string] {
	const index = approvalId.indexOf(APPROVAL_ID_SEPARATOR);
	if (index <= 0 || index === approvalId.length - 1) throw approvalNotFound();
	return [approvalId.slice(0, index), approvalId.slice(index + 1)];
}

function approvalNotFound() {
	return new McpChannelToolError(
		'This approval is no longer pending. It may have expired or already been decided.',
	);
}

/** A client that disconnects stops the run. */
function abortOnClose(res: Response) {
	const abort = new AbortController();
	res.on('close', () => {
		if (!res.writableFinished) abort.abort();
	});
	return abort.signal;
}
