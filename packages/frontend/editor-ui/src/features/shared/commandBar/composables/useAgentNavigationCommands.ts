import { computed, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { getResourcePermissions } from '@n8n/permissions';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { AGENT_BUILDER_VIEW, AGENTS_MODULE_NAME } from '@/features/agents/constants';
import { listAgentsPageGlobal } from '@/features/agents/composables/useAgentApi';
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
	const sourceControlStore = useSourceControlStore();
	const { createAgent } = useCreateAgent();

	const router = useRouter();

	const isAgentsModuleActive = () => settingsStore.isModuleActive(AGENTS_MODULE_NAME) === true;

	const homeProject = computed(() => projectsStore.currentProject ?? projectsStore.personalProject);

	const getProjectName = (agent: AgentResource) => {
		if (agent.project?.type === 'personal') {
			return i18n.baseText('projects.menu.personal');
		}
		return agent.project?.name ?? '';
	};

	const toCommandBarItem = (agent: AgentResource): CommandBarItem => {
		const location = {
			name: AGENT_BUILDER_VIEW,
			params: { projectId: agent.projectId, agentId: agent.id },
		};

		return {
			id: agent.id,
			title: agent.name,
			description: getProjectName(agent),
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
		const trimmed = query.trim();
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
		const canCreate =
			isAgentsModuleActive() &&
			!!projectId &&
			!sourceControlStore.preferences.branchReadOnly &&
			getResourcePermissions(homeProject.value?.scopes).agent?.create === true;

		if (!canCreate) return [];

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
			isAvailable: isAgentsModuleActive,
			search,
		},
	};
}
