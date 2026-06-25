import { Container } from '@n8n/di';

import { AgentsConfig } from '../agents.config';

describe('AgentsConfig', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		Container.reset();
		vi.clearAllMocks();
		process.env = {};
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it('defaults agent execution logs to filesystem storage', () => {
		const config = Container.get(AgentsConfig);

		expect(config.executionLogStorageMode).toBe('filesystem');
		expect(config.executionLogStorageModeTag).toBe('fs');
	});

	it.each([
		{ mode: 'database', tag: 'db' },
		{ mode: 'filesystem', tag: 'fs' },
		{ mode: 's3', tag: 's3' },
		{ mode: 'azure', tag: 'az' },
	])('maps $mode to $tag for agent execution log storage', ({ mode, tag }) => {
		process.env.N8N_AGENT_EXECUTION_LOG_STORAGE_MODE = mode;

		const config = Container.get(AgentsConfig);

		expect(config.executionLogStorageMode).toBe(mode);
		expect(config.executionLogStorageModeTag).toBe(tag);
	});

	it('falls back to filesystem for invalid agent execution log storage values', () => {
		process.env.N8N_AGENT_EXECUTION_LOG_STORAGE_MODE = 'invalid';
		console.warn = vi.fn();

		const config = Container.get(AgentsConfig);

		expect(config.executionLogStorageMode).toBe('filesystem');
		expect(config.executionLogStorageModeTag).toBe('fs');
		expect(console.warn).toHaveBeenCalledWith(
			expect.stringContaining('Invalid value for N8N_AGENT_EXECUTION_LOG_STORAGE_MODE'),
		);
	});
});
