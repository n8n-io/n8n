import Container from 'typedi';
import * as testDb from './shared/testDb';
import { CtaService } from '@/services/cta.service';
import { createUser } from './shared/db/users';
import { createManyWorkflows } from './shared/db/workflows';
import type { User } from '@/databases/entities/User';
import { createWorkflowStatisticsItem } from './shared/db/workflowStatistics';
import { StatisticsNames } from '@/databases/entities/WorkflowStatistics';

describe('CtaService', () => {
	let ctaService: CtaService;
	let user: User;

	beforeAll(async () => {
		await testDb.init();

		ctaService = Container.get(CtaService);
		user = await createUser();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('getBecomeCreatorCta()', () => {
		afterEach(async () => {
			await testDb.truncate(['Workflow', 'SharedWorkflow']);
		});

		test.each([
			[false, 0, 0],
			[false, 2, 5],
			[false, 3, 4],
			[true, 3, 5],
		])(
			'should return %p if user has %d active workflows with %d successful production executions',
			async (expected, numWorkflows, numExecutions) => {
				const workflows = await createManyWorkflows(numWorkflows, { active: true }, user);

				await Promise.all(
					workflows.map(
						async (workflow) =>
							await createWorkflowStatisticsItem(workflow.id, {
								count: numExecutions,
								name: StatisticsNames.productionSuccess,
							}),
					),
				);

				expect(await ctaService.getBecomeCreatorCta(user.id)).toBe(expected);
			},
		);
	});
});
