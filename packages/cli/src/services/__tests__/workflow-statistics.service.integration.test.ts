import {
	getPersonalProject,
	createTeamProject,
	createWorkflow,
	testDb,
	mockInstance,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { IWorkflowDb, Project, WorkflowEntity, WorkflowRepository, User } from '@n8n/db';
import { SettingsRepository, WorkflowStatisticsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	QueryFailedError,
	type DataSource,
	type EntityManager,
	type EntityMetadata,
} from '@n8n/typeorm';
import { createUser } from '@test-integration/db/users';
import { mocked } from 'jest-mock';
import { mock } from 'jest-mock-extended';
import {
	createEmptyRunExecutionData,
	type ExecutionStatus,
	type INode,
	type IRun,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

import { EventService } from '@/events/event.service';
import { OwnershipService } from '@/services/ownership.service';
import { UserService } from '@/services/user.service';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';

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
			// Clear first production failure setting
			const settingsRepository = Container.get(SettingsRepository);
			await settingsRepository.delete({ key: 'instance.firstProductionFailure' });
		});

		test.each<WorkflowExecuteMode>(['cli', 'error', 'retry', 'trigger', 'webhook', 'evaluation'])(
			'should upsert `count` and `rootCount` for execution mode %s',
			async (mode) => {
				// ARRANGE
				const runData: IRun = {
					finished: true,
					status: 'success',
					data: createEmptyRunExecutionData(),
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
					workflowName: workflow.name,
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
					data: createEmptyRunExecutionData(),
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
					workflowName: workflow.name,
				});
			},
		);

		it('should not upsert statistics for execution mode chat', async () => {
			// ARRANGE
			const runData: IRun = {
				finished: true,
				status: 'success',
				data: createEmptyRunExecutionData(),
				mode: 'chat',
				startedAt: new Date(),
			};

			// ACT
			await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);
			await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);

			// ASSERT
			const statistics = await workflowStatisticsRepository.find();
			expect(statistics).toHaveLength(0);
		});

		test.each<ExecutionStatus>(['success', 'crashed', 'error'])(
			'should upsert `count` and `rootCount` for execution status %s',
			async (status) => {
				// ARRANGE
				const runData: IRun = {
					finished: true,
					status,
					data: createEmptyRunExecutionData(),
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
					workflowName: workflow.name,
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
					data: createEmptyRunExecutionData(),
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
					workflowName: workflow.name,
				});
			},
		);

		test('updates user settings and emit first-production-workflow-succeeded', async () => {
			// ARRANGE
			const runData: IRun = {
				finished: true,
				status: 'success',
				data: createEmptyRunExecutionData(),
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
				data: createEmptyRunExecutionData(),
				mode: 'internal',
				startedAt: new Date(),
			};
			const emitSpy = jest.spyOn(Container.get(EventService), 'emit');
			const updateSettingsSpy = jest.spyOn(userService, 'updateSettings');

			// ACT
			await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);

			// ASSERT
			expect(updateSettingsSpy).not.toHaveBeenCalled();
			expect(emitSpy).not.toHaveBeenCalledWith(
				'first-production-workflow-succeeded',
				expect.anything(),
			);
		});

		test('does not update user settings and does not emit first-production-workflow-succeeded for successive executions', async () => {
			// ARRANGE
			const runData: IRun = {
				finished: true,
				status: 'success',
				data: createEmptyRunExecutionData(),
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

		test('emits instance-first-production-workflow-failed event on first production failure when no error workflows exist', async () => {
			// ARRANGE
			const runData: IRun = {
				finished: false,
				status: 'error',
				data: createEmptyRunExecutionData(),
				mode: 'trigger',
				startedAt: new Date(),
			};

			// Create a fresh instance with workflowRepository returning false (no error workflows exist)
			const workflowRepositoryNoErrorWorkflows = mock<WorkflowRepository>();
			(
				workflowRepositoryNoErrorWorkflows as unknown as {
					hasAnyWorkflowsWithErrorWorkflow: jest.Mock;
				}
			).hasAnyWorkflowsWithErrorWorkflow.mockResolvedValue(false);
			const settingsRepository = Container.get(SettingsRepository);
			const statisticsService = new WorkflowStatisticsService(
				mock(),
				workflowStatisticsRepository,
				Container.get(OwnershipService),
				userService,
				Container.get(EventService),
				settingsRepository,
				workflowRepositoryNoErrorWorkflows,
			);
			const emitSpy = jest.spyOn(Container.get(EventService), 'emit');

			// ACT
			await statisticsService.workflowExecutionCompleted(workflow, runData);

			// ASSERT
			expect(emitSpy).toHaveBeenCalledWith('instance-first-production-workflow-failed', {
				projectId: personalProject.id,
				workflowId: workflow.id,
				workflowName: workflow.name,
				userId: user.id,
			});
		});

		test('does not emit instance-first-production-workflow-failed event on successive production failures', async () => {
			// ARRANGE
			const runData: IRun = {
				finished: false,
				status: 'error',
				data: createEmptyRunExecutionData(),
				mode: 'trigger',
				startedAt: new Date(),
			};

			// Create a fresh instance with workflowRepository returning false (no error workflows exist)
			const workflowRepositoryNoErrorWorkflows = mock<WorkflowRepository>();
			(
				workflowRepositoryNoErrorWorkflows as unknown as {
					hasAnyWorkflowsWithErrorWorkflow: jest.Mock;
				}
			).hasAnyWorkflowsWithErrorWorkflow.mockResolvedValue(false);
			const settingsRepository = Container.get(SettingsRepository);
			const statisticsService = new WorkflowStatisticsService(
				mock(),
				workflowStatisticsRepository,
				Container.get(OwnershipService),
				userService,
				Container.get(EventService),
				settingsRepository,
				workflowRepositoryNoErrorWorkflows,
			);

			// First failure - this will set the instance.firstProductionFailure setting
			await statisticsService.workflowExecutionCompleted(workflow, runData);
			const emitSpy = jest.spyOn(Container.get(EventService), 'emit');

			// ACT - Second failure
			await statisticsService.workflowExecutionCompleted(workflow, runData);

			// ASSERT
			expect(emitSpy).not.toHaveBeenCalled();
		});

		test('does not emit instance-first-production-workflow-failed event when error workflows exist', async () => {
			// ARRANGE
			const runData: IRun = {
				finished: false,
				status: 'error',
				data: createEmptyRunExecutionData(),
				mode: 'trigger',
				startedAt: new Date(),
			};

			// Create a fresh instance with workflowRepository returning true (error workflows exist)
			const workflowRepositoryWithErrorWorkflows = mock<WorkflowRepository>();
			(
				workflowRepositoryWithErrorWorkflows as unknown as {
					hasAnyWorkflowsWithErrorWorkflow: jest.Mock;
				}
			).hasAnyWorkflowsWithErrorWorkflow.mockResolvedValue(true);
			const settingsRepository = Container.get(SettingsRepository);
			const statisticsService = new WorkflowStatisticsService(
				mock(),
				workflowStatisticsRepository,
				Container.get(OwnershipService),
				userService,
				Container.get(EventService),
				settingsRepository,
				workflowRepositoryWithErrorWorkflows,
			);
			const emitSpy = jest.spyOn(Container.get(EventService), 'emit');

			// ACT
			await statisticsService.workflowExecutionCompleted(workflow, runData);

			// ASSERT
			expect(emitSpy).not.toHaveBeenCalledWith(
				'instance-first-production-workflow-failed',
				expect.any(Object),
			);
		});

		test('does not emit instance-first-production-workflow-failed event for non-production mode failures', async () => {
			// ARRANGE
			const runData: IRun = {
				finished: false,
				status: 'error',
				data: createEmptyRunExecutionData(),
				mode: 'manual', // non-production mode
				startedAt: new Date(),
			};
			const emitSpy = jest.spyOn(Container.get(EventService), 'emit');

			// ACT
			await workflowStatisticsService.workflowExecutionCompleted(workflow, runData);

			// ASSERT
			expect(emitSpy).not.toHaveBeenCalledWith(
				'instance-first-production-workflow-failed',
				expect.any(Object),
			);
		});
		test('emits first-production-workflow-succeeded with null userId for team project', async () => {
			// ARRANGE
			const teamProject = await createTeamProject('Team Project');
			const teamWorkflow = await createWorkflow({}, teamProject);
			const runData: IRun = {
				finished: true,
				status: 'success',
				data: createEmptyRunExecutionData(),
				mode: 'internal',
				startedAt: new Date(),
			};
			const emitSpy = jest.spyOn(Container.get(EventService), 'emit');
			const updateSettingsSpy = jest.spyOn(userService, 'updateSettings');

			// ACT
			await workflowStatisticsService.workflowExecutionCompleted(teamWorkflow, runData);

			// ASSERT
			expect(updateSettingsSpy).not.toHaveBeenCalled();
			expect(emitSpy).toHaveBeenCalledTimes(1);
			expect(emitSpy).toHaveBeenCalledWith('first-production-workflow-succeeded', {
				projectId: teamProject.id,
				workflowId: teamWorkflow.id,
				userId: null,
			});
		});

		test('emits instance-first-production-workflow-failed with instance owner for team project', async () => {
			// ARRANGE
			const teamProject = await createTeamProject('Team Project for Failure');
			const teamWorkflow = await createWorkflow({ settings: {} }, teamProject);
			const runData: IRun = {
				finished: false,
				status: 'error',
				data: createEmptyRunExecutionData(),
				mode: 'trigger',
				startedAt: new Date(),
			};

			// Create a fresh instance with workflowRepository returning false (no error workflows exist)
			const workflowRepositoryNoErrorWorkflows = mock<WorkflowRepository>();
			(
				workflowRepositoryNoErrorWorkflows as unknown as {
					hasAnyWorkflowsWithErrorWorkflow: jest.Mock;
				}
			).hasAnyWorkflowsWithErrorWorkflow.mockResolvedValue(false);
			const ownershipService = Container.get(OwnershipService);
			const settingsRepository = Container.get(SettingsRepository);
			const statisticsService = new WorkflowStatisticsService(
				mock(),
				workflowStatisticsRepository,
				ownershipService,
				userService,
				Container.get(EventService),
				settingsRepository,
				workflowRepositoryNoErrorWorkflows,
			);
			const emitSpy = jest.spyOn(Container.get(EventService), 'emit');

			// Get the instance owner to verify the userId
			const instanceOwner = await ownershipService.getInstanceOwner();

			// ACT
			await statisticsService.workflowExecutionCompleted(teamWorkflow, runData);

			// ASSERT
			// For team projects, it should fall back to instance owner
			expect(emitSpy).toHaveBeenCalledWith('instance-first-production-workflow-failed', {
				projectId: teamProject.id,
				workflowId: teamWorkflow.id,
				workflowName: teamWorkflow.name,
				userId: instanceOwner.id,
			});
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
			const settingsRepository = mock<SettingsRepository>();
			const workflowRepository = mock<WorkflowRepository>();
			(
				workflowRepository as unknown as { hasAnyWorkflowsWithErrorWorkflow: jest.Mock }
			).hasAnyWorkflowsWithErrorWorkflow.mockResolvedValue(false);
			workflowStatisticsService = new WorkflowStatisticsService(
				mock(),
				workflowStatisticsRepository,
				ownershipService,
				userService,
				eventService,
				settingsRepository,
				workflowRepository,
			);
			globalConfig.diagnostics.enabled = true;
			globalConfig.deployment.type = 'n8n-testing';
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
