import { Container } from 'typedi';
import { NodeApiError, NodeOperationError, Workflow } from 'n8n-workflow';
import type { IWebhookData } from 'n8n-workflow';

import { ActiveExecutions } from '@/ActiveExecutions';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import config from '@/config';
import { ExternalHooks } from '@/ExternalHooks';
import { Push } from '@/push';
import { SecretsHelper } from '@/SecretsHelpers';
import { WebhookService } from '@/services/webhook.service';
import * as WebhookHelpers from '@/WebhookHelpers';
import * as AdditionalData from '@/WorkflowExecuteAdditionalData';
import type { User } from '@db/entities/User';
import type { WebhookEntity } from '@db/entities/WebhookEntity';
import { NodeTypes } from '@/NodeTypes';
import { ExecutionService } from '@/executions/execution.service';
import { WorkflowService } from '@/workflows/workflow.service';
import { ActiveWorkflowsService } from '@/services/activeWorkflows.service';

import { mockInstance } from '../shared/mocking';
import { setSchedulerAsLoadedNode } from './shared/utils';
import * as testDb from './shared/testDb';
import { createOwner } from './shared/db/users';
import { createWorkflow } from './shared/db/workflows';

mockInstance(ActiveExecutions);
mockInstance(Push);
mockInstance(SecretsHelper);
mockInstance(ExecutionService);
mockInstance(WorkflowService);

const webhookService = mockInstance(WebhookService);

setSchedulerAsLoadedNode();

const externalHooks = mockInstance(ExternalHooks);

let activeWorkflowsService: ActiveWorkflowsService;
let activeWorkflowRunner: ActiveWorkflowRunner;
let owner: User;

beforeAll(async () => {
	await testDb.init();

	activeWorkflowsService = Container.get(ActiveWorkflowsService);
	activeWorkflowRunner = Container.get(ActiveWorkflowRunner);
	owner = await createOwner();
});

afterEach(async () => {
	await activeWorkflowRunner.removeAll();
	activeWorkflowRunner.removeAllQueuedWorkflowActivations();
	await testDb.truncate(['Workflow']);
	config.load(config.default);
	jest.restoreAllMocks();
});

afterAll(async () => {
	await testDb.terminate();
});

describe('init()', () => {
	test('should call `ExternalHooks.run()`', async () => {
		const runSpy = jest.spyOn(externalHooks, 'run');

		await activeWorkflowRunner.init();

		expect(runSpy).toHaveBeenCalledTimes(1);
		const [hook, arg] = runSpy.mock.calls[0];
		expect(hook).toBe('activeWorkflows.initialized');
		expect(arg).toBeEmptyArray();
	});

	test('should start with no active workflows', async () => {
		await activeWorkflowRunner.init();

		const inStorage = await activeWorkflowsService.getAllActiveIdsInStorage();
		expect(inStorage).toHaveLength(0);

		const inMemory = activeWorkflowRunner.allActiveInMemory();
		expect(inMemory).toHaveLength(0);
	});

	test('should start with one active workflow', async () => {
		await createWorkflow({ active: true }, owner);

		await activeWorkflowRunner.init();

		const inStorage = await activeWorkflowsService.getAllActiveIdsInStorage();
		expect(inStorage).toHaveLength(1);

		const inMemory = activeWorkflowRunner.allActiveInMemory();
		expect(inMemory).toHaveLength(1);
	});

	test('should start with multiple active workflows', async () => {
		await createWorkflow({ active: true }, owner);
		await createWorkflow({ active: true }, owner);

		await activeWorkflowRunner.init();

		const inStorage = await activeWorkflowsService.getAllActiveIdsInStorage();
		expect(inStorage).toHaveLength(2);

		const inMemory = activeWorkflowRunner.allActiveInMemory();
		expect(inMemory).toHaveLength(2);
	});

	test('should pre-check that every workflow can be activated', async () => {
		await createWorkflow({ active: true }, owner);
		await createWorkflow({ active: true }, owner);

		const precheckSpy = jest
			.spyOn(Workflow.prototype, 'checkIfWorkflowCanBeActivated')
			.mockReturnValue(true);

		await activeWorkflowRunner.init();

		expect(precheckSpy).toHaveBeenCalledTimes(2);
	});
});

describe('removeAll()', () => {
	test('should remove all active workflows from memory', async () => {
		await createWorkflow({ active: true }, owner);
		await createWorkflow({ active: true }, owner);

		await activeWorkflowRunner.init();
		await activeWorkflowRunner.removeAll();

		const inMemory = activeWorkflowRunner.allActiveInMemory();
		expect(inMemory).toHaveLength(0);
	});
});

describe('remove()', () => {
	test('should call `ActiveWorkflowRunner.clearWebhooks()`', async () => {
		const workflow = await createWorkflow({ active: true }, owner);
		const clearWebhooksSpy = jest.spyOn(activeWorkflowRunner, 'clearWebhooks');

		await activeWorkflowRunner.init();
		await activeWorkflowRunner.remove(workflow.id);

		expect(clearWebhooksSpy).toHaveBeenCalledTimes(1);
	});
});

describe('isActive()', () => {
	test('should return `true` for active workflow in storage', async () => {
		const workflow = await createWorkflow({ active: true }, owner);

		await activeWorkflowRunner.init();

		const isActiveInStorage = activeWorkflowRunner.isActive(workflow.id);
		await expect(isActiveInStorage).resolves.toBe(true);
	});

	test('should return `false` for inactive workflow in storage', async () => {
		const workflow = await createWorkflow({ active: false }, owner);

		await activeWorkflowRunner.init();

		const isActiveInStorage = activeWorkflowRunner.isActive(workflow.id);
		await expect(isActiveInStorage).resolves.toBe(false);
	});
});

describe('executeErrorWorkflow()', () => {
	test('should call `WorkflowExecuteAdditionalData.executeErrorWorkflow()`', async () => {
		const workflow = await createWorkflow({ active: true }, owner);
		const [node] = workflow.nodes;
		const error = new NodeOperationError(node, 'Fake error message');
		const executeSpy = jest.spyOn(AdditionalData, 'executeErrorWorkflow');

		await activeWorkflowRunner.init();
		activeWorkflowRunner.executeErrorWorkflow(error, workflow, 'trigger');

		expect(executeSpy).toHaveBeenCalledTimes(1);
	});

	test('should be called on failure to activate due to 401', async () => {
		const storedWorkflow = await createWorkflow({ active: true }, owner);
		const [node] = storedWorkflow.nodes;
		const executeSpy = jest.spyOn(activeWorkflowRunner, 'executeErrorWorkflow');

		jest.spyOn(activeWorkflowRunner, 'add').mockImplementation(() => {
			throw new NodeApiError(node, {
				httpCode: '401',
				message: 'Authorization failed - please check your credentials',
			});
		});

		await activeWorkflowRunner.init();

		expect(executeSpy).toHaveBeenCalledTimes(1);
		const [error, workflow] = executeSpy.mock.calls[0];
		expect(error.message).toContain('Authorization');
		expect(workflow.id).toBe(storedWorkflow.id);
	});
});

describe('addWebhooks()', () => {
	test('should call `WebhookService.storeWebhook()`', async () => {
		const mockWebhook = { path: 'fake-path' } as unknown as IWebhookData;
		const mockWebhookEntity = { webhookPath: 'fake-path' } as unknown as WebhookEntity;

		jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([mockWebhook]);
		webhookService.createWebhook.mockReturnValue(mockWebhookEntity);

		const additionalData = await AdditionalData.getBase('fake-user-id');

		const dbWorkflow = await createWorkflow({ active: true }, owner);

		const workflow = new Workflow({
			id: dbWorkflow.id,
			name: dbWorkflow.name,
			nodes: dbWorkflow.nodes,
			connections: dbWorkflow.connections,
			active: dbWorkflow.active,
			nodeTypes: Container.get(NodeTypes),
			staticData: dbWorkflow.staticData,
			settings: dbWorkflow.settings,
		});

		const [node] = dbWorkflow.nodes;

		jest.spyOn(Workflow.prototype, 'getNode').mockReturnValue(node);
		jest.spyOn(Workflow.prototype, 'checkIfWorkflowCanBeActivated').mockReturnValue(true);
		jest.spyOn(Workflow.prototype, 'createWebhookIfNotExists').mockResolvedValue(undefined);

		await activeWorkflowRunner.addWebhooks(workflow, additionalData, 'trigger', 'init');

		expect(webhookService.storeWebhook).toHaveBeenCalledTimes(1);
	});
});
