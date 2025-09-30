import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { VIEWS } from '@/constants';
import { useProjectsStore } from '@/stores/projects.store';
import type { CommandGroup } from './types';

const Section = {
	WORKFLOWS: 'Workflows',
} as const;

export function useBaseCommands(): CommandGroup {
	const router = useRouter();
	const route = useRoute();
	const projectsStore = useProjectsStore();

	const personalProjectId = computed(() => {
		return projectsStore.myProjects.find((p) => p.type === 'personal')?.id;
	});

	const currentProjectName = computed(() => {
		if (!route.params.projectId || route.params.projectId === personalProjectId.value) {
			return 'Personal';
		}
		return projectsStore.myProjects.find((p) => p.id === (route.params.projectId as string))?.name;
	});

	const baseCommands = computed(() => {
		return [
			{
				id: 'demo-action',
				title: 'This is available everywhere',
				section: 'Demo',
				handler: () => {
					console.log('hello');
				},
			},
			{
				id: 'create-workflow',
				title: `Create new workflow in ${currentProjectName.value}`,
				section: Section.WORKFLOWS,
				handler: () => {
					void router.push({
						name: VIEWS.NEW_WORKFLOW,
						query: {
							projectId: route.params.projectId as string,
							parentFolderId: route.params.folderId as string,
						},
					});
				},
			},
		];
	});

	return {
		commands: baseCommands,
	};
}
