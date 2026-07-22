import { LICENSE_FEATURES } from '@n8n/constants';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

import { isWorkflowReviewsEnvFeatureFlagEnabled } from '@/constants/workflow-reviews';

@BackendModule({ name: 'workflow-reviews', licenseFlag: LICENSE_FEATURES.WORKFLOW_REVIEWS })
export class WorkflowReviewsModule implements ModuleInterface {
	async init() {
		if (!isWorkflowReviewsEnvFeatureFlagEnabled()) return;

		await import('./workflow-review-requests.controller.js');
	}
}
