import {
	INSTANCE_AI_MCP_SERVER_TARGET_METADATA_KEY,
	instanceAiMcpServerTargetSchema,
	type InstanceAiMcpServerSubject,
	type InstanceAiMcpServerTarget,
} from '@n8n/api-types';

/** The custom MCP server that a thread works on, from the page that opened it. */
export function parseMcpServerTarget(
	metadata: Record<string, unknown>,
): InstanceAiMcpServerTarget | undefined {
	const parsed = instanceAiMcpServerTargetSchema.safeParse(
		metadata[INSTANCE_AI_MCP_SERVER_TARGET_METADATA_KEY],
	);
	return parsed.success ? parsed.data : undefined;
}

/**
 * The thread metadata that binds a custom MCP server subject. A thread works on one
 * server, so it returns `undefined` when the thread already has a server.
 */
export function withMcpServerSubject(
	metadata: Record<string, unknown>,
	{ id: serverId, projectId, name }: InstanceAiMcpServerSubject,
): Record<string, unknown> | undefined {
	if (parseMcpServerTarget(metadata)) return undefined;
	const target: InstanceAiMcpServerTarget = { serverId, projectId, ...(name ? { name } : {}) };
	return { ...metadata, [INSTANCE_AI_MCP_SERVER_TARGET_METADATA_KEY]: target };
}
