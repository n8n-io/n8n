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
		callerContext: { hostMode: 'trigger' },
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

	it('returns an empty search without a provider', async () => {
		await expect(proxy.searchExecutions({ workflowIds: 'all', limit: 20 })).resolves.toEqual({
			items: [],
			nextCursor: null,
			total: 0,
		});
	});

	it('forwards search filters and propagates provider failures', async () => {
		const provider = mock<EngineDataPlaneProvider>();
		proxy.registerProvider(provider);
		provider.searchExecutions.mockRejectedValue(new Error('unavailable'));
		await expect(proxy.searchExecutions({ workflowIds: ['wf'], limit: 20 })).rejects.toThrow(
			'unavailable',
		);
		expect(provider.searchExecutions).toHaveBeenCalledWith({ workflowIds: ['wf'], limit: 20 });
	});

	it('reports no latest execution without a provider', async () => {
		await expect(proxy.findLatestExecution({ workflowIds: ['wf'] })).resolves.toBeUndefined();
	});

	it('forwards a latest-execution read to the provider', async () => {
		const provider = mock<EngineDataPlaneProvider>();
		const snapshot = mock<ExecutionSnapshot>({ id: executionId });
		provider.findLatestExecution.mockResolvedValue(snapshot);
		proxy.registerProvider(provider);

		const filter = { workflowIds: ['wf'], status: ['completed' as const] };
		await expect(proxy.findLatestExecution(filter)).resolves.toBe(snapshot);
		expect(provider.findLatestExecution).toHaveBeenCalledWith(filter);
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

	it('reports no execution to cancel without a provider', async () => {
		await expect(proxy.cancelExecution(executionId)).resolves.toBeUndefined();
	});

	it('forwards a cancel to the provider', async () => {
		const provider = mock<EngineDataPlaneProvider>();
		provider.cancelExecution.mockResolvedValue({
			cancelled: true,
			finishedAt: new Date('2026-10-02T09:00:00.000Z'),
		});
		proxy.registerProvider(provider);

		await expect(proxy.cancelExecution(executionId)).resolves.toEqual({
			cancelled: true,
			finishedAt: new Date('2026-10-02T09:00:00.000Z'),
		});
		expect(provider.cancelExecution).toHaveBeenCalledWith(executionId);
	});
});

describe('EngineDataPlaneProxyService resume requests', () => {
	const executionId = '01a038ae-c4a8-7799-8a3e-e3c2ca055cfa' as ExecutionIdV2;

	it('answers both phases as not found without a provider', async () => {
		const proxy = new EngineDataPlaneProxyService();

		await expect(proxy.locateResumeTarget(executionId, { token: 't' })).resolves.toEqual({
			ok: false,
			status: 404,
			error: 'not_found',
		});
		await expect(proxy.resolveStep('step-1', { token: 't', outputs: [] })).resolves.toEqual({
			ok: false,
			status: 404,
			error: 'not_found',
		});
	});

	it('forwards both phases to the provider', async () => {
		const provider = mock<EngineDataPlaneProvider>();
		const proxy = new EngineDataPlaneProxyService();
		proxy.registerProvider(provider);
		const located = {
			ok: true as const,
			value: { execution: mock<ExecutionSnapshot>(), target: null },
		};
		provider.locateResumeTarget.mockResolvedValue(located);
		const resolved = { ok: true as const, value: { executionId, stepId: 'step-1' } };
		provider.resolveStep.mockResolvedValue(resolved);

		await expect(proxy.locateResumeTarget(executionId, { token: 't' })).resolves.toBe(located);
		await expect(proxy.resolveStep('step-1', { token: 't', outputs: [[]] })).resolves.toBe(
			resolved,
		);

		expect(provider.locateResumeTarget).toHaveBeenCalledWith(executionId, { token: 't' });
		expect(provider.resolveStep).toHaveBeenCalledWith('step-1', { token: 't', outputs: [[]] });
	});
});
