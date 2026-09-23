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
import { AgentExecutionService } from './agent-execution.service';
import { AgentValidationService } from './agent-validation.service';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { draftChatMemoryResourceId } from './utils/agent-memory-scope';
import type { AgentSessionMode } from './utils/agent-thread-access';

interface PrepareDraftRunInput {
	agentId: string;
	projectId: string;
	user: User;
	sessionId?: string;
	previewChat?: boolean;
	newSession?: boolean;
	credentialProvider: CredentialProvider;
}

export type PrepareDraftRunResult =
	| { status: 'ready'; sessionId: string; sessionMode: AgentSessionMode }
	| { status: 'session_not_found' }
	| { status: 'agent_misconfigured'; missing: string[] };

interface DraftRunState {
	response: string;
	suspensions: AgentTestRunSuspension[];
	errorChunk?: Extract<StreamChunk, { type: 'error' }>;
	observerFailed: boolean;
	observerError?: unknown;
}

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
		user,
		sessionId,
		previewChat,
		newSession,
		credentialProvider,
	}: PrepareDraftRunInput): Promise<PrepareDraftRunResult> {
		const sessionMode: AgentSessionMode = !sessionId || newSession ? 'new' : 'existing';
		if (sessionId) {
			if (
				!(await this.agentExecutionService.canUseDraftThread(
					sessionId,
					projectId,
					agentId,
					user.id,
					{ previewChat, sessionMode },
				))
			) {
				return { status: 'session_not_found' };
			}
		}

		const { missing } = await this.agentValidationService.validateAgentIsRunnable(
			agentId,
			projectId,
			credentialProvider,
		);
		if (missing.length > 0) return { status: 'agent_misconfigured', missing };

		return {
			status: 'ready',
			sessionId: sessionId ?? randomUUID(),
			sessionMode,
		};
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
			sessionMode: prepared.sessionMode,
		});
		return { ...result, sessionId: prepared.sessionId };
	}

	async resumeDraftRun({
		sessionId,
		response,
		...input
	}: ResumeDraftRunInput): Promise<AgentTestRunResult> {
		if (
			!(await this.agentExecutionService.canUseDraftThread(
				sessionId,
				input.projectId,
				input.agentId,
				input.user.id,
				{ previewChat: input.previewChat, sessionMode: 'existing' },
			))
		) {
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

		await this.validateDraftApprovalCheckpoint(continuation.data, input.agentId, input.user.id);

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
		const state: DraftRunState = {
			response: initialResponse,
			suspensions: [],
			observerFailed: false,
		};
		try {
			for await (const chunk of stream) {
				this.observeDraftChunk(chunk, onChunk, state);
				this.collectDraftChunk(chunk, errorMode, state);
			}
		} catch (error) {
			if (state.observerFailed) throw state.observerError;
			throw error;
		}
		if (state.observerFailed) throw state.observerError;
		// Drain first so terminal usage and finalization errors are preserved.
		if (state.errorChunk) throw state.errorChunk.error;
		const executionId = getExecutionId();
		if (!executionId) throw new UnexpectedError('Agent execution completed without a recorded ID');
		const metadata = { response: state.response, executionId };
		if (state.suspensions.length > 0) {
			return { status: 'suspended', ...metadata, suspensions: state.suspensions };
		}
		return { status: 'completed', ...metadata };
	}

	private async validateDraftApprovalCheckpoint(
		continuation: AgentTestRunContinuation,
		agentId: string,
		userId: string,
	): Promise<void> {
		let checkpoint: SerializableAgentState | undefined;
		try {
			checkpoint = await this.n8nCheckpointStorage.load(continuation.runId, agentId);
		} catch (error) {
			if (error instanceof UserError) throw new InvalidAgentTestRunCheckpointError();
			throw error;
		}

		const pendingToolCall = checkpoint?.pendingToolCalls[continuation.toolCallId];
		const expectedResourceId = draftChatMemoryResourceId(userId);
		if (
			checkpoint?.status !== 'suspended' ||
			checkpoint.persistence?.delegated === true ||
			checkpoint.persistence?.threadId !== continuation.sessionId ||
			checkpoint.persistence?.resourceId !== expectedResourceId ||
			!pendingToolCall?.suspended ||
			pendingToolCall.runId !== continuation.runId ||
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
	}

	private observeDraftChunk(
		chunk: StreamChunk,
		onChunk: DraftRunConsumptionOptions['onChunk'],
		state: DraftRunState,
	): void {
		if (state.observerFailed || !onChunk) return;
		try {
			onChunk(chunk);
		} catch (error) {
			state.observerFailed = true;
			state.observerError = error;
		}
	}

	private collectDraftChunk(
		chunk: StreamChunk,
		errorMode: DraftRunConsumptionOptions['errorMode'],
		state: DraftRunState,
	): void {
		if (chunk.type === 'error' && errorMode === 'throw' && !state.observerFailed) {
			state.errorChunk ??= chunk;
			return;
		}
		if (state.errorChunk) return;
		if (chunk.type === 'text-delta') {
			state.response += chunk.delta;
		} else if (chunk.type === 'tool-call-suspended') {
			state.suspensions.push({
				runId: chunk.runId,
				toolCallId: chunk.toolCallId,
				toolName: chunk.toolName,
				...(chunk.input !== undefined ? { input: chunk.input } : {}),
				...(chunk.suspendPayload !== undefined ? { suspendPayload: chunk.suspendPayload } : {}),
				...(chunk.resumeSchema !== undefined ? { resumeSchema: chunk.resumeSchema } : {}),
			});
		}
	}
}
