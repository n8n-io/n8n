import { buildAgentTestPath } from './agent-builder-test-path';

/** Per-Agent context the builder needs: the Preview link. */
export function buildBuilderSessionContext(projectId: string, agentId: string): string {
	return `\
## Session context

- Preview link for the target agent: [Preview](${buildAgentTestPath(projectId, agentId)})`;
}
