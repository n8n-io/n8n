import { computed, type ComputedRef } from 'vue';
import { isIconOrEmoji, type IconOrEmoji } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { DEFAULT_PROJECT_ICON } from '@/features/collaboration/projects/projects.constants';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

export function useAgentProjectBreadcrumb(projectId: ComputedRef<string>) {
	const projectsStore = useProjectsStore();
	const i18n = useI18n();

	const isPersonalProject = computed(() => projectsStore.personalProject?.id === projectId.value);
	const project = computed(() => {
		if (isPersonalProject.value) return projectsStore.personalProject;
		if (projectsStore.currentProject?.id === projectId.value) return projectsStore.currentProject;
		return projectsStore.myProjects.find((item) => item.id === projectId.value);
	});

	const projectName = computed(() =>
		isPersonalProject.value
			? i18n.baseText('projects.menu.personal')
			: (project.value?.name ?? null),
	);
	const projectIcon = computed<IconOrEmoji>(() => {
		if (isPersonalProject.value) return { type: 'icon', value: 'user' };
		return isIconOrEmoji(project.value?.icon) ? project.value.icon : DEFAULT_PROJECT_ICON;
	});

	return { projectName, projectIcon };
}
