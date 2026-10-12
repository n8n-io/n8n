import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { N8nIcon, isIconOrEmoji } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { VIEWS } from '@/app/constants';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { searchProjects } from '@/features/collaboration/projects/projects.api';
import type {
	CommandBarItem,
	CommandBarSearchRequest,
	CommandBarSearchResult,
	CommandGroup,
} from '../types';
import { useGlobalEntityCreation } from '@/app/composables/useGlobalEntityCreation';

const ITEM_ID = {
	CREATE_PROJECT: 'create-project',
};

export function useProjectNavigationCommands(): CommandGroup {
	const i18n = useI18n();
	const rootStore = useRootStore();
	const projectsStore = useProjectsStore();
	const globalEntityCreation = useGlobalEntityCreation();

	const router = useRouter();

	const toCommandBarItem = (project: ProjectListItem): CommandBarItem => {
		const isPersonal = project.type === 'personal';
		const title =
			project.id === projectsStore.personalProject?.id
				? i18n.baseText('projects.menu.personal')
				: project.name || i18n.baseText('commandBar.projects.unnamed');
		const location = { name: VIEWS.PROJECTS_WORKFLOWS, params: { projectId: project.id } };

		return {
			id: project.id,
			title,
			icon: isPersonal
				? { type: 'icon', value: 'user' }
				: isIconOrEmoji(project.icon)
					? project.icon
					: { type: 'icon', value: 'layers' },
			href: router.resolve(location).href,
			handler: () => {
				void router.push(location);
			},
		};
	};

	async function search({
		query,
		offset,
		limit,
	}: CommandBarSearchRequest): Promise<CommandBarSearchResult> {
		const search = query.trim();
		const { count, data } = await searchProjects(rootStore.restApiContext, {
			...(search ? { search } : {}),
			skip: offset,
			take: limit,
		});

		return {
			items: data.map(toCommandBarItem),
			hasMore: offset + data.length < count,
		};
	}

	const projectNavigationCommands = computed<CommandBarItem[]>(() => {
		if (!projectsStore.hasPermissionToCreateProjects || !projectsStore.canCreateProjects) {
			return [];
		}

		return [
			{
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
			},
		];
	});

	return {
		commands: projectNavigationCommands,
		source: {
			id: 'projects',
			title: i18n.baseText('commandBar.sections.projects'),
			isRemote: true,
			isAvailable: () => projectsStore.canViewProjects,
			search,
		},
	};
}
