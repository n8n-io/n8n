import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import {
	type CredentialProvider,
	type SerializableAgentState,
	type StreamChunk,
} from '@n8n/agents';
import {
	APPROVAL_RESUME_SCHEMA,
	APPROVAL_SUSPEND_SCHEMA,
	type ApprovalSuspendPayload,
} from '@n8n/agents/tool';
import { zodToJsonSchema } from '@n8n/ai-utilities/json-schema';
import { N8N_CHAT_INTEGRATION_TYPE } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError, UserError } from 'n8n-workflow';
import { z } from 'zod';

import {
	AgentExecutionOrchestratorService,
	type ExecuteForChatConfig,
	type ResumeForChatConfig,
} from './agent-execution-orchestrator.service';
import { AgentExecutionService, threadBelongsTo } from './agent-execution.service';
import { AgentValidationService } from './agent-validation.service';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
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

interface DraftRunConsumptionOptions {
	errorMode?: 'throw' | 'forward';
	onChunk?: (chunk: StreamChunk) => void;
}

export interface ExecutePreparedDraftRunInput
	extends Omit<ExecuteForChatConfig, 'memory'>,
		DraftRunConsumptionOptions {
	sessionId: string;
}

export interface ResumePreparedDraftRunInput
	extends Omit<ResumeForChatConfig, 'integrationType' | 'usePublishedVersion'>,
		DraftRunConsumptionOptions {
	user: User;
	initialResponse?: string;
}

type ExecuteDraftRunInput = PrepareDraftRunInput &
	Pick<ExecuteForChatConfig, 'message' | 'user' | 'source' | 'abortSignal'>;

interface ResumeDraftRunInput
	extends Omit<
		ResumeForChatConfig,
		'expectedMemory' | 'integrationType' | 'usePublishedVersion' | 'onExecutionRecorded'
	> {
	sessionId: string;
	user: User;
	response: string;
}

export const agentTestRunContinuationSchema = z
	.object({
		runId: z.string(),
		toolCallId: z.string(),
		sessionId: z.string(),
		response: z.string(),
	})
	.strict();

export type AgentTestRunContinuation = z.infer<typeof agentTestRunContinuationSchema>;

export interface AgentTestRunSuspension {
	runId: string;
	toolCallId: string;
	toolName: string;
	input?: unknown;
	suspendPayload?: unknown;
	resumeSchema?: unknown;
}

export interface AgentTestRunApproval extends ApprovalSuspendPayload {
	continuation: AgentTestRunContinuation;
}

export type PreparedDraftRunResult = {
	response: string;
	executionId: string;
} & ({ status: 'completed' } | { status: 'suspended'; suspensions: AgentTestRunSuspension[] });

export type AgentTestRunResult =
	| (PreparedDraftRunResult & { sessionId: string })
	| Exclude<PrepareDraftRunResult, { status: 'ready' }>;

const expectedApprovalResumeJsonSchema = zodToJsonSchema(APPROVAL_RESUME_SCHEMA);

export class InvalidAgentTestRunCheckpointError extends UserError {
	readonly code = 'invalid_checkpoint';

	constructor() {
		super('This test run can no longer be resumed.');
	}
}

export function parseStandardApprovalSuspension(
	suspension: AgentTestRunSuspension,
): ApprovalSuspendPayload | undefined {
	const payload = APPROVAL_SUSPEND_SCHEMA.safeParse(suspension.suspendPayload);
	if (
		!payload.success ||
		!isDeepStrictEqual(suspension.resumeSchema, expectedApprovalResumeJsonSchema)
	) {
		return undefined;
	}
	return payload.data;
}

export function collectStandardApprovals(
	result: Extract<AgentTestRunResult, { status: 'suspended' }>,
): AgentTestRunApproval[] | undefined {
	const approvals: AgentTestRunApproval[] = [];
	for (const suspension of result.suspensions) {
		const approval = parseStandardApprovalSuspension(suspension);
		if (!approval) return undefined;
		approvals.push({
			...approval,
			continuation: {
				runId: suspension.runId,
				toolCallId: suspension.toolCallId,
				sessionId: result.sessionId,
				response: result.response,
			},
		});
	}
	return approvals;
}

@Service()
export class AgentTestRunService {
	constructor(
		private readonly agentExecutionService: AgentExecutionService,
		private readonly agentValidationService: AgentValidationService,
		private readonly agentExecutionOrchestratorService: AgentExecutionOrchestratorService,
		private readonly n8nCheckpointStorage: N8NCheckpointStorage,
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

	async executePreparedDraftRun({
		sessionId,
		errorMode,
		onChunk,
		onExecutionRecorded,
		...execution
	}: ExecutePreparedDraftRunInput): Promise<PreparedDraftRunResult> {
		let executionId: string | undefined;
		const stream = this.agentExecutionOrchestratorService.executeForChat({
			...execution,
			memory: {
				threadId: sessionId,
				resourceId: draftChatMemoryResourceId(execution.user.id),
			},
			onExecutionRecorded: (id) => {
				executionId = id;
				onExecutionRecorded?.(id);
			},
		});

		return await this.collectDraftRun(stream, '', () => executionId, { errorMode, onChunk });
	}

	async resumePreparedDraftRun({
		initialResponse = '',
		errorMode,
		onChunk,
		onExecutionRecorded,
		...execution
	}: ResumePreparedDraftRunInput): Promise<PreparedDraftRunResult> {
		let executionId: string | undefined;
		const stream = this.agentExecutionOrchestratorService.resumeForChat({
			...execution,
			usePublishedVersion: false,
			integrationType: N8N_CHAT_INTEGRATION_TYPE,
			onExecutionRecorded: (id) => {
				executionId = id;
				onExecutionRecorded?.(id);
			},
		});

		return await this.collectDraftRun(stream, initialResponse, () => executionId, {
			errorMode,
			onChunk,
		});
	}

	async executeDraftRun({
		credentialProvider,
		...input
	}: ExecuteDraftRunInput): Promise<AgentTestRunResult> {
		const prepared = await this.prepareDraftRun({ ...input, credentialProvider });
		if (prepared.status !== 'ready') return prepared;

		const result = await this.executePreparedDraftRun({
			...input,
			sessionId: prepared.sessionId,
		});
		return { ...result, sessionId: prepared.sessionId };
	}

	async resumeDraftRun({
		sessionId,
		response,
		...input
	}: ResumeDraftRunInput): Promise<AgentTestRunResult> {
		const existing = await this.agentExecutionService.findThreadById(sessionId);
		if (existing && !threadBelongsTo(existing, input.projectId, input.agentId)) {
			return { status: 'session_not_found' };
		}

		const result = await this.resumePreparedDraftRun({
			...input,
			expectedMemory: {
				threadId: sessionId,
				resourceId: draftChatMemoryResourceId(input.user.id),
			},
			initialResponse: response,
		});
		return { ...result, sessionId };
	}

	async resumeDraftApproval(input: {
		agentId: string;
		projectId: string;
		continuation: unknown;
		approved: boolean;
		user: User;
		source?: string;
		abortSignal?: AbortSignal;
	}): Promise<AgentTestRunResult> {
		const continuation = agentTestRunContinuationSchema.safeParse(input.continuation);
		if (!continuation.success) throw new InvalidAgentTestRunCheckpointError();

		let checkpoint: SerializableAgentState | undefined;
		try {
			checkpoint = await this.n8nCheckpointStorage.load(continuation.data.runId, input.agentId);
		} catch (error) {
			if (error instanceof UserError) throw new InvalidAgentTestRunCheckpointError();
			throw error;
		}

		const pendingToolCall = checkpoint?.pendingToolCalls[continuation.data.toolCallId];
		const expectedResourceId = draftChatMemoryResourceId(input.user.id);
		if (
			checkpoint?.status !== 'suspended' ||
			checkpoint.persistence?.delegated === true ||
			checkpoint.persistence?.threadId !== continuation.data.sessionId ||
			checkpoint.persistence?.resourceId !== expectedResourceId ||
			!pendingToolCall?.suspended ||
			pendingToolCall.runId !== continuation.data.runId ||
			!parseStandardApprovalSuspension({
				runId: pendingToolCall.runId,
				toolCallId: pendingToolCall.toolCallId,
				toolName: pendingToolCall.toolName,
				suspendPayload: pendingToolCall.suspendPayload,
				resumeSchema: pendingToolCall.resumeSchema,
			})
		) {
			throw new InvalidAgentTestRunCheckpointError();
		}

		return await this.resumeDraftRun({
			agentId: input.agentId,
			projectId: input.projectId,
			sessionId: continuation.data.sessionId,
			runId: continuation.data.runId,
			toolCallId: continuation.data.toolCallId,
			resumeData: { approved: input.approved },
			user: input.user,
			source: input.source,
			response: continuation.data.response,
			...(input.abortSignal ? { abortSignal: input.abortSignal } : {}),
		});
	}

	async cancelSuspendedRuns({
		agentId,
		suspensions,
		userId,
	}: {
		agentId: string;
		suspensions: Array<Pick<AgentTestRunSuspension, 'runId'>>;
		userId: string;
	}): Promise<boolean> {
		const runIds = [...new Set(suspensions.map(({ runId }) => runId))];
		try {
			const cancellations = await Promise.all(
				runIds.map(
					async (runId) =>
						await this.agentExecutionOrchestratorService.cancelChatRun({
							agentId,
							runId,
							resourceId: draftChatMemoryResourceId(userId),
						}),
				),
			);
			return cancellations.every(Boolean);
		} catch {
			return false;
		}
	}

	private async collectDraftRun(
		stream: AsyncIterable<StreamChunk>,
		initialResponse: string,
		getExecutionId: () => string | undefined,
		{ errorMode = 'throw', onChunk }: DraftRunConsumptionOptions,
	): Promise<PreparedDraftRunResult> {
		let response = initialResponse;
		const suspensions: AgentTestRunSuspension[] = [];
		let errorChunk: Extract<StreamChunk, { type: 'error' }> | undefined;
		let observerFailed = false;
		let observerError: unknown;

		try {
			for await (const chunk of stream) {
				if (!observerFailed && onChunk) {
					try {
						onChunk(chunk);
					} catch (error) {
						observerFailed = true;
						observerError = error;
					}
				}
				if (chunk.type === 'error' && errorMode === 'throw' && !observerFailed) {
					errorChunk ??= chunk;
					continue;
				}
				if (errorChunk) continue;
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
		} catch (error) {
			if (observerFailed) throw observerError;
			throw error;
		}
		if (observerFailed) throw observerError;

		// Draining preserves terminal usage and lets finalization failures take precedence.
		if (errorChunk) throw errorChunk.error;
		const executionId = getExecutionId();
		if (!executionId) throw new UnexpectedError('Agent execution completed without a recorded ID');
		const metadata = {
			response,
			executionId,
		};
		return suspensions.length > 0
			? { status: 'suspended', ...metadata, suspensions }
			: { status: 'completed', ...metadata };
	}
}
