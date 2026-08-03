import { Container } from '@n8n/di';

import { NodesConfig } from '../nodes.config';

describe('NodesConfig', () => {
	beforeEach(() => {
		Container.reset();
		vi.resetAllMocks();
		vi.unstubAllEnvs();
	});

	describe('NODES_MERGE_SQL_SANDBOX_MEMORY_LIMIT_MB', () => {
		test('defaults mergeSqlSandboxMemoryLimitMb to 64', () => {
			expect(Container.get(NodesConfig).mergeSqlSandboxMemoryLimitMb).toBe(64);
		});

		test('overrides mergeSqlSandboxMemoryLimitMb', () => {
			vi.stubEnv('NODES_MERGE_SQL_SANDBOX_MEMORY_LIMIT_MB', '128');

			expect(Container.get(NodesConfig).mergeSqlSandboxMemoryLimitMb).toBe(128);
		});

		test('falls back to default on non-positive value', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			vi.stubEnv('NODES_MERGE_SQL_SANDBOX_MEMORY_LIMIT_MB', '0');

			expect(Container.get(NodesConfig).mergeSqlSandboxMemoryLimitMb).toBe(64);
			expect(consoleWarnSpy).toHaveBeenCalled();
		});
	});
});
