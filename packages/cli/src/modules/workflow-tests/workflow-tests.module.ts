import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'workflow-tests', instanceTypes: ['main'] })
export class WorkflowTestsModule implements ModuleInterface {
	async init() {
		await import('./workflow-tests.controller.js');
		await import('./workflow-test-reviews.controller.js');

		// Workflow reviews run the tests on the pinned version, and approval needs them to pass.
		const { WorkflowReviewCheckRegistry } = await import(
			'../workflow-reviews.ee/workflow-review-check.registry.js'
		);
		const { WorkflowTestReviewService } = await import('./workflow-test-review.service.js');
		const reviewService = Container.get(WorkflowTestReviewService);
		Container.get(WorkflowReviewCheckRegistry).register(reviewService);
		reviewService.listenForReviews();
	}

	async entities() {
		const { WorkflowTestEntity } = await import('./database/workflow-test.entity.js');
		const { WorkflowTestReviewRunEntity } = await import(
			'./database/workflow-test-review-run.entity.js'
		);
		return [WorkflowTestEntity, WorkflowTestReviewRunEntity];
	}
}
