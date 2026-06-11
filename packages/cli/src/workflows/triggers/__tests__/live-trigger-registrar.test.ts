/* eslint-disable @typescript-eslint/unbound-method */
import type { WorkflowEntity } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { ActiveWorkflowTriggers } from 'n8n-core';
import type { IWorkflowBase, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import { LiveTriggerRegistrar } from '@/workflows/triggers/live-trigger-registrar';
import type { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';

import { createWorkflow, logger, node } from './trigger-test-utils';

describe('LiveTriggerRegistrar', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.restoreAllMocks();
	});

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
