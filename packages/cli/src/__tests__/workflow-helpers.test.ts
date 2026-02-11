import { mockInstance } from '@n8n/backend-test-utils';
import type { Project, Variables } from '@n8n/db';
import type { IWorkflowBase, IWorkflowSettings } from 'n8n-workflow';

import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { OwnershipService } from '@/services/ownership.service';
import {
	getVariables,
	removeDefaultValues,
	shouldRestartParentExecution,
} from '@/workflow-helpers';

describe('workflow-helpers', () => {
	beforeAll(() => {
		mockInstance(VariablesService, {
			async getAllCached() {
				return [
					{ id: '1', key: 'VAR1', value: 'value1' },
					{ id: '2', key: 'VAR2', value: 'value2' },
					{
						id: '3',
						key: 'VAR2',
						value: 'value1Project',
						project: { id: '1', name: 'project1' } as Project,
					},
					{
						id: '4',
						key: 'VAR4',
						value: 'value4',
						project: { id: '1', name: 'project1' } as Project,
					},
					{
						id: '5',
						key: 'VAR5',
						value: 'value5',
						project: { id: '2', name: 'project2' } as Project,
					},
				] as Variables[];
			},
		});

		mockInstance(OwnershipService, {
			async getWorkflowProjectCached(_workflowId: string) {
				return { id: '1', name: 'project' } as unknown as Project;
			},
		});
	});

	describe('getVariables', () => {
		it('should return all variables as key-value pairs if no parameters are given', async () => {
			const variables = await getVariables();
			expect(variables).toEqual({ VAR1: 'value1', VAR2: 'value2' });
		});

		it('should return global and project variables if projectId is given', async () => {
			const variables = await getVariables(undefined, '1');
			expect(variables).toEqual({ VAR1: 'value1', VAR2: 'value1Project', VAR4: 'value4' });
		});

		it('should return global and project variables if workflowId is given', async () => {
			const variables = await getVariables('1');
			expect(variables).toEqual({ VAR1: 'value1', VAR2: 'value1Project', VAR4: 'value4' });
		});

		it('should prioritize passed of projectId over workflowId', async () => {
			const variables = await getVariables('1', '2');
			expect(variables).toEqual({ VAR1: 'value1', VAR2: 'value2', VAR5: 'value5' });
		});
	});
});

describe('shouldRestartParentExecution', () => {
	it('should return false when parentExecution is undefined', () => {
		expect(shouldRestartParentExecution(undefined)).toBe(false);
	});

	it('should return false when shouldResume is explicitly false', () => {
		const parentExecution = {
			executionId: 'parent-exec-id',
			workflowId: 'parent-workflow-id',
			shouldResume: false,
		};
		expect(shouldRestartParentExecution(parentExecution)).toBe(false);
	});

	it('should return true when shouldResume is undefined', () => {
		const parentExecution = {
			executionId: 'parent-exec-id',
			workflowId: 'parent-workflow-id',
			shouldResume: undefined,
		};
		expect(shouldRestartParentExecution(parentExecution)).toBe(true);
	});

	it('should return true when shouldResume is true', () => {
		const parentExecution = {
			executionId: 'parent-exec-id',
			workflowId: 'parent-workflow-id',
			shouldResume: true,
		};
		expect(shouldRestartParentExecution(parentExecution)).toBe(true);
	});
});

describe('removeDefaultValues', () => {
	const DEFAULT_EXECUTION_TIMEOUT = 3600;
	const DEFAULT = 'DEFAULT';

	it('should remove errorWorkflow when set to DEFAULT', () => {
		const settings: IWorkflowSettings = {
			errorWorkflow: DEFAULT,
			timezone: 'America/New_York',
		};
		const result = removeDefaultValues(settings, DEFAULT_EXECUTION_TIMEOUT);
		expect(result).toEqual({
			timezone: 'America/New_York',
		});
	});

	it('should remove all keys set to DEFAULT', () => {
		const settings: IWorkflowSettings = {
			errorWorkflow: DEFAULT,
			timezone: DEFAULT,
			saveDataErrorExecution: DEFAULT,
			saveDataSuccessExecution: DEFAULT,
			saveManualExecutions: DEFAULT,
			saveExecutionProgress: DEFAULT,
			callerPolicy: 'workflowsFromSameOwner',
		};
		const result = removeDefaultValues(settings, DEFAULT_EXECUTION_TIMEOUT);
		expect(result).toEqual({
			callerPolicy: 'workflowsFromSameOwner',
		});
	});

	it('should remove executionTimeout when it matches default', () => {
		const settings: IWorkflowSettings = {
			executionTimeout: 3600,
			timezone: 'America/New_York',
		};
		const result = removeDefaultValues(settings, DEFAULT_EXECUTION_TIMEOUT);
		expect(result).toEqual({
			timezone: 'America/New_York',
		});
	});

	it('should keep executionTimeout when it differs from default', () => {
		const settings: IWorkflowSettings = {
			executionTimeout: 7200,
			timezone: 'America/New_York',
		};
		const result = removeDefaultValues(settings, DEFAULT_EXECUTION_TIMEOUT);
		expect(result).toEqual({
			executionTimeout: 7200,
			timezone: 'America/New_York',
		});
	});

	it('should keep non-DEFAULT values', () => {
		const settings: IWorkflowSettings = {
			errorWorkflow: 'some-workflow-id',
			timezone: 'America/New_York',
			saveDataErrorExecution: 'all',
		};
		const result = removeDefaultValues(settings, DEFAULT_EXECUTION_TIMEOUT);
		expect(result).toEqual({
			errorWorkflow: 'some-workflow-id',
			timezone: 'America/New_York',
			saveDataErrorExecution: 'all',
		});
	});

	it('should not mutate the original settings object', () => {
		const settings = {
			errorWorkflow: DEFAULT,
			timezone: 'America/New_York',
			executionTimeout: 3600,
		};
		const originalSettings = { ...settings };
		removeDefaultValues(settings, DEFAULT_EXECUTION_TIMEOUT);
		expect(settings).toEqual(originalSettings);
	});

	it('should remove callerPolicy when it is default and workflow has no Execute Workflow Trigger', () => {
		const settings: IWorkflowSettings = {
			callerPolicy: 'workflowsFromSameOwner',
			timezone: 'America/New_York',
		};
		const nodes = [
			{ type: 'n8n-nodes-base.webhook', name: 'Webhook' },
			{ type: 'n8n-nodes-base.set', name: 'Set' },
		] as IWorkflowBase['nodes'];
		const result = removeDefaultValues(settings, DEFAULT_EXECUTION_TIMEOUT, nodes);
		expect(result).toEqual({
			timezone: 'America/New_York',
		});
	});

	it('should keep callerPolicy when workflow has Execute Workflow Trigger', () => {
		const settings: IWorkflowSettings = {
			callerPolicy: 'workflowsFromSameOwner',
			timezone: 'America/New_York',
		};
		const nodes = [
			{ type: 'n8n-nodes-base.executeWorkflowTrigger', name: 'When Called' },
			{ type: 'n8n-nodes-base.set', name: 'Set' },
		] as IWorkflowBase['nodes'];
		const result = removeDefaultValues(settings, DEFAULT_EXECUTION_TIMEOUT, nodes);
		expect(result).toEqual({
			callerPolicy: 'workflowsFromSameOwner',
			timezone: 'America/New_York',
		});
	});

	it('should keep callerPolicy when it is not the default value', () => {
		const settings: IWorkflowSettings = {
			callerPolicy: 'any',
			timezone: 'America/New_York',
		};
		const nodes = [
			{ type: 'n8n-nodes-base.webhook', name: 'Webhook' },
		] as IWorkflowBase['nodes'];
		const result = removeDefaultValues(settings, DEFAULT_EXECUTION_TIMEOUT, nodes);
		expect(result).toEqual({
			callerPolicy: 'any',
			timezone: 'America/New_York',
		});
	});

	it('should handle undefined nodes parameter (backward compatibility)', () => {
		const settings: IWorkflowSettings = {
			callerPolicy: 'workflowsFromSameOwner',
			timezone: 'America/New_York',
		};
		// When nodes is undefined, callerPolicy should be kept (can't determine if workflow has Execute Workflow Trigger)
		const result = removeDefaultValues(settings, DEFAULT_EXECUTION_TIMEOUT);
		expect(result).toEqual({
			callerPolicy: 'workflowsFromSameOwner',
			timezone: 'America/New_York',
		});
	});

	it('should handle empty nodes array', () => {
		const settings: IWorkflowSettings = {
			callerPolicy: 'workflowsFromSameOwner',
			timezone: 'America/New_York',
		};
		const nodes = [] as IWorkflowBase['nodes'];
		// Empty nodes array means no Execute Workflow Trigger, so callerPolicy should be removed
		const result = removeDefaultValues(settings, DEFAULT_EXECUTION_TIMEOUT, nodes);
		expect(result).toEqual({
			timezone: 'America/New_York',
		});
	});

	it('should handle custom defaultCallerPolicy parameter', () => {
		const settings: IWorkflowSettings = {
			callerPolicy: 'none', // Custom default
			timezone: 'America/New_York',
		};
		const nodes = [
			{ type: 'n8n-nodes-base.webhook', name: 'Webhook' },
		] as IWorkflowBase['nodes'];
		// With custom default 'none', should remove it for webhook-only workflows
		const result = removeDefaultValues(settings, DEFAULT_EXECUTION_TIMEOUT, nodes, 'none');
		expect(result).toEqual({
			timezone: 'America/New_York',
		});
	});
});
