import { ActiveExecutions, IWorkflowExecutionDataProcess, Db } from '../../src';
import { mocked } from 'jest-mock';
import PCancelable from 'p-cancelable';
import { v4 as uuid } from 'uuid';
import type { IRun } from 'n8n-workflow';

const FAKE_EXECUTION_ID = '15';
const FAKE_SECOND_EXECUTION_ID = '20';

jest.mock('../../src/Db', () => {
	return {
		collections: {
			Execution: {
				save: jest.fn(async () => Promise.resolve({id: FAKE_EXECUTION_ID})),
				update: jest.fn(),
			}
		}
	};
});

describe('ActiveExecutions', () => {

	let activeExecutions: ActiveExecutions.ActiveExecutions;

	beforeEach(() => {
		activeExecutions = new ActiveExecutions.ActiveExecutions();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	test('Should initialize activeExecutions with empty list', () => {
		expect(activeExecutions.getActiveExecutions().length).toBe(0);
	});

	test('Should add execution to active execution list', async () => {
		const newExecution = mockExecutionData();
		const executionId = await activeExecutions.add(newExecution);
		expect(executionId).toBe(FAKE_EXECUTION_ID);
		expect(activeExecutions.getActiveExecutions().length).toBe(1);
		expect(mocked(Db.collections.Execution.save)).toHaveBeenCalledTimes(1);
		expect(mocked(Db.collections.Execution.update)).toHaveBeenCalledTimes(0);
	});

	test('Should update execution if add is called with execution ID', async () => {
		const newExecution = mockExecutionData();
		const executionId = await activeExecutions.add(newExecution, undefined, FAKE_SECOND_EXECUTION_ID);
		expect(executionId).toBe(FAKE_SECOND_EXECUTION_ID);
		expect(activeExecutions.getActiveExecutions().length).toBe(1);
		expect(mocked(Db.collections.Execution.save)).toHaveBeenCalledTimes(0);
		expect(mocked(Db.collections.Execution.update)).toHaveBeenCalledTimes(1);
	});

	test('Should fail attaching execution to invalid executionId', async () => {
		const deferredPromise = mockCancelablePromise();
		expect(() => {
			activeExecutions.attachWorkflowExecution(FAKE_EXECUTION_ID, deferredPromise);
		}).toThrow();
	});

	test('Should successfully attach execution to valid executionId', async () => {
		const newExecution = mockExecutionData();
		await activeExecutions.add(newExecution, undefined, FAKE_EXECUTION_ID);
		const deferredPromise = mockCancelablePromise();
		activeExecutions.attachWorkflowExecution(FAKE_EXECUTION_ID, deferredPromise);
	});

});

function mockExecutionData(): IWorkflowExecutionDataProcess {
	return {
		executionMode: 'manual',
		workflowData: {
			name: 'Test workflow 1',
			active: false,
			createdAt: new Date(),
			updatedAt: new Date(),
			nodes: [],
			connections: {}
		},
		userId: uuid(),
	}
}

function mockCancelablePromise(): PCancelable<IRun> {
	return new PCancelable(async (resolve) => {
		resolve();
	});
}

