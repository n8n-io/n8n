export const SUB_AGENT_RESOURCE_PREFIX = 'instance-ai-subagent';

export function createSubAgentResourceIdPrefix(parentThreadId: string): string {
	return `${SUB_AGENT_RESOURCE_PREFIX}:${parentThreadId}:`;
}
