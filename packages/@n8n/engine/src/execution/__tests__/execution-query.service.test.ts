import { describe, expect, it, vi } from 'vitest';

import { ExecutionQueryService } from '../execution-query.service';
import type { ExecutionReadStore, ExecutionView, StepView } from '../execution-read-store';
import { ExecutionNotFoundError } from '../execution-store';

function makeReadStore(overrides: Partial<ExecutionReadStore> = {}): ExecutionReadStore {
	return {
		loadExecutionView: vi.fn(),
		loadStepViews: vi.fn(),
		...overrides,
	};
}

describe('ExecutionQueryService', () => {
	it('getExecution loads and returns the execution view', async () => {
		const execution = { id: 'exec-1' } as ExecutionView;
		const readStore = makeReadStore({
			loadExecutionView: vi.fn().mockResolvedValue(execution),
		});
		const service = new ExecutionQueryService(readStore);

		await expect(service.getExecution('exec-1')).resolves.toBe(execution);
		expect(readStore.loadExecutionView).toHaveBeenCalledWith('exec-1');
	});

	it('getExecution propagates ExecutionNotFoundError', async () => {
		const readStore = makeReadStore({
			loadExecutionView: vi.fn().mockRejectedValue(new ExecutionNotFoundError('exec-1')),
		});
		const service = new ExecutionQueryService(readStore);

		await expect(service.getExecution('exec-1')).rejects.toBeInstanceOf(ExecutionNotFoundError);
	});

	it('getSteps loads and returns the step views', async () => {
		const steps = [{ id: 'step-1' }] as StepView[];
		const readStore = makeReadStore({ loadStepViews: vi.fn().mockResolvedValue(steps) });
		const service = new ExecutionQueryService(readStore);

		await expect(service.getSteps('exec-1')).resolves.toBe(steps);
		expect(readStore.loadStepViews).toHaveBeenCalledWith('exec-1');
	});
});
