export const WORKFLOW_EXECUTION_BLOCK_CAUSES = ['restrictedNode'] as const;

export type WorkflowExecutionBlockCause = (typeof WORKFLOW_EXECUTION_BLOCK_CAUSES)[number];
