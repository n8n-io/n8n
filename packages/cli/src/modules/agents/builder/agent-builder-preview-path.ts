export function buildAgentPreviewPath(projectId: string, agentId: string): string {
	const encodedProjectId = encodeURIComponent(projectId);
	const encodedAgentId = encodeURIComponent(agentId);

	return `/projects/${encodedProjectId}/agents/${encodedAgentId}/preview`;
}
