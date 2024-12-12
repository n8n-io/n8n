import { mock } from 'jest-mock-extended';
import { NodeApiError, Workflow } from 'n8n-workflow';
import type { IWebhookData, WorkflowActivateMode } from 'n8n-workflow';
import { Container } from 'typedi';

import { ActiveExecutions } from '@/active-executions';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import type { WebhookEntity } from '@/databases/entities/webhook-entity';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import { ExecutionService } from '@/executions/execution.service';
import { ExternalHooks } from '@/external-hooks';
import { Logger } from '@/logging/logger.service';
import { NodeTypes } from '@/node-types';
import { Push } from '@/push';
import { SecretsHelper } from '@/secrets-helpers';
import * as WebhookHelpers from '@/webhooks/webhook-helpers';
import { WebhookService } from '@/webhooks/webhook.service';
import * as AdditionalData from '@/workflow-execute-additional-data';
import { WorkflowService } from '@/workflows/workflow.service';

import { createOwner } from './shared/db/users';
import { createWorkflow } from './shared/db/workflows';
import * as testDb from './shared/test-db';
import * as utils from './shared/utils/';
import { mockInstance } from '../shared/mocking';

mockInstance(ActiveExecutions);
mockInstance(Logger);
mockInstance(Push);
mockInstance(SecretsHelper);
mockInstance(ExecutionService);
mockInstance(WorkflowService);

const webhookService = mockInstance(WebhookService);
const externalHooks = mockInstance(ExternalHooks);

let activeWorkflowManager: ActiveWorkflowManager;

let createActiveWorkflow: () => Promise<WorkflowEntity>;
let createInactiveWorkflow: () => Promise<WorkflowEntity>;

beforeAll(async () => {
	await testDb.init();

	activeWorkflowManager = Container.get(ActiveWorkflowManager);

	await utils.initNodeTypes();

	const owner = await createOwner();
	createActiveWorkflow = async () => await createWorkflow({ active: true }, owner);
	createInactiveWorkflow = async () => await createWorkflow({ active: false }, owner);
});

afterEach(async () => {
	await activeWorkflowManager.removeAll();
	await testDb.truncate(['Workflow', 'Webhook']);
	jest.clearAllMocks();
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
			.spyOn(activeWorkflowManager, 'checkIfWorkflowCanBeActivated')
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
			jest
				.spyOn(WebhookHelpers, 'getWorkflowWebhooks')
				.mockReturnValue([mock<IWebhookData>({ path: 'some-path' })]);

			await activeWorkflowManager.init();
			await activeWorkflowManager.remove(dbWorkflow.id);

			expect(webhookService.deleteWebhook).toHaveBeenCalledTimes(1);
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
	// it('should delegate to `WorkflowExecuteAdditionalData`', async () => {
	// 	const dbWorkflow = await createActiveWorkflow();
	// 	const [node] = dbWorkflow.nodes;

	// 	const executeSpy = jest.spyOn(AdditionalData, 'executeErrorWorkflow');

	// 	await activeWorkflowManager.init();

	// 	activeWorkflowManager.executeErrorWorkflow(
	// 		new NodeOperationError(node, 'Something went wrong'),
	// 		dbWorkflow,
	// 		'trigger',
	// 	);

	// 	expect(executeSpy).toHaveBeenCalledTimes(1);
	// });

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
		jest.spyOn(activeWorkflowManager, 'checkIfWorkflowCanBeActivated').mockReturnValue(true);
		webhookService.createWebhookIfNotExists.mockResolvedValue(undefined);

		await activeWorkflowManager.addWebhooks(workflow, additionalData, 'trigger', 'init');

		expect(webhookService.storeWebhook).toHaveBeenCalledTimes(1);
	});
});
