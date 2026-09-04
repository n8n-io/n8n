import { describe, expect, it, vi } from 'vitest';

import { ExecutionQueryService } from '../execution-query.service';
import { ExecutionNotFoundError } from '../execution-store';
import type {
	ExecutionViewStore,
	ExecutionView,
	ExecutionWithStepsView,
	StepView,
} from '../execution-view-store';

function makeViewStore(overrides: Partial<ExecutionViewStore> = {}): ExecutionViewStore {
	return {
		loadExecutionView: vi.fn(),
		loadExecutionWithStepsView: vi.fn(),
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
