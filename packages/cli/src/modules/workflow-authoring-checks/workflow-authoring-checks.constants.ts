export const WORKFLOW_CHECK_TYPES = {
	NodeHasDirectParent: 'node-has-direct-parent',
} as const;

export type WorkflowCheckTypeKey = (typeof WORKFLOW_CHECK_TYPES)[keyof typeof WORKFLOW_CHECK_TYPES];
