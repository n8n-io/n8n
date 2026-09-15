import {
	type CredentialProvider,
	type SerializableAgentState,
	type StreamChunk,
} from '@n8n/agents';
import { APPROVAL_RESUME_SCHEMA } from '@n8n/agents/tool';
import { zodToJsonSchema } from '@n8n/ai-utilities/json-schema';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { createTestTurnQueue } from './test-utils/turn-queue';
import type { AgentExecutionOrchestratorService } from '../agent-execution-orchestrator.service';
import type { AgentExecutionService } from '../agent-execution.service';
import { AgentTestRunService } from '../agent-test-run.service';
import {
	consumeStream,
	type AgentTurnClaim,
	type AgentTurnQueueService,
} from '../agent-turn-queue.service';
import type { AgentValidationService } from '../agent-validation.service';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';

vi.mock('@/permissions.ee/check-access', () => ({
	userHasScopes: vi.fn().mockResolvedValue(true),
}));

const agentId = 'agent-1';
const projectId = 'project-1';
const user = mock<User>({ id: 'user-1', disabled: false });
const credentialProvider = mock<CredentialProvider>();
const approvalResumeSchema = (() => {
	const schema = zodToJsonSchema(APPROVAL_RESUME_SCHEMA);
	if (schema === null) throw new Error('Failed to generate approval resume schema');
	return schema;
})();

function suspendedApprovalCheckpoint(
	resumeSchema: typeof approvalResumeSchema = approvalResumeSchema,
	persistence: SerializableAgentState['persistence'] = {
		threadId: 'session-1',
		resourceId: 'draft-chat:user-1',
	},
): SerializableAgentState {
	return {
		status: 'suspended',
		persistence,
		messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
		pendingToolCalls: {
			'tool-call-1': {
				runId: 'run-1',
				toolCallId: 'tool-call-1',
				toolName: 'delete_record',
				input: { id: 'record-1' },
				suspended: true,
				suspendPayload: {
					type: 'approval',
					toolName: 'delete_record',
					args: { id: 'record-1' },
				},
				resumeSchema,
			},
		},
	};
}

function makeService() {
	const agentExecutionService = mock<AgentExecutionService>();
	const agentValidationService = mock<AgentValidationService>();
	const agentExecutionOrchestratorService = mock<AgentExecutionOrchestratorService>();
	const n8nCheckpointStorage = mock<N8NCheckpointStorage>();
	const agentTurnQueueService = mock<AgentTurnQueueService>();
	// An idle session: every turn claims at once.
	agentTurnQueueService.tryRunNow.mockImplementation(async ({ threadId }) => ({
		executionId: 'exec-1',
		threadId,
		abortSignal: new AbortController().signal,
		release: vi.fn(async () => {}),
		fail: vi.fn(async () => {}),
	}));
	agentExecutionOrchestratorService.resolveResumeThread.mockImplementation(
		async ({ expectedMemory }) => expectedMemory?.threadId ?? 'session-1',
	);
	agentExecutionService.findThreadById.mockResolvedValue(null);
	agentValidationService.validateAgentIsRunnable.mockResolvedValue({ missing: [] });

	return {
		service: new AgentTestRunService(
			agentExecutionService,
			agentValidationService,
			agentExecutionOrchestratorService,
			n8nCheckpointStorage,
			agentTurnQueueService,
		),
		agentExecutionService,
		agentValidationService,
		agentExecutionOrchestratorService,
		n8nCheckpointStorage,
		agentTurnQueueService,
	};
}

describe('AgentTestRunService', () => {
	afterEach(() => Container.reset());

	it.each([
		['message', true],
		['message', false],
		['message', undefined],
		['resume', true],
		['resume', false],
		['resume', undefined],
	] as const)(
		'preserves draft %s options when queued (previewChat: %s)',
		async (kind, previewChat) => {
			const queue = createTestTurnQueue(user);
			const service = new AgentTestRunService(
				queue.executionService,
				mock<AgentValidationService>(),
				queue.orchestrator,
				queue.checkpointStorage,
				queue.service,
			);
			queue.orchestrator.resolveResumeThread.mockResolvedValue('session-1');
			async function* finishTurn(
				_config: unknown,
				claim: AgentTurnClaim,
			): AsyncGenerator<StreamChunk> {
				yield { type: 'finish', finishReason: 'stop' };
				queue.finish(claim);
				await claim.release();
			}
			queue.orchestrator.executeForChat.mockImplementation(finishTurn);
			queue.orchestrator.resumeForChat.mockImplementation(finishTurn);
			const input = {
				agentId,
				projectId,
				user,
				sessionId: 'session-1',
				source: 'instance-ai',
				abortSignal: new AbortController().signal,
				...(previewChat !== undefined ? { previewChat } : {}),
			};
			const attachments = [
				{ id: 'att-1', fileName: 'notes.txt', mimeType: 'text/plain', sizeBytes: 5 },
			];
			const resume = { runId: 'run-1', toolCallId: 'tool-1', resumeData: { approved: true } };
			const submit = async () =>
				kind === 'message'
					? await service.submitDraftRun({ ...input, message: 'hello', attachments })
					: await service.submitDraftResume({ ...input, ...resume });

			const first = await submit();
			if (first.status !== 'claimed') throw new Error('Expected an immediate turn');
			expect(first.executionId).toBe('exec-1');
			expect(await submit()).toMatchObject({ status: 'queued', executionId: 'exec-2' });
			await consumeStream(first.stream);
			await vi.waitFor(() =>
				expect(queue.rows.map(({ status }) => status)).toEqual(['success', 'success']),
			);

			const calls =
				kind === 'message'
					? queue.orchestrator.executeForChat.mock.calls
					: queue.orchestrator.resumeForChat.mock.calls;
			const memory = { threadId: 'session-1', resourceId: 'draft-chat:user-1' };
			const expected = {
				agentId,
				projectId,
				user,
				source: 'instance-ai',
				previewChat,
				...(kind === 'message'
					? { message: 'hello', attachments, memory }
					: {
							...resume,
							expectedMemory: memory,
							usePublishedVersion: false,
							integrationType: 'n8n_chat',
						}),
			};
			expect(calls).toHaveLength(2);
			expect(calls[0][0]).toMatchObject({ ...expected, abortSignal: input.abortSignal });
			expect(calls[1][0]).toMatchObject(expected);
			expect(calls[1][0]).not.toHaveProperty('abortSignal');
			expect(calls.map(([, claim]) => claim.executionId)).toEqual(['exec-1', 'exec-2']);
		},
	);

	it('runs a draft test and returns its response and execution identifiers', async () => {
		const { service, agentExecutionOrchestratorService } = makeService();
		agentExecutionOrchestratorService.executeForChat.mockImplementation(async function* () {
			yield { type: 'text-delta', id: 'text-1', delta: 'Hello ' };
			yield { type: 'text-delta', id: 'text-1', delta: 'there' };
		});

		const result = await service.executeDraftRun({
			agentId,
			projectId,
			message: 'Hi',
			user,
			credentialProvider,
			source: 'instance-ai',
		});

		expect(result).toEqual({
			status: 'completed',
			response: 'Hello there',
			sessionId: expect.any(String),
			executionId: 'exec-1',
		});
		if (result.status !== 'completed') throw new Error('Expected a completed test run');
		expect(agentExecutionOrchestratorService.executeForChat).toHaveBeenCalledWith(
			expect.objectContaining({
				agentId,
				projectId,
				user,
				source: 'instance-ai',
				memory: {
					threadId: result.sessionId,
					resourceId: 'draft-chat:user-1',
				},
			}),
			expect.anything(),
		);
	});

	it('returns partial text and every suspension for a continued session', async () => {
		const { service, agentExecutionOrchestratorService } = makeService();
		const chunks: StreamChunk[] = [
			{ type: 'text-delta', id: 'text-1', delta: 'I can do that. ' },
			{
				type: 'tool-call-suspended',
				runId: 'run-1',
				toolCallId: 'tool-call-1',
				toolName: 'delete_record',
				input: { id: 'record-1' },
				suspendPayload: { type: 'approval' },
			},
			{
				type: 'tool-call-suspended',
				runId: 'run-1',
				toolCallId: 'tool-call-2',
				toolName: 'notify_owner',
				resumeSchema: { type: 'object' },
			},
		];
		agentExecutionOrchestratorService.executeForChat.mockImplementation(async function* () {
			yield* chunks;
		});

		await expect(
			service.executeDraftRun({
				agentId,
				projectId,
				message: 'Continue',
				sessionId: 'session-1',
				user,
				credentialProvider,
			}),
		).resolves.toEqual({
			status: 'suspended',
			response: 'I can do that. ',
			sessionId: 'session-1',
			executionId: 'exec-1',
			suspensions: [
				{
					runId: 'run-1',
					toolCallId: 'tool-call-1',
					toolName: 'delete_record',
					input: { id: 'record-1' },
					suspendPayload: { type: 'approval' },
				},
				{
					runId: 'run-1',
					toolCallId: 'tool-call-2',
					toolName: 'notify_owner',
					resumeSchema: { type: 'object' },
				},
			],
		});
	});

	it('resumes the same draft session and returns the next suspended segment', async () => {
		const { service, agentExecutionOrchestratorService, n8nCheckpointStorage } = makeService();
		n8nCheckpointStorage.load.mockResolvedValue(suspendedApprovalCheckpoint());
		agentExecutionOrchestratorService.resumeForChat.mockImplementation(async function* () {
			yield { type: 'text-delta', id: 'text-1', delta: ' Next step.' };
			yield {
				type: 'tool-call-suspended',
				runId: 'run-2',
				toolCallId: 'tool-call-2',
				toolName: 'notify_owner',
				suspendPayload: {
					type: 'approval',
					toolName: 'notify_owner',
					args: { ownerId: 'owner-1' },
				},
			};
		});

		const result = await service.resumeDraftApproval({
			agentId,
			projectId,
			continuation: {
				sessionId: 'session-1',
				runId: 'run-1',
				toolCallId: 'tool-call-1',
				response: 'First step.',
			},
			approved: true,
			user,
			source: 'instance-ai',
		});

		expect(result).toEqual({
			status: 'suspended',
			response: 'First step. Next step.',
			sessionId: 'session-1',
			executionId: 'exec-1',
			suspensions: [
				{
					runId: 'run-2',
					toolCallId: 'tool-call-2',
					toolName: 'notify_owner',
					suspendPayload: {
						type: 'approval',
						toolName: 'notify_owner',
						args: { ownerId: 'owner-1' },
					},
				},
			],
		});
		expect(agentExecutionOrchestratorService.resumeForChat).toHaveBeenCalledWith(
			expect.objectContaining({
				runId: 'run-1',
				toolCallId: 'tool-call-1',
				resumeData: { approved: true },
				source: 'instance-ai',
				usePublishedVersion: false,
				expectedMemory: {
					threadId: 'session-1',
					resourceId: 'draft-chat:user-1',
				},
			}),
			expect.anything(),
		);
	});

	it.each([
		['missing', undefined],
		['noncanonical', suspendedApprovalCheckpoint({ type: 'object' })],
		[
			'wrong-memory',
			suspendedApprovalCheckpoint(approvalResumeSchema, {
				threadId: 'session-1',
				resourceId: 'draft-chat:another-user',
			}),
		],
	])('rejects a %s approval checkpoint before resuming', async (_label, checkpoint) => {
		const { service, agentExecutionOrchestratorService, n8nCheckpointStorage } = makeService();
		n8nCheckpointStorage.load.mockResolvedValue(checkpoint);

		await expect(
			service.resumeDraftApproval({
				agentId,
				projectId,
				continuation: {
					sessionId: 'session-1',
					runId: 'run-1',
					toolCallId: 'tool-call-1',
					response: '',
				},
				approved: false,
				user,
			}),
		).rejects.toThrow('This test run can no longer be resumed.');
		expect(agentExecutionOrchestratorService.resumeForChat).not.toHaveBeenCalled();
	});

	it('deduplicates suspended run cancellation and reports partial failure', async () => {
		const { service, agentExecutionOrchestratorService } = makeService();
		agentExecutionOrchestratorService.cancelChatRun
			.mockResolvedValueOnce(true)
			.mockResolvedValueOnce(false);

		await expect(
			service.cancelSuspendedRuns({
				agentId,
				userId: user.id,
				suspensions: [{ runId: 'run-1' }, { runId: 'run-1' }, { runId: 'run-2' }],
			}),
		).resolves.toBe(false);
		expect(agentExecutionOrchestratorService.cancelChatRun).toHaveBeenCalledTimes(2);
		expect(agentExecutionOrchestratorService.cancelChatRun).toHaveBeenNthCalledWith(1, {
			agentId,
			runId: 'run-1',
			resourceId: 'draft-chat:user-1',
		});
		expect(agentExecutionOrchestratorService.cancelChatRun).toHaveBeenNthCalledWith(2, {
			agentId,
			runId: 'run-2',
			resourceId: 'draft-chat:user-1',
		});
	});

	it('rejects a session owned by another agent without starting a run', async () => {
		const {
			service,
			agentExecutionService,
			agentValidationService,
			agentExecutionOrchestratorService,
		} = makeService();
		agentExecutionService.findThreadById.mockResolvedValue({
			id: 'session-1',
			projectId: 'another-project',
			agentId,
		} as AgentExecutionThread);

		await expect(
			service.executeDraftRun({
				agentId,
				projectId,
				message: 'Hi',
				sessionId: 'session-1',
				user,
				credentialProvider,
			}),
		).resolves.toEqual({ status: 'session_not_found' });
		await expect(
			service.resumeDraftRun({
				agentId,
				projectId,
				sessionId: 'session-1',
				runId: 'run-1',
				toolCallId: 'tool-call-1',
				resumeData: { approved: false },
				user,
				response: '',
			}),
		).resolves.toEqual({ status: 'session_not_found' });
		expect(agentValidationService.validateAgentIsRunnable).not.toHaveBeenCalled();
		expect(agentExecutionOrchestratorService.executeForChat).not.toHaveBeenCalled();
		expect(agentExecutionOrchestratorService.resumeForChat).not.toHaveBeenCalled();
	});

	it('returns missing configuration without starting a run', async () => {
		const { service, agentValidationService, agentExecutionOrchestratorService } = makeService();
		agentValidationService.validateAgentIsRunnable.mockResolvedValue({
			missing: ['model', 'credential'],
		});

		await expect(
			service.executeDraftRun({
				agentId,
				projectId,
				message: 'Hi',
				user,
				credentialProvider,
			}),
		).resolves.toEqual({
			status: 'agent_misconfigured',
			missing: ['model', 'credential'],
		});
		expect(agentExecutionOrchestratorService.executeForChat).not.toHaveBeenCalled();
	});

	it('propagates a streamed execution error instead of completing the draft run', async () => {
		const { service, agentExecutionOrchestratorService } = makeService();
		const executionError = new Error('streamed execution failed');
		agentExecutionOrchestratorService.executeForChat.mockImplementation(async function* () {
			yield { type: 'error', error: executionError };
			yield { type: 'finish', finishReason: 'error' };
		});

		await expect(
			service.executeDraftRun({
				agentId,
				projectId,
				message: 'Hi',
				user,
				credentialProvider,
			}),
		).rejects.toBe(executionError);
	});
});
