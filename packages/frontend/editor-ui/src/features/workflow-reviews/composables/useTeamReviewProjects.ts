import { computed } from 'vue';

import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

/** Team projects only. Personal projects are outside this policy. */
export function useTeamReviewProjects() {
	const projectsStore = useProjectsStore();

	const teamProjects = computed(() =>
		projectsStore.myProjects.filter((project) => project.type === ProjectTypes.Team),
	);

	return { teamProjects };
}
