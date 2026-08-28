import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

/**
 * Resolves a project's display name from the stores agent surfaces already
 * have loaded, so per-agent project subtitles stay consistent with the
 * project scope the agent catalog is queried against.
 */
export function useAgentProjectNameResolver() {
	const projectStore = useProjectsStore();

	function findProject(id: string) {
		if (!id) return null;
		if (projectStore.currentProject?.id === id) return projectStore.currentProject;
		if (projectStore.personalProject?.id === id) return projectStore.personalProject;
		return projectStore.myProjects.find((candidate) => candidate.id === id) ?? null;
	}

	function resolveProjectName(id: string): string | null {
		// Only surface a project subtitle for non-personal team projects
		if (!projectStore.isTeamProjectFeatureEnabled) return null;
		const project = findProject(id);
		if (!project || project.type === 'personal') return null;
		return project.name ?? null;
	}

	return { resolveProjectName };
}
