import { mockInstance } from '@n8n/backend-test-utils';
import type { Project, Variables } from '@n8n/db';
import type { ITaskData, IWorkflowSettings } from 'n8n-workflow';

import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { OwnershipService } from '@/services/ownership.service';
import {
	getVariables,
	preserveInputOverride,
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

describe('preserveInputOverride', () => {
	const makeEntry = (overrides: Partial<ITaskData> = {}): ITaskData => ({
		startTime: 100,
		executionTime: 50,
		executionIndex: 1,
		source: [],
		...overrides,
	});

	it('should throw when the array is empty', () => {
		expect(() => preserveInputOverride([])).toThrow();
	});

	it('should pop the entry and leave the array empty when there is no inputOverride', () => {
		const runDataArray: ITaskData[] = [makeEntry()];
		preserveInputOverride(runDataArray);
		expect(runDataArray).toHaveLength(0);
	});

	it('should replace the entry with a zeroed placeholder when inputOverride is present', () => {
		const inputOverride = { main: [[{ json: { key: 'value' } }]] };
		const runDataArray: ITaskData[] = [makeEntry({ inputOverride })];
		preserveInputOverride(runDataArray);
		expect(runDataArray).toHaveLength(1);
		expect(runDataArray[0]).toEqual({
			startTime: 0,
			executionTime: 0,
			executionIndex: 0,
			source: [],
			inputOverride,
		});
	});

	it('should carry source from the original entry over to the placeholder', () => {
		const source = [{ previousNode: 'NodeA', previousNodeOutput: 0 }];
		const inputOverride = { main: [[{ json: {} }]] };
		const runDataArray: ITaskData[] = [makeEntry({ source, inputOverride })];
		preserveInputOverride(runDataArray);
		expect(runDataArray[0].source).toBe(source);
	});

	it('should not include data or other original fields in the placeholder', () => {
		const inputOverride = { main: [[{ json: {} }]] };
		const data = { main: [[{ json: { result: 'something' } }]] };
		const runDataArray: ITaskData[] = [makeEntry({ inputOverride, data, executionTime: 999 })];
		preserveInputOverride(runDataArray);
		expect(runDataArray[0]).not.toHaveProperty('data');
		expect(runDataArray[0].executionTime).toBe(0);
	});

	it('should only affect the last entry when inputOverride is present', () => {
		const inputOverride = { main: [[{ json: {} }]] };
		const first = makeEntry({ executionIndex: 0 });
		const second = makeEntry({ executionIndex: 1 });
		const last = makeEntry({ executionIndex: 2, inputOverride });
		const runDataArray: ITaskData[] = [first, second, last];
		preserveInputOverride(runDataArray);
		expect(runDataArray).toHaveLength(3);
		expect(runDataArray[0]).toBe(first);
		expect(runDataArray[1]).toBe(second);
		expect(runDataArray[2].inputOverride).toBe(inputOverride);
		expect(runDataArray[2].startTime).toBe(0);
	});

	it('should remove only the last entry when no inputOverride and earlier entries remain', () => {
		const first = makeEntry({ executionIndex: 0 });
		const runDataArray: ITaskData[] = [first, makeEntry({ executionIndex: 1 })];
		preserveInputOverride(runDataArray);
		expect(runDataArray).toHaveLength(1);
		expect(runDataArray[0]).toBe(first);
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

	it('should remove credentialResolverId when empty string', () => {
		const settings: IWorkflowSettings = {
			credentialResolverId: '',
			timezone: 'America/New_York',
		};
		const result = removeDefaultValues(settings, DEFAULT_EXECUTION_TIMEOUT);
		expect(result).toEqual({
			timezone: 'America/New_York',
		});
	});

	it('should remove credentialResolverId when undefined', () => {
		const settings: IWorkflowSettings = {
			credentialResolverId: undefined,
			timezone: 'America/New_York',
		};
		const result = removeDefaultValues(settings, DEFAULT_EXECUTION_TIMEOUT);
		expect(result).not.toHaveProperty('credentialResolverId');
	});

	it('should keep credentialResolverId when set to a valid ID', () => {
		const settings: IWorkflowSettings = {
			credentialResolverId: 'resolver-id-123',
			timezone: 'America/New_York',
		};
		const result = removeDefaultValues(settings, DEFAULT_EXECUTION_TIMEOUT);
		expect(result).toEqual({
			credentialResolverId: 'resolver-id-123',
			timezone: 'America/New_York',
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
});
