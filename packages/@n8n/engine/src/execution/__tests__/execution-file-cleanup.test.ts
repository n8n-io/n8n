import { describe, expect, it, vi } from 'vitest';

import type { ExecutionLocation } from '../../dependencies';
import type { EngineLogger } from '../../logging';
import { ExecutionFileCleanup } from '../execution-file-cleanup';

function makeLogger(): EngineLogger {
	return { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
}

const first: ExecutionLocation = { workflowId: 'wf-1', executionId: 'exec-1' };
const second: ExecutionLocation = { workflowId: 'wf-1', executionId: 'exec-2' };

describe('ExecutionFileCleanup', () => {
	it('returns every execution when the host supplied no deleter', async () => {
		const cleanup = new ExecutionFileCleanup(undefined, makeLogger());

		await expect(cleanup.deleteFilesOf([first, second])).resolves.toEqual([first, second]);
	});

	it('calls the deleter once per execution with its location', async () => {
		const deleteFiles = vi.fn().mockResolvedValue(undefined);
		const cleanup = new ExecutionFileCleanup(deleteFiles, makeLogger());

		await cleanup.deleteFilesOf([first, second]);

		expect(deleteFiles).toHaveBeenCalledTimes(2);
		expect(deleteFiles).toHaveBeenCalledWith(first);
		expect(deleteFiles).toHaveBeenCalledWith(second);
	});

	it('returns only the executions whose files were deleted and logs the failure', async () => {
		const error = new Error('store unavailable');
		const deleteFiles = vi.fn(async (execution: ExecutionLocation) => {
			if (execution === first) throw error;
		});
		const logger = makeLogger();
		const cleanup = new ExecutionFileCleanup(deleteFiles, logger);

		await expect(cleanup.deleteFilesOf([first, second])).resolves.toEqual([second]);

		expect(logger.error).toHaveBeenCalledExactlyOnceWith(
			expect.stringContaining('Failed to delete the binary files'),
			{ executionId: 'exec-1', workflowId: 'wf-1', error },
		);
	});

	it('runs at most five file deletions at once', async () => {
		let inFlight = 0;
		let peak = 0;
		const deleteFiles = vi.fn(async () => {
			inFlight++;
			peak = Math.max(peak, inFlight);
			await new Promise((resolve) => setImmediate(resolve));
			inFlight--;
		});
		const executions = Array.from({ length: 12 }, (_, index) => ({
			executionId: `exec-${index}`,
			workflowId: 'wf-1',
		}));

		const kept = await new ExecutionFileCleanup(deleteFiles, makeLogger()).deleteFilesOf(
			executions,
		);

		expect(kept).toEqual(executions);
		expect(deleteFiles).toHaveBeenCalledTimes(12);
		expect(peak).toBe(5);
	});
});
