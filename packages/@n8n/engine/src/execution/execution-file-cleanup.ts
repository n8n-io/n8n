import type { ExecutionFilesDeleter, ExecutionLocation } from '../dependencies';
import type { EngineLogger } from '../logging';

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

		const results = await Promise.allSettled(
			executions.map(async (execution) => await deleteFiles(execution)),
		);

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
