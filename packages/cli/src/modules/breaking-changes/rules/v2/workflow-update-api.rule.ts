import { Service } from '@n8n/di';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@Service()
export class WorkflowUpdateApiRule implements IBreakingChangeInstanceRule {
	id: string = 'workflow-update-api-v2';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v2',
			title: 'Public endpoint to update a workflow',
			description:
				'The workflow update endpoint behavior has changed due to the draft-publish feature',
			category: BreakingChangeCategory.instance,
			severity: 'medium',
			documentationUrl: 'https://docs.n8n.io/api/api-reference/#tag/workflow/patch/workflows/{id}',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		const result: InstanceDetectionReport = {
			isAffected: true,
			instanceIssues: [
				{
					title: 'Workflow update API endpoint behavior changed',
					description:
						'The public API endpoint to update workflows (/workflows/{id}) has changed behavior due to the draft-publish feature. Updates now create drafts by default instead of immediately modifying the active workflow. Review and update any API integrations that use this endpoint.',
					level: 'warning',
				},
			],
			recommendations: [
				{
					action: 'Review API integration behavior',
					description:
						'Understand the new draft-publish workflow and adjust your API integrations accordingly. Updates now create drafts that must be published separately.',
				},
				{
					action: 'Review API documentation',
					description:
						'Consult the updated API documentation to understand the new endpoint behavior and parameters: https://docs.n8n.io/api/api-reference/#tag/workflow/patch/workflows/{id}',
				},
				{
					action: 'Test API integrations',
					description:
						'Test all external integrations that update workflows via the public API to ensure they work with the new draft-publish behavior',
				},
			],
		};

		return result;
	}
}
