/** The engines that run executions. An engine v1 ID is a number, and an engine v2 ID is a UUID v7. */
export const EXECUTION_ENGINES = ['v1', 'v2'] as const;

export type ExecutionEngine = (typeof EXECUTION_ENGINES)[number];
