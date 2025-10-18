import { computed, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '@/constants';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { CommandBarItem } from '../types';
import { useGlobalEntityCreation } from '@/composables/useGlobalEntityCreation';
import CommandBarItemTitle from '@/features/shared/commandBar/components/CommandBarItemTitle.vue';

const ITEM_ID = {
	CREATE_PROJECT: 'create-project',
	OPEN_PROJECT: 'open-project',
};

export function useProjectNavigationCommands(options: {
	lastQuery: Ref<string>;
	activeNodeId: Ref<string | null>;
}) {
	const i18n = useI18n();
	const { lastQuery, activeNodeId } = options;
	const projectsStore = useProjectsStore();
	const globalEntityCreation = useGlobalEntityCreation();

	const router = useRouter();

	const filteredProjects = computed(() => {
		const trimmed = (lastQuery.value || '').trim().toLowerCase();
		const allProjects = projectsStore.availableProjects;

		if (!trimmed) {
			return allProjects;
		}

		return allProjects.filter(
			(project) =>
				project.name?.toLowerCase().includes(trimmed) ||
				project.id?.toLowerCase().includes(trimmed),
		);
	});

	const createProjectCommand = (project: ProjectListItem): CommandBarItem => {
		const title =
			project.type === 'personal'
				? i18n.baseText('projects.menu.personal')
				: project.name
					? project.name
					: i18n.baseText('commandBar.projects.unnamed');

		return {
			id: project.id,
			title: {
				component: CommandBarItemTitle,
				props: {
					title,
					actionText: i18n.baseText('generic.open'),
				},
			},
			section: i18n.baseText('commandBar.sections.projects'),
			keywords: [title],
			handler: () => {
				void router.push({
					name: VIEWS.PROJECTS_WORKFLOWS,
					params: { projectId: project.id },
				});
			},
		};
	};

	const openProjectCommands = computed<CommandBarItem[]>(() => {
		const isInProjectParent = activeNodeId.value === ITEM_ID.OPEN_PROJECT;
		if (!isInProjectParent) return [];
		return filteredProjects.value.map((project) => createProjectCommand(project));
	});

	const rootProjectItems = computed<CommandBarItem[]>(() => {
		const isRootWithQuery = activeNodeId.value === null && lastQuery.value.trim().length > 2;
		if (!isRootWithQuery) return [];
		return filteredProjects.value.map((project) => createProjectCommand(project));
	});

	const projectNavigationCommands = computed<CommandBarItem[]>(() => {
		const commands: CommandBarItem[] = [];

		if (projectsStore.hasPermissionToCreateProjects && projectsStore.canCreateProjects) {
			commands.push({
				id: ITEM_ID.CREATE_PROJECT,
				title: i18n.baseText('commandBar.projects.create'),
				section: i18n.baseText('commandBar.sections.projects'),
				icon: {
					component: N8nIcon,
					props: {
						icon: 'layers',
						color: 'text-light',
					},
				},
				handler: () => {
					void globalEntityCreation.createProject('command_bar');
				},
			});
		}

		if (projectsStore.availableProjects.length > 0) {
			commands.push({
				id: ITEM_ID.OPEN_PROJECT,
				title: i18n.baseText('commandBar.projects.open'),
				section: i18n.baseText('commandBar.sections.projects'),
				placeholder: i18n.baseText('commandBar.projects.searchPlaceholder'),
				children: openProjectCommands.value,
				icon: {
					component: N8nIcon,
					props: {
						icon: 'layers',
						color: 'text-light',
					},
				},
			});
		}

		return [...commands, ...rootProjectItems.value];
	});

	function onCommandBarChange(query: string) {
		lastQuery.value = query;
	}

	function onCommandBarNavigateTo(to: string | null) {
		activeNodeId.value = to;
	}

	return {
		commands: projectNavigationCommands,
		handlers: {
			onCommandBarChange,
			onCommandBarNavigateTo,
		},
	};
}
