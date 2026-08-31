/* eslint-disable @typescript-eslint/unbound-method */
import type { WorkflowsConfig } from '@n8n/config';
import type { IWorkflowDb, WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { ErrorReporter, Span, Tracing } from 'n8n-core';
import type { IWebhookData, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import {
	UserError,
	WebhookPathTakenError,
	WorkflowActivationError,
	WorkflowDeactivationError,
	WorkflowExpression,
} from 'n8n-workflow';
import { mock, type MockProxy } from 'vitest-mock-extended';

import type { ActivationErrorsService } from '@/activation-errors.service';
import { TRIGGER_ACTIVATION_MAX_ATTEMPTS, TRIGGER_TEARDOWN_MAX_ATTEMPTS } from '@/constants';
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

vi.mock('@n8n/utils/sleep', () => ({
	sleep: vi.fn(),
}));

const MAX_ATTEMPTS = TRIGGER_ACTIVATION_MAX_ATTEMPTS;

const flushPromises = async () => await new Promise((resolve) => setImmediate(resolve));

const abort = { signal: new AbortController().signal, onDetached: vi.fn() };

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

	describe('getTriggerKinds', () => {
		test('classifies poll/trigger nodes as in-memory and webhook-only nodes as persisted', () => {
			const activator = buildActivator();

			const kinds = activator.getTriggerKinds([
				node('p', 'poll'),
				node('t', 'trigger'),
				node('w', 'webhook'),
				node('pw', 'poll-webhook'),
				node('tw', 'trigger-webhook'),
			]);

			expect(kinds.get('p')).toBe('in-memory');
			expect(kinds.get('t')).toBe('in-memory');
			expect(kinds.get('w')).toBe('persisted');
			// Hybrid nodes register in memory, so in-memory must win: classifying
			// them 'persisted' would hide them from reconciliation.
			expect(kinds.get('pw')).toBe('in-memory');
			expect(kinds.get('tw')).toBe('in-memory');
			expect(kinds.size).toBe(5);
		});

		test('classifies the no-op pseudo triggers as persisted despite their trigger function', () => {
			const activator = buildActivator();

			const kinds = activator.getTriggerKinds([
				node('manual', 'n8n-nodes-base.manualTrigger'),
				node('sub-workflow', 'n8n-nodes-base.executeWorkflowTrigger'),
				node('error', 'n8n-nodes-base.errorTrigger'),
				node('t', 'trigger'),
			]);

			// Their trigger() is a no-op — manual runs, sub-workflow calls and error
			// workflows are fired by the execution engine, never through the trigger
			// registry — so the reconciler must not diff them against the registry.
			expect(kinds.get('manual')).toBe('persisted');
			expect(kinds.get('sub-workflow')).toBe('persisted');
			expect(kinds.get('error')).toBe('persisted');
			// A genuine trigger with the same capability shape stays in-memory.
			expect(kinds.get('t')).toBe('in-memory');
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
			'update',
			abort,
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

	test('threads the activation mode to both the non-webhook and webhook registrations', async () => {
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
			mock<IWorkflowExecuteAdditionalData>(),
		);

		const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
		const webhookData = mock<IWebhookData>({ node: 'Webhook' });
		webhookTriggerRegistrar.getWebhookTriggers.mockReturnValue([webhookData]);

		const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
		nonWebhookTriggerRegistrar.createRegistrationContext.mockReturnValue(
			mock<PreparedNonWebhookTriggerRegistration>(),
		);
		nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue(['t']);

		const activator = buildActivator({ webhookTriggerRegistrar, nonWebhookTriggerRegistrar });
		const dbWorkflow = mock<WorkflowEntity>({
			id: 'wf-1',
			name: 'Test workflow',
			staticData: {},
			settings: {},
		});

		await activator.activate(
			dbWorkflow,
			{
				nodes: [node('t', 'trigger'), node('webhook-node', 'webhook', { name: 'Webhook' })],
				connections: {},
			},
			new Set(['t', 'webhook-node']),
			'init',
			abort,
		);

		expect(nonWebhookTriggerRegistrar.createRegistrationContext).toHaveBeenCalledWith(
			dbWorkflow,
			expect.objectContaining({ activationMode: 'init' }),
		);
		expect(webhookTriggerRegistrar.register).toHaveBeenCalledWith(
			expect.objectContaining({ webhookData, activation: 'init' }),
		);
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
				'update',
				abort,
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
		webhookTriggerRegistrar.getNodeWebhookTriggers.mockImplementation((_workflow, node) =>
			node.name === 'Webhook' ? [webhookData] : [],
		);
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
				abort,
			)
			.then(() => {
				deactivateSettled = true;
			});

		await flushPromises();

		expect(callOrder).toEqual(
			expect.arrayContaining([
				'clear-webhook-rows',
				'deregister-webhooks',
				'deregister-non-webhook:trigger-a',
			]),
		);
		expect(callOrder.indexOf('clear-webhook-rows')).toBeLessThan(
			callOrder.indexOf('deregister-webhooks'),
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
		// A failed local row deletion is (still) fatal to the webhook phase:
		// routing was not stopped, so the operation must fail for retry.
		webhookTriggerRegistrar.clearWorkflowWebhooksForNodes.mockImplementation(async () => {
			callOrder.push('webhook-row-cleanup-fail');
			throw new Error('webhook row cleanup failed');
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
				abort,
			),
		).rejects.toThrow('webhook row cleanup failed');

		expect(callOrder).toContain('deregister-non-webhook-finish');
	});

	describe('local-first webhook teardown', () => {
		test('deletes local webhook rows before attempting external deregistration', async () => {
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
				mock<IWorkflowExecuteAdditionalData>(),
			);

			const callOrder: string[] = [];
			const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
			const webhookData = mock<IWebhookData>({ node: 'Webhook' });
			webhookTriggerRegistrar.getNodeWebhookTriggers.mockReturnValue([webhookData]);
			webhookTriggerRegistrar.clearWorkflowWebhooksForNodes.mockImplementation(async () => {
				callOrder.push('clear-webhook-rows');
			});
			webhookTriggerRegistrar.deregister.mockImplementation(async () => {
				callOrder.push('deregister-external');
				return 'Webhook';
			});
			const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
			nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue([]);

			const activator = buildActivator({ webhookTriggerRegistrar, nonWebhookTriggerRegistrar });

			await activator.deactivate(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
				{ nodes: [node('webhook-node', 'webhook', { name: 'Webhook' })], connections: {} },
				new Set(['webhook-node']),
				abort,
			);

			expect(callOrder).toEqual(['clear-webhook-rows', 'deregister-external']);
			expect(webhookTriggerRegistrar.clearWorkflowWebhooksForNodes).toHaveBeenCalledWith('wf-1', [
				'Webhook',
			]);
		});

		test('deletes local webhook rows and proceeds when webhook discovery throws', async () => {
			// Discovery re-evaluates webhook expressions and can throw when the
			// evaluation context drifted since publish. Rows are already deleted at
			// that point, so the failure is collected — not thrown — or a publish
			// would fail after killing the old version's routing.
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
				mock<IWorkflowExecuteAdditionalData>(),
			);

			const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
			webhookTriggerRegistrar.getNodeWebhookTriggers.mockImplementation(() => {
				throw new Error('discovery failed');
			});
			const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
			nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue([]);

			const activator = buildActivator({ webhookTriggerRegistrar, nonWebhookTriggerRegistrar });

			const { externalTeardownFailures } = await activator.deactivate(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
				{ nodes: [node('webhook-node', 'webhook', { name: 'Webhook' })], connections: {} },
				new Set(['webhook-node']),
				abort,
			);

			expect(externalTeardownFailures).toEqual([
				{
					nodeName: 'Webhook',
					error: expect.objectContaining({ message: 'discovery failed' }),
				},
			]);
			expect(webhookTriggerRegistrar.clearWorkflowWebhooksForNodes).toHaveBeenCalledWith('wf-1', [
				'Webhook',
			]);
		});

		test('a discovery failure on one node still deregisters the other nodes externally', async () => {
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
				mock<IWorkflowExecuteAdditionalData>(),
			);

			const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
			const webhookOk = mock<IWebhookData>({ node: 'Webhook OK' });
			webhookTriggerRegistrar.getNodeWebhookTriggers.mockImplementation((_workflow, node) => {
				if (node.name === 'Webhook Broken') throw new Error('discovery failed');
				return [webhookOk];
			});
			const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
			nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue([]);

			const activator = buildActivator({ webhookTriggerRegistrar, nonWebhookTriggerRegistrar });

			const { externalTeardownFailures } = await activator.deactivate(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
				{
					nodes: [
						node('ok-node', 'webhook', { name: 'Webhook OK' }),
						node('broken-node', 'webhook', { name: 'Webhook Broken' }),
					],
					connections: {},
				},
				new Set(['ok-node', 'broken-node']),
				abort,
			);

			// The healthy node's external subscription is still cleaned up; only
			// the node whose discovery failed is abandoned.
			expect(webhookTriggerRegistrar.deregister).toHaveBeenCalledWith(
				expect.objectContaining({ webhookData: webhookOk }),
			);
			expect(externalTeardownFailures).toEqual([
				{
					nodeName: 'Webhook Broken',
					error: expect.objectContaining({ message: 'discovery failed' }),
				},
			]);
		});

		test('a discovery failure names only the failing node', async () => {
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
				mock<IWorkflowExecuteAdditionalData>(),
			);

			const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
			webhookTriggerRegistrar.getNodeWebhookTriggers.mockImplementation((_workflow, node) => {
				if (node.name === 'Webhook') throw new Error('discovery failed');
				return [];
			});
			const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
			nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue(['trigger-node']);

			const activator = buildActivator({ webhookTriggerRegistrar, nonWebhookTriggerRegistrar });

			const { externalTeardownFailures } = await activator.deactivate(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
				{
					nodes: [
						node('webhook-node', 'webhook', { name: 'Webhook' }),
						node('trigger-node', 'trigger'),
					],
					connections: {},
				},
				new Set(['webhook-node', 'trigger-node']),
				abort,
			);

			// The schedule-style trigger has no external webhook to leak; naming it
			// in an "external webhook deregistration failed" report would be wrong.
			expect(externalTeardownFailures).toEqual([
				{
					nodeName: 'Webhook',
					error: expect.objectContaining({ message: 'discovery failed' }),
				},
			]);
		});
	});

	describe('deactivate teardown failures', () => {
		function buildDeactivationSetup(deregisterError: Error) {
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
				mock<IWorkflowExecuteAdditionalData>(),
			);

			const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
			const webhookOk = mock<IWebhookData>({ node: 'Webhook OK' });
			const webhookBroken = mock<IWebhookData>({ node: 'Webhook Broken' });
			webhookTriggerRegistrar.getNodeWebhookTriggers.mockImplementation((_workflow, node) =>
				node.name === 'Webhook OK' ? [webhookOk] : [webhookBroken],
			);
			webhookTriggerRegistrar.deregister.mockImplementation(async ({ webhookData }) => {
				if (webhookData.node === 'Webhook Broken') throw deregisterError;
				return webhookData.node;
			});
			const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
			nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue([]);

			const activator = buildActivator({ webhookTriggerRegistrar, nonWebhookTriggerRegistrar });
			const deactivate = async () =>
				await activator.deactivate(
					mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
					{
						nodes: [
							node('ok-node', 'webhook', { name: 'Webhook OK' }),
							node('broken-node', 'webhook', { name: 'Webhook Broken' }),
						],
						connections: {},
					},
					new Set(['ok-node', 'broken-node']),
					abort,
				);

			return { webhookTriggerRegistrar, deactivate };
		}

		test('abandons a webhook whose deregistration fails with a UserError', async () => {
			// The failure can never succeed on retry (e.g. the delete hook's
			// credential was deleted): the remote registration is abandoned; the
			// node's rows were already cleared up front.
			const { webhookTriggerRegistrar, deactivate } = buildDeactivationSetup(
				new UserError('Credential with ID "c-1" does not exist for type "trelloApi".'),
			);

			await deactivate();

			expect(webhookTriggerRegistrar.clearWorkflowWebhooksForNodes).toHaveBeenCalledWith('wf-1', [
				'Webhook OK',
				'Webhook Broken',
			]);
		});

		test('collects a transient external failure instead of throwing, with rows already cleared', async () => {
			// Local routing already stopped (rows deleted up front), so an external
			// deregistration failure must not fail the whole deactivation — it is
			// returned for the caller to surface, leaving only external garbage.
			const { webhookTriggerRegistrar, deactivate } = buildDeactivationSetup(
				new Error('remote unreachable'),
			);

			const { externalTeardownFailures } = await deactivate();

			expect(externalTeardownFailures).toEqual([
				{
					nodeName: 'Webhook Broken',
					error: expect.objectContaining({ message: 'remote unreachable' }),
				},
			]);
			expect(webhookTriggerRegistrar.clearWorkflowWebhooksForNodes).toHaveBeenCalledWith('wf-1', [
				'Webhook OK',
				'Webhook Broken',
			]);
		});

		test('an abandoned UserError failure is not returned as an external teardown failure', async () => {
			const { deactivate } = buildDeactivationSetup(
				new UserError('Credential with ID "c-1" does not exist for type "trelloApi".'),
			);

			const { externalTeardownFailures } = await deactivate();

			expect(externalTeardownFailures).toEqual([]);
		});

		test('does not burn retries on a failure that can never succeed', async () => {
			const { webhookTriggerRegistrar, deactivate } = buildDeactivationSetup(
				new UserError('Credential with ID "c-1" does not exist for type "trelloApi".'),
			);

			await deactivate();

			// One call per webhook: 'Webhook OK' + a single, un-retried 'Webhook Broken'.
			expect(webhookTriggerRegistrar.deregister).toHaveBeenCalledTimes(2);
		});
	});

	describe('external deregistration retries', () => {
		function buildRetrySetup(deregisterImpl: (attempt: number) => Promise<string>) {
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
				mock<IWorkflowExecuteAdditionalData>(),
			);

			const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
			const webhookData = mock<IWebhookData>({ node: 'Webhook' });
			webhookTriggerRegistrar.getNodeWebhookTriggers.mockReturnValue([webhookData]);
			let attempt = 0;
			webhookTriggerRegistrar.deregister.mockImplementation(
				async () => await deregisterImpl(attempt++),
			);
			const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
			nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue([]);

			const activator = buildActivator({ webhookTriggerRegistrar, nonWebhookTriggerRegistrar });
			const deactivate = async () =>
				await activator.deactivate(
					mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
					{ nodes: [node('webhook-node', 'webhook', { name: 'Webhook' })], connections: {} },
					new Set(['webhook-node']),
					abort,
				);

			return { webhookTriggerRegistrar, deactivate };
		}

		test('retries a transient external failure and reports nothing when a retry succeeds', async () => {
			const { webhookTriggerRegistrar, deactivate } = buildRetrySetup(async (attempt) => {
				if (attempt === 0) throw new Error('remote unreachable');
				return 'Webhook';
			});

			const { externalTeardownFailures } = await deactivate();

			expect(externalTeardownFailures).toEqual([]);
			expect(webhookTriggerRegistrar.deregister).toHaveBeenCalledTimes(2);
		});

		test('reports a node with multiple failing webhooks as a single teardown failure', async () => {
			// Failures are per node, not per webhook: metrics subtract the failure
			// count from the node count, and the reporter names failed nodes — a
			// multi-webhook node must not be counted (or named) twice.
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
				mock<IWorkflowExecuteAdditionalData>(),
			);

			const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
			webhookTriggerRegistrar.getNodeWebhookTriggers.mockReturnValue([
				mock<IWebhookData>({ node: 'Webhook', path: 'one' }),
				mock<IWebhookData>({ node: 'Webhook', path: 'two' }),
			]);
			webhookTriggerRegistrar.deregister.mockRejectedValue(new Error('remote unreachable'));
			const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
			nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue([]);

			const activator = buildActivator({ webhookTriggerRegistrar, nonWebhookTriggerRegistrar });

			const { externalTeardownFailures } = await activator.deactivate(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
				{ nodes: [node('webhook-node', 'webhook', { name: 'Webhook' })], connections: {} },
				new Set(['webhook-node']),
				abort,
			);

			expect(externalTeardownFailures).toEqual([
				{
					nodeName: 'Webhook',
					error: expect.objectContaining({ message: 'remote unreachable' }),
				},
			]);
		});

		test('gives up on a transient external failure after exhausting the retry budget', async () => {
			const { webhookTriggerRegistrar, deactivate } = buildRetrySetup(async () => {
				throw new Error('remote unreachable');
			});

			const { externalTeardownFailures } = await deactivate();

			expect(externalTeardownFailures).toEqual([
				{
					nodeName: 'Webhook',
					error: expect.objectContaining({ message: 'remote unreachable' }),
				},
			]);
			expect(webhookTriggerRegistrar.deregister).toHaveBeenCalledTimes(
				TRIGGER_TEARDOWN_MAX_ATTEMPTS,
			);
		});

		test('skips a non-webhook trigger whose deregistration fails with a UserError, even when wrapped', async () => {
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
				mock<IWorkflowExecuteAdditionalData>(),
			);

			const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
			webhookTriggerRegistrar.getNodeWebhookTriggers.mockReturnValue([]);
			const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
			nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue(['t']);
			nonWebhookTriggerRegistrar.deregister.mockRejectedValue(
				new WorkflowDeactivationError('Failed to deactivate trigger of workflow ID "wf-1"', {
					cause: new UserError('teardown broken'),
				}),
			);

			const activator = buildActivator({ webhookTriggerRegistrar, nonWebhookTriggerRegistrar });

			await activator.deactivate(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
				{ nodes: [node('t', 'trigger')], connections: {} },
				new Set(['t']),
				abort,
			);

			expect(nonWebhookTriggerRegistrar.deregister).toHaveBeenCalledWith('wf-1', 't');
		});
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
			'update',
			abort,
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
			'update',
			abort,
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
			'update',
			abort,
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
			'update',
			abort,
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
			'update',
			abort,
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
			'update',
			abort,
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
			'update',
			abort,
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
				'update',
				abort,
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
				'update',
				abort,
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
				'update',
				abort,
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
			webhookTriggerRegistrar.getNodeWebhookTriggers.mockReturnValue([]);
			const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
			nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue(['trigger-a']);

			const activator = buildActivator({ webhookTriggerRegistrar, nonWebhookTriggerRegistrar });

			await activator.deactivate(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
				{ nodes: [node('trigger-a', 'trigger')], connections: {} },
				new Set(['trigger-a']),
				abort,
			);

			expect(getEmissions('workflow-publication-trigger-operation')).toContainEqual(
				expect.objectContaining({ operation: 'deactivate', result: 'success' }),
			);
			expect(getEmissions('workflow-publication-trigger-node-operations')).toContainEqual(
				expect.objectContaining({ operation: 'deactivate', result: 'success', count: 1 }),
			);
		});
	});

	describe('abort', () => {
		beforeEach(() => {
			vi.spyOn(WorkflowExpression.prototype, 'acquireIsolate').mockResolvedValue(true);
			vi.spyOn(WorkflowExpression.prototype, 'releaseIsolate').mockResolvedValue();
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
				mock<IWorkflowExecuteAdditionalData>(),
			);
		});

		test('records a node whose registration hangs as failed once the signal aborts, keeping other nodes', async () => {
			const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
			webhookTriggerRegistrar.getWebhookTriggers.mockReturnValue([]);
			const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
			nonWebhookTriggerRegistrar.createRegistrationContext.mockReturnValue(
				mock<PreparedNonWebhookTriggerRegistration>(),
			);
			nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue(['ok', 'stuck']);
			nonWebhookTriggerRegistrar.register.mockImplementation(async (_workflow, _reg, nodeId) => {
				if (nodeId === 'stuck') await new Promise(() => {});
			});

			const activator = buildActivator({ webhookTriggerRegistrar, nonWebhookTriggerRegistrar });
			const controller = new AbortController();
			const onDetached = vi.fn();

			const activation = activator.activate(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
				{ nodes: [node('ok', 'trigger'), node('stuck', 'trigger')], connections: {} },
				new Set(['ok', 'stuck']),
				'update',
				{ signal: controller.signal, onDetached },
			);
			await flushPromises();
			controller.abort(new Error('deadline'));

			const outcome = await activation;
			expect(outcome.activated).toEqual(['ok']);
			expect(outcome.failures).toEqual([
				expect.objectContaining({
					nodeId: 'stuck',
					error: expect.objectContaining({ message: 'deadline' }),
				}),
			]);
			// The hung registration is handed back so the caller can outlive it.
			expect(onDetached).toHaveBeenCalledTimes(1);
			expect(onDetached).toHaveBeenCalledWith(expect.any(Promise));
		});

		test('a deactivation whose teardown hangs rejects with the abort reason once the signal fires', async () => {
			const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
			webhookTriggerRegistrar.getNodeWebhookTriggers.mockReturnValue([]);
			const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
			nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue(['stuck']);
			nonWebhookTriggerRegistrar.deregister.mockImplementation(
				async () => await new Promise(() => {}),
			);

			const activator = buildActivator({ webhookTriggerRegistrar, nonWebhookTriggerRegistrar });
			const controller = new AbortController();
			const onDetached = vi.fn();

			const deactivation = activator.deactivate(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
				{ nodes: [node('stuck', 'trigger')], connections: {} },
				new Set(['stuck']),
				{ signal: controller.signal, onDetached },
			);
			await flushPromises();
			controller.abort(new Error('deadline'));

			await expect(deactivation).rejects.toThrow('deadline');
			expect(onDetached).toHaveBeenCalledWith(expect.any(Promise));
		});

		test('an aborted deactivation rejects with the abort reason, not an earlier webhook failure', async () => {
			// One webhook fails with a UserError (policy: abandon silently) before a
			// sibling's hang triggers the deadline abort. The operation must fail
			// with the abort reason — blaming the UserError would mark the record
			// failed with an error the code explicitly abandons.
			const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
			const webhookBroken = mock<IWebhookData>({ node: 'Webhook Broken', path: 'broken' });
			const webhookStuck = mock<IWebhookData>({ node: 'Webhook Stuck', path: 'hang' });
			webhookTriggerRegistrar.getNodeWebhookTriggers.mockImplementation((_workflow, node) =>
				node.name === 'Webhook Broken' ? [webhookBroken] : [webhookStuck],
			);
			webhookTriggerRegistrar.deregister.mockImplementation(async ({ webhookData }) => {
				if (webhookData.path === 'hang') await new Promise(() => {});
				throw new UserError('Credential with ID "c-1" does not exist for type "trelloApi".');
			});
			const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
			nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue([]);

			const activator = buildActivator({ webhookTriggerRegistrar, nonWebhookTriggerRegistrar });
			const controller = new AbortController();

			const deactivation = activator.deactivate(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
				{
					nodes: [
						node('broken-node', 'webhook', { name: 'Webhook Broken' }),
						node('stuck-node', 'webhook', { name: 'Webhook Stuck' }),
					],
					connections: {},
				},
				new Set(['broken-node', 'stuck-node']),
				{ signal: controller.signal, onDetached: vi.fn() },
			);
			await flushPromises();
			controller.abort(new Error('deadline'));

			await expect(deactivation).rejects.toThrow('deadline');
		});

		test('clears all target webhook rows up front even when a deregistration hangs into the abort', async () => {
			const webhookTriggerRegistrar = mock<WebhookTriggerRegistrar>();
			const webhookOk = mock<IWebhookData>({ node: 'Webhook OK', path: 'ok' });
			const webhookStuck = mock<IWebhookData>({ node: 'Webhook Stuck', path: 'hang' });
			webhookTriggerRegistrar.getNodeWebhookTriggers.mockImplementation((_workflow, node) =>
				node.name === 'Webhook OK' ? [webhookOk] : [webhookStuck],
			);
			webhookTriggerRegistrar.deregister.mockImplementation(async ({ webhookData }) => {
				if (webhookData.path === 'hang') await new Promise(() => {});
				return webhookData.node;
			});
			const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
			nonWebhookTriggerRegistrar.getTriggerNodeIds.mockReturnValue([]);

			const activator = buildActivator({ webhookTriggerRegistrar, nonWebhookTriggerRegistrar });
			const controller = new AbortController();

			const deactivation = activator.deactivate(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow', staticData: {}, settings: {} }),
				{
					nodes: [
						node('ok-node', 'webhook', { name: 'Webhook OK' }),
						node('stuck-node', 'webhook', { name: 'Webhook Stuck' }),
					],
					connections: {},
				},
				new Set(['ok-node', 'stuck-node']),
				{ signal: controller.signal, onDetached: vi.fn() },
			);
			await flushPromises();
			controller.abort(new Error('deadline'));

			// Executions stop regardless of external teardown: rows for every target
			// node were deleted before the external calls, and the abort still
			// surfaces so the record is retried for external cleanup.
			await expect(deactivation).rejects.toThrow('deadline');
			expect(webhookTriggerRegistrar.clearWorkflowWebhooksForNodes).toHaveBeenCalledWith('wf-1', [
				'Webhook OK',
				'Webhook Stuck',
			]);
		});
	});
});
