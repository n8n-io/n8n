import { buildAgentTestPath } from './agent-builder-test-path';

/** Per-Agent context the builder needs: the Preview link. */
export async function buildBuilderSessionContext(
	projectId: string,
	agentId: string,
): Promise<string> {
	return await Promise.resolve(`\
## Session context

- Preview link for the target agent: [Preview](${buildAgentTestPath(projectId, agentId)})`);
}
