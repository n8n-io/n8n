import type { Mock } from 'vitest';
import {
	getPersonalProject,
	createTeamProject,
	createWorkflow,
	testDb,
	mockInstance,
} from '@n8n/backend-test-utils';
import { DatabaseConfig, GlobalConfig } from '@n8n/config';
import type { IWorkflowDb, Project, WorkflowEntity, WorkflowRepository, User } from '@n8n/db';
import { SettingsRepository, StatisticsNames, WorkflowStatisticsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	QueryFailedError,
	DataSource,
	type EntityManager,
	type EntityMetadata,
} from '@n8n/typeorm';

import { mock } from 'vitest-mock-extended';
import {
	createEmptyRunExecutionData,
	type ExecutionStatus,
	type INode,
	type IRun,
	type WorkflowExecuteMode,
	type WorkflowExecutionSource,
} from 'n8n-workflow';

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
		let dataSource: DataSource;
		let isPostgres: boolean;

		beforeAll(async () => {
			await testDb.init();
			workflowStatisticsService = Container.get(WorkflowStatisticsService);
			workflowStatisticsRepository = Container.get(WorkflowStatisticsRepository);
			userService = Container.get(UserService);
			dataSource = Container.get(DataSource);
			isPostgres = Container.get(GlobalConfig).database.type === 'postgresdb';
			user = await createUser();
			personalProject = await getPersonalProject(user);
			workflow = await createWorkflow({}, user);
		});

		/**
		 * On Postgres, `workflowExecutionCompleted` appends to the delta table and the rollup folds it
		 * out of band. These tests assert the materialized counter + milestone, so we drive the fold
		 * here (the rollup's work, minus the leader/lock/timer) to mimic the synchronous behavior the
		 * SQLite path still has. On SQLite this is a no-op (the upsert path already materialized).
		 */
		const flushStats = async (service: WorkflowStatisticsService) => {
			if (!isPostgres) return;
			const { firstOccurrences } = await workflowStatisticsRepository.rollupIncrements(
				dataSource.manager,
				10_000,
			);
			for (const occ of firstOccurrences) {
				await service.emitFirstOccurrenceEvent(
					occ.name,
					occ.workflowId,
					occ.workflowName,
					occ.firstEventMs,
				);
			}
		};

		const completeAndFlush = async (
			service: WorkflowStatisticsService,
			workflowData: IWorkflowDb & WorkflowEntity,
			runData: IRun,
			source?: WorkflowExecutionSource,
		) => {
			await service.workflowExecutionCompleted(workflowData, runData, source);
			await flushStats(service);
		};

		afterAll(async () => {
			await testDb.terminate();
		});

		beforeEach(async () => {
			vi.restoreAllMocks();
			await testDb.truncate(['WorkflowStatistics', 'WorkflowStatisticsDelta']);
			// Clear first production failure setting
			const settingsRepository = Container.get(SettingsRepository);
			await settingsRepository.delete({ key: 'instance.firstProductionFailure' });
		});

		test.each<WorkflowExecuteMode>(['cli', 'retry', 'trigger', 'webhook', 'evaluation'])(
			'should upsert `count` and `rootCount` for execution mode %s',
			async (mode) => {
				// ARRANGE
				const runData: IRun = {
					finished: true,
					status: 'success',
					data: createEmptyRunExecutionData(),
					mode,
					startedAt: new Date(),
					storedAt: 'db',
				};

				// ACT
				await completeAndFlush(workflowStatisticsService, workflow, runData);
				await completeAndFlush(workflowStatisticsService, workflow, runData);

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

		test.each<WorkflowExecuteMode>(['manual', 'integrated', 'internal', 'error'])(
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
					storedAt: 'db',
				};

				// ACT
				await completeAndFlush(workflowStatisticsService, workflow, runData);
				await completeAndFlush(workflowStatisticsService, workflow, runData);

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

		test('should not upsert production statistics for chat execution mode', async () => {
			const mode: WorkflowExecuteMode = 'chat';
			for (const status of ['success', 'error', 'crashed'] as const) {
				await testDb.truncate(['WorkflowStatistics']);

				const runData: IRun = {
					finished: status === 'success',
					status,
					data: createEmptyRunExecutionData(),
					mode,
					startedAt: new Date(),
					storedAt: 'db',
				};

				await completeAndFlush(workflowStatisticsService, workflow, runData);

				const statistics = await workflowStatisticsRepository.find();
				expect(statistics).toHaveLength(0);
			}
		});

		test.each<WorkflowExecuteMode>(['trigger', 'webhook'])(
			'should count successful instance_ai-sourced execution with mode %s as manual, not production',
			async (mode) => {
				// ARRANGE
				const runData: IRun = {
					finished: true,
					status: 'success',
					data: createEmptyRunExecutionData(),
					mode,
					startedAt: new Date(),
					storedAt: 'db',
				};

				// ACT
				await completeAndFlush(workflowStatisticsService, workflow, runData, 'instance_ai');

				// ASSERT
				const statistics = await workflowStatisticsRepository.find();
				expect(statistics).toHaveLength(1);
				expect(statistics[0]).toMatchObject({
					count: 1,
					rootCount: 0,
					name: 'manual_success',
					workflowId: workflow.id,
				});
			},
		);

		test('should count failing instance_ai-sourced execution as manual error and not emit instance-first-production-workflow-failed', async () => {
			// ARRANGE
			const runData: IRun = {
				finished: false,
				status: 'error',
				data: createEmptyRunExecutionData(),
				mode: 'trigger',
				startedAt: new Date(),
				storedAt: 'db',
			};
			const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

			// ACT
			await completeAndFlush(workflowStatisticsService, workflow, runData, 'instance_ai');

			// ASSERT
			const statistics = await workflowStatisticsRepository.find();
			expect(statistics).toHaveLength(1);
			expect(statistics[0]).toMatchObject({
				count: 1,
				rootCount: 0,
				name: 'manual_error',
				workflowId: workflow.id,
			});
			expect(emitSpy).not.toHaveBeenCalledWith(
				'instance-first-production-workflow-failed',
				expect.anything(),
			);
		});

		test('should not update user settings or emit first-production-workflow-succeeded for instance_ai-sourced executions', async () => {
			// ARRANGE
			const runData: IRun = {
				finished: true,
				status: 'success',
				data: createEmptyRunExecutionData(),
				mode: 'trigger',
				startedAt: new Date(),
				storedAt: 'db',
			};
			const emitSpy = vi.spyOn(Container.get(EventService), 'emit');
			const updateSettingsSpy = vi.spyOn(userService, 'updateSettings');

			// ACT
			await completeAndFlush(workflowStatisticsService, workflow, runData, 'instance_ai');

			// ASSERT
			expect(updateSettingsSpy).not.toHaveBeenCalled();
			expect(emitSpy).not.toHaveBeenCalledWith(
				'first-production-workflow-succeeded',
				expect.anything(),
			);
		});

		test('should count user-sourced executions as production', async () => {
			// ARRANGE
			const runData: IRun = {
				finished: true,
				status: 'success',
				data: createEmptyRunExecutionData(),
				mode: 'trigger',
				startedAt: new Date(),
				storedAt: 'db',
			};

			// ACT
			await completeAndFlush(workflowStatisticsService, workflow, runData, 'user');

			// ASSERT
			const statistics = await workflowStatisticsRepository.find();
			expect(statistics).toHaveLength(1);
			expect(statistics[0]).toMatchObject({
				count: 1,
				rootCount: 1,
				name: 'production_success',
				workflowId: workflow.id,
			});
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
					storedAt: 'db',
				};

				// ACT
				await completeAndFlush(workflowStatisticsService, workflow, runData);
				await completeAndFlush(workflowStatisticsService, workflow, runData);

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
			'should not record statistics for non-terminal execution status %s',
			async (status) => {
				// ARRANGE
				const runData: IRun = {
					finished: true,
					status,
					data: createEmptyRunExecutionData(),
					mode: 'trigger',
					startedAt: new Date(),
					storedAt: 'db',
				};

				// ACT
				await completeAndFlush(workflowStatisticsService, workflow, runData);

				// ASSERT
				const statistics = await workflowStatisticsRepository.find();
				expect(statistics).toHaveLength(0);
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
				storedAt: 'db',
			};
			const emitSpy = vi.spyOn(Container.get(EventService), 'emit');
			const updateSettingsSpy = vi.spyOn(userService, 'updateSettings');

			// ACT
			await completeAndFlush(workflowStatisticsService, workflow, runData);

			// ASSERT
			expect(updateSettingsSpy).toHaveBeenCalledTimes(1);
			expect(updateSettingsSpy).toHaveBeenCalledWith(user.id, {
				firstSuccessfulWorkflowId: workflow.id,
				userActivated: true,
				// On Postgres the milestone fires from the fold using the delta's `firstEvent`
				// (~completion time), not `runData.startedAt` — an accepted best-effort drift.
				userActivatedAt: isPostgres ? expect.any(Number) : runData.startedAt.getTime(),
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
				storedAt: 'db',
			};
			const emitSpy = vi.spyOn(Container.get(EventService), 'emit');
			const updateSettingsSpy = vi.spyOn(userService, 'updateSettings');

			// ACT
			await completeAndFlush(workflowStatisticsService, workflow, runData);

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
				storedAt: 'db',
			};
			await completeAndFlush(workflowStatisticsService, workflow, runData);
			const emitSpy = vi.spyOn(Container.get(EventService), 'emit');
			const updateSettingsSpy = vi.spyOn(Container.get(UserService), 'updateSettings');

			// ACT
			await completeAndFlush(workflowStatisticsService, workflow, runData);

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
				storedAt: 'db',
			};

			// Create a fresh instance with workflowRepository returning false (no error workflows exist)
			const workflowRepositoryNoErrorWorkflows = mock<WorkflowRepository>();
			(
				workflowRepositoryNoErrorWorkflows as unknown as {
					hasAnyWorkflowsWithErrorWorkflow: Mock;
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
				Container.get(DatabaseConfig),
			);
			const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

			// ACT
			await completeAndFlush(statisticsService, workflow, runData);

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
				storedAt: 'db',
			};

			// Create a fresh instance with workflowRepository returning false (no error workflows exist)
			const workflowRepositoryNoErrorWorkflows = mock<WorkflowRepository>();
			(
				workflowRepositoryNoErrorWorkflows as unknown as {
					hasAnyWorkflowsWithErrorWorkflow: Mock;
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
				Container.get(DatabaseConfig),
			);

			// First failure - this will set the instance.firstProductionFailure setting
			await completeAndFlush(statisticsService, workflow, runData);
			const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

			// ACT - Second failure
			await completeAndFlush(statisticsService, workflow, runData);

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
				storedAt: 'db',
			};

			// Create a fresh instance with workflowRepository returning true (error workflows exist)
			const workflowRepositoryWithErrorWorkflows = mock<WorkflowRepository>();
			(
				workflowRepositoryWithErrorWorkflows as unknown as {
					hasAnyWorkflowsWithErrorWorkflow: Mock;
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
				Container.get(DatabaseConfig),
			);
			const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

			// ACT
			await completeAndFlush(statisticsService, workflow, runData);

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
				storedAt: 'db',
			};
			const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

			// ACT
			await completeAndFlush(workflowStatisticsService, workflow, runData);

			// ASSERT
			expect(emitSpy).not.toHaveBeenCalledWith(
				'instance-first-production-workflow-failed',
				expect.any(Object),
			);
		});

		test('does not emit instance-first-production-workflow-failed for waiting status (N8N-9680)', async () => {
			// ARRANGE - simulates the bug scenario where a workflow enters wait state
			const runData: IRun = {
				finished: false,
				status: 'waiting',
				data: createEmptyRunExecutionData(),
				mode: 'trigger',
				startedAt: new Date(),
				storedAt: 'db',
			};
			const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

			// ACT
			await completeAndFlush(workflowStatisticsService, workflow, runData);

			// ASSERT
			expect(emitSpy).not.toHaveBeenCalledWith(
				'instance-first-production-workflow-failed',
				expect.any(Object),
			);
			const statistics = await workflowStatisticsRepository.find();
			expect(statistics).toHaveLength(0);
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
				storedAt: 'db',
			};
			const emitSpy = vi.spyOn(Container.get(EventService), 'emit');
			const updateSettingsSpy = vi.spyOn(userService, 'updateSettings');

			// ACT
			await completeAndFlush(workflowStatisticsService, teamWorkflow, runData);

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
				storedAt: 'db',
			};

			// Create a fresh instance with workflowRepository returning false (no error workflows exist)
			const workflowRepositoryNoErrorWorkflows = mock<WorkflowRepository>();
			(
				workflowRepositoryNoErrorWorkflows as unknown as {
					hasAnyWorkflowsWithErrorWorkflow: Mock;
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
				Container.get(DatabaseConfig),
			);
			const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

			// Get the instance owner to verify the userId
			const instanceOwner = await ownershipService.getInstanceOwner();

			// ACT
			await completeAndFlush(statisticsService, teamWorkflow, runData);

			// ASSERT
			// For team projects, it should fall back to instance owner
			expect(emitSpy).toHaveBeenCalledWith('instance-first-production-workflow-failed', {
				projectId: teamProject.id,
				workflowId: teamWorkflow.id,
				workflowName: teamWorkflow.name,
				userId: instanceOwner.id,
			});
		});

		// The fold is Postgres-only (raw CTE). These exercise its mechanics directly via the repository.
		describe('rollupIncrements (Postgres append path)', () => {
			// The delta table is cleared by the outer beforeEach via testDb.truncate.
			const deltaTable = () =>
				`${Container.get(GlobalConfig).database.tablePrefix}workflow_statistics_delta`;

			const append = async (isRoot: boolean) =>
				await workflowStatisticsRepository.appendIncrement(
					StatisticsNames.productionSuccess,
					workflow.id,
					isRoot,
					workflow.name,
				);

			const appendFor = async (name: StatisticsNames, workflowId: string, isRoot: boolean) =>
				await workflowStatisticsRepository.appendIncrement(name, workflowId, isRoot, 'wf');

			const countersByKey = async () => {
				const rows = await workflowStatisticsRepository.find();
				return new Map(rows.map((r) => [`${r.workflowId}|${r.name}`, r]));
			};

			test('folds many appended deltas into one counter row with exact totals', async () => {
				if (!isPostgres) return;

				// 5 appends: 3 root, 2 non-root
				await append(true);
				await append(true);
				await append(true);
				await append(false);
				await append(false);

				const { increments, firstOccurrences } =
					await workflowStatisticsRepository.rollupIncrements(dataSource.manager, 10_000);

				expect(increments).toBe(5);
				expect(firstOccurrences).toHaveLength(1); // the new production_success counter row
				expect(firstOccurrences[0]).toMatchObject({
					name: 'production_success',
					workflowId: workflow.id,
				});

				const [counter] = await workflowStatisticsRepository.find();
				expect(counter).toMatchObject({ count: 5, rootCount: 3, name: 'production_success' });

				const remaining = await dataSource.query(`SELECT COUNT(*)::int AS c FROM ${deltaTable()}`);
				expect(remaining[0].c).toBe(0); // delta drained
			});

			test('drains a backlog larger than the batch size across multiple folds (bounded)', async () => {
				if (!isPostgres) return;

				for (let i = 0; i < 5; i++) await append(true);

				// Batch size 2 -> folds of 2, 2, 1, then 0 (drained).
				const counts: number[] = [];
				let folded: number;
				do {
					({ increments: folded } = await workflowStatisticsRepository.rollupIncrements(
						dataSource.manager,
						2,
					));
					counts.push(folded);
				} while (folded > 0);

				expect(counts).toEqual([2, 2, 1, 0]);

				const [counter] = await workflowStatisticsRepository.find();
				expect(counter).toMatchObject({ count: 5, rootCount: 5 });
			});

			test('does not report a first occurrence when the counter row already exists', async () => {
				if (!isPostgres) return;

				// First occurrence: creates the counter row.
				await append(true);
				const first = await workflowStatisticsRepository.rollupIncrements(
					dataSource.manager,
					10_000,
				);
				expect(first.firstOccurrences).toHaveLength(1);

				// Subsequent fold updates the existing row -> no first-occurrence -> no milestone.
				await append(true);
				const second = await workflowStatisticsRepository.rollupIncrements(
					dataSource.manager,
					10_000,
				);
				expect(second.increments).toBe(1);
				expect(second.firstOccurrences).toHaveLength(0);

				const [counter] = await workflowStatisticsRepository.find();
				expect(counter).toMatchObject({ count: 2 });
			});

			test('folds several (workflow, name) groups in one batch, each with its own totals', async () => {
				if (!isPostgres) return;

				const workflow2 = await createWorkflow({}, user);

				// Three groups folded together: exercises GROUP BY + the upsert/agg join.
				await appendFor(StatisticsNames.productionSuccess, workflow.id, true);
				await appendFor(StatisticsNames.productionSuccess, workflow.id, true);
				await appendFor(StatisticsNames.productionSuccess, workflow.id, false);
				await appendFor(StatisticsNames.productionError, workflow.id, true);
				await appendFor(StatisticsNames.productionSuccess, workflow2.id, true);
				await appendFor(StatisticsNames.productionSuccess, workflow2.id, true);

				const { increments, firstOccurrences } =
					await workflowStatisticsRepository.rollupIncrements(dataSource.manager, 10_000);

				expect(increments).toBe(6);

				// Every group is new, so each is reported once and attributed to the right (workflow, name).
				const occKeys = new Set(firstOccurrences.map((o) => `${o.workflowId}|${o.name}`));
				expect(occKeys).toEqual(
					new Set([
						`${workflow.id}|production_success`,
						`${workflow.id}|production_error`,
						`${workflow2.id}|production_success`,
					]),
				);

				const counters = await countersByKey();
				expect(counters.get(`${workflow.id}|production_success`)).toMatchObject({
					count: 3,
					rootCount: 2,
				});
				expect(counters.get(`${workflow.id}|production_error`)).toMatchObject({
					count: 1,
					rootCount: 1,
				});
				expect(counters.get(`${workflow2.id}|production_success`)).toMatchObject({
					count: 2,
					rootCount: 2,
				});
			});

			test('reports a first occurrence only for groups whose counter row is new', async () => {
				if (!isPostgres) return;

				const workflow2 = await createWorkflow({}, user);

				// Pre-existing counter row for workflow1/success.
				await appendFor(StatisticsNames.productionSuccess, workflow.id, true);
				await workflowStatisticsRepository.rollupIncrements(dataSource.manager, 10_000);

				// One batch touching the existing group and a brand-new one.
				await appendFor(StatisticsNames.productionSuccess, workflow.id, true);
				await appendFor(StatisticsNames.productionSuccess, workflow2.id, true);

				const { increments, firstOccurrences } =
					await workflowStatisticsRepository.rollupIncrements(dataSource.manager, 10_000);

				expect(increments).toBe(2);
				expect(firstOccurrences).toHaveLength(1);
				expect(firstOccurrences[0]).toMatchObject({
					workflowId: workflow2.id,
					name: 'production_success',
				});

				const counters = await countersByKey();
				expect(counters.get(`${workflow.id}|production_success`)).toMatchObject({ count: 2 });
				expect(counters.get(`${workflow2.id}|production_success`)).toMatchObject({ count: 1 });
			});

			test('does not regress an existing counter row to an older event time', async () => {
				if (!isPostgres) return;

				const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
				await workflowStatisticsRepository.insert({
					workflowId: workflow.id,
					name: StatisticsNames.productionSuccess,
					count: 1,
					rootCount: 1,
					latestEvent: future,
					workflowName: workflow.name,
				});

				// Folding "now" events into a row whose stored timestamp is in the future.
				await append(true);
				await workflowStatisticsRepository.rollupIncrements(dataSource.manager, 10_000);

				const [counter] = await workflowStatisticsRepository.find();
				expect(counter).toMatchObject({ count: 2, rootCount: 2 });
				// GREATEST keeps the newer stored timestamp, not the older folded one.
				expect(counter.latestEvent.getTime()).toBe(future.getTime());
			});

			test('returns an empty result when there are no deltas', async () => {
				if (!isPostgres) return;

				const result = await workflowStatisticsRepository.rollupIncrements(
					dataSource.manager,
					10_000,
				);

				expect(result).toEqual({ increments: 0, firstOccurrences: [] });
			});

			test('carries the earliest event as the first-occurrence time and the latest as the counter time', async () => {
				if (!isPostgres) return;

				// Two deltas with explicit, ordered timestamps so MIN/MAX are deterministic.
				const earliest = new Date('2030-01-01T00:00:00.000Z');
				const latest = new Date('2030-01-02T00:00:00.000Z');
				await dataSource.query(
					`INSERT INTO ${deltaTable()} ("workflowId", "name", "rootCountDelta", "createdAt", "workflowName")
					 VALUES ($1, $2, 1, $3, 'older'), ($4, $5, 1, $6, 'newer')`,
					[
						workflow.id,
						StatisticsNames.productionSuccess,
						earliest,
						workflow.id,
						StatisticsNames.productionSuccess,
						latest,
					],
				);

				const { firstOccurrences } = await workflowStatisticsRepository.rollupIncrements(
					dataSource.manager,
					10_000,
				);

				expect(firstOccurrences).toHaveLength(1);
				expect(firstOccurrences[0].firstEventMs).toBe(earliest.getTime()); // MIN(createdAt)

				const [counter] = await workflowStatisticsRepository.find();
				expect(counter.latestEvent.getTime()).toBe(latest.getTime()); // MAX(createdAt)
				expect(counter.workflowName).toBe('newer'); // name from the most recent delta
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
			const databaseConfig = Container.get(DatabaseConfig);

			entityManager = mock<EntityManager>();
			const dataSource = mock<DataSource>({
				manager: entityManager,
				getMetadata: () =>
					mock<EntityMetadata>({
						tableName: 'workflow_statistics',
					}),
				driver: { escape: vi.fn((id) => id) },
			});
			Object.assign(entityManager, { connection: dataSource });
			eventService = mock<EventService>();
			workflowStatisticsRepository = new WorkflowStatisticsRepository(dataSource, globalConfig);
			const settingsRepository = mock<SettingsRepository>();
			const workflowRepository = mock<WorkflowRepository>();
			(
				workflowRepository as unknown as { hasAnyWorkflowsWithErrorWorkflow: Mock }
			).hasAnyWorkflowsWithErrorWorkflow.mockResolvedValue(false);
			workflowStatisticsService = new WorkflowStatisticsService(
				mock(),
				workflowStatisticsRepository,
				ownershipService,
				userService,
				eventService,
				settingsRepository,
				workflowRepository,
				databaseConfig,
			);
			globalConfig.diagnostics.enabled = true;
			globalConfig.deployment.type = 'n8n-testing';
			vi.mocked(ownershipService.getWorkflowProjectCached).mockResolvedValue(project);
			vi.mocked(ownershipService.getPersonalProjectOwnerCached).mockResolvedValue(user);
		});

		afterAll(() => {
			vi.resetAllMocks();
		});

		beforeEach(() => {
			vi.clearAllMocks();
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

		test('should not record data-loaded statistics for instance_ai-sourced executions', async () => {
			const workflowId = '1';
			const node = {
				id: 'abcde',
				name: 'test node',
				typeVersion: 1,
				type: '',
				position: [0, 0] as [number, number],
				parameters: {},
			};
			await workflowStatisticsService.nodeFetchedData(workflowId, node, 'instance_ai');
			expect(entityManager.insert).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		test('should emit event with no `userId` if workflow is owned by team project', async () => {
			const workflowId = '123';
			vi.mocked(ownershipService.getPersonalProjectOwnerCached).mockResolvedValueOnce(null);
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
			vi.mocked(entityManager.insert).mockRejectedValueOnce(
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
