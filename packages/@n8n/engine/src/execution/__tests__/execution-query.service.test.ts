import { describe, expect, it, vi } from 'vitest';

import { ExecutionQueryService } from '../execution-query.service';
import { ExecutionNotFoundError } from '../execution-store';
import type {
	ExecutionViewStore,
	ExecutionListItemView,
	ExecutionView,
	ExecutionWithStepsView,
	StepView,
} from '../execution-view-store';

function makeViewStore(overrides: Partial<ExecutionViewStore> = {}): ExecutionViewStore {
	return {
		listExecutionViews: vi.fn().mockResolvedValue([]),
		countExecutionViews: vi.fn().mockResolvedValue(0),
		loadExecutionView: vi.fn(),
		loadExecutionWithStepsView: vi.fn(),
		...overrides,
	};
}

describe('ExecutionQueryService', () => {
	it('uses lookahead to report the next page cursor without including it in the page', async () => {
		const rows = [
			{ id: '1', createdAt: '2026-01-01T00:00:00.000Z' },
			{ id: '2', createdAt: '2026-01-02T00:00:00.000Z' },
			{ id: '3', createdAt: '2026-01-03T00:00:00.000Z' },
		] as unknown as ExecutionListItemView[];
		const store = makeViewStore({
			listExecutionViews: vi.fn().mockResolvedValue(rows),
			countExecutionViews: vi.fn().mockResolvedValue(8),
		});
		const service = new ExecutionQueryService(store);
		await expect(
			service.searchExecutions({ workflowIds: ['wf'], limit: 2, includeTotal: true }),
		).resolves.toEqual({
			items: rows.slice(0, 2),
			nextCursor: { id: '2', createdAt: '2026-01-02T00:00:00.000Z' },
			total: 8,
		});
		expect(store.listExecutionViews).toHaveBeenCalledWith(expect.objectContaining({ limit: 3 }));
	});

	it('does not count when the request does not ask for a total', async () => {
		const store = makeViewStore();
		await expect(
			new ExecutionQueryService(store).searchExecutions({ workflowIds: 'all', limit: 20 }),
		).resolves.toEqual({ items: [], nextCursor: null });
		expect(store.countExecutionViews).not.toHaveBeenCalled();
	});
	it('getExecution loads and returns the execution view', async () => {
		const execution = { id: 'exec-1' } as ExecutionView;
		const viewStore = makeViewStore({
			loadExecutionView: vi.fn().mockResolvedValue(execution),
		});
		const service = new ExecutionQueryService(viewStore);

		await expect(service.getExecution('exec-1')).resolves.toBe(execution);
		expect(viewStore.loadExecutionView).toHaveBeenCalledWith('exec-1');
	});

	it('getExecution propagates ExecutionNotFoundError', async () => {
		const viewStore = makeViewStore({
			loadExecutionView: vi.fn().mockRejectedValue(new ExecutionNotFoundError('exec-1')),
		});
		const service = new ExecutionQueryService(viewStore);

		await expect(service.getExecution('exec-1')).rejects.toBeInstanceOf(ExecutionNotFoundError);
	});

	it('getExecutionWithSteps loads the execution and its steps in one call', async () => {
		const execution = {
			id: 'exec-1',
			steps: [{ id: 'step-1' }] as StepView[],
		} as ExecutionWithStepsView;
		const viewStore = makeViewStore({
			loadExecutionWithStepsView: vi.fn().mockResolvedValue(execution),
		});
		const service = new ExecutionQueryService(viewStore);

		await expect(service.getExecutionWithSteps('exec-1')).resolves.toBe(execution);
		expect(viewStore.loadExecutionWithStepsView).toHaveBeenCalledWith('exec-1');
		expect(viewStore.loadExecutionView).not.toHaveBeenCalled();
	});

	it('getExecutionWithSteps propagates ExecutionNotFoundError', async () => {
		const viewStore = makeViewStore({
			loadExecutionWithStepsView: vi.fn().mockRejectedValue(new ExecutionNotFoundError('exec-1')),
		});
		const service = new ExecutionQueryService(viewStore);

		await expect(service.getExecutionWithSteps('exec-1')).rejects.toBeInstanceOf(
			ExecutionNotFoundError,
		);
	});
});
