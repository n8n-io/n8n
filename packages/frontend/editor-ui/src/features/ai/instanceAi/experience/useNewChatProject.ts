import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { INSTANCE_AI_PROJECT_ID_QUERY } from '../constants';
import { useExperienceMode } from './useExperienceMode';
import { useLastUsedProject } from './useLastUsedProject';

/**
 * The project of a new chat on the Assistant start screen. The `projectId` query wins.
 * Power mode starts in the personal project and shows a picker. Simple mode has no
 * picker, so teammates see the work in the last-used team project.
 */
export function useNewChatProject() {
	const route = useRoute();
	const projectsStore = useProjectsStore();
	const { isSimple } = useExperienceMode();
	const { rememberChatProject, simpleDefaultProjectId } = useLastUsedProject();

	function resolveProjectId(): string | undefined {
		const queryProjectId = route.query[INSTANCE_AI_PROJECT_ID_QUERY];
		if (typeof queryProjectId === 'string' && queryProjectId.length > 0) {
			return queryProjectId;
		}
		return isSimple.value ? simpleDefaultProjectId() : projectsStore.personalProject?.id;
	}

	const selectedProject = ref(resolveProjectId());

	// Simple mode runs the rule again when one of its inputs changes: the projects, the
	// rights, or the last-used project. Power mode does not, so a reload of the projects
	// keeps the choice that the user made in the picker.
	const simpleProjectId = computed(() => (isSimple.value ? simpleDefaultProjectId() : undefined));

	// The mode switch is in the sidebar, so the screen stays open while the mode changes.
	// Choose again also when the query changes or is cleared, so that the previous
	// project of a link does not stay selected.
	watch([() => route.query[INSTANCE_AI_PROJECT_ID_QUERY], isSimple, simpleProjectId], () => {
		selectedProject.value = resolveProjectId();
	});

	// An instance that loses its team-project license keeps its projects, but the user
	// cannot work in them. Hide the picker then, the same way the sidebar project list
	// hides itself. Simple mode chooses the project itself.
	const canSelectProject = computed(
		() =>
			projectsStore.isTeamProjectFeatureEnabled &&
			projectsStore.myProjects.length > 1 &&
			!isSimple.value,
	);

	return { selectedProject, canSelectProject, rememberChatProject };
}
