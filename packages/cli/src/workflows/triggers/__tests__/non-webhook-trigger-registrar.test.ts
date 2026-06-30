/* eslint-disable @typescript-eslint/unbound-method */
import type { WorkflowEntity } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import type { ActiveWorkflowTriggers, Span, Tracing } from 'n8n-core';
import type { IWorkflowBase, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import { NonWebhookTriggerRegistrar } from '@/workflows/triggers/non-webhook-trigger-registrar';
import type { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';

import { createWorkflow, logger, node } from './trigger-test-utils';

describe('NonWebhookTriggerRegistrar', () => {
	const tracing = mock<Tracing>();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
		tracing.startSpan.mockImplementation(async (_opts, spanCb) => await spanCb(mock<Span>()));
	});

	test('resolves trigger and poll node ids', () => {
		const registrar = new NonWebhookTriggerRegistrar(
			logger,
			mock<ActiveWorkflowTriggers>(),
			mock<TriggerExecutionContextFactory>(),
			tracing,
		);
		const workflow = createWorkflow([
			node('trigger-a', 'trigger'),
			node('poll-a', 'poll'),
			node('regular', 'regular'),
		]);

		expect(registrar.getTriggerNodeIds(workflow)).toEqual(['trigger-a', 'poll-a']);
	});

	test('registers one trigger or poll node id', async () => {
		const activeWorkflowTriggers = mock<ActiveWorkflowTriggers>();
		const factory = mock<TriggerExecutionContextFactory>();
		const getTriggerFunctions = vi.fn();
		const getPollFunctions = vi.fn();
		factory.getExecuteTriggerFunctions.mockReturnValue(getTriggerFunctions);
		factory.getExecutePollFunctions.mockReturnValue(getPollFunctions);
		const registrar = new NonWebhookTriggerRegistrar(
			logger,
			activeWorkflowTriggers,
			factory,
			tracing,
		);
		const workflow = createWorkflow([node('trigger-a', 'trigger'), node('poll-a', 'poll')]);
		const additionalData = mock<IWorkflowExecuteAdditionalData>();
		const dbWorkflow = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow' });

		const registration = registrar.createRegistrationContext(dbWorkflow, {
			activationMode: 'update',
			executionMode: 'trigger',
			additionalData,
			resolveWorkflowData: async () => mock<IWorkflowBase>(),
			onTriggerFailure: vi.fn(),
		});

		await registrar.register(workflow, registration, 'poll-a');

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

	test('deregisters one trigger or poll node id', async () => {
		const activeWorkflowTriggers = mock<ActiveWorkflowTriggers>();
		const registrar = new NonWebhookTriggerRegistrar(
			logger,
			activeWorkflowTriggers,
			mock<TriggerExecutionContextFactory>(),
			tracing,
		);

		await registrar.deregister('wf-1', 'poll-a');

		expect(activeWorkflowTriggers.removeTriggers).toHaveBeenCalledWith('wf-1', new Set(['poll-a']));
	});

	test('propagates activation errors', async () => {
		const activeWorkflowTriggers = mock<ActiveWorkflowTriggers>();
		const factory = mock<TriggerExecutionContextFactory>();
		factory.getExecuteTriggerFunctions.mockReturnValue(vi.fn());
		factory.getExecutePollFunctions.mockReturnValue(vi.fn());
		const registrar = new NonWebhookTriggerRegistrar(
			logger,
			activeWorkflowTriggers,
			factory,
			tracing,
		);
		const workflow = createWorkflow([node('trigger-a', 'trigger')]);
		const context = {
			activationMode: 'update' as const,
			executionMode: 'trigger' as const,
			additionalData: mock<IWorkflowExecuteAdditionalData>(),
			resolveWorkflowData: async () => mock<IWorkflowBase>(),
			onTriggerFailure: vi.fn(),
		};
		const registration = registrar.createRegistrationContext(
			mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow' }),
			context,
		);
		activeWorkflowTriggers.addTriggers.mockRejectedValue(new Error('activation failed'));
		await expect(registrar.register(workflow, registration, 'trigger-a')).rejects.toThrow(
			'activation failed',
		);
	});
});
