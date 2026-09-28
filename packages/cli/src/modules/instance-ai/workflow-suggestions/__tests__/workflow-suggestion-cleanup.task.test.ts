import { mock } from 'vitest-mock-extended';

import type { WorkflowSuggestionRepository } from '../database/workflow-suggestion.repository';
import { WorkflowSuggestionCleanupTask } from '../workflow-suggestion-cleanup.task';

describe('WorkflowSuggestionCleanupTask', () => {
	const suggestions = mock<WorkflowSuggestionRepository>();
	const task = new WorkflowSuggestionCleanupTask(suggestions);

	beforeEach(() => vi.clearAllMocks());

	it('cleans up suggestions when the task is active', async () => {
		await task.run(new AbortController().signal);

		expect(suggestions.cleanup).toHaveBeenCalledExactlyOnceWith(expect.any(Date));
	});

	it('skips cleanup when the task is aborted', async () => {
		const controller = new AbortController();
		controller.abort();

		await task.run(controller.signal);

		expect(suggestions.cleanup).not.toHaveBeenCalled();
	});
});
