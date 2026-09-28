/**
 * Prefix of the agents-module builder session thread ids spawned by one
 * instance-AI thread (full id: `ia-builder:<threadId>:<agentId>`). Shared
 * with the CLI host so thread deletion can find and remove these sessions.
 */
export function instanceAiBuilderThreadPrefix(instanceAiThreadId: string): string {
	return `ia-builder:${instanceAiThreadId}:`;
}
