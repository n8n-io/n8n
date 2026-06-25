import { testDb, testModules } from '@n8n/backend-test-utils';
import { ProjectRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import {
	INSIGHTS_ANALYST_DEMO_PROJECT_ID,
	INSIGHTS_ANALYST_DEMO_PROJECT_NAME,
	INSIGHTS_ANALYST_DEMO_WORKFLOWS,
} from '../insights-demo.data';
import { InsightsDemoService } from '../insights-demo.service';

describe('InsightsDemoService (Integration)', () => {
	beforeAll(async () => {
		await testModules.loadModules(['insights']);
		await testDb.init();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	beforeEach(async () => {
		await testDb.truncate([
			'InsightsByPeriod',
			'InsightsMetadata',
			'ExecutionData',
			'ExecutionEntity',
			'SharedWorkflow',
			'WorkflowEntity',
			'ProjectRelation',
			'Project',
		]);
	});

	test('seed is idempotent and does not create duplicate demo projects', async () => {
		const service = Container.get(InsightsDemoService);

		await service.seed();
		const afterFirstSeed = {
			projects: await Container.get(ProjectRepository).count({
				where: { name: INSIGHTS_ANALYST_DEMO_PROJECT_NAME },
			}),
			workflows: await Container.get(WorkflowRepository).count(),
		};

		await service.seed();
		const afterSecondSeed = {
			projects: await Container.get(ProjectRepository).count({
				where: { name: INSIGHTS_ANALYST_DEMO_PROJECT_NAME },
			}),
			workflows: await Container.get(WorkflowRepository).count(),
		};

		expect(afterFirstSeed).toEqual(afterSecondSeed);
		expect(afterSecondSeed.projects).toBe(1);
		expect(afterSecondSeed.workflows).toBe(INSIGHTS_ANALYST_DEMO_WORKFLOWS.length);

		const project = await Container.get(ProjectRepository).findOneByOrFail({
			id: INSIGHTS_ANALYST_DEMO_PROJECT_ID,
		});
		expect(project.name).toBe(INSIGHTS_ANALYST_DEMO_PROJECT_NAME);
	});
});
