import { CliActivateAllWorkflowsRule } from '../cli-activate-all-workflows.rule';

describe('CliActivateAllWorkflowsRule', () => {
	let rule: CliActivateAllWorkflowsRule;

	beforeEach(() => {
		rule = new CliActivateAllWorkflowsRule();
	});

	describe('getMetadata()', () => {
		it('should return correct metadata', () => {
			const metadata = rule.getMetadata();

			expect(metadata.version).toBe('v2');
			expect(metadata.title).toBe('Remove CLI command operation to activate all workflows');
			expect(metadata.severity).toBe('low');
		});
	});

	describe('detect()', () => {
		it('should always be affected (informational)', async () => {
			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].title).toBe('CLI command to activate all workflows removed');
			expect(result.instanceIssues[0].level).toBe('info');
		});

		it('should include description about CLI command removal', async () => {
			const result = await rule.detect();

			expect(result.instanceIssues[0].description).toContain('CLI command');
			expect(result.instanceIssues[0].description).toContain('removed');
		});

		it('should have 2 recommendations', async () => {
			const result = await rule.detect();

			expect(result.recommendations).toHaveLength(2);
			expect(result.recommendations[0].action).toContain('Use the API to activate workflows');
			expect(result.recommendations[1].action).toContain('Review deployment scripts');
		});
	});
});
