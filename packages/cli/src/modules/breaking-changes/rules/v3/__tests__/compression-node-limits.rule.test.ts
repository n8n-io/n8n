import { CompressionNodeLimitsRule } from '../compression-node-limits.rule';

describe('CompressionNodeLimitsRule', () => {
	let rule: CompressionNodeLimitsRule;
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		delete process.env.N8N_COMPRESSION_NODE_MAX_DECOMPRESSED_SIZE_BYTES;
		delete process.env.N8N_COMPRESSION_NODE_MAX_ZIP_ENTRIES;
		rule = new CompressionNodeLimitsRule();
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	describe('detect()', () => {
		it('should report both limits when neither variable is set', async () => {
			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(2);
			expect(result.recommendations).toHaveLength(1);
		});

		it('should report only the unset limit', async () => {
			process.env.N8N_COMPRESSION_NODE_MAX_DECOMPRESSED_SIZE_BYTES = '2147483648';

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].title).toContain('ZIP entries');
		});

		it('should report only the unset size limit', async () => {
			process.env.N8N_COMPRESSION_NODE_MAX_ZIP_ENTRIES = '5000';

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].title).toContain('decompressed size');
		});

		it('should not be affected when both variables are set', async () => {
			process.env.N8N_COMPRESSION_NODE_MAX_DECOMPRESSED_SIZE_BYTES = '2147483648';
			process.env.N8N_COMPRESSION_NODE_MAX_ZIP_ENTRIES = '5000';

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
		});
	});

	describe('getMetadata()', () => {
		it('should report an executionsMightFail impact because only a default changes and the admin can override it', () => {
			expect(rule.getMetadata().impact).toBe('executionsMightFail');
		});

		it('should say that only the defaults change', () => {
			const { description } = rule.getMetadata();

			expect(description).toMatch(/only the default/i);
			expect(description).not.toMatch(/will fail|will be aborted|start failing/);
		});
	});

	describe('recommendation', () => {
		it('should name the variables that keep the current limits, and say when to set them', async () => {
			const { recommendations } = await rule.detect();
			const { description } = recommendations[0];

			expect(description).toContain('N8N_COMPRESSION_NODE_MAX_DECOMPRESSED_SIZE_BYTES');
			expect(description).toContain('N8N_COMPRESSION_NODE_MAX_ZIP_ENTRIES');
			expect(description).toMatch(/only when .*not set/i);
			expect(description).toMatch(/do not need to do anything/i);
		});
	});
});
