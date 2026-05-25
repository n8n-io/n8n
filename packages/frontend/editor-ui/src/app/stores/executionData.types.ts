/**
 * Per-output aggregation of execution run data.
 *
 * `total` — items emitted across all iterations.
 * `iterations` — number of non-canceled task iterations contributing.
 * `byTarget` — present for non-main connection types (e.g. AI tools / memory /
 * embeddings). Tracks the same `{ total, iterations }` per target node id, so
 * label rendering can show counts per fan-out target. Keyed by node id.
 */
export type ExecutionOutputMapData = {
	total: number;
	iterations: number;
	byTarget?: {
		[targetNodeId: string]: {
			total: number;
			iterations: number;
		};
	};
};

/**
 * Aggregated output stats for a single node, indexed first by connection type
 * (`main`, `ai_tool`, etc.) and then by output index (as a string).
 */
export type ExecutionOutputMap = {
	[connectionType: string]: {
		[outputIndex: string]: ExecutionOutputMapData;
	};
};
