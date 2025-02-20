import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import {
	QueryFailedError,
	type DataSource,
	type EntityManager,
	type EntityMetadata,
} from '@n8n/typeorm';
import { mocked } from 'jest-mock';
import { mock } from 'jest-mock-extended';
import type { INode, IRun, WorkflowExecuteMode } from 'n8n-workflow';

import config from '@/config';
import type { Project } from '@/databases/entities/project';
import type { User } from '@/databases/entities/user';
import type { WorkflowStatistics } from '@/databases/entities/workflow-statistics';
import { WorkflowStatisticsRepository } from '@/databases/repositories/workflow-statistics.repository';
import type { EventService } from '@/events/event.service';
import { OwnershipService } from '@/services/ownership.service';
import { UserService } from '@/services/user.service';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import { mockInstance } from '@test/mocking';

describe('WorkflowStatisticsService', () => {
	const fakeUser = mock<User>({ id: 'abcde-fghij' });
	const fakeProject = mock<Project>({ id: '12345-67890', type: 'personal' });
	const ownershipService = mockInstance(OwnershipService);
	const userService = mockInstance(UserService);
	const globalConfig = Container.get(GlobalConfig);
	const dbType = globalConfig.database.type;

	const entityManager = mock<EntityManager>();
	const dataSource = mock<DataSource>({
		manager: entityManager,
		getMetadata: () =>
			mock<EntityMetadata>({
				tableName: 'workflow_statistics',
			}),
	});
	Object.assign(entityManager, { connection: dataSource });

	globalConfig.diagnostics.enabled = true;
	config.set('deployment.type', 'n8n-testing');
	mocked(ownershipService.getWorkflowProjectCached).mockResolvedValue(fakeProject);
	mocked(ownershipService.getPersonalProjectOwnerCached).mockResolvedValue(fakeUser);
	const updateSettingsMock = jest.spyOn(userService, 'updateSettings').mockImplementation();

	const eventService = mock<EventService>();
	const workflowStatisticsService = new WorkflowStatisticsService(
		mock(),
		new WorkflowStatisticsRepository(dataSource, globalConfig),
		ownershipService,
		userService,
		eventService,
	);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	const mockDBCall = (count = 1) => {
		if (dbType === 'sqlite') {
			entityManager.findOne.mockResolvedValueOnce(mock<WorkflowStatistics>({ count }));
		} else {
			const result = dbType === 'postgresdb' ? [{ count }] : { affectedRows: count };
			entityManager.query.mockImplementationOnce(async (query) =>
				query.startsWith('INSERT INTO') ? result : null,
			);
		}
	};

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
			mockDBCall();

			await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);
			expect(updateSettingsMock).toHaveBeenCalledTimes(1);
			expect(eventService.emit).toHaveBeenCalledWith('first-production-workflow-succeeded', {
				projectId: fakeProject.id,
				workflowId: workflow.id,
				userId: fakeUser.id,
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
				status: 'error',
				data: { resultData: { runData: {} } },
				mode: 'internal' as WorkflowExecuteMode,
				startedAt: new Date(),
			};
			await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		test('should not send metrics for updated entries', async () => {
			// Call the function with a fail insert, ensure update is called *and* metrics aren't sent
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
			mockDBCall(2);
			await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);
			expect(eventService.emit).not.toHaveBeenCalled();
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
			await workflowStatisticsService.nodeFetchedData(workflowId, node);
			expect(eventService.emit).toHaveBeenCalledWith('first-workflow-data-loaded', {
				userId: fakeUser.id,
				project: fakeProject.id,
				workflowId,
				nodeType: node.type,
				nodeId: node.id,
			});
		});

		test('should emit event with no `userId` if workflow is owned by team project', async () => {
			const workflowId = '123';
			ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(null);
			const node = mock<INode>({ id: '123', type: 'n8n-nodes-base.noOp', credentials: {} });

			await workflowStatisticsService.nodeFetchedData(workflowId, node);

			expect(eventService.emit).toHaveBeenCalledWith('first-workflow-data-loaded', {
				userId: '',
				project: fakeProject.id,
				workflowId,
				nodeType: node.type,
				nodeId: node.id,
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
			await workflowStatisticsService.nodeFetchedData(workflowId, node);
			expect(eventService.emit).toHaveBeenCalledWith('first-workflow-data-loaded', {
				userId: fakeUser.id,
				project: fakeProject.id,
				workflowId,
				nodeType: node.type,
				nodeId: node.id,
				credentialType: 'testCredentials',
				credentialId: node.credentials.testCredentials.id,
			});
		});

		test('should not send metrics for entries that already have the flag set', async () => {
			// Fetch data for workflow 2 which is set up to not be altered in the mocks
			entityManager.insert.mockRejectedValueOnce(new QueryFailedError('', undefined, new Error()));
			const workflowId = '1';
			const node = {
				id: 'abcde',
				name: 'test node',
				typeVersion: 1,
				type: '',
				position: [0, 0] as [number, number],
				parameters: {},
			};
			await workflowStatisticsService.nodeFetchedData(workflowId, node);
			expect(eventService.emit).not.toHaveBeenCalled();
		});
	});
});
