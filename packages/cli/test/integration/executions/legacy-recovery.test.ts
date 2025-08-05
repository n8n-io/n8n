import { LegacySqliteExecutionRecoveryService } from '@/executions/legacy-sqlite-execution-recovery.service';
import { Logger } from '@n8n/backend-common';
import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { DbConnection, ExecutionRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';

const globalConfig = Container.get(GlobalConfig);

if (globalConfig.database.isLegacySqlite) {
	beforeAll(async () => {
		await testDb.init();
	});

	describe('Legacy SQLite Execution Recovery Service', () => {
		let legacySqliteExecutionRecoveryService: LegacySqliteExecutionRecoveryService;
		let executionRepository: ExecutionRepository;
		let dbConnection: DbConnection;

		beforeEach(async () => {
			await testDb.truncate(['WorkflowEntity', 'ExecutionEntity', 'ExecutionData']);
			executionRepository = Container.get(ExecutionRepository);
			dbConnection = Container.get(DbConnection);
			legacySqliteExecutionRecoveryService = new LegacySqliteExecutionRecoveryService(
				Container.get(Logger),
				executionRepository,
				globalConfig,
				dbConnection,
			);

			const workflowRepository = Container.get(WorkflowRepository);

			const workflow = workflowRepository.create({
				id: 'test-workflow-id',
				name: 'Test Workflow',
				active: true,
				nodes: [],
				connections: {},
				settings: {},
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await workflowRepository.save(workflow);
		});

		afterAll(async () => {
			await testDb.terminate();
		});

		it('should recover executions without data', async () => {
			// Arrange
			let execution = executionRepository.create({
				status: 'new',
				mode: 'manual',
				workflowId: 'test-workflow-id',
				createdAt: new Date(),
				finished: false,
			});

			execution = await executionRepository.save(execution);

			// Act
			await legacySqliteExecutionRecoveryService.cleanupWorkflowExecutions();

			const executionMarkedAsCrashed = await executionRepository.findOneBy({ id: execution.id });
			// Assert
			expect(executionMarkedAsCrashed?.id).toBe(execution.id);
			expect(executionMarkedAsCrashed?.status).toBe('crashed');
		});
	});
} else {
	describe('Legacy SQLite Execution Recovery Service', () => {
		it('should not run on non-legacy SQLite databases', () => {
			// We need an empty test here to ensure that the test suite is not empty
		});
	});
}
