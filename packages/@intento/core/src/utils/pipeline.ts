import type { ExecuteContext } from 'n8n-core';
import type { INodeExecutionData } from 'n8n-workflow';

import type { IFunctions } from 'types/*';

/**
 * Utility for extracting workflow execution pipeline data.
 *
 * Provides access to outputs from all previously executed nodes in the workflow,
 * enabling downstream nodes to read data produced by upstream nodes without
 * explicit node connections.
 *
 * **Use case:** Access any node's output regardless of connection topology
 * (e.g., read Node A's output from Node C even if A→B→C).
 */
export class Pipeline {
	/**
	 * Extracts outputs from all previously executed nodes in the workflow.
	 *
	 * Returns a snapshot of the execution pipeline at the current point, mapping
	 * each node name to its latest output data. Nodes that executed multiple times
	 * (e.g., in loops) only return their most recent output.
	 *
	 * **Data structure accessed:**
	 * - `runExecutionData.resultData.runData` - Map of node outputs by name
	 * - Each node has array of `ITaskData` (one per execution/run)
	 * - Each `ITaskData.data.main` is array of output branches (main[0], main[1], ...)
	 *
	 * **Limitations:**
	 * - Only returns main[0] branch (primary output)
	 * - Nodes with no output or failed executions are excluded
	 * - Empty result if called before any nodes execute
	 *
	 * @param functions - n8n functions providing execution context
	 * @returns Map of nodeName → node output data (INodeExecutionData[])
	 *
	 * @example
	 * ```typescript
	 * const pipeline = Pipeline.readPipeline(this);
	 * const dataFromNodeA = pipeline['Node A']; // Get Node A's output
	 * ```
	 */
	static readPipeline(functions: IFunctions): Record<string, INodeExecutionData[]> {
		// NOTE: Type cast justified - IFunctions doesn't expose ExecuteContext in public API
		// but runExecutionData is available at runtime in execution context
		const context = functions as ExecuteContext;
		const runData = context.runExecutionData?.resultData?.runData;

		// NOTE: No execution data available (shouldn't happen in normal flow, but defensive)
		if (!runData) return {};

		const allNodesOutput: Record<string, INodeExecutionData[]> = {};

		for (const [nodeName, taskDataArray] of Object.entries(runData)) {
			// NOTE: Use latest run data (nodes can execute multiple times in loops)
			// taskDataArray.length-1 gets most recent execution
			const latestRun = taskDataArray[taskDataArray.length - 1];

			// NOTE: data.main[0] contains primary output branch
			// Nodes can have multiple output branches (main[0], main[1], etc.) but we only read main[0]
			// Missing latestRun or data.main[0] means node hasn't executed successfully yet
			if (latestRun?.data?.main?.[0]) allNodesOutput[nodeName] = latestRun.data.main[0];
		}

		return allNodesOutput;
	}
}
