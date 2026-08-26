import {
	zodToJsonSchema,
	type CredentialProvider,
	type SerializableAgentState,
	type StreamChunk,
} from '@n8n/agents';
import { APPROVAL_RESUME_SCHEMA } from '@n8n/agents/tool';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { AgentExecutionOrchestratorService } from '../agent-execution-orchestrator.service';
import type { AgentExecutionService } from '../agent-execution.service';
import { AgentTestRunService } from '../agent-test-run.service';
import type { AgentValidationService } from '../agent-validation.service';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';

const agentId = 'agent-1';
const projectId = 'project-1';
const user = mock<User>({ id: 'user-1' });
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
	agentExecutionService.findThreadById.mockResolvedValue(null);
	agentValidationService.validateAgentIsRunnable.mockResolvedValue({ missing: [] });

	return {
		service: new AgentTestRunService(
			agentExecutionService,
			agentValidationService,
			agentExecutionOrchestratorService,
			n8nCheckpointStorage,
		),
		agentExecutionService,
		agentValidationService,
		agentExecutionOrchestratorService,
		n8nCheckpointStorage,
	};
}

describe('AgentTestRunService', () => {
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
