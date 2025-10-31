import { Service } from '@n8n/di';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@Service()
export class WorkflowActivationApiRule implements IBreakingChangeInstanceRule {
	id: string = 'workflow-activation-api-v2';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v2',
			title: 'Public endpoint to activate a workflow is changing',
			description:
				'The workflow activation endpoint now requires an extra parameter for the version ID due to draft-publish changes',
			category: BreakingChangeCategory.instance,
			severity: 'high',
			documentationUrl:
				'https://docs.n8n.io/api/api-reference/#tag/workflow/post/workflows/{id}/activate',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		const result: InstanceDetectionReport = {
			isAffected: true,
			instanceIssues: [
				{
					title: 'Workflow activation API endpoint requires version ID parameter',
					description:
						'The public API endpoint to activate workflows (/workflows/{id}/activate) now requires a version ID parameter. This change is due to the draft-publish feature, which allows users to activate specific versions of a workflow. Update any API integrations that use this endpoint.',
					level: 'warning',
				},
			],
			recommendations: [
				{
					action: 'Update API calls to include version ID',
					description:
						'Review and update all API integrations that call the workflow activation endpoint to include the version ID parameter',
				},
				{
					action: 'Review API documentation',
					description:
						'Consult the updated API documentation to understand the new endpoint structure and parameters: https://docs.n8n.io/api/api-reference/#tag/workflow/post/workflows/{id}/activate',
				},
				{
					action: 'Test API integrations',
					description:
						'Test all external integrations that activate workflows via the public API to ensure they work with the new endpoint signature',
				},
			],
		};

		return result;
	}
}
