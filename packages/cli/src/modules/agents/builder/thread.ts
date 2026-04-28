/** Thread-id prefixes scoping different chat surfaces of the same agent. */
export const AGENT_THREAD_PREFIX = {
	TEST: 'test:',
	BUILDER: 'builder:',
} as const;

/** Derive a stable thread ID for the builder chat of a given agent. */
export function builderThreadId(agentId: string): string {
	return `${AGENT_THREAD_PREFIX.BUILDER}${agentId}`;
}

/** Derive a stable thread ID for the test-chat of a given agent. */
export function testChatThreadId(agentId: string): string {
	return `${AGENT_THREAD_PREFIX.TEST}${agentId}`;
}
