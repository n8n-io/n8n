export const enum NodeDiffStatus {
	Eq = 'equal',
	Modified = 'modified',
	Added = 'added',
	Deleted = 'deleted',
}

export type NodeDiff = {
	status: NodeDiffStatus;
};

export type WorkflowDiff = Record<string, NodeDiff>;
