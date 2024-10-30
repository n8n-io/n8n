export const enum NodeDiffStatus {
	Eq = 'equal',
	Modified = 'modified',
	Added = 'added',
	Deleted = 'deleted',
}

export type WorkflowDiff = Record<string, NodeDiffStatus>;
