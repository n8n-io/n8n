import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { useProjectsStore } from '@/features/projects/projects.store';
import type { CommandGroup, CommandBarItem } from '../types';
import { VIEWS } from '@/constants';
import { N8nIcon } from '@n8n/design-system';

export function useExecutionNavigationCommands(): CommandGroup {
	const i18n = useI18n();
	const projectsStore = useProjectsStore();

	const router = useRouter();
	const route = useRoute();

	const personalProjectId = computed(() => {
		return projectsStore.myProjects.find((p) => p.type === 'personal')?.id;
	});

	const currentProjectId = computed(() => {
		return typeof route.params.projectId === 'string'
			? route.params.projectId
			: personalProjectId.value;
	});

	const executionNavigationCommands = computed<CommandBarItem[]>(() => {
		return [
			{
				id: 'open-executions',
				title: i18n.baseText('commandBar.executions.open'),
				section: i18n.baseText('commandBar.sections.executions'),
				icon: {
					component: N8nIcon,
					props: {
						icon: 'arrow-right',
					},
				},
				handler: () => {
					if (currentProjectId.value === personalProjectId.value) {
						void router.push({ name: VIEWS.EXECUTIONS });
					} else {
						void router.push({
							name: VIEWS.PROJECTS_EXECUTIONS,
							params: { projectId: currentProjectId.value },
						});
					}
				},
			},
		];
	});

	return {
		commands: executionNavigationCommands,
	};
}
