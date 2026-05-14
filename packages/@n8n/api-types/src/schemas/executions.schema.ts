import { z } from 'zod';

/**
 * Describes who initiated a single-node execution (n8n Hub Task 20 / Phase 5.1).
 *
 * Stored as `caller.kind` / `caller.name` / `caller.clientId` rows in
 * `ExecutionMetadata` and surfaced on the executions DTO so the UI can attribute
 * single-node calls back to the MCP / SDK / CLI / Instance AI client that triggered them.
 */
export const ExecutionCallerKindSchema = z.enum(['mcp', 'sdk', 'cli', 'instance-ai']);

export const ExecutionCallerSchema = z.object({
	kind: ExecutionCallerKindSchema,
	name: z.string(),
	clientId: z.string().optional(),
	sessionId: z.string().min(1).max(512).optional(),
});

export type ExecutionCallerKind = z.infer<typeof ExecutionCallerKindSchema>;
export type ExecutionCaller = z.infer<typeof ExecutionCallerSchema>;

/**
 * Metadata keys used to persist caller info on `ExecutionMetadata`.
 * Kept here so the writer (ExecuteNodeService) and the reader (ExecutionService)
 * stay in sync.
 */
export const EXECUTION_CALLER_METADATA_KEYS = {
	kind: 'caller.kind',
	name: 'caller.name',
	clientId: 'caller.clientId',
	sessionId: 'caller.sessionId',
	nodeType: 'nodeType',
	/**
	 * Full action id, e.g. `n8n-nodes-base.slack.message.send`. Distinct from
	 * `nodeType` (just the n8n node id, e.g. `n8n-nodes-base.slack`) so the UI
	 * can show which specific operation ran, not just which node.
	 */
	actionId: 'actionId',
	/**
	 * Human-readable action label, e.g. `Slack - Post Message`. Composed from
	 * the node's `displayName` plus the operation's display name (when the
	 * node has a resource/operation discriminator). Falls back to just the
	 * node display name for simple nodes (HTTP Request, etc.).
	 */
	actionDisplayName: 'actionDisplayName',
	credentialId: 'credentialId',
} as const;

/**
 * Reconstruct an {@link ExecutionCaller} from a metadata record. Returns
 * `undefined` if either `kind` or `name` is missing — both are required by the
 * schema, and `clientId` is optional.
 */
export function extractExecutionCaller(
	metadata: Record<string, string> | undefined,
): ExecutionCaller | undefined {
	if (!metadata) return undefined;

	const kindRaw = metadata[EXECUTION_CALLER_METADATA_KEYS.kind];
	const name = metadata[EXECUTION_CALLER_METADATA_KEYS.name];

	if (!kindRaw || !name) return undefined;

	const kind = ExecutionCallerKindSchema.safeParse(kindRaw);
	if (!kind.success) return undefined;

	const clientId = metadata[EXECUTION_CALLER_METADATA_KEYS.clientId];
	const sessionId = metadata[EXECUTION_CALLER_METADATA_KEYS.sessionId];

	return {
		kind: kind.data,
		name,
		...(clientId !== undefined ? { clientId } : {}),
		...(sessionId !== undefined ? { sessionId } : {}),
	};
}
