import {
	type CredentialProvider,
	type SerializableAgentState,
	type StreamChunk,
} from '@n8n/agents';
import { APPROVAL_RESUME_SCHEMA } from '@n8n/agents/tool';
import { zodToJsonSchema } from '@n8n/ai-utilities/json-schema';
import type { User } from '@n8n/db';
import { ForbiddenError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import type { AgentExecutionOrchestratorService } from '../agent-execution-orchestrator.service';
import type { AgentExecutionService } from '../agent-execution.service';
import { AgentTestRunService } from '../agent-test-run.service';
import type { AgentValidationService } from '../agent-validation.service';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { SimulationSession } from '../simulation/simulation-session';
import type { SimulationSessionService } from '../simulation/simulation-session.service';

vi.mock('@/permissions.ee/check-access', () => ({
	userHasScopes: vi.fn(),
}));

const agentId = 'agent-1';
const projectId = 'project-1';
const user = mock<User>({ id: 'user-1' });
const credentialProvider = mock<CredentialProvider>();
const preparedDraftRunInput = {
	agentId,
	projectId,
	message: 'Hi',
	user,
	sessionId: 'session-1',
};
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
	const simulationSessions = mock<SimulationSessionService>();
	simulationSessions.openForDraftRun.mockResolvedValue(undefined);
	agentExecutionService.findThreadById.mockResolvedValue(null);
	agentExecutionService.canUseDraftThread.mockResolvedValue(true);
	agentValidationService.validateAgentIsRunnable.mockResolvedValue({ missing: [] });
	vi.mocked(userHasScopes).mockResolvedValue(true);

	return {
		service: new AgentTestRunService(
			agentExecutionService,
			agentValidationService,
			agentExecutionOrchestratorService,
			n8nCheckpointStorage,
			simulationSessions,
		),
		agentExecutionService,
		agentValidationService,
		agentExecutionOrchestratorService,
		n8nCheckpointStorage,
		simulationSessions,
	};
}

describe('AgentTestRunService', () => {
	it('executes a prepared draft run without repeating preparation', async () => {
		const { service, agentExecutionOrchestratorService, agentValidationService } = makeService();
		const executionError = new Error('streamed execution failed');
		const chunks: StreamChunk[] = [
			{ type: 'text-delta', id: 'text-1', delta: 'Hello' },
			{ type: 'error', error: executionError },
			{ type: 'text-delta', id: 'text-1', delta: ' there' },
		];
		agentExecutionOrchestratorService.executeForChat.mockImplementation(async function* (config) {
			yield* chunks;
			config.onExecutionRecorded?.('execution-1');
		});
		const onChunk = vi.fn();

		await expect(
			service.executePreparedDraftRun({
				...preparedDraftRunInput,
				attachments: [
					{ id: 'attachment-1', fileName: 'notes.txt', mimeType: 'text/plain', sizeBytes: 5 },
				],
				errorMode: 'forward',
				onChunk,
			}),
		).resolves.toEqual({
			status: 'completed',
			response: 'Hello there',
			executionId: 'execution-1',
		});
		expect(agentValidationService.validateAgentIsRunnable).not.toHaveBeenCalled();
		expect(onChunk).toHaveBeenCalledWith({ type: 'error', error: executionError });
		expect(onChunk).toHaveBeenCalledTimes(3);
		expect(agentExecutionOrchestratorService.executeForChat).toHaveBeenCalledWith(
			expect.objectContaining({
				memory: { threadId: 'session-1', resourceId: 'draft-chat:user-1' },
				attachments: [
					{ id: 'attachment-1', fileName: 'notes.txt', mimeType: 'text/plain', sizeBytes: 5 },
				],
			}),
		);
	});

	it.each([undefined, ''])(
		'prepares a new session with a generated id when sessionId is %j',
		async (sessionId) => {
			const { service, agentExecutionService } = makeService();

			const result = await service.prepareDraftRun({
				agentId,
				projectId,
				user,
				sessionId,
				credentialProvider,
			});

			expect(result).toEqual({
				status: 'ready',
				sessionId: expect.stringMatching(/^[0-9a-f-]{36}$/),
				sessionMode: 'new',
			});
			expect(agentExecutionService.canUseDraftThread).not.toHaveBeenCalled();
		},
	);

	it('flags a run that stopped on the iteration cap', async () => {
		const { service, agentExecutionOrchestratorService } = makeService();
		agentExecutionOrchestratorService.executeForChat.mockImplementation(async function* (config) {
			config.onExecutionRecorded?.('execution-1');
			yield { type: 'text-delta', id: 'text-1', delta: 'Working on it' };
			yield { type: 'finish', finishReason: 'max-iterations' };
		});

		await expect(service.executePreparedDraftRun(preparedDraftRunInput)).resolves.toEqual({
			status: 'completed',
			response: 'Working on it',
			executionId: 'execution-1',
			maxIterations: true,
		});
	});

	it('resumes a prepared draft run with its selected memory scope', async () => {
		const { service, agentExecutionOrchestratorService, agentExecutionService } = makeService();
		agentExecutionOrchestratorService.resumeForChat.mockImplementation(async function* (config) {
			yield { type: 'text-delta', id: 'text-1', delta: 'continued' };
			config.onExecutionRecorded?.('execution-2');
		});

		await expect(
			service.resumePreparedDraftRun({
				agentId,
				projectId,
				runId: 'run-1',
				toolCallId: 'tool-call-1',
				resumeData: { approved: true },
				user,
				expectedMemory: { threadId: 'session-1', resourceId: 'draft-chat:user-1' },
				initialResponse: 'Already ',
			}),
		).resolves.toEqual({
			status: 'completed',
			response: 'Already continued',
			executionId: 'execution-2',
		});
		expect(agentExecutionService.findThreadById).not.toHaveBeenCalled();
		expect(agentExecutionOrchestratorService.resumeForChat).toHaveBeenCalledWith(
			expect.objectContaining({
				runId: 'run-1',
				toolCallId: 'tool-call-1',
				expectedMemory: { threadId: 'session-1', resourceId: 'draft-chat:user-1' },
			}),
		);
	});

	it('reports an observer failure after the execution stream settles', async () => {
		const { service, agentExecutionOrchestratorService } = makeService();
		const abortController = new AbortController();
		const deliveryError = new Error('delivery failed');
		const produced: string[] = [];
		agentExecutionOrchestratorService.executeForChat.mockImplementation(async function* () {
			try {
				yield { type: 'text-delta', id: 'text-1', delta: 'first' };
				produced.push('continued');
				yield { type: 'text-delta', id: 'text-1', delta: 'second' };
			} finally {
				produced.push('settled');
			}
		});
		const onChunk = vi.fn(() => {
			throw deliveryError;
		});

		await expect(
			service.executePreparedDraftRun({
				...preparedDraftRunInput,
				onChunk,
				abortSignal: abortController.signal,
			}),
		).rejects.toBe(deliveryError);
		expect(onChunk).toHaveBeenCalledTimes(1);
		expect(produced).toEqual(['continued', 'settled']);
		expect(abortController.signal.aborted).toBe(false);
	});

	it('runs a draft test and returns its response and execution identifiers', async () => {
		const { service, agentExecutionOrchestratorService } = makeService();
		agentExecutionOrchestratorService.executeForChat.mockImplementation(async function* (config) {
			config.onExecutionRecorded?.('execution-1');
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
			executionId: 'execution-1',
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
		agentExecutionOrchestratorService.executeForChat.mockImplementation(async function* (config) {
			yield* chunks;
			config.onExecutionRecorded?.('execution-1');
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
			executionId: 'execution-1',
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
		agentExecutionOrchestratorService.resumeForChat.mockImplementation(async function* (config) {
			config.onExecutionRecorded?.('execution-2');
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
			executionId: 'execution-2',
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
		agentExecutionService.canUseDraftThread.mockResolvedValue(false);

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

	it('rejects a draft run and resume from a user without agent:read', async () => {
		const { service, agentValidationService, agentExecutionOrchestratorService } = makeService();
		vi.mocked(userHasScopes).mockResolvedValue(false);

		await expect(
			service.prepareDraftRun({ agentId, projectId, user, previewChat: true, credentialProvider }),
		).rejects.toThrow(ForbiddenError);
		await expect(
			service.resumePreparedDraftRun({
				agentId,
				projectId,
				runId: 'run-1',
				toolCallId: 'tool-call-1',
				resumeData: { approved: true },
				user,
				chatSurface: 'preview',
			}),
		).rejects.toThrow(ForbiddenError);
		expect(userHasScopes).toHaveBeenCalledWith(user, ['agent:read'], false, { projectId });
		expect(agentValidationService.validateAgentIsRunnable).not.toHaveBeenCalled();
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

	it.each(['headless', 'observed'])('rejects a streamed error for an %s run', async (caller) => {
		const { service, agentExecutionOrchestratorService } = makeService();
		const executionError = new Error('streamed execution failed');
		let settled = false;
		agentExecutionOrchestratorService.executeForChat.mockImplementation(async function* () {
			try {
				yield { type: 'error', error: executionError };
				yield { type: 'finish', finishReason: 'error' };
			} finally {
				settled = true;
			}
		});

		const execution =
			caller === 'headless'
				? service.executeDraftRun({ ...preparedDraftRunInput, credentialProvider })
				: service.executePreparedDraftRun({ ...preparedDraftRunInput, onChunk: vi.fn() });
		await expect(execution).rejects.toBe(executionError);
		expect(settled).toBe(true);
	});

	describe('test runs (safe testing)', () => {
		const toolResult = (toolCallId: string): StreamChunk => ({
			type: 'tool-result',
			toolCallId,
			toolName: 'send_slack',
			output: { ok: true },
		});

		async function runWithStream(
			service: AgentTestRunService,
			orchestrator: ReturnType<typeof makeService>['agentExecutionOrchestratorService'],
			chunks: StreamChunk[],
			onChunk = vi.fn(),
		) {
			orchestrator.executeForChat.mockImplementation(async function* (config) {
				await config.simulation?.(config.memory.threadId);
				yield* chunks;
				config.onExecutionRecorded?.('execution-1');
			});
			return await service.executePreparedDraftRun({ ...preparedDraftRunInput, onChunk });
		}

		it('leaves a draft run unchanged when there is no test-run session', async () => {
			const { service, agentExecutionOrchestratorService, simulationSessions } = makeService();
			const onChunk = vi.fn();

			const result = await runWithStream(
				service,
				agentExecutionOrchestratorService,
				[toolResult('tc-1')],
				onChunk,
			);

			expect(result).toEqual({ status: 'completed', response: '', executionId: 'execution-1' });
			expect(onChunk).toHaveBeenCalledWith(toolResult('tc-1'));
			expect(simulationSessions.openForDraftRun).toHaveBeenCalledWith({
				user,
				agentId,
				projectId,
				testChatId: 'session-1',
				message: 'Hi',
			});
			expect(simulationSessions.markExecutionSimulated).not.toHaveBeenCalled();
		});

		it('streams each tool result with its route and marks the execution', async () => {
			const { service, agentExecutionOrchestratorService, simulationSessions } = makeService();
			const session = mock<SimulationSession>({ worldId: 'world-1' });
			session.takeDecision.mockImplementation((toolCallId) =>
				toolCallId === 'tc-1'
					? { route: 'simulated_made_up', reason: 'invented_by_llm' }
					: undefined,
			);
			simulationSessions.openForDraftRun.mockResolvedValue(session);
			const onChunk = vi.fn();

			const result = await runWithStream(
				service,
				agentExecutionOrchestratorService,
				[toolResult('tc-1'), toolResult('tc-local')],
				onChunk,
			);

			expect(onChunk).toHaveBeenCalledWith({
				...toolResult('tc-1'),
				simulation: { route: 'simulated_made_up', reason: 'invented_by_llm' },
			});
			expect(onChunk).toHaveBeenCalledWith(toolResult('tc-local'));
			expect(result).toMatchObject({
				status: 'completed',
				simulation: {
					worldId: 'world-1',
					toolCalls: [
						{
							toolCallId: 'tc-1',
							toolName: 'send_slack',
							route: 'simulated_made_up',
							reason: 'invented_by_llm',
						},
					],
				},
			});
			expect(simulationSessions.markExecutionSimulated).toHaveBeenCalledWith('execution-1');
		});

		it('resolves the session for a resumed draft run too', async () => {
			const { service, agentExecutionOrchestratorService, simulationSessions } = makeService();
			const session = mock<SimulationSession>({ worldId: 'world-1' });
			session.takeDecision.mockReturnValue({
				route: 'blocked',
				reason: 'unsupported_by_simulator',
			});
			simulationSessions.openForDraftRun.mockResolvedValue(session);
			agentExecutionOrchestratorService.resumeForChat.mockImplementation(async function* (config) {
				await config.simulation?.('session-1');
				yield toolResult('tc-2');
				config.onExecutionRecorded?.('execution-2');
			});

			const result = await service.resumePreparedDraftRun({
				agentId,
				projectId,
				runId: 'run-1',
				toolCallId: 'tc-2',
				resumeData: { approved: true },
				user,
			});

			expect(result).toMatchObject({
				simulation: { toolCalls: [expect.objectContaining({ route: 'blocked' })] },
			});
			expect(simulationSessions.markExecutionSimulated).toHaveBeenCalledWith('execution-2');
		});
	});
});
