import { getPersonalProject, createWorkflow, testDb, mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { IWorkflowDb, Project, WorkflowEntity, User } from '@n8n/db';
import { WorkflowStatisticsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	QueryFailedError,
	type DataSource,
	type EntityManager,
	type EntityMetadata,
} from '@n8n/typeorm';
import { mocked } from 'jest-mock';
import { mock } from 'jest-mock-extended';
import {
	type ExecutionStatus,
	type INode,
	type IRun,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

import config from '@/config';
import { EventService } from '@/events/event.service';
import { OwnershipService } from '@/services/ownership.service';
import { UserService } from '@/services/user.service';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import { createUser } from '@test-integration/db/users';

describe('WorkflowStatisticsService', () => {
	describe('workflowExecutionCompleted', () => {
		let workflowStatisticsService: WorkflowStatisticsService;
		let workflowStatisticsRepository: WorkflowStatisticsRepository;
		let userService: UserService;
		let user: User;
		let personalProject: Project;
		let workflow: IWorkflowDb & WorkflowEntity;

		beforeAll(async () => {
			await testDb.init();
			workflowStatisticsService = Container.get(WorkflowStatisticsService);
			workflowStatisticsRepository = Container.get(WorkflowStatisticsRepository);
			userService = Container.get(UserService);
			user = await createUser();
			personalProject = await getPersonalProject(user);
			workflow = await createWorkflow({}, user);
		});

		afterAll(async () => {
			await testDb.terminate();
		});

		beforeEach(async () => {
			jest.restoreAllMocks();
			await testDb.truncate(['WorkflowStatistics']);
		});

		test.each<WorkflowExecuteMode>(['cli', 'error', 'retry', 'trigger', 'webhook', 'evaluation'])(
			'should upsert `count` and `rootCount` for execution mode %s',
			async (mode) => {
				// ARRANGE
				const runData: IRun = {
					finished: true,
					status: 'success',
					data: { resultData: { runData: {} } },
					mode,
					startedAt: new Date(),
				};

				// ACT
				await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);
				await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);

				// ASSERT
				const statistics = await workflowStatisticsRepository.find();
				expect(statistics).toHaveLength(1);
				expect(statistics[0]).toMatchObject({
					count: 2,
					rootCount: 2,
					latestEvent: expect.any(Date),
					name: 'production_success',
					workflowId: workflow.id,
				});
			},
		);

		test.each<WorkflowExecuteMode>(['manual', 'integrated', 'internal'])(
			'should upsert `count`, but not `rootCount` for execution mode %s',
			async (mode) => {
				// ARRANGE
				const runData: IRun = {
					finished: true,
					// use `success` to make sure it would upsert if it were not for the
					// mode used
					status: 'success',
					data: { resultData: { runData: {} } },
					mode,
					startedAt: new Date(),
				};

				// ACT
				await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);
				await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);

				// ASSERT
				const statistics = await workflowStatisticsRepository.find();
				expect(statistics).toHaveLength(1);
				expect(statistics[0]).toMatchObject({
					count: 2,
					rootCount: 0,
					latestEvent: expect.any(Date),
					name: mode === 'manual' ? 'manual_success' : 'production_success',
					workflowId: workflow.id,
				});
			},
		);

		test.each<ExecutionStatus>(['success', 'crashed', 'error'])(
			'should upsert `count` and `rootCount` for execution status %s',
			async (status) => {
				// ARRANGE
				const runData: IRun = {
					finished: true,
					status,
					data: { resultData: { runData: {} } },
					mode: 'trigger',
					startedAt: new Date(),
				};

				// ACT
				await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);
				await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);

				// ASSERT
				const statistics = await workflowStatisticsRepository.find();
				expect(statistics).toHaveLength(1);
				expect(statistics[0]).toMatchObject({
					count: 2,
					rootCount: 2,
					latestEvent: expect.any(Date),
					name: status === 'success' ? 'production_success' : 'production_error',
					workflowId: workflow.id,
				});
			},
		);

		test.each<ExecutionStatus>(['canceled', 'new', 'running', 'unknown', 'waiting'])(
			'should upsert `count`, but not `rootCount` for execution status %s',
			async (status) => {
				// ARRANGE
				const runData: IRun = {
					finished: true,
					status,
					data: { resultData: { runData: {} } },
					// use `trigger` to make sure it would upsert if it were not for the
					// status used
					mode: 'trigger',
					startedAt: new Date(),
				};

				// ACT
				await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);
				await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);

				// ASSERT
				const statistics = await workflowStatisticsRepository.find();
				expect(statistics).toHaveLength(1);
				expect(statistics[0]).toMatchObject({
					count: 2,
					rootCount: 0,
					latestEvent: expect.any(Date),
					name: 'production_error',
					workflowId: workflow.id,
				});
			},
		);

		test('updates user settings and emit first-production-workflow-succeeded', async () => {
			// ARRANGE
			const runData: IRun = {
				finished: true,
				status: 'success',
				data: { resultData: { runData: {} } },
				mode: 'internal',
				startedAt: new Date(),
			};
			const emitSpy = jest.spyOn(Container.get(EventService), 'emit');
			const updateSettingsSpy = jest.spyOn(userService, 'updateSettings');

			// ACT
			await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);

			// ASSERT
			expect(updateSettingsSpy).toHaveBeenCalledTimes(1);
			expect(updateSettingsSpy).toHaveBeenCalledWith(user.id, {
				firstSuccessfulWorkflowId: workflow.id,
				userActivated: true,
				userActivatedAt: runData.startedAt.getTime(),
			});
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expect(emitSpy).toHaveBeenCalledWith('first-production-workflow-succeeded', {
				projectId: personalProject.id,
				workflowId: workflow.id,
				userId: user.id,
			});
		});

		test('does not update user settings and does not emit first-production-workflow-succeeded for failing executions', async () => {
			// ARRANGE
			const runData: IRun = {
				finished: false,
				status: 'error',
				data: { resultData: { runData: {} } },
				mode: 'internal',
				startedAt: new Date(),
			};
			const emitSpy = jest.spyOn(Container.get(EventService), 'emit');
			const updateSettingsSpy = jest.spyOn(userService, 'updateSettings');

			// ACT
			await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);

			// ASSERT
			expect(updateSettingsSpy).not.toHaveBeenCalled();
			expect(emitSpy).not.toHaveBeenCalled();
		});

		test('does not update user settings and does not emit first-production-workflow-succeeded for successive executions', async () => {
			// ARRANGE
			const runData: IRun = {
				finished: true,
				status: 'success',
				data: { resultData: { runData: {} } },
				mode: 'internal',
				startedAt: new Date(),
			};
			await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);
			const emitSpy = jest.spyOn(Container.get(EventService), 'emit');
			const updateSettingsSpy = jest.spyOn(Container.get(UserService), 'updateSettings');

			// ACT
			await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);

			// ASSERT
			expect(updateSettingsSpy).not.toHaveBeenCalled();
			expect(emitSpy).not.toHaveBeenCalled();
		});
	});

	describe('nodeFetchedData', () => {
		let workflowStatisticsService: WorkflowStatisticsService;
		let eventService: EventService;
		let user: User;
		let project: Project;
		let ownershipService: OwnershipService;
		let entityManager: EntityManager;
		let userService: UserService;
		let workflowStatisticsRepository: WorkflowStatisticsRepository;

		beforeAll(() => {
			user = mock<User>({ id: 'abcde-fghij' });
			project = mock<Project>({ id: '12345-67890', type: 'personal' });
			ownershipService = mockInstance(OwnershipService);
			userService = mockInstance(UserService);
			const globalConfig = Container.get(GlobalConfig);

			entityManager = mock<EntityManager>();
			const dataSource = mock<DataSource>({
				manager: entityManager,
				getMetadata: () =>
					mock<EntityMetadata>({
						tableName: 'workflow_statistics',
					}),
				driver: { escape: jest.fn((id) => id) },
			});
			Object.assign(entityManager, { connection: dataSource });
			eventService = mock<EventService>();
			workflowStatisticsRepository = new WorkflowStatisticsRepository(dataSource, globalConfig);
			workflowStatisticsService = new WorkflowStatisticsService(
				mock(),
				workflowStatisticsRepository,
				ownershipService,
				userService,
				eventService,
			);
			globalConfig.diagnostics.enabled = true;
			config.set('deployment.type', 'n8n-testing');
			mocked(ownershipService.getWorkflowProjectCached).mockResolvedValue(project);
			mocked(ownershipService.getPersonalProjectOwnerCached).mockResolvedValue(user);
		});

		afterAll(() => {
			jest.resetAllMocks();
		});

		beforeEach(() => {
			jest.clearAllMocks();
		});

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
				userId: user.id,
				project: project.id,
				workflowId,
				nodeType: node.type,
				nodeId: node.id,
			});
		});

		test('should emit event with no `userId` if workflow is owned by team project', async () => {
			const workflowId = '123';
			mocked(ownershipService.getPersonalProjectOwnerCached).mockResolvedValueOnce(null);
			const node = mock<INode>({ id: '123', type: 'n8n-nodes-base.noOp', credentials: {} });

			await workflowStatisticsService.nodeFetchedData(workflowId, node);

			expect(eventService.emit).toHaveBeenCalledWith('first-workflow-data-loaded', {
				userId: '',
				project: project.id,
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
				userId: user.id,
				project: project.id,
				workflowId,
				nodeType: node.type,
				nodeId: node.id,
				credentialType: 'testCredentials',
				credentialId: node.credentials.testCredentials.id,
			});
		});

		test('should not send metrics for entries that already have the flag set', async () => {
			// Fetch data for workflow 2 which is set up to not be altered in the mocks
			mocked(entityManager.insert).mockRejectedValueOnce(
				new QueryFailedError('', undefined, new Error()),
			);
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
