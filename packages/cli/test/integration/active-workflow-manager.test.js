'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_core_1 = require('n8n-core');
const FormTrigger_node_1 = require('n8n-nodes-base/nodes/Form/FormTrigger.node');
const ScheduleTrigger_node_1 = require('n8n-nodes-base/nodes/Schedule/ScheduleTrigger.node');
const n8n_workflow_1 = require('n8n-workflow');
const active_executions_1 = require('@/active-executions');
const active_workflow_manager_1 = require('@/active-workflow-manager');
const execution_service_1 = require('@/executions/execution.service');
const external_hooks_1 = require('@/external-hooks');
const node_types_1 = require('@/node-types');
const push_1 = require('@/push');
const WebhookHelpers = __importStar(require('@/webhooks/webhook-helpers'));
const webhook_service_1 = require('@/webhooks/webhook.service');
const AdditionalData = __importStar(require('@/workflow-execute-additional-data'));
const workflow_service_1 = require('@/workflows/workflow.service');
const users_1 = require('./shared/db/users');
const utils = __importStar(require('./shared/utils/'));
(0, backend_test_utils_1.mockInstance)(active_executions_1.ActiveExecutions);
(0, backend_test_utils_1.mockInstance)(push_1.Push);
(0, backend_test_utils_1.mockInstance)(n8n_core_1.ExternalSecretsProxy);
(0, backend_test_utils_1.mockInstance)(execution_service_1.ExecutionService);
(0, backend_test_utils_1.mockInstance)(workflow_service_1.WorkflowService);
const webhookService = (0, backend_test_utils_1.mockInstance)(webhook_service_1.WebhookService);
const externalHooks = (0, backend_test_utils_1.mockInstance)(external_hooks_1.ExternalHooks);
let activeWorkflowManager;
let createActiveWorkflow;
let createInactiveWorkflow;
beforeAll(async () => {
	await backend_test_utils_1.testDb.init();
	activeWorkflowManager = di_1.Container.get(active_workflow_manager_1.ActiveWorkflowManager);
	const nodes = {
		'n8n-nodes-base.scheduleTrigger': {
			type: new ScheduleTrigger_node_1.ScheduleTrigger(),
			sourcePath: '',
		},
		'n8n-nodes-base.formTrigger': {
			type: new FormTrigger_node_1.FormTrigger(),
			sourcePath: '',
		},
	};
	await utils.initNodeTypes(nodes);
	const owner = await (0, users_1.createOwner)();
	createActiveWorkflow = async () =>
		await (0, backend_test_utils_1.createWorkflow)({ active: true }, owner);
	createInactiveWorkflow = async () =>
		await (0, backend_test_utils_1.createWorkflow)({ active: false }, owner);
	di_1.Container.get(n8n_core_1.InstanceSettings).markAsLeader();
});
afterEach(async () => {
	await activeWorkflowManager.removeAll();
	await backend_test_utils_1.testDb.truncate(['WorkflowEntity', 'WebhookEntity']);
	jest.clearAllMocks();
});
afterAll(async () => {
	await backend_test_utils_1.testDb.terminate();
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
		expect(externalHooks.run).toHaveBeenCalledWith('activeWorkflows.initialized');
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
			async (mode) => {
				await activeWorkflowManager.init();
				const dbWorkflow = await createActiveWorkflow();
				const addWebhooksSpy = jest.spyOn(activeWorkflowManager, 'addWebhooks');
				const addTriggersAndPollersSpy = jest.spyOn(activeWorkflowManager, 'addTriggersAndPollers');
				await activeWorkflowManager.add(dbWorkflow.id, mode);
				const [argWorkflow] = addWebhooksSpy.mock.calls[0];
				const [_, _argWorkflow] = addTriggersAndPollersSpy.mock.calls[0];
				expect(addWebhooksSpy).toHaveBeenCalledTimes(1);
				expect(addTriggersAndPollersSpy).toHaveBeenCalledTimes(1);
				if (!(argWorkflow instanceof n8n_workflow_1.Workflow)) fail();
				if (!(_argWorkflow instanceof n8n_workflow_1.Workflow)) fail();
				expect(argWorkflow.id).toBe(dbWorkflow.id);
				expect(_argWorkflow.id).toBe(dbWorkflow.id);
			},
		);
	});
	test('should count workflow triggers correctly when node has multiple webhooks', async () => {
		const workflowRepositoryInstance = di_1.Container.get(db_1.WorkflowRepository);
		const updateWorkflowTriggerCountSpy = jest.spyOn(
			workflowRepositoryInstance,
			'updateWorkflowTriggerCount',
		);
		await activeWorkflowManager.init();
		const mockWebhooks = [
			(0, jest_mock_extended_1.mock)({
				node: 'Form Trigger',
				httpMethod: 'GET',
				path: '/webhook-path',
			}),
			(0, jest_mock_extended_1.mock)({
				node: 'Form Trigger',
				httpMethod: 'POST',
				path: '/webhook-path',
			}),
		];
		webhookService.getNodeWebhooks.mockReturnValue(mockWebhooks);
		webhookService.createWebhook.mockReturnValue(
			(0, jest_mock_extended_1.mock)({ webhookPath: '/webhook-path' }),
		);
		const dbWorkflow = await (0, backend_test_utils_1.createWorkflow)({
			nodes: [
				{
					id: 'uuid-1',
					parameters: { path: 'test-webhook-path', options: {} },
					name: 'Form Trigger',
					type: 'n8n-nodes-base.formTrigger',
					typeVersion: 1,
					position: [500, 300],
				},
			],
		});
		await activeWorkflowManager.add(dbWorkflow.id, 'activate');
		expect(updateWorkflowTriggerCountSpy).toHaveBeenCalledWith(dbWorkflow.id, 1);
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
				.mockReturnValue([(0, jest_mock_extended_1.mock)({ path: 'some-path' })]);
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
	it('should be called on failure to activate due to 401', async () => {
		const dbWorkflow = await createActiveWorkflow();
		const [node] = dbWorkflow.nodes;
		const executeSpy = jest.spyOn(activeWorkflowManager, 'executeErrorWorkflow');
		jest.spyOn(activeWorkflowManager, 'add').mockImplementation(() => {
			throw new n8n_workflow_1.NodeApiError(node, {
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
		const webhook = (0, jest_mock_extended_1.mock)({ path: 'some-path' });
		const webhookEntity = (0, jest_mock_extended_1.mock)({ webhookPath: 'some-path' });
		jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);
		webhookService.createWebhook.mockReturnValue(webhookEntity);
		const additionalData = await AdditionalData.getBase('some-user-id');
		const dbWorkflow = await createActiveWorkflow();
		const workflow = new n8n_workflow_1.Workflow({
			id: dbWorkflow.id,
			name: dbWorkflow.name,
			nodes: dbWorkflow.nodes,
			connections: dbWorkflow.connections,
			active: dbWorkflow.active,
			nodeTypes: di_1.Container.get(node_types_1.NodeTypes),
			staticData: dbWorkflow.staticData,
			settings: dbWorkflow.settings,
		});
		const [node] = dbWorkflow.nodes;
		jest.spyOn(n8n_workflow_1.Workflow.prototype, 'getNode').mockReturnValue(node);
		jest.spyOn(activeWorkflowManager, 'checkIfWorkflowCanBeActivated').mockReturnValue(true);
		webhookService.createWebhookIfNotExists.mockResolvedValue(undefined);
		await activeWorkflowManager.addWebhooks(workflow, additionalData, 'trigger', 'init');
		expect(webhookService.storeWebhook).toHaveBeenCalledTimes(1);
	});
});
//# sourceMappingURL=active-workflow-manager.test.js.map
