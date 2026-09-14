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
import { UserError } from 'n8n-workflow';
import { z } from 'zod';

import type { StoredAttachmentRef } from './agent-chat-attachment.service';
import {
	AgentExecutionOrchestratorService,
	type ResumeForChatConfig,
} from './agent-execution-orchestrator.service';
import { AgentExecutionService, threadBelongsTo } from './agent-execution.service';
import {
	AgentThreadBusyError,
	AgentTurnQueueService,
	type AgentTurnClaim,
	type AgentTurnSubmission,
} from './agent-turn-queue.service';
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

interface DraftRunInput {
	agentId: string;
	projectId: string;
	message: string;
	user: User;
	sessionId: string;
	attachments?: StoredAttachmentRef[];
	source?: string;
	/** Set by the in-app preview chat only — see `ExecuteForChatConfig.previewChat`. */
	previewChat?: boolean;
	/** Runs after the turn has a durable execution row. */
	onExecutionRecorded?: (executionId: string) => void;
	abortSignal?: AbortSignal;
}

interface ExecuteDraftRunInput extends PrepareDraftRunInput {
	message: string;
	user: User;
	source?: string;
	abortSignal?: AbortSignal;
}

interface DraftResumeInput {
	agentId: string;
	projectId: string;
	/** The session the checkpoint must belong to. The preview chat resumes by run id alone. */
	sessionId?: string;
	runId: string;
	toolCallId: string;
	resumeData: unknown;
	user: User;
	source?: string;
	/** Set by the in-app preview chat only — see `ExecuteForChatConfig.previewChat`. */
	previewChat?: boolean;
	onExecutionRecorded?: (executionId: string) => void;
	abortSignal?: AbortSignal;
}

interface ResumeDraftRunInput extends DraftResumeInput {
	sessionId: string;
	response: string;
}

/**
 * A turn the queue accepted: `claimed` runs now and streams its answer;
 * `queued` waits behind the session's running turn and runs headless once it
 * ends, so the answer arrives through the execution update push and history.
 */
export type DraftTurnSubmission =
	| { status: 'claimed'; sessionId: string; stream: AsyncGenerator<StreamChunk> }
	| { status: 'queued'; sessionId: string; executionId: string };

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
		private readonly agentTurnQueueService: AgentTurnQueueService,
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

	/** Store the message as the session's next turn; see {@link DraftTurnSubmission}. */
	async submitDraftRun(input: DraftRunInput): Promise<DraftTurnSubmission> {
		const { onExecutionRecorded, ...run } = input;
		const submitted = await this.agentTurnQueueService.submit(
			this.messageTurn(run),
			onExecutionRecorded,
		);
		return submitted.status === 'queued'
			? { ...submitted, sessionId: run.sessionId }
			: {
					status: 'claimed',
					sessionId: run.sessionId,
					stream: this.streamDraftRun(run, submitted.claim),
				};
	}

	/**
	 * Store a human-in-the-loop response as the session's next turn. A resume
	 * runs at once on an idle session even when messages wait for it.
	 */
	async submitDraftResume(
		input: DraftResumeInput,
	): Promise<DraftTurnSubmission | { status: 'session_not_found' }> {
		const prepared = await this.prepareDraftResume(input);
		if (prepared.status !== 'ready') return prepared;
		const submitted = await this.agentTurnQueueService.submit(prepared.turn);
		return submitted.status === 'queued'
			? { ...submitted, sessionId: prepared.sessionId }
			: {
					status: 'claimed',
					sessionId: prepared.sessionId,
					stream: this.agentExecutionOrchestratorService.resumeForChat(
						prepared.config,
						submitted.claim,
					),
				};
	}

	/**
	 * Run the message now and return its outcome. Throws
	 * {@link AgentThreadBusyError} while the session runs another turn: the
	 * caller needs the answer in this call, so nothing is queued.
	 */
	async executeDraftRun(input: ExecuteDraftRunInput): Promise<AgentTestRunResult> {
		const prepared = await this.prepareDraftRun(input);
		if (prepared.status !== 'ready') return prepared;

		let executionId: string | undefined;
		const run: DraftRunInput = {
			...input,
			sessionId: prepared.sessionId,
			onExecutionRecorded: (id) => {
				executionId = id;
			},
		};
		const claim = await this.agentTurnQueueService.tryRunNow(this.messageTurn(run));
		if (!claim) throw new AgentThreadBusyError();

		return await this.collectDraftRun(
			this.streamDraftRun(run, claim),
			prepared.sessionId,
			'',
			() => executionId,
		);
	}

	/** Resume now and return the outcome; throws {@link AgentThreadBusyError} like {@link executeDraftRun}. */
	async resumeDraftRun(input: ResumeDraftRunInput): Promise<AgentTestRunResult> {
		let executionId: string | undefined;
		const prepared = await this.prepareDraftResume({
			...input,
			onExecutionRecorded: (id) => {
				executionId = id;
			},
		});
		if (prepared.status !== 'ready') return prepared;
		const claim = await this.agentTurnQueueService.tryRunNow(prepared.turn);
		if (!claim) throw new AgentThreadBusyError();

		return await this.collectDraftRun(
			this.agentExecutionOrchestratorService.resumeForChat(prepared.config, claim),
			input.sessionId,
			input.response,
			() => executionId,
		);
	}

	private streamDraftRun(
		{
			agentId,
			projectId,
			message,
			user,
			sessionId,
			attachments,
			source,
			previewChat,
			onExecutionRecorded,
			abortSignal,
		}: DraftRunInput,
		claim: AgentTurnClaim,
	): AsyncGenerator<StreamChunk> {
		return this.agentExecutionOrchestratorService.executeForChat(
			{
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
				previewChat,
				onExecutionRecorded,
				abortSignal,
			},
			claim,
		);
	}

	private messageTurn(input: DraftRunInput): AgentTurnSubmission {
		return {
			threadId: input.sessionId,
			agentId: input.agentId,
			projectId: input.projectId,
			userMessage: input.message,
			attachments: input.attachments,
			source: input.source,
			resourceId: draftChatMemoryResourceId(input.user.id),
			runContext: { kind: 'message' },
		};
	}

	/** Check the checkpoint before anything is stored, and resolve the session it belongs to. */
	private async prepareDraftResume(
		input: DraftResumeInput,
	): Promise<
		| { status: 'session_not_found' }
		| { status: 'ready'; sessionId: string; config: ResumeForChatConfig; turn: AgentTurnSubmission }
	> {
		const { agentId, projectId, sessionId, runId, toolCallId, resumeData, user, source } = input;
		if (sessionId) {
			const existing = await this.agentExecutionService.findThreadById(sessionId);
			if (existing && !threadBelongsTo(existing, projectId, agentId)) {
				return { status: 'session_not_found' };
			}
		}

		const resourceId = draftChatMemoryResourceId(user.id);
		const config: ResumeForChatConfig = {
			agentId,
			projectId,
			runId,
			toolCallId,
			resumeData,
			user,
			usePublishedVersion: false,
			integrationType: N8N_CHAT_INTEGRATION_TYPE,
			expectedMemory: { ...(sessionId ? { threadId: sessionId } : {}), resourceId },
			source,
			previewChat: input.previewChat,
			onExecutionRecorded: input.onExecutionRecorded,
			...(input.abortSignal ? { abortSignal: input.abortSignal } : {}),
		};
		const threadId = await this.agentExecutionOrchestratorService.resolveResumeThread(config);
		return {
			status: 'ready',
			sessionId: threadId,
			config,
			turn: {
				threadId,
				agentId,
				projectId,
				userMessage: null,
				source,
				resourceId,
				runContext: {
					kind: 'resume',
					runId,
					toolCallId,
					resumeData,
					previewChat: input.previewChat,
				},
			},
		};
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
