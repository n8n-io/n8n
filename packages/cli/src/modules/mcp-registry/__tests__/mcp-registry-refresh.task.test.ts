import type { SystemTask } from '@n8n/decorators';
import { mock } from 'vitest-mock-extended';

import { McpRegistryRefreshTask } from '../mcp-registry-refresh.task';
import type { McpRegistryService } from '../registry/mcp-registry.service';

describe('McpRegistryRefreshTask', () => {
	const mcpRegistryService = mock<McpRegistryService>();
	const task: SystemTask = new McpRegistryRefreshTask(mcpRegistryService);

	beforeEach(() => {
		mcpRegistryService.refreshFromApi.mockReset();
	});

	it('should refresh every 8 hours on the leader and once on takeover, without an early retry', () => {
		expect(task.name).toBe('mcp-registry-refresh');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 8 * 3600 });
		expect(task.effects).toBe('idempotent');
		expect(task.durable).toBe(false);
		expect(task.runOnTakeover).toBe(true);
		expect(task.retryDelaySeconds).toBeUndefined();
	});

	it('should refresh the registry on run and hand it the abort signal', async () => {
		const { signal } = new AbortController();

		await task.run(signal);

		expect(mcpRegistryService.refreshFromApi).toHaveBeenCalledExactlyOnceWith(signal);
	});

	it('should let a failed refresh propagate to the runner', async () => {
		mcpRegistryService.refreshFromApi.mockRejectedValue(new Error('api down'));

		await expect(task.run(new AbortController().signal)).rejects.toThrow('api down');
	});
});
