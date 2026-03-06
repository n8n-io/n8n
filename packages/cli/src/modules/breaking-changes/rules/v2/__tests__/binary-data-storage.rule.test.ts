import type { ExecutionsConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type { BinaryDataConfig } from 'n8n-core';

import { BinaryDataStorageRule } from '../binary-data-storage.rule';

describe('BinaryDataStorageRule', () => {
	let rule: BinaryDataStorageRule;
	const binaryDataConfig: BinaryDataConfig = mock<BinaryDataConfig>();
	const executionsConfig: ExecutionsConfig = mock<ExecutionsConfig>();

	beforeEach(() => {
		rule = new BinaryDataStorageRule(binaryDataConfig, executionsConfig);
	});

	describe('detect()', () => {
		it('should not be affected if mode is not default', async () => {
			binaryDataConfig.mode = 'filesystem';
			executionsConfig.mode = 'regular';
			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
		});

		it('should be affected if mode is default and execution mode is regular', async () => {
			binaryDataConfig.mode = 'default';
			executionsConfig.mode = 'regular';
			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].title).toBe('Binary data storage mode changed');
			expect(result.recommendations).toHaveLength(3);
			expect(result.recommendations[0].action).toBe('Ensure adequate disk space');
		});

		it('should be affected if mode is default and execution mode is queue', async () => {
			binaryDataConfig.mode = 'default';
			executionsConfig.mode = 'queue';
			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].title).toBe('Binary data storage mode changed');
			expect(result.recommendations).toHaveLength(0);
		});
	});
});
