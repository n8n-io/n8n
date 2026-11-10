import type { SerializedCursor } from './execution-list-pagination';

/** The place in the run data where a search found its text. */
export interface ExecutionSearchMatch {
	/** The node whose data matched. Open the execution on this node to see the match. */
	nodeName: string;
	/** ID of that node in the workflow as the execution ran it. Absent if the workflow snapshot does not have the node. */
	nodeId?: string;
	/** Absent when the search was for the node only. */
	source?: 'input' | 'output';
	/** Path of the matching field, relative to the item's JSON. Example: `body.issue.url`. */
	path?: string;
	/** The matching text with some text on each side of it. */
	snippet?: { before: string; match: string; after: string };
}

/**
 * One step of a search through the stored execution data. A step stops when it has a
 * page of matches or when its time is up, so `results` can be empty before the end.
 */
export interface ExecutionSearchPage<Result> {
	results: Array<Result & { match: ExecutionSearchMatch }>;
	/** Continues the search below the last execution of this step. `null` at the end of the history. */
	nextCursor: SerializedCursor | null;
	/** The number of executions that this step searched. */
	searchedCount: number;
	/** Start time of the oldest execution that this step searched. `null` when it searched none. */
	searchedBackTo: string | null;
}
