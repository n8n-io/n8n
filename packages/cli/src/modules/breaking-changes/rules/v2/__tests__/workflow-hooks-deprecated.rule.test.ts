import { WorkflowHooksDeprecatedRule } from '../workflow-hooks-deprecated.rule';

describe('WorkflowHooksDeprecatedRule', () => {
	let rule: WorkflowHooksDeprecatedRule;

	beforeEach(() => {
		rule = new WorkflowHooksDeprecatedRule();
	});

	describe('getMetadata()', () => {
		it('should return correct metadata', () => {
			const metadata = rule.getMetadata();

			expect(metadata.version).toBe('v2');
			expect(metadata.title).toBe('Deprecated frontend workflow hooks');
			expect(metadata.severity).toBe('low');
			expect(metadata.documentationUrl).toBe(
				'https://docs.n8n.io/2-0-breaking-changes/#deprecated-frontend-workflow-hooks',
			);
		});
	});

	describe('detect()', () => {
		it('should always be affected (informational)', async () => {
			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].title).toContain('workflow.activeChange');
			expect(result.instanceIssues[0].title).toContain('workflow.activeChangeCurrent');
			expect(result.instanceIssues[0].level).toBe('warning');
		});

		it('should include description about deprecated hooks', async () => {
			const result = await rule.detect();

			expect(result.instanceIssues[0].description).toContain('workflow.activeChange');
			expect(result.instanceIssues[0].description).toContain('workflow.activeChangeCurrent');
			expect(result.instanceIssues[0].description).toContain('workflow.published');
		});

		it('should have 3 recommendations', async () => {
			const result = await rule.detect();

			expect(result.recommendations).toHaveLength(3);
			expect(result.recommendations[0].action).toContain(
				'Replace workflow.activeChange with workflow.published',
			);
			expect(result.recommendations[1].action).toContain(
				'Replace workflow.activeChangeCurrent with workflow.published',
			);
			expect(result.recommendations[2].action).toContain('Review custom integrations');
		});
	});
});
