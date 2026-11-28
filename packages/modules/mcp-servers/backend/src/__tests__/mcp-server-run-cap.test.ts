import type { McpServersConfig } from '../../mcp-servers.config';

import { McpServerRunCap } from '../run-cap';

describe('McpServerRunCap', () => {
	it('refuses a run when the server has as many runs in flight as the cap', () => {
		const cap = new McpServerRunCap({ maxConcurrentRuns: 2 } as McpServersConfig);

		expect(cap.tryAcquire('server-a')).not.toBeNull();
		expect(cap.tryAcquire('server-a')).not.toBeNull();
		expect(cap.tryAcquire('server-a')).toBeNull();
	});

	it('counts the runs of each server apart', () => {
		const cap = new McpServerRunCap({ maxConcurrentRuns: 1 } as McpServersConfig);
		cap.tryAcquire('server-a');

		expect(cap.tryAcquire('server-b')).not.toBeNull();
	});

	it('has no limit when the cap is 0', () => {
		const cap = new McpServerRunCap({ maxConcurrentRuns: 0 } as McpServersConfig);

		for (let i = 0; i < 100; i++) expect(cap.tryAcquire('server-a')).not.toBeNull();
	});

	it('gives the slot back when the run releases it', () => {
		const cap = new McpServerRunCap({ maxConcurrentRuns: 1 } as McpServersConfig);
		const release = cap.tryAcquire('server-a');

		release?.();

		expect(cap.tryAcquire('server-a')).not.toBeNull();
	});

	it('frees one slot only, when a run releases twice', () => {
		const cap = new McpServerRunCap({ maxConcurrentRuns: 2 } as McpServersConfig);
		const release = cap.tryAcquire('server-a');
		cap.tryAcquire('server-a');

		release?.();
		release?.();

		expect(cap.tryAcquire('server-a')).not.toBeNull();
		expect(cap.tryAcquire('server-a')).toBeNull();
	});
});
