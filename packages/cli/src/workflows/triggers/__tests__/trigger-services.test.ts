/* eslint-disable @typescript-eslint/unbound-method */
import type { Logger } from '@n8n/backend-common';
import type { WorkflowsConfig } from '@n8n/config';
import type { WebhookEntity, WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { ActiveWorkflowTriggers, ErrorReporter } from 'n8n-core';
import type {
	INode,
	IWorkflowBase,
	IWebhookData,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { WebhookPathTakenError, Workflow, WorkflowExpression } from 'n8n-workflow';

import type { NodeTypes } from '@/node-types';
import type { WebhookService } from '@/webhooks/webhook.service';
import * as WebhookHelpers from '@/webhooks/webhook-helpers';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import type { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';
import { LiveTriggerRegistrar } from '@/workflows/triggers/live-trigger-registrar';
import { TriggerCountService } from '@/workflows/triggers/trigger-count.service';
import type { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';
import { WebhookTriggerRegistrar } from '@/workflows/triggers/webhook-trigger-registrar';
import { WorkflowTriggerActivator } from '@/workflows/triggers/workflow-trigger-activator';

describe('trigger lifecycle services', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const description = { properties: [] };

	function node(id: string, type: string, overrides: Partial<INode> = {}): INode {
		return {
			id,
			name: id,
			type,
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			...overrides,
		};
	}

	function createNodeTypes() {
		const nodeTypes = mock<NodeTypes>();
		nodeTypes.getByNameAndVersion.mockImplementation((type: string) => {
			if (type === 'trigger') {
				return { description: { ...description, name: 'trigger' }, trigger: jest.fn() } as never;
			}
			if (type === 'manual') {
				return {
					description: { ...description, name: 'manualTrigger' },
					trigger: jest.fn(),
				} as never;
			}
			if (type === 'execute-workflow') {
				return {
					description: { ...description, name: 'executeWorkflowTrigger' },
					trigger: jest.fn(),
				} as never;
			}
			if (type === 'poll') {
				return { description: { ...description, name: 'poll' }, poll: jest.fn() } as never;
			}
			if (type === 'webhook') {
				return { description: { ...description, name: 'webhook' }, webhook: jest.fn() } as never;
			}

			return { description: { ...description, name: type } } as never;
		});
		return nodeTypes;
	}

	function createWorkflow(nodes: INode[], nodeTypes = createNodeTypes()) {
		return new Workflow({
			id: 'wf-1',
			name: 'Test workflow',
			nodes,
			connections: {},
			active: true,
			nodeTypes,
			staticData: {},
			settings: {},
		});
	}

	beforeEach(() => {
		jest.clearAllMocks();
		jest.restoreAllMocks();
	});

	describe('WorkflowTriggerActivator', () => {
		test('returns enabled trigger, poll and webhook nodes, excluding regular and disabled nodes', () => {
			const activator = new WorkflowTriggerActivator(
				logger,
				mock<ErrorReporter>(),
				createNodeTypes(),
				mock<WorkflowRepository>(),
				mock<WorkflowStaticDataService>(),
				mock<WorkflowsConfig>(),
				mock<TriggerExecutionContextFactory>(),
				mock<WebhookTriggerRegistrar>(),
				mock<LiveTriggerRegistrar>(),
				mock<TriggerCountService>(),
			);

			const result = activator.getEnabledTriggerNodes({
				nodes: [
					node('t', 'trigger'),
					node('p', 'poll'),
					node('w', 'webhook'),
					node('regular', 'n8n-nodes-base.set'),
					node('disabled', 'trigger', { disabled: true }),
				],
				connections: {},
			});

			expect(result.map((n) => n.id).sort()).toEqual(['p', 't', 'w']);
			expect(activator.getEnabledTriggerNodes(null)).toEqual([]);
		});

		test('activates webhooks, live triggers, count, and persistence in order', async () => {
			const callOrder: string[] = [];
			jest
				.spyOn(WorkflowExpression.prototype, 'acquireIsolate')
				.mockImplementation(async () => {
					callOrder.push('acquire');
				});
			jest
				.spyOn(WorkflowExpression.prototype, 'releaseIsolate')
				.mockImplementation(async () => {
					callOrder.push('release');
				});
			jest
				.spyOn(WorkflowExecuteAdditionalData, 'getBase')
				.mockResolvedValue(mock<IWorkflowExecuteAdditionalData>());

			const workflowRepository = mock<WorkflowRepository>();
			workflowRepository.updateWorkflowTriggerCount.mockImplementation(async () => {
				callOrder.push('persist-count');
				return await Promise.resolve(mock());
			});
			const workflowStaticDataService = mock<WorkflowStaticDataService>();
			workflowStaticDataService.saveStaticData.mockImplementation(async () => {
				callOrder.push('save-static');
			});
			const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
			webhookTriggerRegistrar.register.mockImplementation(async () => {
				callOrder.push('webhooks');
				return true;
			});
			const liveTriggerRegistrar = mock<LiveTriggerRegistrar>();
			liveTriggerRegistrar.register.mockImplementation(async () => {
				callOrder.push('live');
				return true;
			});
			const triggerCountService = mock<TriggerCountService>();
			triggerCountService.count.mockImplementation(() => {
				callOrder.push('count');
				return 2;
			});

			const activator = new WorkflowTriggerActivator(
				logger,
				mock<ErrorReporter>(),
				createNodeTypes(),
				workflowRepository,
				workflowStaticDataService,
				mock<WorkflowsConfig>({ useWorkflowPublicationService: true }),
				mock<TriggerExecutionContextFactory>(),
				webhookTriggerRegistrar,
				liveTriggerRegistrar,
				triggerCountService,
			);

			await activator.activate(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
				{ nodes: [node('t', 'trigger')], connections: {} },
				new Set(['t']),
			);

			expect(callOrder).toEqual([
				'acquire',
				'webhooks',
				'live',
				'count',
				'release',
				'persist-count',
				'save-static',
			]);
			expect(workflowRepository.updateWorkflowTriggerCount).toHaveBeenCalledWith('wf-1', 2);
		});

		test('deactivates webhook rows before live triggers', async () => {
			jest
				.spyOn(WorkflowExecuteAdditionalData, 'getBase')
				.mockResolvedValue(mock<IWorkflowExecuteAdditionalData>());

			const callOrder: string[] = [];
			const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
			webhookTriggerRegistrar.deregister.mockImplementation(async () => {
				callOrder.push('deregister-webhooks');
				return ['Webhook'];
			});
			webhookTriggerRegistrar.clearWorkflowWebhooksForNodes.mockImplementation(async () => {
				callOrder.push('clear-webhook-rows');
			});
			const liveTriggerRegistrar = mock<LiveTriggerRegistrar>();
			liveTriggerRegistrar.deregister.mockImplementation(async () => {
				callOrder.push('deregister-live');
			});

			const activator = new WorkflowTriggerActivator(
				logger,
				mock<ErrorReporter>(),
				createNodeTypes(),
				mock<WorkflowRepository>(),
				mock<WorkflowStaticDataService>(),
				mock<WorkflowsConfig>(),
				mock<TriggerExecutionContextFactory>(),
				webhookTriggerRegistrar,
				liveTriggerRegistrar,
				mock<TriggerCountService>(),
			);

			await activator.deactivate(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
				{ nodes: [node('webhook-node', 'webhook', { name: 'Webhook' })], connections: {} },
				new Set(['webhook-node']),
			);

			expect(callOrder).toEqual(['deregister-webhooks', 'clear-webhook-rows', 'deregister-live']);
		});
	});

	describe('WebhookTriggerRegistrar', () => {
		test('normalizes webhook paths, stores dynamic metadata, and saves static data', async () => {
			const webhookService = mock<WebhookService>();
			const workflowStaticDataService = mock<WorkflowStaticDataService>();
			const registrar = new WebhookTriggerRegistrar(
				logger,
				mock<ErrorReporter>(),
				webhookService,
				workflowStaticDataService,
			);
			const webhookEntity = { webhookPath: '/team/:id/', node: 'Webhook' } as WebhookEntity;
			webhookService.createWebhook.mockReturnValue(webhookEntity);
			const webhookData = mock<IWebhookData>({
				node: 'Webhook',
				workflowId: 'wf-1',
				httpMethod: 'GET',
				path: '/team/:id/',
			});
			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhookData]);
			const workflow = createWorkflow([
				node('webhook-node', 'webhook', { name: 'Webhook', webhookId: 'hook-id' }),
			]);

			await registrar.register({
				workflow,
				additionalData: mock<IWorkflowExecuteAdditionalData>(),
				mode: 'trigger',
				activation: 'update',
				nodeIds: new Set(['webhook-node']),
			});

			expect(webhookService.storeWebhook).toHaveBeenCalledWith(
				expect.objectContaining({
					webhookPath: 'team/:id',
					webhookId: 'hook-id',
					pathLength: 2,
				}),
			);
			expect(webhookService.createWebhookIfNotExists).toHaveBeenCalledWith(
				workflow,
				webhookData,
				'trigger',
				'update',
			);
			expect(workflowStaticDataService.saveStaticData).toHaveBeenCalledWith(workflow);
		});

		test('filters registration and deregistration by node id', async () => {
			const webhookService = mock<WebhookService>();
			const workflowStaticDataService = mock<WorkflowStaticDataService>();
			const registrar = new WebhookTriggerRegistrar(
				logger,
				mock<ErrorReporter>(),
				webhookService,
				workflowStaticDataService,
			);
			webhookService.createWebhook.mockImplementation(
				(data) => ({ webhookPath: data.webhookPath, node: data.node }) as WebhookEntity,
			);
			const webhookA = mock<IWebhookData>({
				node: 'Webhook A',
				workflowId: 'wf-1',
				httpMethod: 'GET',
				path: 'a',
			});
			const webhookB = mock<IWebhookData>({
				node: 'Webhook B',
				workflowId: 'wf-1',
				httpMethod: 'POST',
				path: 'b',
			});
			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhookA, webhookB]);
			const workflow = createWorkflow([
				node('a', 'webhook', { name: 'Webhook A' }),
				node('b', 'webhook', { name: 'Webhook B' }),
			]);

			await registrar.register({
				workflow,
				additionalData: mock<IWorkflowExecuteAdditionalData>(),
				mode: 'trigger',
				activation: 'update',
				nodeIds: new Set(['b']),
			});
			const removed = await registrar.deregister(
				workflow,
				mock<IWorkflowExecuteAdditionalData>(),
				new Set(['b']),
			);

			expect(webhookService.storeWebhook).toHaveBeenCalledTimes(1);
			expect(webhookService.storeWebhook).toHaveBeenCalledWith(
				expect.objectContaining({ webhookPath: 'b', node: 'Webhook B' }),
			);
			expect(webhookService.deleteWebhook).toHaveBeenCalledTimes(1);
			expect(webhookService.deleteWebhook).toHaveBeenCalledWith(
				workflow,
				webhookB,
				'internal',
				'update',
			);
			expect(removed).toEqual(['Webhook B']);
		});

		test('translates update duplicate insert errors and tolerates init duplicates', async () => {
			const webhookService = mock<WebhookService>();
			const workflowStaticDataService = mock<WorkflowStaticDataService>();
			const registrar = new WebhookTriggerRegistrar(
				logger,
				mock<ErrorReporter>(),
				webhookService,
				workflowStaticDataService,
			);
			const webhookEntity = { webhookPath: 'taken', node: 'Webhook' } as WebhookEntity;
			webhookService.createWebhook.mockReturnValue(webhookEntity);
			const webhookData = mock<IWebhookData>({
				node: 'Webhook',
				workflowId: 'wf-1',
				httpMethod: 'GET',
				path: 'taken',
			});
			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhookData]);
			const workflow = createWorkflow([node('webhook-node', 'webhook', { name: 'Webhook' })]);
			const dbError = new Error('duplicate');
			dbError.name = 'QueryFailedError';

			webhookService.storeWebhook.mockRejectedValueOnce(dbError);
			await expect(
				registrar.register({
					workflow,
					additionalData: mock<IWorkflowExecuteAdditionalData>(),
					mode: 'trigger',
					activation: 'update',
					nodeIds: new Set(['webhook-node']),
				}),
			).rejects.toBeInstanceOf(WebhookPathTakenError);
			expect(webhookService.deleteWorkflowWebhooks).toHaveBeenCalledWith('wf-1');

			webhookService.storeWebhook.mockRejectedValueOnce(dbError);
			await expect(
				registrar.register({
					workflow,
					additionalData: mock<IWorkflowExecuteAdditionalData>(),
					mode: 'trigger',
					activation: 'init',
					nodeIds: new Set(['webhook-node']),
				}),
			).resolves.toBe(true);
			expect(webhookService.createWebhookIfNotExists).not.toHaveBeenCalled();
			expect(workflowStaticDataService.saveStaticData).toHaveBeenCalledWith(workflow);
		});
	});

	describe('LiveTriggerRegistrar', () => {
		test('registers only requested trigger and poll node ids', async () => {
			const activeWorkflowTriggers = mock<ActiveWorkflowTriggers>();
			const factory = mock<TriggerExecutionContextFactory>();
			const getTriggerFunctions = jest.fn();
			const getPollFunctions = jest.fn();
			factory.getExecuteTriggerFunctions.mockReturnValue(getTriggerFunctions);
			factory.getExecutePollFunctions.mockReturnValue(getPollFunctions);
			const registrar = new LiveTriggerRegistrar(logger, activeWorkflowTriggers, factory);
			const workflow = createWorkflow([node('trigger-a', 'trigger'), node('poll-a', 'poll')]);
			const additionalData = mock<IWorkflowExecuteAdditionalData>();

			await registrar.register(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow' }),
				workflow,
				{
					activationMode: 'update',
					executionMode: 'trigger',
					additionalData,
					resolveWorkflowData: async () => mock<IWorkflowBase>(),
					onTriggerFailure: jest.fn(),
				},
				new Set(['poll-a']),
			);

			expect(activeWorkflowTriggers.addTriggers).toHaveBeenCalledWith(
				'wf-1',
				workflow,
				['poll-a'],
				additionalData,
				'trigger',
				'update',
				getTriggerFunctions,
				getPollFunctions,
			);
		});

		test('returns false when no requested live triggers match and propagates activation errors', async () => {
			const activeWorkflowTriggers = mock<ActiveWorkflowTriggers>();
			const factory = mock<TriggerExecutionContextFactory>();
			factory.getExecuteTriggerFunctions.mockReturnValue(jest.fn());
			factory.getExecutePollFunctions.mockReturnValue(jest.fn());
			const registrar = new LiveTriggerRegistrar(logger, activeWorkflowTriggers, factory);
			const workflow = createWorkflow([node('trigger-a', 'trigger')]);
			const context = {
				activationMode: 'update' as const,
				executionMode: 'trigger' as const,
				additionalData: mock<IWorkflowExecuteAdditionalData>(),
				resolveWorkflowData: async () => mock<IWorkflowBase>(),
				onTriggerFailure: jest.fn(),
			};

			await expect(
				registrar.register(
					mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow' }),
					workflow,
					context,
					new Set(['missing']),
				),
			).resolves.toBe(false);
			expect(activeWorkflowTriggers.addTriggers).not.toHaveBeenCalled();
			expect(factory.getExecuteTriggerFunctions).not.toHaveBeenCalled();
			expect(factory.getExecutePollFunctions).not.toHaveBeenCalled();

			jest.clearAllMocks();
			activeWorkflowTriggers.addTriggers.mockRejectedValue(new Error('activation failed'));
			await expect(
				registrar.register(
					mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow' }),
					workflow,
					context,
					new Set(['trigger-a']),
				),
			).rejects.toThrow('activation failed');
		});
	});

	describe('TriggerCountService', () => {
		test('counts triggers, pollers, and unique webhook nodes while excluding internal triggers', () => {
			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([
				mock<IWebhookData>({ node: 'Webhook A' }),
				mock<IWebhookData>({ node: 'Webhook A' }),
				mock<IWebhookData>({ node: 'Webhook B' }),
			]);
			const workflow = createWorkflow([
				node('trigger', 'trigger'),
				node('manual', 'manual'),
				node('execute', 'execute-workflow'),
				node('poll', 'poll'),
				node('regular', 'regular'),
			]);
			const service = new TriggerCountService();

			expect(service.count(workflow, mock<IWorkflowExecuteAdditionalData>())).toBe(4);
		});
	});
});
