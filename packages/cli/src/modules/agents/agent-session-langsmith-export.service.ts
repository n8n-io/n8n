import { redactDeep, redactText, SUPPORTED_PII_CATEGORIES } from '@n8n/agents';
import type { AgentSessionLangSmithExportResponse } from '@n8n/api-types';
import { buildProxyHeaders } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import type { Client } from 'langsmith';
import { nanoid } from 'nanoid';
import { v5 as uuidv5 } from 'uuid';

import { N8N_VERSION } from '@/constants';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ServiceUnavailableError } from '@/errors/response-errors/service-unavailable.error';
import { AiService } from '@/services/ai.service';
import { ProxyTokenManager } from '@/services/proxy-token-manager';
import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';

import type { AgentExecution } from './entities/agent-execution.entity';
import type { AgentExecutionThread } from './entities/agent-execution-thread.entity';
import type { TimelineEvent } from './execution-recorder';
import { AgentExecutionService, type ThreadDetail } from './agent-execution.service';
import { AgentExecutionThreadRepository } from './repositories/agent-execution-thread.repository';

const LANGSMITH_PROJECT = 'n8n-user-agents-debug';
const EXPORT_NAMESPACE = uuidv5('n8n-agent-session-langsmith-export', uuidv5.URL);
const REDACTION_OPTIONS = {
	secrets: true,
	detect: SUPPORTED_PII_CATEGORIES,
	preserveUrlStructure: true,
	redactSensitiveKeys: true,
};

type LangSmithRun = Parameters<Client['createRun']>[0];
type DottedOrderConverter = (
	epoch: number,
	runId: string,
	executionOrder?: number,
) => { dottedOrder: string };

interface LoadedSession {
	thread: AgentExecutionThread;
	executions: AgentExecution[];
	children: LoadedSession[];
}

interface DraftRun {
	path: string;
	name: string;
	runType: 'chain' | 'llm' | 'tool';
	startTime: number;
	endTime?: number;
	inputs: Record<string, unknown>;
	outputs?: Record<string, unknown>;
	error?: string;
	metadata: Record<string, unknown>;
	children: DraftRun[];
}

interface ExportSessionInput {
	projectId: string;
	agentId: string;
	threadId: string;
	user: User;
}

@Service()
export class AgentSessionLangSmithExportService {
	constructor(
		private readonly logger: Logger,
		private readonly aiService: AiService,
		private readonly outboundHttp: OutboundHttp,
		private readonly agentExecutionService: AgentExecutionService,
		private readonly threadRepository: AgentExecutionThreadRepository,
	) {}

	async exportSession(input: ExportSessionInput): Promise<AgentSessionLangSmithExportResponse> {
		this.ensureEnabled();

		const tree = await this.loadSessionTree(
			input.threadId,
			input.projectId,
			input.agentId,
			new Set(),
		);
		const draft = buildSessionRun(tree, `sessions/${tree.thread.id}`);
		const traceId = uuidv5(canonicalSerialize(draft), EXPORT_NAMESPACE);
		const { convertToDottedOrderFormat } = await import('langsmith/run_trees');
		const runs = materializeRuns(draft, traceId, convertToDottedOrderFormat);

		try {
			const client = await this.createClient(input.user);
			for (const run of runs) {
				await client.createRun(run);
			}
		} catch (error) {
			this.logger.error('Failed to export agent session to LangSmith', {
				projectId: input.projectId,
				agentId: input.agentId,
				threadId: input.threadId,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new ServiceUnavailableError("Session couldn't be sent to LangSmith. Try again.");
		}

		return { traceId };
	}

	private ensureEnabled() {
		if (!this.aiService.isProxyEnabled()) {
			throw new NotFoundError('LangSmith debug export is not enabled');
		}
	}

	private async loadSessionTree(
		threadId: string,
		projectId: string,
		agentId: string,
		visited: Set<string>,
	): Promise<LoadedSession> {
		if (visited.has(threadId)) {
			throw new ConflictError('Agent session contains a cyclic child link');
		}
		visited.add(threadId);

		const detail = await this.agentExecutionService.getThreadDetail(threadId, projectId, agentId);
		if (!detail) {
			throw new NotFoundError(`Thread "${threadId}" not found`);
		}
		this.ensureSettled(detail);

		const childThreads = await this.threadRepository.findByParentThreadId(threadId, projectId);
		const children: LoadedSession[] = [];
		for (const child of childThreads) {
			if (
				child.parentThreadId !== detail.thread.id ||
				child.parentAgentId !== detail.thread.agentId ||
				child.projectId !== detail.thread.projectId
			) {
				throw new ConflictError('Agent session child link is invalid');
			}
			children.push(await this.loadSessionTree(child.id, projectId, child.agentId, visited));
		}

		return { ...detail, children };
	}

	private ensureSettled(detail: ThreadDetail) {
		if (detail.executions.some((execution) => execution.status === 'running')) {
			throw new ConflictError('Session is still running');
		}
		if (
			detail.executions.some(
				(execution) => execution.storedAt !== 'db' && execution.timeline === null,
			)
		) {
			throw new ServiceUnavailableError(
				"Session couldn't be exported because some execution data is unavailable. Try again.",
			);
		}
	}

	private async createClient(user: User): Promise<Client> {
		const proxyClient = await this.aiService.getClient();
		const proxyBaseUrl = proxyClient.getApiProxyBaseUrl().replace(/\/$/, '');
		const tokenManager = new ProxyTokenManager(async () => {
			return await proxyClient.getBuilderApiProxyToken(
				{ id: user.id },
				{ userMessageId: nanoid() },
			);
		});
		const proxyHeaders = buildProxyHeaders({
			feature: 'agent-builder',
			n8nVersion: N8N_VERSION,
		});
		const transportFetch = createAiProxyFetch(this.outboundHttp);
		const fetchImplementation: typeof globalThis.fetch = async (request, init) => {
			const headers = new Headers(init?.headers);
			const authHeaders = await tokenManager.getAuthHeaders();
			for (const [key, value] of Object.entries({ ...proxyHeaders, ...authHeaders })) {
				headers.set(key, value);
			}
			if (!headers.has('Accept-Encoding')) {
				headers.set('Accept-Encoding', 'gzip, deflate');
			}
			const response = await transportFetch(request, { ...init, headers });
			return response.status === 409
				? new Response(null, { status: 200, statusText: 'OK (409 suppressed)' })
				: response;
		};
		const { Client: LangSmithClient } = await import('langsmith');
		return new LangSmithClient({
			apiUrl: proxyBaseUrl + '/langsmith',
			apiKey: '-',
			autoBatchTracing: false,
			fetchImplementation,
		});
	}
}

function buildSessionRun(session: LoadedSession, path: string): DraftRun {
	const matchedChildren = new Set<string>();
	const childSessions = new Map(session.children.map((child) => [child.thread.id, child]));
	const executionRuns = session.executions.map((execution) =>
		buildExecutionRun(execution, path, childSessions, matchedChildren),
	);
	const unmatchedChildren = session.children
		.filter((child) => !matchedChildren.has(child.thread.id))
		.map((child) => buildSessionRun(child, `${path}/children/${child.thread.id}`));
	const startTime =
		session.executions[0]?.startedAt?.getTime() ??
		session.executions[0]?.createdAt.getTime() ??
		session.thread.createdAt.getTime();
	const lastExecution = session.executions.at(-1);
	const endTime =
		lastExecution?.stoppedAt?.getTime() ??
		lastExecution?.updatedAt.getTime() ??
		session.thread.updatedAt.getTime();

	return {
		path,
		name: `Agent session: ${session.thread.agentName}`,
		runType: 'chain',
		startTime,
		endTime,
		inputs: {
			title: session.thread.title,
			taskId: session.thread.taskId,
		},
		outputs: {
			executionCount: session.executions.length,
			childSessionCount: session.children.length,
		},
		metadata: {
			n8nVersion: N8N_VERSION,
			threadId: session.thread.id,
			agentId: session.thread.agentId,
			agentName: session.thread.agentName,
			projectId: session.thread.projectId,
			parentThreadId: session.thread.parentThreadId,
			parentAgentId: session.thread.parentAgentId,
			sessionNumber: session.thread.sessionNumber,
			taskId: session.thread.taskId,
			taskVersionId: session.thread.taskVersionId,
			totalPromptTokens: session.thread.totalPromptTokens,
			totalCompletionTokens: session.thread.totalCompletionTokens,
			totalCost: session.thread.totalCost,
			totalDuration: session.thread.totalDuration,
		},
		children: [...executionRuns, ...unmatchedChildren],
	};
}

function buildExecutionRun(
	execution: AgentExecution,
	sessionPath: string,
	childSessions: Map<string, LoadedSession>,
	matchedChildren: Set<string>,
): DraftRun {
	const path = `${sessionPath}/executions/${execution.id}`;
	const events = execution.timeline ?? [];
	const children = events.map((event, index) => {
		const eventRun = buildEventRun(event, execution, `${path}/events/${index}`);
		const childThreadId = delegatedChildThreadId(event);
		const childSession = childThreadId ? childSessions.get(childThreadId) : undefined;
		if (childSession && !matchedChildren.has(childSession.thread.id)) {
			matchedChildren.add(childSession.thread.id);
			eventRun.children.push(
				buildSessionRun(childSession, `${eventRun.path}/children/${childSession.thread.id}`),
			);
		}
		return eventRun;
	});
	const startTime = execution.startedAt?.getTime() ?? execution.createdAt.getTime();
	const endTime = execution.stoppedAt?.getTime() ?? execution.updatedAt.getTime();

	return {
		path,
		name: 'Agent turn',
		runType: 'chain',
		startTime,
		endTime,
		inputs: {
			message: execution.userMessage,
			attachments: execution.attachments,
		},
		outputs: { status: execution.status },
		error: execution.error ?? undefined,
		metadata: executionMetadata(execution),
		children,
	};
}

function buildEventRun(event: TimelineEvent, execution: AgentExecution, path: string): DraftRun {
	switch (event.type) {
		case 'text':
			return {
				path,
				name: 'Agent response',
				runType: 'llm',
				startTime: event.timestamp,
				endTime: event.endTime ?? event.timestamp,
				inputs: {},
				outputs: { text: event.content },
				metadata: executionUsageMetadata(execution),
				children: [],
			};
		case 'reasoning':
			return {
				path,
				name: 'Reasoning',
				runType: 'chain',
				startTime: event.timestamp,
				endTime: event.endTime ?? event.timestamp,
				inputs: {},
				outputs: { content: event.content },
				metadata: {},
				children: [],
			};
		case 'suspension':
			return {
				path,
				name: 'Suspension',
				runType: 'chain',
				startTime: event.timestamp,
				endTime: event.timestamp,
				inputs: {
					toolName: event.toolName,
					toolCallId: event.toolCallId,
				},
				outputs: { status: 'suspended' },
				metadata: {},
				children: [],
			};
		case 'tool-call':
			return {
				path,
				name: event.name,
				runType: 'tool',
				startTime: event.startTime,
				endTime: event.endTime,
				inputs: toRecord(event.input),
				outputs: {
					...toRecord(event.output),
					...(event.childTrace ? { childTrace: event.childTrace } : {}),
				},
				error: event.success ? undefined : toolError(event.output),
				metadata: {
					kind: event.kind,
					toolCallId: event.toolCallId,
					success: event.success,
					workflowId: event.workflowId,
					workflowName: event.workflowName,
					workflowExecutionId: event.workflowExecutionId,
					triggerType: event.triggerType,
					nodeType: event.nodeType,
					nodeTypeVersion: event.nodeTypeVersion,
					nodeDisplayName: event.nodeDisplayName,
					nodeParameters: event.nodeParameters,
				},
				children: [],
			};
	}
}

function executionMetadata(execution: AgentExecution): Record<string, unknown> {
	return {
		executionId: execution.id,
		status: execution.status,
		hitlStatus: execution.hitlStatus,
		source: execution.source,
		storedAt: execution.storedAt,
		...executionUsageMetadata(execution),
	};
}

function executionUsageMetadata(execution: AgentExecution): Record<string, unknown> {
	return {
		model: execution.model,
		promptTokens: execution.promptTokens,
		completionTokens: execution.completionTokens,
		totalTokens: execution.totalTokens,
		cost: execution.cost,
		duration: execution.duration,
	};
}

function delegatedChildThreadId(event: TimelineEvent): string | undefined {
	if (event.type !== 'tool-call' || event.name !== 'delegate_subagent') return undefined;
	if (!isRecord(event.output)) return undefined;
	const { threadId } = event.output;
	return typeof threadId === 'string' ? threadId : undefined;
}

function toolError(output: unknown): string {
	if (typeof output === 'string') return output;
	if (isRecord(output)) {
		if (typeof output.error === 'string') return output.error;
		if (typeof output.message === 'string') return output.message;
	}
	return 'Tool call failed';
}

function toRecord(value: unknown): Record<string, unknown> {
	return isRecord(value) ? value : { value };
}

function materializeRuns(
	root: DraftRun,
	traceId: string,
	convertToDottedOrderFormat: DottedOrderConverter,
): LangSmithRun[] {
	const runs: LangSmithRun[] = [];

	const visit = (
		draft: DraftRun,
		parentRunId: string | undefined,
		parentDottedOrder: string | undefined,
		siblingOrder: number,
	) => {
		const id = parentRunId ? uuidv5(draft.path, traceId) : traceId;
		const segment = convertToDottedOrderFormat(draft.startTime, id, siblingOrder).dottedOrder;
		const dottedOrder = parentDottedOrder ? `${parentDottedOrder}.${segment}` : segment;
		const sanitized = {
			name: scrubText(draft.name),
			inputs: sanitizeRecord(draft.inputs),
			outputs: draft.outputs ? sanitizeRecord(draft.outputs) : undefined,
			error: draft.error ? scrubText(draft.error) : undefined,
			extra: { metadata: sanitizeRecord(draft.metadata) },
		};
		runs.push({
			...sanitized,
			id,
			trace_id: traceId,
			parent_run_id: parentRunId,
			dotted_order: dottedOrder,
			run_type: draft.runType,
			start_time: draft.startTime,
			end_time: draft.endTime,
			project_name: LANGSMITH_PROJECT,
		});

		draft.children.forEach((child, index) => {
			visit(child, id, dottedOrder, index + 1);
		});
	};

	visit(root, undefined, undefined, 1);
	return runs;
}

function sanitizeRecord(value: Record<string, unknown>): Record<string, unknown> {
	const sanitized = redactDeep(value, REDACTION_OPTIONS).value;
	return isRecord(sanitized) ? sanitized : {};
}

function scrubText(value: string): string {
	return redactText(value, REDACTION_OPTIONS).text;
}

function canonicalSerialize(value: DraftRun): string {
	return (
		JSON.stringify(value, (_key, item: unknown) =>
			isRecord(item)
				? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
				: item,
		) ?? '{}'
	);
}
