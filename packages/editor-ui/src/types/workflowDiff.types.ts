export const enum NodeDiffStatus {
	EQ,
	MODIFIED,
	ADDED,
	DELETED,
}

export type WorkflowDiff = Record<string, NodeDiffStatus>;
