import * as Db from '@/Db';
import { ActiveExecutions } from '@/ActiveExecutions';
import { mocked } from 'jest-mock';
import PCancelable from 'p-cancelable';
import { v4 as uuid } from 'uuid';
import {
	createDeferredPromise,
	IDeferredPromise,
	IExecuteResponsePromiseData,
	IRun,
} from 'n8n-workflow';
import { IWorkflowExecutionDataProcess } from '@/Interfaces';

const FAKE_EXECUTION_ID = '15';
const FAKE_SECOND_EXECUTION_ID = '20';

jest.mock('@/Db', () => {
	return {
		collections: {
			Execution: {
				save: jest.fn(async () => Promise.resolve({ id: FAKE_EXECUTION_ID })),
				update: jest.fn(),
			},
		},
	};
});

describe('ActiveExecutions', () => {
	let activeExecutions: ActiveExecutions;

	beforeEach(() => {
		activeExecutions = new ActiveExecutions();
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
		const executionId = await activeExecutions.add(
			newExecution,
			undefined,
			FAKE_SECOND_EXECUTION_ID,
		);

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

		expect(() =>
			activeExecutions.attachWorkflowExecution(FAKE_EXECUTION_ID, deferredPromise),
		).not.toThrow();
	});

	test('Should attach and resolve response promise to existing execution', async () => {
		const newExecution = mockExecutionData();
		await activeExecutions.add(newExecution, undefined, FAKE_EXECUTION_ID);
		const deferredPromise = await mockDeferredPromise();
		activeExecutions.attachResponsePromise(FAKE_EXECUTION_ID, deferredPromise);
		const fakeResponse = { data: { resultData: { runData: {} } } };
		activeExecutions.resolveResponsePromise(FAKE_EXECUTION_ID, fakeResponse);

		expect(deferredPromise.promise()).resolves.toEqual(fakeResponse);
	});

	test('Should remove an existing execution', async () => {
		const newExecution = mockExecutionData();
		const executionId = await activeExecutions.add(newExecution);
		activeExecutions.remove(executionId);

		expect(activeExecutions.getActiveExecutions().length).toBe(0);
	});

	test('Should resolve post execute promise on removal', async () => {
		const newExecution = mockExecutionData();
		const executionId = await activeExecutions.add(newExecution);
		const postExecutePromise = activeExecutions.getPostExecutePromise(executionId);
		// Force the above to be executed since we cannot await it
		await new Promise((res) => {
			setTimeout(res, 100);
		});
		const fakeOutput = mockFullRunData();
		activeExecutions.remove(executionId, fakeOutput);

		expect(postExecutePromise).resolves.toEqual(fakeOutput);
	});

	test('Should throw error when trying to create a promise with invalid execution', async () => {
		expect(activeExecutions.getPostExecutePromise(FAKE_EXECUTION_ID)).rejects.toThrow();
	});

	test('Should call function to cancel execution when asked to stop', async () => {
		const newExecution = mockExecutionData();
		const executionId = await activeExecutions.add(newExecution);
		const cancelExecution = jest.fn();
		const cancellablePromise = mockCancelablePromise();
		cancellablePromise.cancel = cancelExecution;
		activeExecutions.attachWorkflowExecution(executionId, cancellablePromise);
		activeExecutions.stopExecution(executionId);

		expect(cancelExecution).toHaveBeenCalledTimes(1);
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
			connections: {},
		},
		userId: uuid(),
	};
}

function mockFullRunData(): IRun {
	return {
		data: {
			resultData: {
				runData: {},
			},
		},
		mode: 'manual',
		startedAt: new Date(),
		status: 'new',
	};
}

function mockCancelablePromise(): PCancelable<IRun> {
	return new PCancelable(async (resolve) => {
		resolve();
	});
}

function mockDeferredPromise(): Promise<IDeferredPromise<IExecuteResponsePromiseData>> {
	return createDeferredPromise<IExecuteResponsePromiseData>();
}
