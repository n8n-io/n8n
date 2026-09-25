import type { BinaryDataConfig } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { InMemoryBinaryDataRule } from '../in-memory-binary-data.rule';

describe('InMemoryBinaryDataRule', () => {
	let rule: InMemoryBinaryDataRule;
	const binaryDataConfig: BinaryDataConfig = mock<BinaryDataConfig>();

	beforeEach(() => {
		rule = new InMemoryBinaryDataRule(binaryDataConfig);
	});

	describe('detect()', () => {
		it.each(['filesystem', 's3', 'database'] as const)(
			'should not be affected in %s mode',
			async (mode) => {
				binaryDataConfig.mode = mode;

				const result = await rule.detect();

				expect(result.isAffected).toBe(false);
				expect(result.instanceIssues).toHaveLength(0);
			},
		);

		it('should be affected in default (in-memory) mode', async () => {
			binaryDataConfig.mode = 'default';

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].level).toBe('warning');
			expect(result.recommendations).toHaveLength(1);
		});
	});
});
