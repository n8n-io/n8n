import { WaitTracker } from '@/WaitTracker';
import { mock } from 'jest-mock-extended';
import { mockInstance } from '../shared/mocking';
import { OwnershipService } from '@/services/ownership.service';
import { User } from '@/databases/entities/User';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import type { IExecutionResponse } from '@/Interfaces';
import { Logger } from '@/Logger';
import Container from 'typedi';
import { Push } from '@/push';
import { ActiveExecutions } from '@/ActiveExecutions';

jest.useFakeTimers();

Container.set(Logger, mockInstance(Logger));
Container.set(Push, mockInstance(Push));
Container.set(ActiveExecutions, mockInstance(ActiveExecutions));

const workflowOwner = new User();
workflowOwner.id = '123';

let executionsToReturn: IExecutionResponse[] = [];
let executionToReturn: IExecutionResponse | undefined;

let startExecutionSpy: jest.SpyInstance;

const executionRepositoryFindSingleExecutionMock = jest.fn(async () => executionToReturn);
const executionRepositoryGetWaitingExecutionsMock = jest.fn(async () => executionsToReturn);
const executionRepositoryUpdateExistingExecutionMock = jest.fn();

const ownershipServiceGetWorkflowOwnerCachedMock = jest.fn(async () => {
	console.log('potato');
	return workflowOwner;
});

const fakeExecution: IExecutionResponse = {
	id: '123',
	data: { resultData: { runData: {} } },
	workflowData: {
		id: '456',
		name: 'Test workflow',
		active: true,
		createdAt: new Date(),
		updatedAt: new Date(),
		nodes: [],
		connections: {},
	},
	mode: 'trigger',
	startedAt: new Date(),
	finished: false,
	status: 'new',
	waitTill: new Date(new Date().getTime() + 1000),
};

describe('WaitTracker', () => {
	let waitTracker: WaitTracker;

	beforeEach(() => {
		waitTracker = new WaitTracker(
			mock(),
			mockInstance(ExecutionRepository, {
				// @ts-expect-error
				// We won't be implementing all overrides here
				findSingleExecution: executionRepositoryFindSingleExecutionMock,
				getWaitingExecutions: executionRepositoryGetWaitingExecutionsMock,
				updateExistingExecution: executionRepositoryUpdateExistingExecutionMock,
			}),
			mockInstance(OwnershipService),
		);
		startExecutionSpy = jest.spyOn(waitTracker, 'startExecution');
	});

	afterEach(() => {
		waitTracker.shutdown();
	});

	describe('getWaitingExecutions', () => {
		it('Should reach out to the database when constructed', async () => {
			expect(executionRepositoryGetWaitingExecutionsMock).toHaveBeenCalledTimes(1);
		});

		it('Should do nothing when there are no executions to start', async () => {
			await waitTracker.getWaitingExecutions();

			expect(executionRepositoryFindSingleExecutionMock).not.toHaveBeenCalled();
		});

		it('Should not call start execution when there is an execution to start but not enough time pass', async () => {
			executionsToReturn = [fakeExecution];

			await waitTracker.getWaitingExecutions();
			jest.advanceTimersByTime(100);
			expect(startExecutionSpy).not.toHaveBeenCalled();
		});

		it('Should call start execution when there is an execution to start and enough time elapsed', async () => {
			executionsToReturn = [fakeExecution];

			await waitTracker.getWaitingExecutions();
			jest.advanceTimersByTime(20000);
			expect(startExecutionSpy).toHaveBeenCalledWith('123');
		});
	});

	describe('startExecution', () => {
		it('Should fetch execution when called', async () => {
			executionRepositoryFindSingleExecutionMock.mockClear();
			executionRepositoryFindSingleExecutionMock.mockResolvedValue(fakeExecution);
			waitTracker.startExecution('123');
			jest.advanceTimersByTime(5);
			expect(executionRepositoryFindSingleExecutionMock).toHaveBeenCalled();
		});
	});
});
