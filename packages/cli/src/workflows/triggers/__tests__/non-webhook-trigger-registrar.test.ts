/* eslint-disable @typescript-eslint/unbound-method */
import type { WorkflowEntity } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { ActiveWorkflowTriggers } from 'n8n-core';
import type { IWorkflowBase, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import type { DistributedScheduleTriggerService } from '@/distributed-scheduler/distributed-schedule-trigger.service';
import { NonWebhookTriggerRegistrar } from '@/workflows/triggers/non-webhook-trigger-registrar';
import type { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';

import { createWorkflow, logger, node } from './trigger-test-utils';

describe('NonWebhookTriggerRegistrar', () => {
	const distributedScheduleTriggerService = mock<DistributedScheduleTriggerService>({
		register: jest.fn().mockResolvedValue(false),
		deregister: jest.fn().mockResolvedValue(false),
	});

	beforeEach(() => {
		jest.clearAllMocks();
		jest.restoreAllMocks();
		distributedScheduleTriggerService.register.mockResolvedValue(false);
		distributedScheduleTriggerService.deregister.mockResolvedValue(false);
	});

	test('resolves trigger and poll node ids', () => {
		const registrar = new NonWebhookTriggerRegistrar(
			logger,
			mock<ActiveWorkflowTriggers>(),
			mock<TriggerExecutionContextFactory>(),
			distributedScheduleTriggerService,
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
		const getTriggerFunctions = jest.fn();
		const getPollFunctions = jest.fn();
		factory.getExecuteTriggerFunctions.mockReturnValue(getTriggerFunctions);
		factory.getExecutePollFunctions.mockReturnValue(getPollFunctions);
		const registrar = new NonWebhookTriggerRegistrar(
			logger,
			activeWorkflowTriggers,
			factory,
			distributedScheduleTriggerService,
		);
		const workflow = createWorkflow([node('trigger-a', 'trigger'), node('poll-a', 'poll')]);
		const additionalData = mock<IWorkflowExecuteAdditionalData>();
		const dbWorkflow = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow' });

		const registration = registrar.createRegistrationContext(dbWorkflow, {
			activationMode: 'update',
			executionMode: 'trigger',
			additionalData,
			resolveWorkflowData: async () => mock<IWorkflowBase>(),
			onTriggerFailure: jest.fn(),
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
			distributedScheduleTriggerService,
		);

		await registrar.deregister('wf-1', 'poll-a');

		expect(activeWorkflowTriggers.removeTriggers).toHaveBeenCalledWith('wf-1', new Set(['poll-a']));
	});

	test('uses distributed registration when schedule trigger service handles the node', async () => {
		distributedScheduleTriggerService.register.mockResolvedValue(true);
		const activeWorkflowTriggers = mock<ActiveWorkflowTriggers>();
		const registrar = new NonWebhookTriggerRegistrar(
			logger,
			activeWorkflowTriggers,
			mock<TriggerExecutionContextFactory>(),
			distributedScheduleTriggerService,
		);
		const workflow = createWorkflow([node('trigger-a', 'trigger')]);
		const registration = registrar.createRegistrationContext(
			mock<WorkflowEntity>({ id: 'wf-1', name: 'Test workflow' }),
			{
				activationMode: 'update',
				executionMode: 'trigger',
				additionalData: mock<IWorkflowExecuteAdditionalData>(),
				resolveWorkflowData: async () => mock<IWorkflowBase>(),
				onTriggerFailure: jest.fn(),
			},
		);

		await registrar.register(workflow, registration, 'trigger-a');

		expect(distributedScheduleTriggerService.register).toHaveBeenCalledWith(
			workflow,
			workflow.getNode('trigger-a'),
		);
		expect(activeWorkflowTriggers.addTriggers).not.toHaveBeenCalled();
	});

	test('uses distributed deregistration when schedule trigger service handles the node', async () => {
		distributedScheduleTriggerService.deregister.mockResolvedValue(true);
		const activeWorkflowTriggers = mock<ActiveWorkflowTriggers>();
		const registrar = new NonWebhookTriggerRegistrar(
			logger,
			activeWorkflowTriggers,
			mock<TriggerExecutionContextFactory>(),
			distributedScheduleTriggerService,
		);

		await registrar.deregister('wf-1', 'trigger-a');

		expect(distributedScheduleTriggerService.deregister).toHaveBeenCalledWith('wf-1', 'trigger-a');
		expect(activeWorkflowTriggers.removeTriggers).not.toHaveBeenCalled();
	});

	test('propagates activation errors', async () => {
		const activeWorkflowTriggers = mock<ActiveWorkflowTriggers>();
		const factory = mock<TriggerExecutionContextFactory>();
		factory.getExecuteTriggerFunctions.mockReturnValue(jest.fn());
		factory.getExecutePollFunctions.mockReturnValue(jest.fn());
		const registrar = new NonWebhookTriggerRegistrar(
			logger,
			activeWorkflowTriggers,
			factory,
			distributedScheduleTriggerService,
		);
		const workflow = createWorkflow([node('trigger-a', 'trigger')]);
		const context = {
			activationMode: 'update' as const,
			executionMode: 'trigger' as const,
			additionalData: mock<IWorkflowExecuteAdditionalData>(),
			resolveWorkflowData: async () => mock<IWorkflowBase>(),
			onTriggerFailure: jest.fn(),
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
