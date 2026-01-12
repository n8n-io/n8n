import type { ExecuteContext } from 'n8n-core';
import type { INodeExecutionData } from 'n8n-workflow';

import type { IFunctions } from 'types/*';

/**
 * Utility for extracting workflow execution pipeline data.
 *
 * Provides access to outputs from all previously executed nodes in the workflow,
 * enabling downstream nodes to read data produced by upstream nodes without
 * explicit node connections.
 */
export class Pipeline {
	/**
	 * Extracts outputs from all previously executed nodes in the workflow.
	 *
	 * Returns a snapshot of the execution pipeline at the current point, mapping
	 * each node name to its latest output data. Nodes that executed multiple times
	 * (e.g., in loops) only return their most recent output.
	 *
	 * @param functions - n8n functions providing execution context
	 * @returns Map of nodeName → node output data. Nodes without output are excluded.
	 *
	 * @example
	 * ```typescript
	 * const pipeline = Pipeline.readPipeline(this);
	 * const dataFromNodeA = pipeline['Node A']; // Get Node A's output
	 * ```
	 */
	static readPipeline(functions: IFunctions): Record<string, INodeExecutionData[]> {
		// NOTE: Type cast required - IFunctions doesn't expose ExecuteContext in public API
		// but runExecutionData is available at runtime in execution context
		const context = functions as ExecuteContext;
		const runData = context.runExecutionData?.resultData?.runData;

		if (!runData) return {};

		const allNodesOutput: Record<string, INodeExecutionData[]> = {};

		for (const [nodeName, taskDataArray] of Object.entries(runData)) {
			// NOTE: Use latest run data - nodes can execute multiple times in loops
			const latestRun = taskDataArray[taskDataArray.length - 1];

			// NOTE: Only include nodes with successful execution output on main[0] branch
			if (latestRun?.data?.main?.[0]) allNodesOutput[nodeName] = latestRun.data.main[0];
		}

		return allNodesOutput;
	}
}
