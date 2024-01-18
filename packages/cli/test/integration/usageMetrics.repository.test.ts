import { UsageMetricsRepository } from '@/databases/repositories/usageMetrics.repository';
import { createAdmin, createMember, createOwner, createUser } from './shared/db/users';
import * as testDb from './shared/testDb';
import Container from 'typedi';
import { CredentialsRepository } from '@/databases/repositories/credentials.repository';
import { createManyWorkflows } from './shared/db/workflows';
import { createExecution } from './shared/db/executions';
import { createManyCredentials } from './shared/db/credentials';

describe('UsageMetricsRepository', () => {
	let usageMetricsRepository: UsageMetricsRepository;
	let credentialsRepository: CredentialsRepository;

	beforeAll(async () => {
		await testDb.init();

		usageMetricsRepository = Container.get(UsageMetricsRepository);
		credentialsRepository = Container.get(CredentialsRepository);

		await testDb.truncate(['User', 'Credentials', 'Workflow', 'Execution']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('getLicenseRenewalMetrics()', () => {
		test('should return license renewal metrics', async () => {
			const [firstWorkflow, secondWorkflow] = await createManyWorkflows(2, { active: false });

			await Promise.all([
				createOwner(),
				createAdmin(),
				createMember(),
				createMember(),
				createUser({ disabled: true }),
				createManyCredentials(2),
				createManyWorkflows(3, { active: true }),
				createExecution({ finished: true, mode: 'manual' }, firstWorkflow),
				createExecution({ finished: true, mode: 'webhook' }, secondWorkflow),
			]);

			const metrics = await usageMetricsRepository.getLicenseRenewalMetrics();

			expect(metrics).toStrictEqual({
				enabledUsers: 4,
				totalCredentials: 2,
				totalWorkflows: 5,
				activeWorkflows: 3,
				productionExecutions: 1,
				manualExecutions: 1,
			});
		});
	});
});
