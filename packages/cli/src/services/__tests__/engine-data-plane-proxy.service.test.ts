import type { StartExecutionRequest } from '@n8n/engine';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { EngineDataPlaneProvider } from '../engine-data-plane-proxy.service';
import { EngineDataPlaneProxyService } from '../engine-data-plane-proxy.service';

describe('EngineDataPlaneProxyService', () => {
	const request: StartExecutionRequest = {
		workflowId: 'wf-1',
		graph: { nodes: [], edges: [] },
	};

	let proxy: EngineDataPlaneProxyService;

	beforeEach(() => {
		proxy = new EngineDataPlaneProxyService();
	});

	it('is unavailable until a provider registers', () => {
		expect(proxy.isAvailable()).toBe(false);

		proxy.registerProvider(mock<EngineDataPlaneProvider>());

		expect(proxy.isAvailable()).toBe(true);
	});

	it('explains how to enable the engine when no provider is registered', async () => {
		await expect(proxy.startExecution(request)).rejects.toThrow(UserError);
		await expect(proxy.startExecution(request)).rejects.toThrow('N8N_ENABLED_MODULES');
	});

	it('delegates to the registered provider', async () => {
		const provider = mock<EngineDataPlaneProvider>();
		provider.startExecution.mockResolvedValue({ executionId: 'exec-1' });
		proxy.registerProvider(provider);

		await expect(proxy.startExecution(request)).resolves.toEqual({ executionId: 'exec-1' });
		expect(provider.startExecution).toHaveBeenCalledWith(request);
	});
});
