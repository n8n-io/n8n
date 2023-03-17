import { IRun, LoggerProxy, WorkflowExecuteMode } from 'n8n-workflow';
import { QueryFailedError, Repository } from 'typeorm';
import { mock } from 'jest-mock-extended';

import config from '@/config';
import * as Db from '@/Db';
import { User } from '@db/entities/User';
import { WorkflowStatistics } from '@db/entities/WorkflowStatistics';
import { nodeFetchedData, workflowExecutionCompleted } from '@/events/WorkflowStatistics';
import * as UserManagementHelper from '@/UserManagement/UserManagementHelper';
import { getLogger } from '@/Logger';
import { InternalHooks } from '@/InternalHooks';

import { mockInstance } from '../integration/shared/utils';

type WorkflowStatisticsRepository = Repository<WorkflowStatistics>;
jest.mock('@/Db', () => {
	return {
		collections: {
			WorkflowStatistics: mock<WorkflowStatisticsRepository>(),
		},
	};
});

describe('Events', () => {
	const fakeUser = Object.assign(new User(), { id: 'abcde-fghij' });
	const internalHooks = mockInstance(InternalHooks);

	jest.spyOn(UserManagementHelper, 'getWorkflowOwner').mockResolvedValue(fakeUser);

	const workflowStatisticsRepository = Db.collections.WorkflowStatistics as ReturnType<
		typeof mock<WorkflowStatisticsRepository>
	>;

	beforeAll(() => {
		config.set('diagnostics.enabled', true);
		config.set('deployment.type', 'n8n-testing');
		LoggerProxy.init(getLogger());
	});

	afterAll(() => {
		jest.clearAllTimers();
		jest.useRealTimers();
	});

	beforeEach(() => {
		internalHooks.onFirstProductionWorkflowSuccess.mockClear();
		internalHooks.onFirstWorkflowDataLoad.mockClear();
	});

	afterEach(() => {});

	describe('workflowExecutionCompleted', () => {
		test('should create metrics for production successes', async () => {
			// Call the function with a production success result, ensure metrics hook gets called
			const workflow = {
				id: '1',
				name: '',
				active: false,
				createdAt: new Date(),
				updatedAt: new Date(),
				nodes: [],
				connections: {},
			};
			const runData: IRun = {
				finished: true,
				status: 'success',
				data: { resultData: { runData: {} } },
				mode: 'internal' as WorkflowExecuteMode,
				startedAt: new Date(),
			};
			await workflowExecutionCompleted(workflow, runData);
			expect(internalHooks.onFirstProductionWorkflowSuccess).toBeCalledTimes(1);
			expect(internalHooks.onFirstProductionWorkflowSuccess).toHaveBeenNthCalledWith(1, {
				user_id: fakeUser.id,
				workflow_id: workflow.id,
			});
		});

		test('should only create metrics for production successes', async () => {
			// Call the function with a non production success result, ensure metrics hook is never called
			const workflow = {
				id: '1',
				name: '',
				active: false,
				createdAt: new Date(),
				updatedAt: new Date(),
				nodes: [],
				connections: {},
			};
			const runData: IRun = {
				finished: false,
				status: 'failed',
				data: { resultData: { runData: {} } },
				mode: 'internal' as WorkflowExecuteMode,
				startedAt: new Date(),
			};
			await workflowExecutionCompleted(workflow, runData);
			expect(internalHooks.onFirstProductionWorkflowSuccess).toBeCalledTimes(0);
		});

		test('should not send metrics for updated entries', async () => {
			// Call the function with a fail insert, ensure update is called *and* metrics aren't sent
			workflowStatisticsRepository.insert.mockImplementationOnce(() => {
				throw new QueryFailedError('invalid insert', [], '');
			});
			const workflow = {
				id: '1',
				name: '',
				active: false,
				createdAt: new Date(),
				updatedAt: new Date(),
				nodes: [],
				connections: {},
			};
			const runData: IRun = {
				finished: true,
				status: 'success',
				data: { resultData: { runData: {} } },
				mode: 'internal' as WorkflowExecuteMode,
				startedAt: new Date(),
			};
			await workflowExecutionCompleted(workflow, runData);
			expect(internalHooks.onFirstProductionWorkflowSuccess).toBeCalledTimes(0);
		});
	});

	describe('nodeFetchedData', () => {
		test('should create metrics when the db is updated', async () => {
			// Call the function with a production success result, ensure metrics hook gets called
			const workflowId = '1';
			const node = {
				id: 'abcde',
				name: 'test node',
				typeVersion: 1,
				type: '',
				position: [0, 0] as [number, number],
				parameters: {},
			};
			await nodeFetchedData(workflowId, node);
			expect(internalHooks.onFirstWorkflowDataLoad).toBeCalledTimes(1);
			expect(internalHooks.onFirstWorkflowDataLoad).toHaveBeenNthCalledWith(1, {
				user_id: fakeUser.id,
				workflow_id: workflowId,
				node_type: node.type,
				node_id: node.id,
			});
		});

		test('should create metrics with credentials when the db is updated', async () => {
			// Call the function with a production success result, ensure metrics hook gets called
			const workflowId = '1';
			const node = {
				id: 'abcde',
				name: 'test node',
				typeVersion: 1,
				type: '',
				position: [0, 0] as [number, number],
				parameters: {},
				credentials: {
					testCredentials: {
						id: '1',
						name: 'Test Credentials',
					},
				},
			};
			await nodeFetchedData(workflowId, node);
			expect(internalHooks.onFirstWorkflowDataLoad).toBeCalledTimes(1);
			expect(internalHooks.onFirstWorkflowDataLoad).toHaveBeenNthCalledWith(1, {
				user_id: fakeUser.id,
				workflow_id: workflowId,
				node_type: node.type,
				node_id: node.id,
				credential_type: 'testCredentials',
				credential_id: node.credentials.testCredentials.id,
			});
		});

		test('should not send metrics for entries that already have the flag set', async () => {
			// Fetch data for workflow 2 which is set up to not be altered in the mocks
			workflowStatisticsRepository.insert.mockImplementationOnce(() => {
				throw new QueryFailedError('invalid insert', [], '');
			});
			const workflowId = '1';
			const node = {
				id: 'abcde',
				name: 'test node',
				typeVersion: 1,
				type: '',
				position: [0, 0] as [number, number],
				parameters: {},
			};
			await nodeFetchedData(workflowId, node);
			expect(internalHooks.onFirstWorkflowDataLoad).toBeCalledTimes(0);
		});
	});
});
