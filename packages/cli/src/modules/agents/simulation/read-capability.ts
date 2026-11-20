import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/** The one test chat world that a read caller serves. It never changes after the world opens. */
export interface ReadCapabilityBinding {
	readonly ownerId: string;
	readonly projectId: string;
	readonly agentId: string;
	readonly testChatId: string;
}

/**
 * Reads the real service for one binding. The caller owns its destination and its credential.
 * It takes a tool name and arguments only, so a tool request cannot supply a URL, a header or a
 * token. It has no write method.
 */
export interface ScopedReadCaller {
	read(toolName: string, args: Readonly<Record<string, unknown>>): Promise<CallToolResult>;
}

/**
 * Supplied by n8n. A backend calls it one time when it opens a world, and keeps the result for
 * that world only. The caller must refuse a tool that is not in `readTools`.
 */
export type ReadCapabilityFactory = (
	binding: ReadCapabilityBinding,
	readTools: ReadonlySet<string>,
) => Promise<ScopedReadCaller>;
