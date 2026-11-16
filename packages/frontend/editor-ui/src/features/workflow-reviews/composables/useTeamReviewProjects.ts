import { computed, watch } from 'vue';

import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { seedTrackOptIn } from '@/features/workflow-reviews/reviewPrototype.state';

/** Team projects only. Personal projects are outside this policy. */
export function useTeamReviewProjects() {
	const projectsStore = useProjectsStore();

	const teamProjects = computed(() =>
		projectsStore.myProjects.filter((project) => project.type === ProjectTypes.Team),
	);

	watch(
		teamProjects,
		(projects) => {
			const projectIds = projects.map((project) => project.id);
			seedTrackOptIn(projectIds, 'publishing');
			seedTrackOptIn(projectIds, 'promoting');
		},
		{ immediate: true },
	);

	return { teamProjects };
}
