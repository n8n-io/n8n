/**
 * Whether the agent can read the workflow dependency index: the `nodeTypes`
 * filter on `workflows(action="list")` and the `node-usage` action.
 *
 * Separate from the folder gate so the two can be measured apart — folders answer
 * "where does this live", node usage answers "what is it built out of", and a
 * combined switch could not tell which one moved a result. Defaults to ON.
 */
export function isNodeUsageContextEnabled(): boolean {
	return process.env.N8N_INSTANCE_AI_NODE_USAGE_CONTEXT_ENABLED !== 'false';
}
