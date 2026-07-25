/* eslint-disable @typescript-eslint/unbound-method */
import type { WorkflowEntity } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import type { ActiveWorkflowTriggers, Span, Tracing } from 'n8n-core';
import type { IWorkflowBase, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import type {
	ScheduleTriggerCollectionSession,
	ScheduleTriggerJobRegistrar,
} from '@/scheduling/schedule-trigger-node/schedule-trigger-job-registrar';
import { NonWebhookTriggerRegistrar } from '@/workflows/triggers/non-webhook-trigger-registrar';
import type { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';

import { createWorkflow, logger, node } from './trigger-test-utils';

describe('NonWebhookTriggerRegistrar', () => {
	const tracing = mock<Tracing>();
	const scheduleTriggerJobRegistrar = mock<ScheduleTriggerJobRegistrar>();
	const scheduleCollectionSession = mock<ScheduleTriggerCollectionSession>();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
		tracing.startSpan.mockImplementation(async (_opts, spanCb) => await spanCb(mock<Span>()));
		scheduleTriggerJobRegistrar.createSession.mockReturnValue(scheduleCollectionSession);
	});

	test('resolves trigger and poll node ids', () => {
		const registrar = new NonWebhookTriggerRegistrar(
			logger,
			mock<ActiveWorkflowTriggers>(),
			mock<TriggerExecutionContextFactory>(),
			scheduleTriggerJobRegistrar,
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
			scheduleTriggerJobRegistrar,
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
			scheduleTriggerJobRegistrar,
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
			scheduleTriggerJobRegistrar,
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

	describe('durable schedule jobs', () => {
		const makeRegistrar = () => {
			const activeWorkflowTriggers = mock<ActiveWorkflowTriggers>();
			const factory = mock<TriggerExecutionContextFactory>();
			factory.getExecuteTriggerFunctions.mockReturnValue(vi.fn());
			factory.getExecutePollFunctions.mockReturnValue(vi.fn());
			const registrar = new NonWebhookTriggerRegistrar(
				logger,
				activeWorkflowTriggers,
				factory,
				scheduleTriggerJobRegistrar,
				tracing,
			);
			const registration = registrar.createRegistrationContext(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow' }),
				{
					activationMode: 'update',
					executionMode: 'trigger',
					additionalData: mock<IWorkflowExecuteAdditionalData>(),
					resolveWorkflowData: async () => mock<IWorkflowBase>(),
					onTriggerFailure: vi.fn(),
				},
			);
			return { registrar, registration, activeWorkflowTriggers };
		};

		test('register commits collected schedules after in-memory registration, then discards', async () => {
			const { registrar, registration } = makeRegistrar();
			const workflow = createWorkflow([node('trigger-a', 'trigger')]);

			await registrar.register(workflow, registration, 'trigger-a');

			expect(scheduleCollectionSession.commit).toHaveBeenCalledWith(workflow.id, 'trigger-a');
			expect(scheduleCollectionSession.discard).toHaveBeenCalledWith(workflow.id, 'trigger-a');
		});

		test('register discards without committing when in-memory registration fails', async () => {
			const { registrar, registration, activeWorkflowTriggers } = makeRegistrar();
			const workflow = createWorkflow([node('trigger-a', 'trigger')]);
			activeWorkflowTriggers.addTriggers.mockRejectedValue(new Error('activation failed'));

			await expect(registrar.register(workflow, registration, 'trigger-a')).rejects.toThrow(
				'activation failed',
			);

			expect(scheduleCollectionSession.commit).not.toHaveBeenCalled();
			expect(scheduleCollectionSession.discard).toHaveBeenCalledWith(workflow.id, 'trigger-a');
		});

		test('register fails the node activation when the commit fails', async () => {
			const { registrar, registration } = makeRegistrar();
			const workflow = createWorkflow([node('trigger-a', 'trigger')]);
			scheduleCollectionSession.commit.mockRejectedValue(new Error('db down'));

			await expect(registrar.register(workflow, registration, 'trigger-a')).rejects.toThrow(
				'db down',
			);
			expect(scheduleCollectionSession.discard).toHaveBeenCalledWith(workflow.id, 'trigger-a');
		});

		test('deregister removes durable jobs alongside in-memory triggers', async () => {
			const { registrar, activeWorkflowTriggers } = makeRegistrar();

			await registrar.deregister('wf-1', 'trigger-a');

			expect(activeWorkflowTriggers.removeTriggers).toHaveBeenCalledWith(
				'wf-1',
				new Set(['trigger-a']),
			);
			expect(scheduleTriggerJobRegistrar.remove).toHaveBeenCalledWith('wf-1', 'trigger-a');
		});
	});
});
