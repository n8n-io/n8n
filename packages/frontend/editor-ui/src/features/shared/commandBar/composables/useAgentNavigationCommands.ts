import { computed, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { N8nIcon, isIconOrEmoji, type IconOrEmoji } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import {
	ProjectTypes,
	type ProjectListItem,
} from '@/features/collaboration/projects/projects.types';
import { AGENT_BUILDER_VIEW, AGENT_N8N_CHAT_SEARCH_MAX_LENGTH } from '@/features/agents/constants';
import { listAgentsPageGlobal } from '@/features/agents/composables/useAgentApi';
import { useAgentPermissions } from '@/features/agents/composables/useAgentPermissions';
import { useCreateAgent } from '@/features/agents/composables/useCreateAgent';
import type { AgentResource } from '@/features/agents/types';
import type {
	CommandBarItem,
	CommandBarSearchRequest,
	CommandBarSearchResult,
	CommandGroup,
} from '../types';

const ITEM_ID = {
	CREATE_AGENT: 'create-agent',
} as const;

export function useAgentNavigationCommands(options: {
	currentProjectName: Ref<string>;
}): CommandGroup {
	const i18n = useI18n();
	const { currentProjectName } = options;
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const projectsStore = useProjectsStore();
	const { createAgent } = useCreateAgent();

	const router = useRouter();

	const isAgentsEnabled = () => settingsStore.isAgentsEnabled;

	const homeProject = computed(() => projectsStore.currentProject ?? projectsStore.personalProject);
	const { canCreate: canCreateInHomeProject } = useAgentPermissions(() => homeProject.value?.id);

	const getProjectName = (project: ProjectListItem) =>
		project.type === ProjectTypes.Personal
			? i18n.baseText('projects.menu.personal')
			: (project.name ?? '');

	const getProjectIcon = (project: ProjectListItem): IconOrEmoji => {
		if (project.type === ProjectTypes.Personal) return { type: 'icon', value: 'user' };
		return isIconOrEmoji(project.icon) ? project.icon : { type: 'icon', value: 'layers' };
	};

	const toCommandBarItem = (agent: AgentResource): CommandBarItem => {
		const location = {
			name: AGENT_BUILDER_VIEW,
			params: { projectId: agent.projectId, agentId: agent.id },
		};

		const project = projectsStore.myProjects.find(({ id }) => id === agent.projectId);

		return {
			id: agent.id,
			title: agent.name,
			...(project
				? { description: getProjectName(project), descriptionIcon: getProjectIcon(project) }
				: {}),
			icon: { type: 'icon', value: 'bot' },
			timestamp: agent.updatedAt,
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
		const trimmed = query.trim().slice(0, AGENT_N8N_CHAT_SEARCH_MAX_LENGTH);
		const { count, data } = await listAgentsPageGlobal(rootStore.restApiContext, {
			skip: offset,
			take: limit,
			sortBy: 'updatedAt:desc',
			...(trimmed ? { filter: { query: trimmed } } : {}),
		});

		return {
			items: data.map(toCommandBarItem),
			hasMore: offset + data.length < count,
		};
	}

	const agentNavigationCommands = computed<CommandBarItem[]>(() => {
		const projectId = homeProject.value?.id;
		if (!isAgentsEnabled() || !projectId || !canCreateInHomeProject.value) return [];

		return [
			{
				id: ITEM_ID.CREATE_AGENT,
				title: i18n.baseText('commandBar.agents.create', {
					interpolate: { projectName: currentProjectName.value },
				}),
				section: i18n.baseText('commandBar.sections.agents'),
				keywords: [i18n.baseText('projects.menu.create.agent')],
				icon: {
					component: N8nIcon,
					props: {
						icon: 'bot',
						color: 'text-light',
					},
				},
				handler: () => {
					createAgent('command_bar', projectId);
				},
			},
		];
	});

	return {
		commands: agentNavigationCommands,
		source: {
			id: 'agents',
			title: i18n.baseText('commandBar.sections.agents'),
			isRemote: true,
			isAvailable: isAgentsEnabled,
			search,
		},
	};
}
