/* eslint-disable @typescript-eslint/unbound-method */
import type { WorkflowsConfig } from '@n8n/config';
import type { IWorkflowDb, WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { ErrorReporter, Span, Tracing } from 'n8n-core';
import type { IWebhookData, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { WebhookPathTakenError, WorkflowActivationError, WorkflowExpression } from 'n8n-workflow';
import { mock, type MockProxy } from 'vitest-mock-extended';

import type { ActivationErrorsService } from '@/activation-errors.service';
import { TRIGGER_ACTIVATION_MAX_ATTEMPTS } from '@/constants';
import type { EventService } from '@/events/event.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import type {
	NonWebhookTriggerRegistrar,
	PreparedNonWebhookTriggerRegistration,
} from '@/workflows/triggers/non-webhook-trigger-registrar';
import type { TriggerCountService } from '@/workflows/triggers/trigger-count.service';
import type { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';
import type { WebhookTriggerRegistrar } from '@/workflows/triggers/webhook-trigger-registrar';
import { WorkflowTriggerActivator } from '@/workflows/triggers/workflow-trigger-activator';
import type { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

import { createNodeTypes, logger, node } from './trigger-test-utils';

vi.mock('n8n-workflow', async () => ({
	...(await vi.importActual<typeof import('n8n-workflow')>('n8n-workflow')),
	sleep: vi.fn(),
}));

const MAX_ATTEMPTS = TRIGGER_ACTIVATION_MAX_ATTEMPTS;

const flushPromises = async () => await new Promise((resolve) => setImmediate(resolve));

const tracing = mock<Tracing>();
const eventService = mock<EventService>();

type ActivatorOverrides = {
	errorReporter?: ErrorReporter;
	nodeTypes?: ReturnType<typeof createNodeTypes>;
	workflowRepository?: WorkflowRepository;
	workflowStaticDataService?: WorkflowStaticDataService;
	workflowsConfig?: WorkflowsConfig;
	triggerExecutionContextFactory?: TriggerExecutionContextFactory;
	webhookTriggerRegistrar?: WebhookTriggerRegistrar;
	nonWebhookTriggerRegistrar?: NonWebhookTriggerRegistrar;
	triggerCountService?: TriggerCountService;
	activationErrorsService?: ActivationErrorsService;
	tracing?: Tracing;
	eventService?: EventService;
};

function buildActivator(overrides: ActivatorOverrides = {}) {
	return new WorkflowTriggerActivator(
		logger,
		overrides.errorReporter ?? mock<ErrorReporter>(),
		overrides.nodeTypes ?? createNodeTypes(),
		overrides.workflowRepository ?? mock<WorkflowRepository>(),
		overrides.workflowStaticDataService ?? mock<WorkflowStaticDataService>(),
		overrides.workflowsConfig ?? mock<WorkflowsConfig>({ useWorkflowPublicationService: true }),
		overrides.triggerExecutionContextFactory ?? mock<TriggerExecutionContextFactory>(),
		overrides.webhookTriggerRegistrar ?? mock<WebhookTriggerRegistrar>(),
		overrides.nonWebhookTriggerRegistrar ?? mock<NonWebhookTriggerRegistrar>(),
		overrides.triggerCountService ?? mock<TriggerCountService>(),
		overrides.activationErrorsService ?? mock<ActivationErrorsService>(),
		overrides.tracing ?? tracing,
		overrides.eventService ?? eventService,
	);
}

describe('WorkflowTriggerActivator', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
		tracing.startSpan.mockImplementation(async (_opts, spanCb) => await spanCb(mock<Span>()));
	});

	test('requires workflow publication service to be enabled', () => {
		expect(() =>
			buildActivator({
				workflowsConfig: mock<WorkflowsConfig>({ useWorkflowPublicationService: false }),
			}),
		).toThrow('WorkflowTriggerActivator requires workflow publication service to be enabled');
	});

	test('returns enabled trigger, poll and webhook nodes, excluding regular and disabled nodes', () => {
		const activator = buildActivator();

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

	describe('getUnregisteredNonWebhookTriggerNodeIds', () => {
		test('returns desired non-webhook triggers not registered in memory', () => {
			const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
			nonWebhookTriggerRegistrar.getRegisteredTriggerNodeIds.mockReturnValue(new Set(['t']));
			const activator = buildActivator({ nonWebhookTriggerRegistrar });

			const result = activator.getUnregisteredNonWebhookTriggerNodeIds('wf-1', [
				node('t', 'trigger'),
				node('p', 'poll'),
			]);

			expect(result).toEqual(new Set(['p']));
			expect(nonWebhookTriggerRegistrar.getRegisteredTriggerNodeIds).toHaveBeenCalledWith('wf-1');
		});

		test('excludes webhook nodes since they are not tracked in memory', () => {
			const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
			nonWebhookTriggerRegistrar.getRegisteredTriggerNodeIds.mockReturnValue(new Set());
			const activator = buildActivator({ nonWebhookTriggerRegistrar });

			const result = activator.getUnregisteredNonWebhookTriggerNodeIds('wf-1', [
				node('t', 'trigger'),
				node('w', 'webhook'),
			]);

			expect(result).toEqual(new Set(['t']));
		});

		test('returns empty when all desired non-webhook triggers are registered', () => {
			const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
			nonWebhookTriggerRegistrar.getRegisteredTriggerNodeIds.mockReturnValue(new Set(['t', 'p']));
			const activator = buildActivator({ nonWebhookTriggerRegistrar });

			const result = activator.getUnregisteredNonWebhookTriggerNodeIds('wf-1', [
				node('t', 'trigger'),
				node('p', 'poll'),
			]);

			expect(result).toEqual(new Set());
		});
	});

	describe('getNodesWithUnregisteredWebhooks', () => {
		test("delegates to the registrar with the version's enabled trigger node ids", async () => {
			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(additionalData);
			const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
			webhookTriggerRegistrar.getNodesWithUnregisteredWebhooks.mockResolvedValue(new Set(['w']));
			const activator = buildActivator({ webhookTriggerRegistrar });

			const result = await activator.getNodesWithUnregisteredWebhooks(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
				{
					nodes: [node('w', 'webhook'), node('regular', 'n8n-nodes-base.set')],
					connections: {},
				},
			);

			expect(result).toEqual(new Set(['w']));
			expect(webhookTriggerRegistrar.getNodesWithUnregisteredWebhooks).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'wf-1' }),
				additionalData,
				new Set(['w']),
			);
		});

		test('returns empty without calling the registrar when there are no trigger nodes', async () => {
			const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
			const activator = buildActivator({ webhookTriggerRegistrar });

			const result = await activator.getNodesWithUnregisteredWebhooks(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
				{ nodes: [node('regular', 'n8n-nodes-base.set')], connections: {} },
			);

			expect(result).toEqual(new Set());
			expect(webhookTriggerRegistrar.getNodesWithUnregisteredWebhooks).not.toHaveBeenCalled();
		});
	});

	test('activates webhook and non-webhook triggers concurrently, then counts and persists', async () => {
		const callOrder: string[] = [];
		vi.spyOn(WorkflowExpression.prototype, 'acquireIsolate').mockImplementation(async () => {
			callOrder.push('acquire');
			return true;
		});
		vi.spyOn(WorkflowExpression.prototype, 'releaseIsolate').mockImplementation(async () => {
			callOrder.push('release');
		});
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
			mock<IWorkflowExecuteAdditionalData>(),
		);

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
		const webhookData = mock<IWebhookData>({ node: 'Webhook' });
		webhookTriggerRegistrar.getWebhookTriggers.mockReturnValue([webhookData]);
		webhookTriggerRegistrar.register.mockImplementation(async () => {
			callOrder.push('webhooks');
		});
		const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
		const nonWebhookRegistration = mock<PreparedNonWebhookTriggerRegistration>();
		nonWebhookTriggerRegistrar.createRegistrationContext.mockReturnValue(nonWebhookRegistration);
		nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue(['t', 'p']);
		nonWebhookTriggerRegistrar.register.mockImplementation(
			async (_workflow, _registration, nodeId) => {
				callOrder.push(`non-webhook:${nodeId}`);
			},
		);
		const triggerCountService = mock<TriggerCountService>();
		triggerCountService.count.mockImplementation(() => {
			callOrder.push('count');
			return 2;
		});

		const activator = buildActivator({
			workflowRepository,
			workflowStaticDataService,
			webhookTriggerRegistrar,
			nonWebhookTriggerRegistrar,
			triggerCountService,
		});

		await activator.activate(
			mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
			{
				nodes: [
					node('t', 'trigger'),
					node('p', 'poll'),
					node('webhook-node', 'webhook', { name: 'Webhook' }),
				],
				connections: {},
			},
			new Set(['t', 'p', 'webhook-node']),
		);

		// Both phases overlap inside one isolate bracket, so their relative order is
		// not asserted — only that every registration is bracketed by acquire and
		// precedes the count, which itself precedes release and persistence.
		const indexOf = (entry: string) => callOrder.indexOf(entry);
		expect(callOrder[0]).toBe('acquire');
		for (const entry of ['webhooks', 'non-webhook:t', 'non-webhook:p']) {
			expect(indexOf(entry)).toBeGreaterThan(indexOf('acquire'));
			expect(indexOf(entry)).toBeLessThan(indexOf('count'));
		}
		expect(indexOf('count')).toBeLessThan(indexOf('release'));
		expect(callOrder.slice(indexOf('release') + 1).sort()).toEqual([
			'persist-count',
			'save-static',
		]);
		expect(workflowRepository.updateWorkflowTriggerCount).toHaveBeenCalledWith('wf-1', 2);
	});

	test('keeps the activation isolate until both concurrent phases settle after a phase error', async () => {
		const callOrder: string[] = [];
		vi.spyOn(WorkflowExpression.prototype, 'acquireIsolate').mockImplementation(async () => {
			callOrder.push('acquire');
			return true;
		});
		vi.spyOn(WorkflowExpression.prototype, 'releaseIsolate').mockImplementation(async () => {
			callOrder.push('release');
		});
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
			mock<IWorkflowExecuteAdditionalData>(),
		);

		const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
		webhookTriggerRegistrar.getWebhookTriggers.mockImplementation(() => {
			callOrder.push('webhook-discovery-fail');
			throw new Error('webhook discovery failed');
		});

		const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
		nonWebhookTriggerRegistrar.createRegistrationContext.mockReturnValue(
			mock<PreparedNonWebhookTriggerRegistration>(),
		);
		nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue(['trigger-node']);
		nonWebhookTriggerRegistrar.register.mockImplementation(async () => {
			callOrder.push('non-webhook-start');
			await flushPromises();
			callOrder.push('non-webhook-finish');
		});

		const activator = buildActivator({ webhookTriggerRegistrar, nonWebhookTriggerRegistrar });

		await expect(
			activator.activate(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
				{
					nodes: [
						node('webhook-node', 'webhook', { name: 'Webhook' }),
						node('trigger-node', 'trigger'),
					],
					connections: {},
				},
				new Set(['webhook-node', 'trigger-node']),
			),
		).rejects.toThrow('webhook discovery failed');

		expect(callOrder).toContain('non-webhook-finish');
		expect(callOrder.indexOf('non-webhook-finish')).toBeLessThan(callOrder.indexOf('release'));
	});

	test('deactivates webhook and non-webhook triggers concurrently and waits for all deregistrations', async () => {
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
			mock<IWorkflowExecuteAdditionalData>(),
		);

		const callOrder: string[] = [];
		const deregisterA = createDeferredPromise();
		const deregisterB = createDeferredPromise();
		const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
		const webhookData = mock<IWebhookData>({ node: 'Webhook' });
		webhookTriggerRegistrar.getWebhookTriggers.mockReturnValue([webhookData]);
		webhookTriggerRegistrar.deregister.mockImplementation(async () => {
			callOrder.push('deregister-webhooks');
			return 'Webhook';
		});
		webhookTriggerRegistrar.clearWorkflowWebhooksForNodes.mockImplementation(async () => {
			callOrder.push('clear-webhook-rows');
		});
		const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
		nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue(['trigger-a', 'trigger-b']);
		nonWebhookTriggerRegistrar.deregister.mockImplementation(async (_workflowId, nodeId) => {
			callOrder.push(`deregister-non-webhook:${nodeId}`);
			await (nodeId === 'trigger-a' ? deregisterA.promise : deregisterB.promise);
		});

		const activator = buildActivator({ webhookTriggerRegistrar, nonWebhookTriggerRegistrar });

		let deactivateSettled = false;
		const deactivatePromise = activator
			.deactivate(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
				{
					nodes: [
						node('webhook-node', 'webhook', { name: 'Webhook' }),
						node('trigger-a', 'trigger'),
						node('trigger-b', 'trigger'),
					],
					connections: {},
				},
				new Set(['webhook-node', 'trigger-a', 'trigger-b']),
			)
			.then(() => {
				deactivateSettled = true;
			});

		await flushPromises();

		expect(callOrder).toEqual(
			expect.arrayContaining([
				'deregister-webhooks',
				'clear-webhook-rows',
				'deregister-non-webhook:trigger-a',
			]),
		);
		expect(callOrder.indexOf('deregister-webhooks')).toBeLessThan(
			callOrder.indexOf('clear-webhook-rows'),
		);
		expect(deactivateSettled).toBe(false);

		deregisterA.resolve(undefined);
		await flushPromises();

		expect(callOrder).toContain('deregister-non-webhook:trigger-b');
		expect(deactivateSettled).toBe(false);

		deregisterB.resolve(undefined);
		await deactivatePromise;

		expect(deactivateSettled).toBe(true);
		expect(nonWebhookTriggerRegistrar.deregister).toHaveBeenCalledTimes(2);
		expect(nonWebhookTriggerRegistrar.deregister).toHaveBeenCalledWith('wf-1', 'trigger-a');
		expect(nonWebhookTriggerRegistrar.deregister).toHaveBeenCalledWith('wf-1', 'trigger-b');
	});

	test('waits for both concurrent deactivation phases before surfacing a phase error', async () => {
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
			mock<IWorkflowExecuteAdditionalData>(),
		);

		const callOrder: string[] = [];
		const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
		webhookTriggerRegistrar.getWebhookTriggers.mockImplementation(() => {
			callOrder.push('webhook-discovery-fail');
			throw new Error('webhook discovery failed');
		});

		const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
		nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue(['trigger-node']);
		nonWebhookTriggerRegistrar.deregister.mockImplementation(async () => {
			callOrder.push('deregister-non-webhook-start');
			await flushPromises();
			callOrder.push('deregister-non-webhook-finish');
		});

		const activator = buildActivator({ webhookTriggerRegistrar, nonWebhookTriggerRegistrar });

		await expect(
			activator.deactivate(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
				{
					nodes: [
						node('webhook-node', 'webhook', { name: 'Webhook' }),
						node('trigger-node', 'trigger'),
					],
					connections: {},
				},
				new Set(['webhook-node', 'trigger-node']),
			),
		).rejects.toThrow('webhook discovery failed');

		expect(callOrder).toContain('deregister-non-webhook-finish');
	});

	test('isolates failures across the concurrent webhook and non-webhook phases', async () => {
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
			mock<IWorkflowExecuteAdditionalData>(),
		);

		const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
		const webhookOk = mock<IWebhookData>({ node: 'Webhook OK' });
		const webhookBad = mock<IWebhookData>({ node: 'Webhook Bad' });
		webhookTriggerRegistrar.getWebhookTriggers.mockReturnValue([webhookOk, webhookBad]);
		webhookTriggerRegistrar.register.mockImplementation(async ({ webhookData }) => {
			if (webhookData === webhookBad) throw new WebhookPathTakenError('Webhook Bad');
		});

		const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
		nonWebhookTriggerRegistrar.createRegistrationContext.mockReturnValue(
			mock<PreparedNonWebhookTriggerRegistration>(),
		);
		nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue(['t', 'p']);
		nonWebhookTriggerRegistrar.register.mockImplementation(async (_workflow, _registration, id) => {
			if (id === 'p') throw new Error('poll failed');
		});

		const activator = buildActivator({ webhookTriggerRegistrar, nonWebhookTriggerRegistrar });

		const outcome = await activator.activate(
			mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
			{
				nodes: [
					node('webhook-ok', 'webhook', { name: 'Webhook OK' }),
					node('webhook-bad', 'webhook', { name: 'Webhook Bad' }),
					node('t', 'trigger'),
					node('p', 'poll'),
				],
				connections: {},
			},
			new Set(['webhook-ok', 'webhook-bad', 't', 'p']),
		);

		// Both registrars ran; each phase surfaced its own failure while keeping the
		// other phase's surviving node activated.
		expect(webhookTriggerRegistrar.register).toHaveBeenCalled();
		expect(nonWebhookTriggerRegistrar.register).toHaveBeenCalled();
		expect(outcome.activated.sort()).toEqual(['t', 'webhook-ok']);
		expect(outcome.failures.map((failure) => failure.nodeId).sort()).toEqual(['p', 'webhook-bad']);
	});

	test('isolates a webhook node that exhausts its retry budget, leaving other webhook nodes running', async () => {
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
			mock<IWorkflowExecuteAdditionalData>(),
		);

		const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
		const webhookA = mock<IWebhookData>({ node: 'Webhook A' });
		const webhookB = mock<IWebhookData>({ node: 'Webhook B' });
		webhookTriggerRegistrar.getWebhookTriggers.mockReturnValue([webhookA, webhookB]);
		// Webhook A registers once; Webhook B fails transiently on every attempt.
		webhookTriggerRegistrar.register.mockImplementation(async ({ webhookData }) => {
			if (webhookData.node === 'Webhook B') throw new Error('registration failed');
		});
		const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
		nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue([]);

		const activator = buildActivator({ webhookTriggerRegistrar, nonWebhookTriggerRegistrar });

		const outcome = await activator.activate(
			mock<WorkflowEntity>({
				id: 'wf-1',
				name: 'Test workflow',
				staticData: {},
				settings: {},
			}),
			{
				nodes: [
					node('webhook-a', 'webhook', { name: 'Webhook A' }),
					node('webhook-b', 'webhook', { name: 'Webhook B' }),
				],
				connections: {},
			},
			new Set(['webhook-a', 'webhook-b']),
		);

		// Parallel fan-out: assert by membership, not order.
		expect(outcome.activated).toEqual(['webhook-a']);
		expect(outcome.failures).toHaveLength(1);
		expect(outcome.failures).toContainEqual({
			nodeId: 'webhook-b',
			nodeName: 'Webhook B',
			error: expect.objectContaining({ message: 'registration failed' }),
		});
		// Webhook B is retried up to its budget (1 success for A + MAX_ATTEMPTS for B).
		expect(webhookTriggerRegistrar.register).toHaveBeenCalledTimes(1 + MAX_ATTEMPTS);
		// The surviving node's webhook is never torn down by the failing node.
		expect(webhookTriggerRegistrar.deregister).not.toHaveBeenCalled();
		expect(webhookTriggerRegistrar.clearWorkflowWebhooksForNodes).not.toHaveBeenCalled();
	});

	test('activates a webhook node that recovers within its retry budget', async () => {
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
			mock<IWorkflowExecuteAdditionalData>(),
		);

		const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
		const webhook = mock<IWebhookData>({ node: 'Webhook A' });
		webhookTriggerRegistrar.getWebhookTriggers.mockReturnValue([webhook]);
		// Fails twice transiently, then succeeds within the attempt budget.
		webhookTriggerRegistrar.register
			.mockRejectedValueOnce(new Error('registration failed'))
			.mockRejectedValueOnce(new Error('registration failed'))
			.mockResolvedValueOnce(undefined);
		const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
		nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue([]);

		const activator = buildActivator({ webhookTriggerRegistrar, nonWebhookTriggerRegistrar });

		const outcome = await activator.activate(
			mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
			{ nodes: [node('webhook-a', 'webhook', { name: 'Webhook A' })], connections: {} },
			new Set(['webhook-a']),
		);

		expect(outcome).toEqual({ activated: ['webhook-a'], failures: [] });
		// Two transient failures then success within the budget.
		expect(webhookTriggerRegistrar.register).toHaveBeenCalledTimes(3);
	});

	test('records a deterministic webhook conflict as a failure without retry, keeping survivors', async () => {
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
			mock<IWorkflowExecuteAdditionalData>(),
		);

		const workflowRepository = mock<WorkflowRepository>();
		const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
		const webhookA = mock<IWebhookData>({ node: 'Webhook A' });
		const webhookB = mock<IWebhookData>({ node: 'Webhook B' });
		const conflict = new WebhookPathTakenError('Webhook B');
		webhookTriggerRegistrar.getWebhookTriggers.mockReturnValue([webhookA, webhookB]);
		webhookTriggerRegistrar.register.mockImplementation(async ({ webhookData }) => {
			if (webhookData.node === 'Webhook B') throw conflict;
		});
		const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
		nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue([]);

		const activator = buildActivator({
			workflowRepository,
			webhookTriggerRegistrar,
			nonWebhookTriggerRegistrar,
		});

		const outcome = await activator.activate(
			mock<WorkflowEntity>({
				id: 'wf-1',
				name: 'Test workflow',
				staticData: {},
				settings: {},
			}),
			{
				nodes: [
					node('webhook-a', 'webhook', { name: 'Webhook A' }),
					node('webhook-b', 'webhook', { name: 'Webhook B' }),
				],
				connections: {},
			},
			new Set(['webhook-a', 'webhook-b']),
		);

		// Parallel fan-out: assert by membership, not order.
		expect(outcome.activated).toEqual(['webhook-a']);
		expect(outcome.failures).toHaveLength(1);
		expect(outcome.failures).toContainEqual({
			nodeId: 'webhook-b',
			nodeName: 'Webhook B',
			error: conflict,
		});
		// A deterministic conflict is recorded without retry (one call per node).
		expect(webhookTriggerRegistrar.register).toHaveBeenCalledTimes(2);
		// The surviving node's webhook is never torn down by the conflicting node.
		expect(webhookTriggerRegistrar.deregister).not.toHaveBeenCalled();
		expect(webhookTriggerRegistrar.clearWorkflowWebhooksForNodes).not.toHaveBeenCalled();
		expect(workflowRepository.updateWorkflowTriggerCount).toHaveBeenCalled();
	});

	test('records a node failure when one of its webhooks exhausts its retries, leaving the rest', async () => {
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
			mock<IWorkflowExecuteAdditionalData>(),
		);

		const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
		const firstWebhook = mock<IWebhookData>({ node: 'Webhook' });
		const secondWebhook = mock<IWebhookData>({ node: 'Webhook' });
		webhookTriggerRegistrar.getWebhookTriggers.mockReturnValue([firstWebhook, secondWebhook]);
		// The node's first webhook registers; the second fails on every attempt.
		webhookTriggerRegistrar.register
			.mockResolvedValueOnce(undefined)
			.mockRejectedValue(new Error('second webhook failed'));
		const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
		nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue([]);

		const activator = buildActivator({ webhookTriggerRegistrar, nonWebhookTriggerRegistrar });

		const outcome = await activator.activate(
			mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
			{ nodes: [node('webhook-node', 'webhook', { name: 'Webhook' })], connections: {} },
			new Set(['webhook-node']),
		);

		expect(outcome.activated).toEqual([]);
		expect(outcome.failures).toEqual([
			{
				nodeId: 'webhook-node',
				nodeName: 'Webhook',
				error: expect.objectContaining({ message: 'second webhook failed' }),
			},
		]);
		// The first (already-registered) webhook of the node is left in place; no cleanup.
		expect(webhookTriggerRegistrar.deregister).not.toHaveBeenCalled();
		expect(webhookTriggerRegistrar.clearWorkflowWebhooksForNodes).not.toHaveBeenCalled();
	});

	test('isolates a failing non-webhook trigger, leaving the others running', async () => {
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
			mock<IWorkflowExecuteAdditionalData>(),
		);

		const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
		webhookTriggerRegistrar.getWebhookTriggers.mockReturnValue([]);
		const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
		nonWebhookTriggerRegistrar.createRegistrationContext.mockReturnValue(
			mock<PreparedNonWebhookTriggerRegistration>(),
		);
		nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue(['t', 'p']);
		nonWebhookTriggerRegistrar.register.mockImplementation(async (_workflow, _registration, id) => {
			if (id === 'p') throw new Error('poll failed');
		});

		const activator = buildActivator({ webhookTriggerRegistrar, nonWebhookTriggerRegistrar });

		const outcome = await activator.activate(
			mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
			{ nodes: [node('t', 'trigger'), node('p', 'poll')], connections: {} },
			new Set(['t', 'p']),
		);

		expect(outcome.activated).toEqual(expect.arrayContaining(['t']));
		expect(outcome.activated).toHaveLength(1);
		expect(outcome.failures).toEqual(
			expect.arrayContaining([
				{
					nodeId: 'p',
					nodeName: 'p',
					error: expect.objectContaining({ message: 'poll failed' }),
				},
			]),
		);
		expect(outcome.failures).toHaveLength(1);
		// 't' registers once; 'p' is retried up to its budget before being recorded as failed.
		expect(nonWebhookTriggerRegistrar.register).toHaveBeenCalledTimes(1 + MAX_ATTEMPTS);
	});

	test('activates a non-webhook trigger that recovers within its retry budget', async () => {
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
			mock<IWorkflowExecuteAdditionalData>(),
		);

		const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
		webhookTriggerRegistrar.getWebhookTriggers.mockReturnValue([]);
		const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
		nonWebhookTriggerRegistrar.createRegistrationContext.mockReturnValue(
			mock<PreparedNonWebhookTriggerRegistration>(),
		);
		nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue(['p']);
		// Fails once transiently, then succeeds within the attempt budget.
		nonWebhookTriggerRegistrar.register
			.mockRejectedValueOnce(new Error('poll failed'))
			.mockResolvedValueOnce(undefined);

		const activator = buildActivator({ webhookTriggerRegistrar, nonWebhookTriggerRegistrar });

		const outcome = await activator.activate(
			mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
			{ nodes: [node('p', 'poll')], connections: {} },
			new Set(['p']),
		);

		expect(outcome).toEqual({ activated: ['p'], failures: [] });
		expect(nonWebhookTriggerRegistrar.register).toHaveBeenCalledTimes(2);
	});

	describe('runtime trigger failure recovery', () => {
		/**
		 * Activates a single active trigger node and returns the `onTriggerFailure`
		 * handler the activator wired into the registration, so a runtime failure
		 * can be simulated by invoking it directly.
		 */
		async function activateAndCaptureFailureHandler(deps: {
			nonWebhookTriggerRegistrar: MockProxy<NonWebhookTriggerRegistrar>;
			triggerExecutionContextFactory?: TriggerExecutionContextFactory;
			activationErrorsService?: ActivationErrorsService;
			errorReporter?: ErrorReporter;
			workflowStaticDataService?: WorkflowStaticDataService;
		}) {
			vi.spyOn(WorkflowExpression.prototype, 'acquireIsolate').mockResolvedValue(true);
			vi.spyOn(WorkflowExpression.prototype, 'releaseIsolate').mockResolvedValue(undefined);
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
				mock<IWorkflowExecuteAdditionalData>(),
			);

			const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
			webhookTriggerRegistrar.getWebhookTriggers.mockReturnValue([]);

			deps.nonWebhookTriggerRegistrar.createRegistrationContext.mockReturnValue(
				mock<PreparedNonWebhookTriggerRegistration>(),
			);
			deps.nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue(['t']);

			const activator = buildActivator({ webhookTriggerRegistrar, ...deps });

			await activator.activate(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
				{ nodes: [node('t', 'trigger')], connections: {} },
				new Set(['t']),
			);

			const context = deps.nonWebhookTriggerRegistrar.createRegistrationContext.mock.calls[0][1];
			return context.onTriggerFailure;
		}

		const failure = {
			error: new Error('trigger crashed'),
			node: node('t', 'trigger'),
			workflowData: mock<IWorkflowDb>({ id: 'wf-1', name: 'Test workflow' }),
			mode: 'trigger' as const,
			activation: 'update' as const,
		};

		test('tears the node down, surfaces the error, runs the error workflow, then reactivates and clears the error', async () => {
			const callOrder: string[] = [];
			const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
			nonWebhookTriggerRegistrar.deregister.mockImplementation(async () => {
				callOrder.push('teardown');
			});
			nonWebhookTriggerRegistrar.register.mockImplementation(async () => {
				callOrder.push('reactivate');
			});
			const triggerExecutionContextFactory = mock<TriggerExecutionContextFactory>();
			triggerExecutionContextFactory.executeErrorWorkflow.mockImplementation(() => {
				callOrder.push('error-workflow');
			});
			const activationErrorsService = mock<ActivationErrorsService>();
			activationErrorsService.register.mockImplementation(async () => {
				callOrder.push('register-error');
			});
			activationErrorsService.deregister.mockImplementation(async () => {
				callOrder.push('clear-error');
			});
			const workflowStaticDataService = mock<WorkflowStaticDataService>();
			workflowStaticDataService.saveStaticData.mockImplementation(async () => {
				callOrder.push('save-static');
			});

			const onTriggerFailure = await activateAndCaptureFailureHandler({
				nonWebhookTriggerRegistrar,
				triggerExecutionContextFactory,
				activationErrorsService,
				workflowStaticDataService,
			});
			// Drop the bookkeeping from the initial activation; only track the recovery.
			callOrder.length = 0;
			workflowStaticDataService.saveStaticData.mockClear();

			onTriggerFailure(failure);
			await flushPromises();

			expect(callOrder).toEqual([
				'teardown',
				'register-error',
				'error-workflow',
				'reactivate',
				'save-static',
				'clear-error',
			]);
			expect(nonWebhookTriggerRegistrar.deregister).toHaveBeenCalledWith('wf-1', 't');
			expect(workflowStaticDataService.saveStaticData).toHaveBeenCalledTimes(1);
			expect(activationErrorsService.register).toHaveBeenCalledWith('wf-1', 'trigger crashed');
			expect(activationErrorsService.deregister).toHaveBeenCalledWith('wf-1');
		});

		test('runs the error workflow with a workflow activation error wrapping the cause', async () => {
			const triggerExecutionContextFactory = mock<TriggerExecutionContextFactory>();

			const onTriggerFailure = await activateAndCaptureFailureHandler({
				nonWebhookTriggerRegistrar: mock<NonWebhookTriggerRegistrar>(),
				triggerExecutionContextFactory,
			});

			onTriggerFailure(failure);
			await flushPromises();

			expect(triggerExecutionContextFactory.executeErrorWorkflow).toHaveBeenCalledTimes(1);
			const [passedError, passedWorkflowData, passedMode] =
				triggerExecutionContextFactory.executeErrorWorkflow.mock.calls[0];
			expect(passedError).toBeInstanceOf(WorkflowActivationError);
			expect((passedError as WorkflowActivationError).node).toBe(failure.node);
			expect(passedError.message).toContain('"t"');
			expect(passedWorkflowData).toBe(failure.workflowData);
			expect(passedMode).toBe('trigger');
		});

		test('leaves the surfaced error in place when reactivation exhausts its retry budget', async () => {
			const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
			const errorReporter = mock<ErrorReporter>();
			const activationErrorsService = mock<ActivationErrorsService>();

			const onTriggerFailure = await activateAndCaptureFailureHandler({
				nonWebhookTriggerRegistrar,
				activationErrorsService,
				errorReporter,
			});

			// Reactivation fails transiently on every attempt, exhausting the budget.
			// Reset first so we only count the reactivation calls, not the initial activation.
			nonWebhookTriggerRegistrar.register.mockReset();
			nonWebhookTriggerRegistrar.register.mockRejectedValue(new Error('still broken'));

			onTriggerFailure(failure);
			await flushPromises();

			// One register call per attempt, all during reactivation.
			expect(nonWebhookTriggerRegistrar.register).toHaveBeenCalledTimes(MAX_ATTEMPTS);
			// The node stays down: the surfaced error is registered but never cleared.
			expect(activationErrorsService.register).toHaveBeenCalledWith('wf-1', 'trigger crashed');
			expect(activationErrorsService.deregister).not.toHaveBeenCalled();
			// The reactivation failure is reported (once for the runtime error, once for the giveup).
			expect(errorReporter.error).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'still broken' }),
				expect.anything(),
			);
		});
	});

	describe('metrics events', () => {
		const getEmissions = (event: string) =>
			eventService.emit.mock.calls
				.filter((call) => call[0] === event)
				.map((call) => call[1] as Record<string, unknown>);

		test('activate emits a success operation and success node count when all nodes activate', async () => {
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
				mock<IWorkflowExecuteAdditionalData>(),
			);
			const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
			webhookTriggerRegistrar.getWebhookTriggers.mockReturnValue([
				mock<IWebhookData>({ node: 'Webhook A' }),
			]);
			const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
			nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue([]);

			const activator = buildActivator({ webhookTriggerRegistrar, nonWebhookTriggerRegistrar });

			await activator.activate(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
				{ nodes: [node('webhook-a', 'webhook', { name: 'Webhook A' })], connections: {} },
				new Set(['webhook-a']),
			);

			expect(getEmissions('workflow-publication-trigger-operation')).toContainEqual(
				expect.objectContaining({ operation: 'activate', result: 'success' }),
			);
			expect(getEmissions('workflow-publication-trigger-node-operations')).toContainEqual(
				expect.objectContaining({ operation: 'activate', result: 'success', count: 1 }),
			);
		});

		test('activate emits a failure operation and failure node count when a node fails', async () => {
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
				mock<IWorkflowExecuteAdditionalData>(),
			);
			const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
			webhookTriggerRegistrar.getWebhookTriggers.mockReturnValue([
				mock<IWebhookData>({ node: 'Webhook B' }),
			]);
			webhookTriggerRegistrar.register.mockRejectedValue(new WebhookPathTakenError('Webhook B'));
			const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
			nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue([]);

			const activator = buildActivator({ webhookTriggerRegistrar, nonWebhookTriggerRegistrar });

			await activator.activate(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
				{ nodes: [node('webhook-b', 'webhook', { name: 'Webhook B' })], connections: {} },
				new Set(['webhook-b']),
			);

			expect(getEmissions('workflow-publication-trigger-operation')).toContainEqual(
				expect.objectContaining({ operation: 'activate', result: 'failure' }),
			);
			expect(getEmissions('workflow-publication-trigger-node-operations')).toContainEqual(
				expect.objectContaining({ operation: 'activate', result: 'failure', count: 1 }),
			);
		});

		test('deactivate emits a success operation and deactivated node count', async () => {
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
				mock<IWorkflowExecuteAdditionalData>(),
			);
			const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
			webhookTriggerRegistrar.getWebhookTriggers.mockReturnValue([]);
			const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
			nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue(['trigger-a']);

			const activator = buildActivator({ webhookTriggerRegistrar, nonWebhookTriggerRegistrar });

			await activator.deactivate(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
				{ nodes: [node('trigger-a', 'trigger')], connections: {} },
				new Set(['trigger-a']),
			);

			expect(getEmissions('workflow-publication-trigger-operation')).toContainEqual(
				expect.objectContaining({ operation: 'deactivate', result: 'success' }),
			);
			expect(getEmissions('workflow-publication-trigger-node-operations')).toContainEqual(
				expect.objectContaining({ operation: 'deactivate', result: 'success', count: 1 }),
			);
		});
	});
});
