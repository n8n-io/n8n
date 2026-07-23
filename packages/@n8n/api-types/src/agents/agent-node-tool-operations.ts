/**
 * Node operations that park the execution in a waiting state and therefore
 * require a persistent workflow execution. Agent node tools run inline, so
 * these operations are hidden in the agents tool configuration UI and
 * rejected by backend validation and the inline node executor.
 */
export const UNSUPPORTED_AGENT_NODE_TOOL_OPERATIONS: readonly string[] = [
	'sendAndWait',
	'dispatchAndWait',
];
