import { WorkflowUpdateApiRule } from '../workflow-update-api.rule';

describe('WorkflowUpdateApiRule', () => {
	let rule: WorkflowUpdateApiRule;

	beforeEach(() => {
		rule = new WorkflowUpdateApiRule();
	});

	describe('getMetadata()', () => {
		it('should return correct metadata', () => {
			const metadata = rule.getMetadata();

			expect(metadata.version).toBe('v2');
			expect(metadata.title).toBe('Public endpoint to update a workflow');
			expect(metadata.severity).toBe('medium');
		});
	});

	describe('detect()', () => {
		it('should always be affected (informational)', async () => {
			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].title).toBe('Workflow update API endpoint behavior changed');
			expect(result.instanceIssues[0].level).toBe('warning');
		});

		it('should include description about draft-publish feature', async () => {
			const result = await rule.detect();

			expect(result.instanceIssues[0].description).toContain('draft-publish');
			expect(result.instanceIssues[0].description).toContain('/workflows/{id}');
		});

		it('should have 3 recommendations', async () => {
			const result = await rule.detect();

			expect(result.recommendations).toHaveLength(3);
			expect(result.recommendations[0].action).toContain('Review API integration behavior');
			expect(result.recommendations[1].action).toContain('Review API documentation');
			expect(result.recommendations[2].action).toContain('Test API integrations');
		});
	});
});
