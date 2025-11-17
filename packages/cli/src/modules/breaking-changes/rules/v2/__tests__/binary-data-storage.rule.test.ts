import { mock } from 'jest-mock-extended';
import type { BinaryDataConfig } from 'n8n-core';

import { BinaryDataStorageRule } from '../binary-data-storage.rule';

describe('BinaryDataStorageRule', () => {
	let rule: BinaryDataStorageRule;
	const config: BinaryDataConfig = mock<BinaryDataConfig>();

	beforeEach(() => {
		rule = new BinaryDataStorageRule(config);
	});

	describe('detect()', () => {
		it('should not be affected if mode is not default', async () => {
			config.mode = 'filesystem';
			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
		});

		it('should be affected if mode is default', async () => {
			config.mode = 'default';
			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].title).toBe('Binary data storage mode changed');
			expect(result.recommendations).toHaveLength(3);
			expect(result.recommendations[0].action).toBe('Ensure adequate disk space');
		});
	});
});
