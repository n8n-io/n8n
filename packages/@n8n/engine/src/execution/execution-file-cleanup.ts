import type { ExecutionFilesDeleter, ExecutionLocation } from '../dependencies';
import type { EngineLogger } from '../logging';

/**
 * At most this many deletions run at once. They share the libuv threadpool with
 * the file, DNS and crypto work of the process. v1 uses the same bound.
 */
const MAX_PARALLEL_FILE_DELETES = 5;

/**
 * Deletes the binary files of executions before the retention job prunes them.
 *
 * Returns the executions that are safe to prune. A failed deletion is logged
 * and its execution is left out, so it is retried on the next run.
 */
export class ExecutionFileCleanup {
	constructor(
		private readonly deleteFiles: ExecutionFilesDeleter | undefined,
		private readonly logger: EngineLogger,
	) {}

	async deleteFilesOf(executions: ExecutionLocation[]): Promise<ExecutionLocation[]> {
		const deleteFiles = this.deleteFiles;
		if (!deleteFiles) return executions;

		const results: Array<PromiseSettledResult<void>> = [];
		for (let start = 0; start < executions.length; start += MAX_PARALLEL_FILE_DELETES) {
			const chunk = executions.slice(start, start + MAX_PARALLEL_FILE_DELETES);
			results.push(
				...(await Promise.allSettled(chunk.map(async (execution) => await deleteFiles(execution)))),
			);
		}

		return executions.filter((execution, index) => {
			const result = results[index];
			if (result.status === 'fulfilled') return true;

			this.logger.error('Failed to delete the binary files of an execution, keeping it', {
				executionId: execution.executionId,
				workflowId: execution.workflowId,
				error: result.reason,
			});
			return false;
		});
	}
}
