import type { CredentialProvider, StreamChunk } from '@n8n/agents';
import { N8N_CHAT_INTEGRATION_TYPE } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import type { StoredAttachmentRef } from './agent-chat-attachment.service';
import { AgentExecutionOrchestratorService } from './agent-execution-orchestrator.service';
import { AgentExecutionService, threadBelongsTo } from './agent-execution.service';
import { AgentValidationService } from './agent-validation.service';
import { draftChatMemoryResourceId } from './utils/agent-memory-scope';

interface PrepareDraftRunInput {
	agentId: string;
	projectId: string;
	sessionId?: string;
	credentialProvider: CredentialProvider;
}

export type PrepareDraftRunResult =
	| { status: 'ready'; sessionId: string }
	| { status: 'session_not_found' }
	| { status: 'agent_misconfigured'; missing: string[] };

interface StreamDraftRunInput {
	agentId: string;
	projectId: string;
	message: string;
	user: User;
	sessionId: string;
	attachments?: StoredAttachmentRef[];
	source?: string;
	onExecutionRecorded?: (executionId: string) => void;
	abortSignal?: AbortSignal;
}

interface ExecuteDraftRunInput extends PrepareDraftRunInput {
	message: string;
	user: User;
	source?: string;
	abortSignal?: AbortSignal;
}

interface ResumeDraftRunInput {
	agentId: string;
	projectId: string;
	sessionId: string;
	runId: string;
	toolCallId: string;
	resumeData: unknown;
	user: User;
	source?: string;
	response: string;
	abortSignal?: AbortSignal;
}

export interface AgentTestRunSuspension {
	runId: string;
	toolCallId: string;
	toolName: string;
	input?: unknown;
	suspendPayload?: unknown;
	resumeSchema?: unknown;
}

export type AgentTestRunResult =
	| { status: 'completed'; response: string; sessionId: string; executionId?: string }
	| {
			status: 'suspended';
			response: string;
			sessionId: string;
			executionId?: string;
			suspensions: AgentTestRunSuspension[];
	  }
	| { status: 'session_not_found' }
	| { status: 'agent_misconfigured'; missing: string[] };

type CollectedDraftRunResult = Extract<AgentTestRunResult, { status: 'completed' | 'suspended' }>;

@Service()
export class AgentTestRunService {
	constructor(
		private readonly agentExecutionService: AgentExecutionService,
		private readonly agentValidationService: AgentValidationService,
		private readonly agentExecutionOrchestratorService: AgentExecutionOrchestratorService,
	) {}

	async prepareDraftRun({
		agentId,
		projectId,
		sessionId,
		credentialProvider,
	}: PrepareDraftRunInput): Promise<PrepareDraftRunResult> {
		if (sessionId) {
			const existing = await this.agentExecutionService.findThreadById(sessionId);
			if (existing && !threadBelongsTo(existing, projectId, agentId)) {
				return { status: 'session_not_found' };
			}
		}

		const { missing } = await this.agentValidationService.validateAgentIsRunnable(
			agentId,
			projectId,
			credentialProvider,
		);
		if (missing.length > 0) return { status: 'agent_misconfigured', missing };

		return { status: 'ready', sessionId: sessionId ?? randomUUID() };
	}

	streamDraftRun({
		agentId,
		projectId,
		message,
		user,
		sessionId,
		attachments,
		source,
		onExecutionRecorded,
		abortSignal,
	}: StreamDraftRunInput): AsyncGenerator<StreamChunk> {
		return this.agentExecutionOrchestratorService.executeForChat({
			agentId,
			projectId,
			message,
			user,
			memory: {
				threadId: sessionId,
				resourceId: draftChatMemoryResourceId(user.id),
			},
			attachments,
			source,
			onExecutionRecorded,
			abortSignal,
		});
	}

	async executeDraftRun(input: ExecuteDraftRunInput): Promise<AgentTestRunResult> {
		const prepared = await this.prepareDraftRun(input);
		if (prepared.status !== 'ready') return prepared;

		let executionId: string | undefined;
		const stream = this.streamDraftRun({
			...input,
			sessionId: prepared.sessionId,
			onExecutionRecorded: (id) => {
				executionId = id;
			},
		});

		return await this.collectDraftRun(stream, prepared.sessionId, '', () => executionId);
	}

	async resumeDraftRun(input: ResumeDraftRunInput): Promise<AgentTestRunResult> {
		const existing = await this.agentExecutionService.findThreadById(input.sessionId);
		if (existing && !threadBelongsTo(existing, input.projectId, input.agentId)) {
			return { status: 'session_not_found' };
		}

		let executionId: string | undefined;
		const stream = this.agentExecutionOrchestratorService.resumeForChat({
			agentId: input.agentId,
			projectId: input.projectId,
			runId: input.runId,
			toolCallId: input.toolCallId,
			resumeData: input.resumeData,
			user: input.user,
			usePublishedVersion: false,
			integrationType: N8N_CHAT_INTEGRATION_TYPE,
			expectedMemory: {
				threadId: input.sessionId,
				resourceId: draftChatMemoryResourceId(input.user.id),
			},
			source: input.source,
			onExecutionRecorded: (id) => {
				executionId = id;
			},
			...(input.abortSignal ? { abortSignal: input.abortSignal } : {}),
		});

		return await this.collectDraftRun(stream, input.sessionId, input.response, () => executionId);
	}

	async cancelSuspendedRun({
		agentId,
		runId,
		userId,
	}: {
		agentId: string;
		runId: string;
		userId: string;
	}): Promise<boolean> {
		return await this.agentExecutionOrchestratorService.cancelChatRun({
			agentId,
			runId,
			resourceId: draftChatMemoryResourceId(userId),
		});
	}

	private async collectDraftRun(
		stream: AsyncIterable<StreamChunk>,
		sessionId: string,
		initialResponse: string,
		getExecutionId: () => string | undefined,
	): Promise<CollectedDraftRunResult> {
		let response = initialResponse;
		const suspensions: AgentTestRunSuspension[] = [];

		for await (const chunk of stream) {
			if (chunk.type === 'error') {
				throw chunk.error;
			}
			if (chunk.type === 'text-delta') {
				response += chunk.delta;
			} else if (chunk.type === 'tool-call-suspended') {
				suspensions.push({
					runId: chunk.runId,
					toolCallId: chunk.toolCallId,
					toolName: chunk.toolName,
					...(chunk.input !== undefined ? { input: chunk.input } : {}),
					...(chunk.suspendPayload !== undefined ? { suspendPayload: chunk.suspendPayload } : {}),
					...(chunk.resumeSchema !== undefined ? { resumeSchema: chunk.resumeSchema } : {}),
				});
			}
		}

		const executionId = getExecutionId();
		const metadata = {
			response,
			sessionId,
			...(executionId ? { executionId } : {}),
		};
		return suspensions.length > 0
			? { status: 'suspended', ...metadata, suspensions }
			: { status: 'completed', ...metadata };
	}
}
