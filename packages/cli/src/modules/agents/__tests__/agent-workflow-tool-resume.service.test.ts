import { N8N_CHAT_INTEGRATION_TYPE } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { User, UserRepository } from '@n8n/db';
import type { WorkflowExecuteAfterContext } from '@n8n/decorators';
import type { InstanceSettings } from 'n8n-core';
import type { IRun, RelatedAgentRun } from 'n8n-workflow';
import { createRunExecutionData } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

import type { AgentExecutionUpdateBroadcaster } from '../agent-execution-update-broadcaster';
import type { AgentTestRunService } from '../agent-test-run.service';
import { AgentWorkflowToolResumeService } from '../agent-workflow-tool-resume.service';
import type { AgentBackgroundJobService } from '../background/agent-background-job.service';
import type { AgentChatBridge } from '../integrations/agent-chat-bridge';
import type { ChatIntegrationService } from '../integrations/chat-integration.service';
import type { IntegrationMessageContextService } from '../integrations/integration-message-context.service';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';

const agentRun: RelatedAgentRun = {
	agentId: 'agent-1',
	projectId: 'project-1',
	threadId: 'agent-1:slack:C123',
	runId: 'run-1',
	toolCallId: 'call-1',
	integrationType: 'slack',
};

const previewRun: RelatedAgentRun = {
	...agentRun,
	integrationType: N8N_CHAT_INTEGRATION_TYPE,
	userId: 'user-1',
};

function setup() {
	const logger = mock<Logger>();
	(logger.scoped as Mock).mockReturnValue(logger);
	const bridge = mock<AgentChatBridge>();
	const chatIntegrationService = mock<ChatIntegrationService>();
	const userRepository = mock<UserRepository>();
	const agentTestRunService = mock<AgentTestRunService>();
	const broadcaster = mock<AgentExecutionUpdateBroadcaster>();
	const messageContextService = mock<IntegrationMessageContextService>();
	messageContextService.getLatest.mockResolvedValue(null);
	const checkpointStorage = mock<N8NCheckpointStorage>();
	const publisher = mock<Publisher>();
	const instanceSettings = mock<InstanceSettings>({ isWorker: false });
	// Default to a genuinely parked run; tests that care override it.
	checkpointStorage.getStatus.mockResolvedValue({
		status: 'active',
		checkpoint: { status: 'suspended' },
	} as never);
	const backgroundJobService = mock<AgentBackgroundJobService>();
	const service = new AgentWorkflowToolResumeService(
		logger,
		userRepository,
		agentTestRunService,
		chatIntegrationService,
		messageContextService,
		broadcaster,
		checkpointStorage,
		instanceSettings,
		publisher,
		backgroundJobService,
	);
	return {
		service,
		logger,
		bridge,
		chatIntegrationService,
		userRepository,
		agentTestRunService,
		broadcaster,
		checkpointStorage,
		publisher,
		instanceSettings,
		messageContextService,
		backgroundJobService,
	};
}

/** A `workflowExecuteAfter` context for a sub-execution carrying an agent marker. */
function afterContext(
	status: IRun['status'],
	parentAgentRun?: RelatedAgentRun,
): WorkflowExecuteAfterContext {
	const data = createRunExecutionData({ resultData: { runData: {} } });
	return mock<WorkflowExecuteAfterContext>({
		executionId: 'exec-1',
		runData: {
			status,
			// The engine stamps this only on runs that ended without error or wait.
			finished: status === 'success',
			data: { ...data, ...(parentAgentRun ? { parentAgentRun } : {}) },
		} as IRun,
	});
}

describe('AgentWorkflowToolResumeService → lifecycle wiring', () => {
	it('resumes the agent run once the sub-workflow finishes', async () => {
		const { service, bridge, chatIntegrationService } = setup();
		chatIntegrationService.getBridge.mockReturnValue(bridge);

		await service.handleWorkflowExecuteAfter(afterContext('success', agentRun));

		expect(bridge.resumeInAgentThread).toHaveBeenCalledWith(
			'agent-1:slack:C123',
			'run-1',
			'call-1',
			{ type: 'workflow_finished', value: 'success' },
		);
	});

	it.each([
		// Parked at a Wait node — the workflow has not finished.
		['the execution is still waiting', 'waiting' as const, agentRun],
		// Every unrelated execution in the instance reaches this handler.
		['there is no agent marker', 'success' as const, undefined],
	])('does nothing when %s', async (_label, status, marker) => {
		const { service, chatIntegrationService } = setup();

		await service.handleWorkflowExecuteAfter(afterContext(status, marker));

		expect(chatIntegrationService.getBridge).not.toHaveBeenCalled();
	});

	// Every sub-execution carries the marker, so without this an ordinary
	// workflow-tool call would drive a resume that can only fail.
	it.each([
		['no checkpoint exists', { status: 'not-found' as const }],
		['the run is not suspended', { status: 'active' as const, checkpoint: { status: 'running' } }],
	])('does not resume when %s', async (_label, status) => {
		const { service, chatIntegrationService, checkpointStorage } = setup();
		checkpointStorage.getStatus.mockResolvedValue(status as never);

		await service.handleWorkflowExecuteAfter(afterContext('success', agentRun));

		expect(chatIntegrationService.getBridge).not.toHaveBeenCalled();
	});

	// In queue mode this hook runs on a worker, which holds no chat connections.
	it('hands the resume to the mains when running on a worker', async () => {
		const { service, chatIntegrationService, publisher, instanceSettings } = setup();
		Object.assign(instanceSettings, { isWorker: true });

		await service.handleWorkflowExecuteAfter(afterContext('success', agentRun));

		expect(chatIntegrationService.getBridge).not.toHaveBeenCalled();
		expect(publisher.publishCommand).toHaveBeenCalledWith({
			command: 'resume-agent-workflow-tool',
			payload: { agentRun, status: 'success' },
		});
	});

	it('resumes on a main when the relayed command arrives', async () => {
		const { service, bridge, chatIntegrationService } = setup();
		chatIntegrationService.getBridge.mockReturnValue(bridge);

		await service.handleResumeRelay({ agentRun, status: 'success' });

		expect(bridge.resumeInAgentThread).toHaveBeenCalled();
	});

	it('never lets a failed resume disturb the execution that triggered it', async () => {
		const { service, logger, bridge, chatIntegrationService } = setup();
		chatIntegrationService.getBridge.mockReturnValue(bridge);
		bridge.resumeInAgentThread.mockRejectedValueOnce(new Error('bridge is gone'));

		await expect(
			service.handleWorkflowExecuteAfter(afterContext('success', agentRun)),
		).resolves.toBeUndefined();

		expect(logger.error).toHaveBeenCalledWith(
			'Failed to resume agent run after sub-workflow completed',
			expect.objectContaining({ agentId: 'agent-1', error: 'bridge is gone' }),
		);
	});
});

describe('AgentWorkflowToolResumeService → chat platforms', () => {
	it('reports the failure to the model when the sub-workflow errored', async () => {
		const { service, bridge, chatIntegrationService } = setup();
		chatIntegrationService.getBridge.mockReturnValue(bridge);

		await service.resume(agentRun, 'error');

		expect(bridge.resumeInAgentThread).toHaveBeenCalledWith(
			expect.any(String),
			expect.any(String),
			expect.any(String),
			{ type: 'workflow_finished', value: 'error' },
		);
	});

	// An agent with two connections on one platform must reply through the one the
	// thread came in on, not whichever is found first.
	it('resolves the bridge by the credential the thread came in on', async () => {
		const { service, bridge, chatIntegrationService, messageContextService } = setup();
		messageContextService.getLatest.mockResolvedValue({
			integrationConnectionId: 'slack:cred-2',
			platform: 'slack',
		} as never);
		chatIntegrationService.getBridge.mockReturnValue(bridge);

		await service.resume(agentRun, 'success');

		expect(chatIntegrationService.getBridge).toHaveBeenCalledWith('agent-1', 'slack', 'cred-2');
	});

	it.each([
		['there is no message context', null],
		[
			'the context belongs to another platform',
			{ integrationConnectionId: 'discord:c', platform: 'discord' },
		],
		['no credential is bound yet', { integrationConnectionId: 'slack', platform: 'slack' }],
	])('falls back to any ingress bridge when %s', async (_label, context) => {
		const { service, bridge, chatIntegrationService, messageContextService } = setup();
		messageContextService.getLatest.mockResolvedValue(context as never);
		chatIntegrationService.getBridge.mockReturnValue(bridge);

		await service.resume(agentRun, 'success');

		expect(chatIntegrationService.getBridge).toHaveBeenCalledWith('agent-1', 'slack', undefined);
	});

	it('does nothing for a run with no chat surface at all', async () => {
		const { service, logger, chatIntegrationService } = setup();
		const { integrationType: _integrationType, ...withoutIntegration } = agentRun;

		await service.resume(withoutIntegration, 'success');

		expect(chatIntegrationService.getBridge).not.toHaveBeenCalled();
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it('warns instead of throwing when no bridge is connected', async () => {
		const { service, logger, bridge, chatIntegrationService } = setup();
		chatIntegrationService.getBridge.mockReturnValue(undefined);

		await expect(service.resume(agentRun, 'success')).resolves.toBeUndefined();

		expect(bridge.resumeInAgentThread).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalledWith(
			'No live chat bridge to resume the agent run into',
			expect.objectContaining({ agentId: 'agent-1', runId: 'run-1' }),
		);
	});
});

describe('AgentWorkflowToolResumeService → preview chat', () => {
	const completed = {
		status: 'completed' as const,
		response: '',
		sessionId: 's',
		executionId: 'exec-42',
	};

	// The preview's SSE stream closed when the run suspended, so the resume runs
	// with nothing attached — recording the turn is what puts it in the transcript.
	it('drives the resume headlessly against the draft version', async () => {
		const { service, userRepository, agentTestRunService, chatIntegrationService } = setup();
		userRepository.findOneBy.mockResolvedValue(mock<User>({ id: 'user-1' }));
		agentTestRunService.resumeDraftRun.mockResolvedValue(completed);

		await service.resume(previewRun, 'success');

		expect(chatIntegrationService.getBridge).not.toHaveBeenCalled();
		expect(agentTestRunService.resumeDraftRun).toHaveBeenCalledWith(
			expect.objectContaining({
				agentId: 'agent-1',
				projectId: 'project-1',
				sessionId: 'agent-1:slack:C123',
				runId: 'run-1',
				toolCallId: 'call-1',
				resumeData: { type: 'workflow_finished', value: 'success' },
			}),
		);
	});

	it.each([
		['a completed turn', completed],
		[
			'a turn that suspended again',
			{ ...completed, status: 'suspended' as const, suspensions: [] },
		],
	])('pushes the recorded execution after %s', async (_label, result) => {
		const { service, userRepository, agentTestRunService, broadcaster } = setup();
		userRepository.findOneBy.mockResolvedValue(mock<User>({ id: 'user-1' }));
		agentTestRunService.resumeDraftRun.mockResolvedValue(result);

		await service.resume(previewRun, 'success');

		expect(broadcaster.notify).toHaveBeenCalledWith({
			projectId: 'project-1',
			agentId: 'agent-1',
			threadId: 'agent-1:slack:C123',
			executionId: 'exec-42',
		});
	});

	it('does not push when the session could not be resumed', async () => {
		const { service, logger, userRepository, agentTestRunService, broadcaster } = setup();
		userRepository.findOneBy.mockResolvedValue(mock<User>({ id: 'user-1' }));
		agentTestRunService.resumeDraftRun.mockResolvedValue({ status: 'session_not_found' });

		await service.resume(previewRun, 'success');

		expect(broadcaster.notify).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalledWith(
			'Preview chat run could not be resumed',
			expect.objectContaining({ status: 'session_not_found' }),
		);
	});

	// Without the user the draft rebuild drops user-gated tools and the resume
	// would fail on the pending tool call, so it is not attempted.
	it.each([
		['the marker carries no user', undefined, null],
		['the user no longer exists', 'user-1', null],
	])('warns and stops when %s', async (_label, userId, found) => {
		const { service, logger, userRepository, agentTestRunService } = setup();
		userRepository.findOneBy.mockResolvedValue(found);

		await service.resume({ ...previewRun, userId }, 'success');

		expect(agentTestRunService.resumeDraftRun).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalledWith(
			'Cannot resume preview chat run without its user',
			expect.objectContaining({ runId: 'run-1' }),
		);
	});
});

describe('AgentWorkflowToolResumeService → background job settlement', () => {
	/** Like {@link afterContext}, with node output the settle serializes. */
	function afterContextWithOutput(status: IRun['status']): WorkflowExecuteAfterContext {
		const ctx = afterContext(status, agentRun);
		ctx.runData.data.resultData.runData = {
			Fetch: [{ data: { main: [[{ json: { page: 1 } }]] } } as never],
			Set: [{ data: { main: [[{ json: { ok: true } }]] } } as never],
		};
		return ctx;
	}

	it('settles the job with only the last node’s output serialized', async () => {
		const { service, backgroundJobService } = setup();

		await service.handleWorkflowExecuteAfter(afterContextWithOutput('success'));

		expect(backgroundJobService.settleWorkflowJobByExecutionId).toHaveBeenCalledWith('exec-1', {
			status: 'completed',
			result: '{"Set":[{"ok":true}]}',
			error: null,
		});
	});

	it('does not settle a success callback for a run that has not finished', async () => {
		const { service, backgroundJobService } = setup();
		const ctx = afterContextWithOutput('success');
		Object.assign(ctx.runData, { finished: false });

		await service.handleWorkflowExecuteAfter(ctx);

		expect(backgroundJobService.settleWorkflowJobByExecutionId).not.toHaveBeenCalled();
	});

	it('settles a failed execution with its error and no result', async () => {
		const { service, backgroundJobService } = setup();
		const ctx = afterContextWithOutput('error');
		ctx.runData.data.resultData.error = { message: 'boom' } as never;

		await service.handleWorkflowExecuteAfter(ctx);

		expect(backgroundJobService.settleWorkflowJobByExecutionId).toHaveBeenCalledWith('exec-1', {
			status: 'failed',
			result: null,
			error: 'boom',
		});
	});

	it('does not settle while the execution is still waiting', async () => {
		const { service, backgroundJobService } = setup();

		await service.handleWorkflowExecuteAfter(afterContext('waiting', agentRun));

		expect(backgroundJobService.settleWorkflowJobByExecutionId).not.toHaveBeenCalled();
	});

	it('still resumes a suspended run after settling — the two paths coexist', async () => {
		const { service, bridge, chatIntegrationService, backgroundJobService } = setup();
		chatIntegrationService.getBridge.mockReturnValue(bridge);

		await service.handleWorkflowExecuteAfter(afterContext('success', agentRun));

		expect(backgroundJobService.settleWorkflowJobByExecutionId).toHaveBeenCalled();
		expect(bridge.resumeInAgentThread).toHaveBeenCalled();
	});

	it('never lets a failing settle disturb the resume path', async () => {
		const { service, bridge, chatIntegrationService, backgroundJobService } = setup();
		chatIntegrationService.getBridge.mockReturnValue(bridge);
		backgroundJobService.settleWorkflowJobByExecutionId.mockRejectedValue(new Error('db down'));

		await service.handleWorkflowExecuteAfter(afterContext('success', agentRun));

		expect(bridge.resumeInAgentThread).toHaveBeenCalled();
	});
});
