import { WorkflowImportUrlRemovedRule } from '../workflow-import-url-removed.rule';

describe('WorkflowImportUrlRemovedRule', () => {
	let rule: WorkflowImportUrlRemovedRule;

	beforeEach(() => {
		rule = new WorkflowImportUrlRemovedRule();
	});

	describe('detect()', () => {
		it('should always report informationally', async () => {
			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].level).toBe('info');
			expect(result.recommendations).toHaveLength(1);
		});
	});
});
