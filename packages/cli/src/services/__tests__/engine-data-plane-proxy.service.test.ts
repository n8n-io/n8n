import type { ExecutionSnapshot, StartExecutionRequest } from '@n8n/engine';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ExecutionIdV2 } from '@/executions/execution-id';

import type { EngineDataPlaneProvider } from '../engine-data-plane-proxy.service';
import { EngineDataPlaneProxyService } from '../engine-data-plane-proxy.service';

describe('EngineDataPlaneProxyService', () => {
	const executionId = '01a038ae-c4a8-7799-8a3e-e3c2ca055cfa' as ExecutionIdV2;

	const request: StartExecutionRequest = {
		workflowId: 'wf-1',
		graph: { nodes: [], edges: [] },
		workflow: {},
		executionId,
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

	it('reads no execution when no provider is registered', async () => {
		// A read degrades to a miss; only a start is worth failing loudly.
		await expect(proxy.getExecution(executionId)).resolves.toBeUndefined();
	});

	it('delegates a read to the registered provider', async () => {
		const provider = mock<EngineDataPlaneProvider>();
		const snapshot = mock<ExecutionSnapshot>({ id: executionId });
		provider.getExecution.mockResolvedValue(snapshot);
		proxy.registerProvider(provider);

		await expect(proxy.getExecution(executionId)).resolves.toBe(snapshot);
		expect(provider.getExecution).toHaveBeenCalledWith(executionId, undefined);
	});

	it('passes the read options through to the provider', async () => {
		const provider = mock<EngineDataPlaneProvider>();
		proxy.registerProvider(provider);

		await proxy.getExecution(executionId, { includeSteps: true });

		expect(provider.getExecution).toHaveBeenCalledWith(executionId, { includeSteps: true });
	});
});
