import type { ExecutionsConfig } from '@n8n/config';
import type { BinaryDataConfig } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { BinaryDataStorageRule } from '../binary-data-storage.rule';

describe('BinaryDataStorageRule', () => {
	let rule: BinaryDataStorageRule;
	const binaryDataConfig: BinaryDataConfig = mock<BinaryDataConfig>();
	const executionsConfig: ExecutionsConfig = mock<ExecutionsConfig>();

	beforeEach(() => {
		rule = new BinaryDataStorageRule(binaryDataConfig, executionsConfig);
	});

	afterEach(() => {
		delete process.env.N8N_DEFAULT_BINARY_DATA_MODE;
	});

	describe('detect()', () => {
		it('should not be affected if env var is not set to default', async () => {
			process.env.N8N_DEFAULT_BINARY_DATA_MODE = 'filesystem';
			executionsConfig.mode = 'regular';
			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
		});

		it('should be affected if env var is default and execution mode is regular', async () => {
			process.env.N8N_DEFAULT_BINARY_DATA_MODE = 'default';
			executionsConfig.mode = 'regular';
			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].title).toBe('Binary data storage mode changed');
			expect(result.recommendations).toHaveLength(3);
			expect(result.recommendations[0].action).toBe('Ensure adequate disk space');
		});

		it('should be affected if env var is default and execution mode is queue', async () => {
			process.env.N8N_DEFAULT_BINARY_DATA_MODE = 'default';
			executionsConfig.mode = 'queue';
			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].title).toBe('Binary data storage mode changed');
			expect(result.recommendations).toHaveLength(0);
		});

		it('should be affected when the env value carries quotes or whitespace', async () => {
			process.env.N8N_DEFAULT_BINARY_DATA_MODE = ' "default" ';
			executionsConfig.mode = 'regular';
			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
		});
	});
});
