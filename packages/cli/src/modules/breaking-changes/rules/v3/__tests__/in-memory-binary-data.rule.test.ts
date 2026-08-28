import { InMemoryBinaryDataRule } from '../in-memory-binary-data.rule';

describe('InMemoryBinaryDataRule', () => {
	const rule = new InMemoryBinaryDataRule();

	afterEach(() => {
		delete process.env.N8N_DEFAULT_BINARY_DATA_MODE;
	});

	describe('detect()', () => {
		it.each(['filesystem', 's3', 'database', undefined])(
			'should not be affected when env var is %s',
			async (mode) => {
				if (mode) process.env.N8N_DEFAULT_BINARY_DATA_MODE = mode;

				const result = await rule.detect();

				expect(result.isAffected).toBe(false);
				expect(result.instanceIssues).toHaveLength(0);
			},
		);

		it('should be affected when env var is set to removed default (in-memory) mode', async () => {
			process.env.N8N_DEFAULT_BINARY_DATA_MODE = 'default';

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].level).toBe('warning');
			expect(result.recommendations).toHaveLength(1);
		});
	});
});
