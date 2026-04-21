export const WORKFLOW_CHECK_TYPES = {
	NodeHasDirectParent: 'node-has-direct-parent',
	NoDanglingNodes: 'no-dangling-nodes',
} as const;

export type WorkflowCheckTypeKey = (typeof WORKFLOW_CHECK_TYPES)[keyof typeof WORKFLOW_CHECK_TYPES];
