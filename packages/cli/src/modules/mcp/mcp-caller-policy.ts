import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * What the server lets the current caller reach beyond its scopes. Derived
 * from the server-side auth context, never from a client claim.
 */
export interface McpCallerPolicy {
	/**
	 * The per-workflow "Available in MCP" switch exposes a workflow to
	 * third-party clients. A first-party client (the n8n Assistant) reads what
	 * its user can read, as it did with its native tools.
	 */
	bypassAvailabilityGate: boolean;
}

const storage = new AsyncLocalStorage<McpCallerPolicy>();

/**
 * Runs one tool call with the caller's policy attached. The workflow gate sits
 * under many tools, so the policy travels with the async context instead of
 * through each of their signatures.
 */
export async function runWithMcpCallerPolicy<T>(
	policy: McpCallerPolicy,
	fn: () => Promise<T>,
): Promise<T> {
	return await storage.run(policy, fn);
}

/** Whether the current call may read workflows that are not available in MCP. */
export function isMcpAvailabilityGateBypassed(): boolean {
	return storage.getStore()?.bypassAvailabilityGate === true;
}
