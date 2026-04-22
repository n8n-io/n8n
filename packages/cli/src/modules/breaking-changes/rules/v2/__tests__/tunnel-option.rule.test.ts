import { TunnelOptionRule } from '../tunnel-option.rule';

describe('TunnelOptionRule', () => {
	let rule: TunnelOptionRule;

	beforeEach(() => {
		rule = new TunnelOptionRule();
	});

	describe('detect()', () => {
		it('should always be affected (informational)', async () => {
			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].title).toBe('--tunnel option removed');
		});

		it('should have no recommendations', async () => {
			const result = await rule.detect();

			expect(result.recommendations).toHaveLength(0);
		});
	});
});
