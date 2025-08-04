'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const di_1 = require('@n8n/di');
const cta_service_1 = require('@/services/cta.service');
const users_1 = require('./shared/db/users');
const workflow_statistics_1 = require('./shared/db/workflow-statistics');
describe('CtaService', () => {
	let ctaService;
	let user;
	beforeAll(async () => {
		await backend_test_utils_1.testDb.init();
		ctaService = di_1.Container.get(cta_service_1.CtaService);
		user = await (0, users_1.createUser)();
	});
	afterAll(async () => {
		await backend_test_utils_1.testDb.terminate();
	});
	describe('getBecomeCreatorCta()', () => {
		afterEach(async () => {
			await backend_test_utils_1.testDb.truncate(['WorkflowEntity', 'SharedWorkflow']);
		});
		test.each([
			[false, 0, 0],
			[false, 2, 5],
			[false, 3, 4],
			[true, 3, 5],
		])(
			'should return %p if user has %d active workflows with %d successful production executions',
			async (expected, numWorkflows, numExecutions) => {
				const workflows = await (0, backend_test_utils_1.createManyWorkflows)(
					numWorkflows,
					{ active: true },
					user,
				);
				await Promise.all(
					workflows.map(
						async (workflow) =>
							await (0, workflow_statistics_1.createWorkflowStatisticsItem)(workflow.id, {
								count: numExecutions,
								name: 'production_success',
							}),
					),
				);
				expect(await ctaService.getBecomeCreatorCta(user.id)).toBe(expected);
			},
		);
	});
});
//# sourceMappingURL=cta.service.test.js.map
