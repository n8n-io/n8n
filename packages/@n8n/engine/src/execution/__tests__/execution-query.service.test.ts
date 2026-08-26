import { describe, expect, it, vi } from 'vitest';

import { ExecutionQueryService } from '../execution-query.service';
import { ExecutionNotFoundError } from '../execution-store';
import type { ExecutionViewStore, ExecutionView, StepView } from '../execution-view-store';

function makeViewStore(overrides: Partial<ExecutionViewStore> = {}): ExecutionViewStore {
	return {
		loadExecutionView: vi.fn(),
		loadStepViews: vi.fn(),
		...overrides,
	};
}

describe('ExecutionQueryService', () => {
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

	it('getSteps loads and returns the step views', async () => {
		const steps = [{ id: 'step-1' }] as StepView[];
		const viewStore = makeViewStore({ loadStepViews: vi.fn().mockResolvedValue(steps) });
		const service = new ExecutionQueryService(viewStore);

		await expect(service.getSteps('exec-1')).resolves.toBe(steps);
		expect(viewStore.loadStepViews).toHaveBeenCalledWith('exec-1');
	});
});
