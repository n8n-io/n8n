import { Container } from 'typedi';
import { mock } from 'jest-mock-extended';
import { NodeApiError, NodeOperationError, Workflow } from 'n8n-workflow';
import type { IWebhookData, WorkflowActivateMode } from 'n8n-workflow';

import { ActiveExecutions } from '@/ActiveExecutions';
import { ActiveWorkflowManager } from '@/ActiveWorkflowManager';
import { ExternalHooks } from '@/ExternalHooks';
import { Push } from '@/push';
import { SecretsHelper } from '@/SecretsHelpers';
import { WebhookService } from '@/services/webhook.service';
import * as WebhookHelpers from '@/WebhookHelpers';
import * as AdditionalData from '@/WorkflowExecuteAdditionalData';
import type { WebhookEntity } from '@db/entities/WebhookEntity';
import { NodeTypes } from '@/NodeTypes';
import { ExecutionService } from '@/executions/execution.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { mockInstance } from '../shared/mocking';
import * as testDb from './shared/testDb';
import { createOwner } from './shared/db/users';
import { createWorkflow } from './shared/db/workflows';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import type { WorkflowEntity } from '@/databases/entities/WorkflowEntity';

mockInstance(ActiveExecutions);
mockInstance(Push);
mockInstance(SecretsHelper);
mockInstance(ExecutionService);
mockInstance(WorkflowService);

const loader = mockInstance(LoadNodesAndCredentials);

Object.assign(loader.loadedNodes, {
	'n8n-nodes-base.scheduleTrigger': {
		type: {
			description: {
				displayName: 'Schedule Trigger',
				name: 'scheduleTrigger',
				properties: [],
			},
			trigger: async () => {},
		},
	},
});

const webhookService = mockInstance(WebhookService);
const externalHooks = mockInstance(ExternalHooks);

let activeWorkflowManager: ActiveWorkflowManager;

let createActiveWorkflow: () => Promise<WorkflowEntity>;
let createInactiveWorkflow: () => Promise<WorkflowEntity>;

beforeAll(async () => {
	await testDb.init();

	activeWorkflowManager = Container.get(ActiveWorkflowManager);

	const owner = await createOwner();
	createActiveWorkflow = async () => await createWorkflow({ active: true }, owner);
	createInactiveWorkflow = async () => await createWorkflow({ active: false }, owner);
});

afterEach(async () => {
	await testDb.truncate(['Workflow', 'Webhook']);
	await activeWorkflowManager.removeAll();
	jest.restoreAllMocks();
});

afterAll(async () => {
	await testDb.terminate();
});

describe('init()', () => {
	it('should load workflows into memory', async () => {
		await activeWorkflowManager.init();

		expect(activeWorkflowManager.allActiveInMemory()).toHaveLength(0);

		await createActiveWorkflow();
		await activeWorkflowManager.init();

		expect(activeWorkflowManager.allActiveInMemory()).toHaveLength(1);
	});

	it('should call external hook', async () => {
		await activeWorkflowManager.init();

		const [hook, arg] = externalHooks.run.mock.calls[0];

		expect(hook).toBe('activeWorkflows.initialized');
		expect(arg).toBeEmptyArray();
	});

	it('should check that workflow can be activated', async () => {
		await Promise.all([createActiveWorkflow(), createActiveWorkflow()]);

		const checkSpy = jest
			.spyOn(Workflow.prototype, 'checkIfWorkflowCanBeActivated')
			.mockReturnValue(true);

		await activeWorkflowManager.init();

		expect(checkSpy).toHaveBeenCalledTimes(2);
	});
});

describe('isActive()', () => {
	it('should return `true` for active workflow in storage', async () => {
		const dbWorkflow = await createActiveWorkflow();

		await activeWorkflowManager.init();

		await expect(activeWorkflowManager.isActive(dbWorkflow.id)).resolves.toBe(true);
	});

	it('should return `false` for inactive workflow in storage', async () => {
		const dbWorkflow = await createInactiveWorkflow();

		await activeWorkflowManager.init();

		await expect(activeWorkflowManager.isActive(dbWorkflow.id)).resolves.toBe(false);
	});
});

describe('add()', () => {
	describe('in single-main mode', () => {
		test.each(['activate', 'update'])(
			"should add webhooks, triggers and pollers for workflow in '%s' activation mode",
			async (mode: WorkflowActivateMode) => {
				await activeWorkflowManager.init();

				const dbWorkflow = await createActiveWorkflow();
				const addWebhooksSpy = jest.spyOn(activeWorkflowManager, 'addWebhooks');
				const addTriggersAndPollersSpy = jest.spyOn(activeWorkflowManager, 'addTriggersAndPollers');

				await activeWorkflowManager.add(dbWorkflow.id, mode);

				const [argWorkflow] = addWebhooksSpy.mock.calls[0];
				const [_, _argWorkflow] = addTriggersAndPollersSpy.mock.calls[0];

				expect(addWebhooksSpy).toHaveBeenCalledTimes(1);
				expect(addTriggersAndPollersSpy).toHaveBeenCalledTimes(1);

				if (!(argWorkflow instanceof Workflow)) fail();
				if (!(_argWorkflow instanceof Workflow)) fail();

				expect(argWorkflow.id).toBe(dbWorkflow.id);
				expect(_argWorkflow.id).toBe(dbWorkflow.id);
			},
		);
	});
});

describe('removeAll()', () => {
	it('should remove all active workflows from memory', async () => {
		await createActiveWorkflow();
		await createActiveWorkflow();

		await activeWorkflowManager.init();
		await activeWorkflowManager.removeAll();

		expect(activeWorkflowManager.allActiveInMemory()).toHaveLength(0);
	});
});

describe('remove()', () => {
	describe('in single-main mode', () => {
		it('should remove all webhooks of a workflow from database', async () => {
			const dbWorkflow = await createActiveWorkflow();

			await activeWorkflowManager.init();
			await activeWorkflowManager.remove(dbWorkflow.id);

			expect(webhookService.deleteWorkflowWebhooks).toHaveBeenCalledTimes(1);
		});

		it('should remove all webhooks of a workflow from external service', async () => {
			const dbWorkflow = await createActiveWorkflow();
			const deleteWebhookSpy = jest.spyOn(Workflow.prototype, 'deleteWebhook');
			jest
				.spyOn(WebhookHelpers, 'getWorkflowWebhooks')
				.mockReturnValue([mock<IWebhookData>({ path: 'some-path' })]);

			await activeWorkflowManager.init();
			await activeWorkflowManager.remove(dbWorkflow.id);

			expect(deleteWebhookSpy).toHaveBeenCalledTimes(1);
		});

		it('should stop running triggers and pollers', async () => {
			const dbWorkflow = await createActiveWorkflow();
			const removeTriggersAndPollersSpy = jest.spyOn(
				activeWorkflowManager,
				'removeWorkflowTriggersAndPollers',
			);

			await activeWorkflowManager.init();
			await activeWorkflowManager.remove(dbWorkflow.id);

			expect(removeTriggersAndPollersSpy).toHaveBeenCalledTimes(1);
		});
	});
});

describe('executeErrorWorkflow()', () => {
	it('should delegate to `WorkflowExecuteAdditionalData`', async () => {
		const dbWorkflow = await createActiveWorkflow();
		const [node] = dbWorkflow.nodes;

		const executeSpy = jest.spyOn(AdditionalData, 'executeErrorWorkflow');

		await activeWorkflowManager.init();

		activeWorkflowManager.executeErrorWorkflow(
			new NodeOperationError(node, 'Something went wrong'),
			dbWorkflow,
			'trigger',
		);

		expect(executeSpy).toHaveBeenCalledTimes(1);
	});

	it('should be called on failure to activate due to 401', async () => {
		const dbWorkflow = await createActiveWorkflow();
		const [node] = dbWorkflow.nodes;
		const executeSpy = jest.spyOn(activeWorkflowManager, 'executeErrorWorkflow');

		jest.spyOn(activeWorkflowManager, 'add').mockImplementation(() => {
			throw new NodeApiError(node, {
				httpCode: '401',
				message: 'Authorization failed - please check your credentials',
			});
		});

		await activeWorkflowManager.init();

		expect(executeSpy).toHaveBeenCalledTimes(1);
		const [error, _dbWorkflow] = executeSpy.mock.calls[0];
		expect(error.message).toContain('Authorization');
		expect(_dbWorkflow.id).toBe(dbWorkflow.id);
	});
});

describe('addWebhooks()', () => {
	it('should call `WebhookService.storeWebhook()`', async () => {
		const webhook = mock<IWebhookData>({ path: 'some-path' });
		const webhookEntity = mock<WebhookEntity>({ webhookPath: 'some-path' });

		jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);

		webhookService.createWebhook.mockReturnValue(webhookEntity);

		const additionalData = await AdditionalData.getBase('some-user-id');

		const dbWorkflow = await createActiveWorkflow();

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

		await activeWorkflowManager.addWebhooks(workflow, additionalData, 'trigger', 'init');

		expect(webhookService.storeWebhook).toHaveBeenCalledTimes(1);
	});
});
