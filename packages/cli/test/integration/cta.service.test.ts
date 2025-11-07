import { createManyWorkflows, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { StatisticsNames } from '@n8n/db';
import { Container } from '@n8n/di';

import { CtaService } from '@/services/cta.service';

import { createUser } from './shared/db/users';
import { createWorkflowStatisticsItem } from './shared/db/workflow-statistics';

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
			await testDb.truncate(['WorkflowEntity', 'SharedWorkflow']);
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
