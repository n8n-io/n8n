import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { HarnessTaskResult, HarnessTaskSettings } from '@n8n/task-runner-harness';

/**
 * Bridge between the harness node and the harness task runner.
 * Follows the pattern of JsTaskRunnerSandbox in the Code node.
 */
export class HarnessSandbox {
	constructor(private readonly executeFunctions: IExecuteFunctions) {}

	/**
	 * Execute a harness task by dispatching it to the harness task runner
	 * via the task broker. Returns the CLI execution result.
	 */
	async execute(settings: HarnessTaskSettings): Promise<HarnessTaskResult> {
		const result = await this.executeFunctions.startJob<HarnessTaskResult>('harness', settings, 0);

		if (!result.ok) {
			throw new NodeOperationError(
				this.executeFunctions.getNode(),
				'Harness task execution failed',
				{
					description: result.error instanceof Error ? result.error.message : String(result.error),
				},
			);
		}

		return result.result;
	}
}
