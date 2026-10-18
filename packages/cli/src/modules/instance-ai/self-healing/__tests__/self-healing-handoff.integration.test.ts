import type { InstanceAiWorkflowAttachment, SelfHealingResultDetail } from '@n8n/api-types';
import {
	createWorkflowWithHistory,
	mockInstance,
	createTeamProject,
	linkUserToProject,
	shareWorkflowWithUsers,
} from '@n8n/backend-test-utils';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { AuthHandlerRegistry } from '@/auth/auth-handler.registry';
import { ControllerRegistry } from '@/controller.registry';
import { WorkflowPublicationNotifier } from '@/workflows/publication/workflow-publication-notifier';
import { createExecution } from '@test-integration/db/executions';
import { createUser } from '@test-integration/db/users';
import { initNodeTypes, setupTestServer } from '@test-integration/utils';

import { InstanceAiMemoryService } from '../../instance-ai-memory.service';
import { InstanceAiSettingsService } from '../../instance-ai-settings.service';
import { InstanceAiService } from '../../instance-ai.service';
import { InstanceAiThreadGrantRepository } from '../../repositories/instance-ai-thread-grant.repository';
import { InstanceAiThreadRepository } from '../../repositories/instance-ai-thread.repository';
import { TypeORMAgentMemory } from '../../storage/typeorm-agent-memory';
import { SelfHealingResultRepository } from '../database/self-healing-result.repository';
import { createConfiguration, addReviewer } from './support/configuration';

vi.mock('../../instance-ai.service', () => ({ InstanceAiService: vi.fn() }));

mockInstance(ActiveWorkflowManager);
mockInstance(WorkflowPublicationNotifier);
const assistant = mockInstance(InstanceAiService);
const settings = mockInstance(InstanceAiSettingsService, {
	getSandboxStatus: () => ({
		enabled: false,
		provider: 'daytona',
		workflowBuilderAvailable: false,
		unavailableReason: null,
	}),
});

const testServer = setupTestServer({
	modules: ['instance-ai'],
	endpointGroups: ['instance-ai'],
	setupTimeout: 60_000,
});

beforeAll(async () => {
	await initNodeTypes();
	await import('../self-healing-results.controller.js');
	Container.get(ControllerRegistry).activate(testServer.app);
	await Container.get(AuthHandlerRegistry).init();
});

beforeEach(() => {
	settings.isInstanceAiEnabled.mockReturnValue(true);
	settings.isModelConfigured.mockResolvedValue(true);
	assistant.hasActiveRun.mockReturnValue(false);
	assistant.startRun.mockReturnValue('controlled-run');
});

async function savedResult() {
	const backgroundUser = await createUser();
	const ownerProject = await createTeamProject(undefined, backgroundUser);
	const workflow = await createWorkflowWithHistory({}, ownerProject);
	const execution = await createExecution({ status: 'error' }, workflow);
	const configuration = await createConfiguration(ownerProject.id, backgroundUser.id);
	const result = await Container.get(SelfHealingResultRepository).createResult(
		{
			configurationId: configuration.id,
			workflowId: workflow.id,
			projectId: ownerProject.id,
			backgroundUserId: backgroundUser.id,
			executionId: execution.id,
			suggestionId: null,
			usage: {
				credits: 1,
				turns: 2,
				durationSeconds: 30,
			},
			outcome: 'needs_you',
			summary: 'Review the failed request.',
			report: 'The request failed. Check the connection settings, then retry the workflow.',
			completedAt: new Date(),
		},
		{},
	);
	const url = `/projects/${ownerProject.id}/workflows/${workflow.id}/self-healing-results/${result.id}`;
	return { backgroundUser, workflow, ownerProject, execution, result, url };
}

it('closes a report and starts a private conversation through normal chat APIs', async () => {
	testServer.license.enable('feat:sharing');
	const { backgroundUser, workflow, ownerProject, execution, result, url } = await savedResult();
	const editor = await createUser();
	const otherEditor = await createUser();
	await linkUserToProject(editor, ownerProject, 'project:editor');
	await linkUserToProject(otherEditor, ownerProject, 'project:editor');
	await addReviewer(result.configurationId, editor.id);
	await addReviewer(result.configurationId, otherEditor.id);
	const memory = Container.get(InstanceAiMemoryService);
	const storedMemory = Container.get(TypeORMAgentMemory);
	const threads = Container.get(InstanceAiThreadRepository);
	const grants = Container.get(InstanceAiThreadGrantRepository);
	const backgroundThreadId = randomUUID();
	await memory.ensureThread(backgroundUser.id, backgroundThreadId, ownerProject.id, {
		source: 'assistant_page',
		origin: 'internal',
	});
	await memory.seedOpeningMessages(backgroundThreadId, backgroundUser.id, 'Private investigation.');
	await grants.grant(backgroundThreadId, backgroundUser.id, 'executions:run');
	const backgroundMessages = await storedMemory.getMessages(backgroundThreadId);
	const originalWorkflow = await Container.get(WorkflowRepository).findOneByOrFail({
		id: workflow.id,
	});
	const editorAgent = testServer.authAgentFor(editor);

	const detailResponse = await editorAgent.get(url).expect(200);
	const detail = detailResponse.body.data as SelfHealingResultDetail;
	expect(detail).toMatchObject({
		report: result.report,
		workflowId: workflow.id,
		execution: { status: 'available', id: execution.id },
	});
	const attachment: InstanceAiWorkflowAttachment = {
		type: 'workflow',
		id: detail.workflowId,
		...(detail.execution.status === 'available' ? { executionId: detail.execution.id } : {}),
	};
	expect(assistant.startRun).not.toHaveBeenCalled();

	const closeResponse = await editorAgent.post(`${url}/dismiss`).expect(200);
	expect(closeResponse.body.data).toMatchObject({
		reviewState: 'dismissed',
		dismissedById: editor.id,
	});
	const threadId = randomUUID();
	await editorAgent
		.post('/instance-ai/threads')
		.send({
			threadId,
			projectId: detail.projectId,
			source: 'self_healing_result',
			origin: 'internal',
			sourceContext: { resultId: result.id, outcome: result.outcome },
		})
		.expect(200);
	expect(await threads.findOneByOrFail({ id: threadId })).toMatchObject({
		resourceId: editor.id,
		projectId: ownerProject.id,
		metadata: {
			source: 'self_healing_result',
			origin: 'internal',
			sourceContext: { resultId: result.id, outcome: result.outcome },
		},
	});

	const response = await editorAgent
		.post(`/instance-ai/chat/${threadId}`)
		.send({
			message: result.report,
			attachments: [attachment],
			authorship: { kind: 'prefill', prefillType: 'handoff_self_healing_report' },
			timeZone: 'UTC',
		})
		.expect(200);
	expect(response.body.data).toEqual({ runId: 'controlled-run' });
	expect(assistant.startRun).toHaveBeenCalledTimes(1);
	expect(assistant.startRun.mock.calls[0]?.slice(0, 4)).toEqual([
		expect.objectContaining({ id: editor.id }),
		threadId,
		result.report,
		[attachment],
	]);
	await editorAgent.get(`/instance-ai/threads/${threadId}`).expect(200);
	for (const user of [backgroundUser, otherEditor]) {
		const agent = testServer.authAgentFor(user);
		const sharedResult = await agent.get(url).expect(200);
		expect(sharedResult.body.data).toMatchObject({
			reviewState: 'dismissed',
			dismissedById: editor.id,
		});
		await agent.post(`${url}/dismiss`).expect(409);
		await agent.get(`/instance-ai/threads/${threadId}`).expect(403);
		await agent.post(`/instance-ai/chat/${threadId}`).send({ message: 'Continue.' }).expect(403);
	}
	expect(assistant.startRun).toHaveBeenCalledTimes(1);
	expect(await grants.countBy({ threadId })).toBe(0);
	expect(await grants.findKeys(backgroundThreadId, backgroundUser.id)).toEqual(
		new Set(['executions:run']),
	);
	expect(await storedMemory.getMessages(backgroundThreadId)).toEqual(backgroundMessages);
	expect(await Container.get(WorkflowRepository).findOneByOrFail({ id: workflow.id })).toEqual(
		originalWorkflow,
	);
	expect(
		await Container.get(SelfHealingResultRepository).findOneByOrFail({ id: result.id }),
	).toMatchObject({ dismissedAt: expect.any(Date), dismissedById: editor.id });
});

it('rejects normal chat creation when the reviewer cannot read the result project', async () => {
	const { workflow, result, url } = await savedResult();
	const reviewer = await createUser();
	await shareWorkflowWithUsers(workflow, [reviewer]);
	await addReviewer(result.configurationId, reviewer.id);
	const agent = testServer.authAgentFor(reviewer);
	await agent.post(`${url}/dismiss`).expect(200);
	const threadId = randomUUID();

	await agent
		.post('/instance-ai/threads')
		.send({
			threadId,
			projectId: result.projectId,
			source: 'self_healing_result',
		})
		.expect(403);

	expect(await Container.get(InstanceAiThreadRepository).findOneBy({ id: threadId })).toBeNull();
	expect(
		await Container.get(SelfHealingResultRepository).findOneByOrFail({ id: result.id }),
	).toMatchObject({ dismissedById: reviewer.id });
});
