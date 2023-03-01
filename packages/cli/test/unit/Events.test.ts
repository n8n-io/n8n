import { LoggerProxy, WorkflowExecuteMode } from 'n8n-workflow';
import { QueryFailedError } from 'typeorm';
import config from '@/config';
import { Db } from '@/index';
import { nodeFetchedData, workflowExecutionCompleted } from '@/events/WorkflowStatistics';
import { getLogger } from '@/Logger';
import * as UserManagementHelper from '@/UserManagement/UserManagementHelper';
import { InternalHooks } from '@/InternalHooks';
import { mockInstance } from '../integration/shared/utils';

const FAKE_USER_ID = 'abcde-fghij';

jest.mock('@/Db', () => {
	return {
		collections: {
			WorkflowStatistics: {
				insert: jest.fn((...args) => {}),
				update: jest.fn((...args) => {}),
			},
		},
	};
});
jest.spyOn(UserManagementHelper, 'getWorkflowOwner').mockImplementation(async (_workflowId) => {
	return { id: FAKE_USER_ID };
});

describe('Events', () => {
	const internalHooks = mockInstance(InternalHooks);

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
			const runData = {
				finished: true,
				data: { resultData: { runData: {} } },
				mode: 'internal' as WorkflowExecuteMode,
				startedAt: new Date(),
			};
			await workflowExecutionCompleted(workflow, runData);
			expect(internalHooks.onFirstProductionWorkflowSuccess).toBeCalledTimes(1);
			expect(internalHooks.onFirstProductionWorkflowSuccess).toHaveBeenNthCalledWith(1, {
				user_id: FAKE_USER_ID,
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
			const runData = {
				finished: false,
				data: { resultData: { runData: {} } },
				mode: 'internal' as WorkflowExecuteMode,
				startedAt: new Date(),
			};
			await workflowExecutionCompleted(workflow, runData);
			expect(internalHooks.onFirstProductionWorkflowSuccess).toBeCalledTimes(0);
		});

		test('should not send metrics for updated entries', async () => {
			// Call the function with a fail insert, ensure update is called *and* metrics aren't sent
			Db.collections.WorkflowStatistics.insert.mockImplementationOnce(() => {
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
			const runData = {
				finished: true,
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
				user_id: FAKE_USER_ID,
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
				user_id: FAKE_USER_ID,
				workflow_id: workflowId,
				node_type: node.type,
				node_id: node.id,
				credential_type: 'testCredentials',
				credential_id: node.credentials.testCredentials.id,
			});
		});

		test('should not send metrics for entries that already have the flag set', async () => {
			// Fetch data for workflow 2 which is set up to not be altered in the mocks
			Db.collections.WorkflowStatistics.insert.mockImplementationOnce(() => {
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
