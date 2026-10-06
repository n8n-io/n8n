import type { InstanceAiWorkflowAttachment, SelfHealingResultDetail } from '@n8n/api-types';
import {
	createWorkflowWithHistory,
	mockInstance,
	shareWorkflowWithUsers,
} from '@n8n/backend-test-utils';
import { ProjectRepository, WorkflowRepository } from '@n8n/db';
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
import { SelfHealingResultService } from '../self-healing-result.service';

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
	setupTimeout: 30_000,
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
	const workflow = await createWorkflowWithHistory({}, backgroundUser);
	const ownerProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		backgroundUser.id,
	);
	const execution = await createExecution({ status: 'error' }, workflow);
	const service = Container.get(SelfHealingResultService);
	const result = await service.create(
		await service.prepare({
			workflowId: workflow.id,
			projectId: ownerProject.id,
			backgroundUserId: backgroundUser.id,
			executionId: execution.id,
			usage: {
				credits: 1,
				turns: 2,
				durationSeconds: 30,
				promptTokens: 1000,
				completionTokens: 200,
				totalTokens: 1200,
			},
			outcome: 'needs_you',
			summary: 'Review the failed request.',
			report: 'The request failed. Check the connection settings, then retry the workflow.',
		}),
	);
	const url = `/projects/${ownerProject.id}/workflows/${workflow.id}/self-healing-results/${result.id}`;
	return { backgroundUser, workflow, ownerProject, execution, result, url };
}

it('continues a saved report in a new private chat owned by the current editor', async () => {
	testServer.license.enable('feat:sharing');
	const { backgroundUser, workflow, ownerProject, execution, result, url } = await savedResult();
	const editor = await createUser();
	const otherEditor = await createUser();
	await shareWorkflowWithUsers(workflow, [editor, otherEditor]);
	const editorProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		editor.id,
	);
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
	const originalResult = await Container.get(SelfHealingResultRepository).findOneByOrFail({
		id: result.id,
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

	const threadId = randomUUID();
	await editorAgent
		.post('/instance-ai/threads')
		.send({ threadId, projectId: editorProject.id, source: 'assistant_page', origin: 'internal' })
		.expect(200);
	expect(await threads.findOneByOrFail({ id: threadId })).toMatchObject({
		resourceId: editor.id,
		projectId: editorProject.id,
	});
	expect(await storedMemory.getMessages(threadId)).toEqual([]);
	expect(assistant.startRun).not.toHaveBeenCalled();

	const response = await editorAgent
		.post(`/instance-ai/chat/${threadId}`)
		.send({ message: detail.report, attachments: [attachment], timeZone: 'UTC' })
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
		await agent.get(url).expect(200);
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
	).toEqual(originalResult);
});
