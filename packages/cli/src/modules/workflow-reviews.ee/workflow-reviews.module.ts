import { LICENSE_FEATURES } from '@n8n/constants';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { WorkflowMutationHooksProxy } from '@/workflows/workflow-mutation-hooks-proxy.service';
import { WorkflowPublishGuardProxy } from '@/workflows/workflow-publish-guard-proxy.service';

@BackendModule({ name: 'workflow-reviews', licenseFlag: LICENSE_FEATURES.WORKFLOW_REVIEWS })
export class WorkflowReviewsModule implements ModuleInterface {
	async init() {
		await import('./workflow-review-requests.controller.js');
		const { WorkflowReviewPublishGuard } = await import(
			'./workflow-review-publish-guard.service.js'
		);
		Container.get(WorkflowPublishGuardProxy).registerProvider(
			Container.get(WorkflowReviewPublishGuard),
		);

		const { WorkflowReviewLifecycleService } = await import(
			'./workflow-review-lifecycle.service.js'
		);
		Container.get(WorkflowMutationHooksProxy).registerProvider(
			Container.get(WorkflowReviewLifecycleService),
		);
	}
}
