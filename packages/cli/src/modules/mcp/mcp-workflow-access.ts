import { AsyncLocalStorage } from 'node:async_hooks';

const inProcessCall = new AsyncLocalStorage<true>();

/**
 * Runs an MCP tool handler for an in-process n8n caller, such as n8n Assistant.
 * These callers already reach every workflow that the user's role allows, so the
 * per-workflow `availableInMCP` setting does not apply. Scopes still apply.
 */
export async function runAsInProcessMcpCall<T>(fn: () => Promise<T>): Promise<T> {
	return await inProcessCall.run(true, fn);
}

/** Whether the `availableInMCP` setting limits the current tool call. */
export function isMcpAvailabilityEnforced(): boolean {
	return inProcessCall.getStore() !== true;
}
