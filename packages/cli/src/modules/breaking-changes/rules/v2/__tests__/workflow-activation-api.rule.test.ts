import { BreakingChangeCategory } from '../../../types';
import { WorkflowActivationApiRule } from '../workflow-activation-api.rule';

describe('WorkflowActivationApiRule', () => {
	let rule: WorkflowActivationApiRule;

	beforeEach(() => {
		rule = new WorkflowActivationApiRule();
	});

	describe('getMetadata()', () => {
		it('should return correct metadata', () => {
			const metadata = rule.getMetadata();

			expect(metadata).toEqual({
				version: 'v2',
				title: 'Public endpoint to activate a workflow is changing',
				description:
					'The workflow activation endpoint now requires an extra parameter for the version ID due to draft-publish changes',
				category: BreakingChangeCategory.instance,
				severity: 'high',
				documentationUrl:
					'https://docs.n8n.io/api/api-reference/#tag/workflow/post/workflows/{id}/activate',
			});
		});
	});

	describe('detect()', () => {
		it('should always be affected with warning level', async () => {
			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0]).toMatchObject({
				title: 'Workflow activation API endpoint requires version ID parameter',
				description: expect.stringContaining('version ID parameter'),
				level: 'warning',
			});
		});

		it('should provide recommendations for API updates', async () => {
			const result = await rule.detect();

			expect(result.recommendations).toHaveLength(3);
			expect(result.recommendations).toEqual([
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
			]);
		});

		it('should include draft-publish explanation in description', async () => {
			const result = await rule.detect();

			expect(result.instanceIssues[0].description).toContain('draft-publish');
			expect(result.instanceIssues[0].description).toContain('specific versions');
		});
	});
});
