<script lang="ts" setup>
import { useGlobalEntityCreation } from '@/app/composables/useGlobalEntityCreation';
import { VIEWS } from '@/app/constants';
import { sourceControlEventBus } from '@/features/integrations/sourceControl.ee/sourceControl.eventBus';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { N8nIcon, N8nMenuItem, N8nText } from '@n8n/design-system';
import type { IMenuItem } from '@n8n/design-system/types';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeMount, onBeforeUnmount, ref, watch } from 'vue';
import { useProjectsStore } from '../projects.store';
import type { ProjectListItem } from '../projects.types';
import { CHAT_VIEW } from '@/features/ai/chatHub/constants';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import { useFavoriteNavItems } from '../composables/useFavoriteNavItems';
import FavoritesSidebarCompact from './FavoritesSidebarCompact.vue';
import { INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';
import { AGENT_BUILDER_VIEW, NEW_AGENT_VIEW } from '@/features/agents/constants';
import { listAllAgents, deleteAgent } from '@/features/agents/composables/useAgentApi';
import { useAgentConfirmationModal } from '@/features/agents/composables/useAgentConfirmationModal';
import { useAgentTelemetry } from '@/features/agents/composables/useAgentTelemetry';
import { agentsEventBus } from '@/features/agents/agents.eventBus';

import { hasPermission } from '@/app/utils/rbac/permissions';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { MODAL_CONFIRM } from '@/app/constants';

const PROJECTS_COLLAPSED_KEY = 'n8n:sidebar:projects-collapsed';

type Props = {
	collapsed: boolean;
	planName?: string;
};

const props = defineProps<Props>();

const locale = useI18n();
const globalEntityCreation = useGlobalEntityCreation();

const projectsStore = useProjectsStore();
const settingsStore = useSettingsStore();
const usersStore = useUsersStore();
const rootStore = useRootStore();
const telemetry = useTelemetry();
const agentTelemetry = useAgentTelemetry();
const favoritesStore = useFavoritesStore();
const { openAgentConfirmationModal } = useAgentConfirmationModal();

const { favoriteGroups, activeTabId, onFavoriteProjectClick, onFavoriteWorkflowClick } =
	useFavoriteNavItems();

const displayProjects = computed(() => globalEntityCreation.displayProjects.value);
const isFoldersFeatureEnabled = computed(() => settingsStore.isFoldersFeatureEnabled);
const isChatLinkAvailable = computed(
	() =>
		settingsStore.isChatFeatureEnabled &&
		hasPermission(['rbac'], { rbac: { scope: 'chatHub:message' } }),
);
const isInstanceAiNavVisible = computed(() => {
	if (!settingsStore.isModuleActive('instance-ai')) return false;
	const ms = settingsStore.moduleSettings['instance-ai'];
	return ms?.enabled !== false;
});
const hasMultipleVerifiedUsers = computed(
	() => usersStore.allUsers.filter((user) => !user.isPendingUser).length > 1,
);

// Agents sidebar section
// Gate: isModuleActive('agents') is false when the module isn't registered.
// The PostHog flag (0XX_first_class_agents) controls module registration on the
// backend side — when the flag is off, 'agents' won't appear in activeModules.
const isAgentsAvailable = computed(() => settingsStore.isModuleActive('agents'));
const agentsList = ref<Array<{ id: string; name: string }>>([]);
const isCoachmarkVisible = computed(
	() => isAgentsAvailable.value && !isCalloutDismissed('agents_sidebar_coachmark'),
);

const activeAgentId = computed(() => {
	if (route.name === AGENT_BUILDER_VIEW) {
		return route.params.agentId as string;
	}
	return undefined;
});

const getAgentMenuItem = (agent: { id: string; name: string }): IMenuItem => ({
	id: `agent-${agent.id}`,
	label: agent.name,
	icon: { type: 'icon', value: 'robot' },
	route: {
		to: {
			name: AGENT_BUILDER_VIEW,
			params: {
				projectId: projectsStore.personalProject?.id,
				agentId: agent.id,
			},
		},
	},
});

const newAgentItem = computed<IMenuItem>(() => ({
	id: 'new-agent',
	label: 'New agent',
	icon: { type: 'icon', value: 'plus' },
	route: { to: { name: NEW_AGENT_VIEW } },
}));

const agentActions = [{ id: 'delete', label: 'Delete' }];

async function fetchAgents() {
	if (!isAgentsAvailable.value) return;
	const personalProjectId = projectsStore.personalProject?.id;
	if (!personalProjectId) return;
	try {
		agentsList.value = await listAllAgents(rootStore.restApiContext, personalProjectId);
	} catch {
		agentsList.value = [];
	}
}

async function onAgentAction(action: string, agent: { id: string; name: string }) {
	if (action === 'delete') {
		const confirmed = await openAgentConfirmationModal({
			title: locale.baseText('agents.delete.modal.title', {
				interpolate: { name: agent.name },
			}),
			description: locale.baseText('agents.delete.modal.description', {
				interpolate: { name: agent.name },
			}),
			confirmButtonText: locale.baseText('agents.delete.modal.button.delete'),
			cancelButtonText: locale.baseText('generic.cancel'),
		});
		if (confirmed !== MODAL_CONFIRM) return;
		const personalProjectId = projectsStore.personalProject?.id ?? '';
		await deleteAgent(rootStore.restApiContext, personalProjectId, agent.id);
		agentsList.value = agentsList.value.filter((a) => a.id !== agent.id);
	}
}

// Refresh agents list when returning from agent builder
watch(
	() => route.name,
	() => {
		if (isAgentsAvailable.value) {
			void fetchAgents();
		}
	},
);

const FAVORITES_COLLAPSED_KEY = computed(
	() => `n8n:sidebar:${usersStore.currentUser?.id ?? 'anonymous'}:favorites-collapsed`,
);

const favoritesCollapsed = ref(localStorage.getItem(FAVORITES_COLLAPSED_KEY.value) === 'true');
const projectsCollapsed = ref(localStorage.getItem(PROJECTS_COLLAPSED_KEY) === 'true');

watch(favoritesCollapsed, (val) =>
	localStorage.setItem(FAVORITES_COLLAPSED_KEY.value, String(val)),
);
watch(projectsCollapsed, (val) => localStorage.setItem(PROJECTS_COLLAPSED_KEY, String(val)));

const home = computed<IMenuItem>(() => ({
	id: 'home',
	label: locale.baseText('projects.menu.overview'),
	icon: 'house',
	route: {
		to: { name: VIEWS.HOMEPAGE },
	},
}));

const shared = computed<IMenuItem>(() => ({
	id: 'shared',
	label: locale.baseText('projects.menu.shared'),
	icon: 'share',
	route: {
		to: { name: VIEWS.SHARED_WITH_ME },
	},
}));

const getProjectMenuItem = (project: ProjectListItem): IMenuItem => ({
	id: project.id,
	label: project.name ?? '',
	icon: project.icon as IMenuItem['icon'],
	route: {
		to: {
			name: VIEWS.PROJECTS_WORKFLOWS,
			params: { projectId: project.id },
		},
	},
});

const personalProject = computed<IMenuItem>(() => ({
	id: projectsStore.personalProject?.id ?? '',
	label: locale.baseText('projects.menu.personal'),
	icon: 'user',
	route: {
		to: {
			name: VIEWS.PROJECTS_WORKFLOWS,
			params: { projectId: projectsStore.personalProject?.id },
		},
	},
}));

const hasFavorites = computed(() => favoritesStore.favorites.length > 0);

const instanceAi = computed<IMenuItem>(() => ({
	id: 'instance-ai',
	icon: 'sparkles',
	label: locale.baseText('projects.menu.instanceAi'),
	route: { to: { name: INSTANCE_AI_VIEW } },
	beta: true,
}));

const chat = computed<IMenuItem>(() => ({
	id: 'chat',
	icon: 'message-circle',
	label: locale.baseText('projects.menu.chat'),
	position: 'bottom',
	route: { to: { name: CHAT_VIEW } },
	beta: true,
}));

async function onSourceControlPull() {
	// Update myProjects for the sidebar display
	await projectsStore.getMyProjects();
}

onBeforeMount(async () => {
	await usersStore.fetchUsers({ filter: { isPending: false }, take: 2 });
	sourceControlEventBus.on('pull', onSourceControlPull);
});

onBeforeUnmount(() => {
	sourceControlEventBus.off('pull', onSourceControlPull);
});
</script>

<template>
	<div :class="$style.projects">
		<div :class="[$style.home, props.collapsed ? $style.collapsed : '']">
			<N8nMenuItem
				:item="home"
				:compact="props.collapsed"
				:active="activeTabId === 'home'"
				data-test-id="project-home-menu-item"
			/>
			<N8nMenuItem
				v-if="projectsStore.isTeamProjectFeatureEnabled || isFoldersFeatureEnabled"
				:item="personalProject"
				:compact="props.collapsed"
				:active="activeTabId === personalProject.id"
				data-test-id="project-personal-menu-item"
			/>
			<N8nMenuItem
				v-if="
					(projectsStore.isTeamProjectFeatureEnabled || isFoldersFeatureEnabled) &&
					hasMultipleVerifiedUsers
				"
				:item="shared"
				:compact="props.collapsed"
				:active="activeTabId === 'shared'"
				data-test-id="project-shared-menu-item"
			/>
			<N8nMenuItem
				v-if="isInstanceAiNavVisible"
				:item="instanceAi"
				:compact="props.collapsed"
				:active="activeTabId === 'instance-ai'"
				data-test-id="project-instance-ai-menu-item"
			/>
			<N8nMenuItem
				v-if="isChatLinkAvailable"
				:item="chat"
				:compact="props.collapsed"
				:active="activeTabId === 'chat'"
				data-test-id="project-chat-menu-item"
			/>
		</div>
		<template v-if="hasFavorites">
			<button
				v-if="!props.collapsed"
				:class="$style.sectionHeader"
				@click="favoritesCollapsed = !favoritesCollapsed"
			>
				<N8nText size="small" bold color="text-light">
					{{ locale.baseText('favorites.menu.title') }}
				</N8nText>
				<N8nIcon
					icon="chevron-down"
					size="small"
					:class="[$style.chevron, favoritesCollapsed ? $style.chevronCollapsed : '']"
				/>
			</button>
			<div v-if="!favoritesCollapsed" :class="$style.projectItems">
				<!-- Expanded: flat list, icon hidden (but space preserved) on non-first items per group -->
				<template v-if="!props.collapsed">
					<template v-for="(group, groupIndex) in favoriteGroups" :key="group.type">
						<div v-if="groupIndex > 0" :class="$style.groupSpacer" />
						<template v-for="item in group.items" :key="item.id">
							<div v-if="group.type === 'project'" @click="onFavoriteProjectClick(item.id)">
								<N8nMenuItem :item="item" :compact="false" :active="activeTabId === item.id" />
							</div>
							<div
								v-else
								@click="group.type === 'workflow' ? onFavoriteWorkflowClick() : undefined"
							>
								<N8nMenuItem :item="item" :compact="false" :active="activeTabId === item.id" />
							</div>
						</template>
					</template>
				</template>
				<!-- Collapsed sidebar: single star trigger with hover popover -->
				<template v-else>
					<FavoritesSidebarCompact />
				</template>
			</div>
			<!-- Compact sidebar always shows the star icon regardless of favoritesCollapsed -->
			<div v-else-if="props.collapsed" :class="$style.projectItems">
				<FavoritesSidebarCompact />
			</div>
		</template>
		<template v-if="projectsStore.isTeamProjectFeatureEnabled && displayProjects.length > 0">
			<button
				v-if="!props.collapsed"
				:class="$style.sectionHeader"
				@click="projectsCollapsed = !projectsCollapsed"
			>
				<N8nText size="small" bold color="text-light">
					{{ locale.baseText('projects.menu.title') }}
				</N8nText>
				<N8nIcon
					icon="chevron-down"
					size="small"
					:class="[$style.chevron, projectsCollapsed ? $style.chevronCollapsed : '']"
				/>
			</button>
		</template>
		<div
			v-if="
				(projectsStore.isTeamProjectFeatureEnabled || isFoldersFeatureEnabled) &&
				(!projectsStore.isTeamProjectFeatureEnabled || !projectsCollapsed || props.collapsed)
			"
			:class="$style.projectItems"
		>
			<N8nMenuItem
				v-for="project in displayProjects"
				:key="project.id"
				:class="{
					[$style.collapsed]: props.collapsed,
				}"
				:item="getProjectMenuItem(project)"
				:compact="props.collapsed"
				:active="activeTabId === project.id"
				data-test-id="project-menu-item"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.projects {
	width: 100%;
	align-items: start;
	gap: var(--spacing--3xs);
	&:hover {
		.plusBtn {
			display: block;
		}
	}
}

.projectItems {
	padding: var(--spacing--2xs) var(--spacing--3xs);
}

.upgradeLink {
	color: var(--color--primary);
	cursor: pointer;
}

.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	width: 100%;
	box-sizing: border-box;
	padding: 0 var(--spacing--xs);
	margin-top: var(--spacing--2xs);
	background: none;
	border: none;
	cursor: pointer;
	color: inherit;

	&:hover .chevron {
		color: var(--color--text);
	}
}

.chevron {
	color: var(--color--text--tint-2);
	transition: transform 0.15s ease;
	flex-shrink: 0;
}

.chevronCollapsed {
	transform: rotate(-90deg);
}

/* Keep old .projectsLabel for any remaining usages */
.projectsLabel {
	display: flex;
	justify-content: space-between;
	text-overflow: ellipsis;
	overflow: hidden;
	box-sizing: border-box;
	padding: 0 var(--spacing--xs);
	margin-top: var(--spacing--2xs);

	&.collapsed {
		padding: 0;
		margin-left: 0;
		justify-content: center;
	}
}

.plusBtn {
	margin: 0;
	padding: 0;
	color: var(--color--text--tint-1);
	display: none;
}

.addFirstProjectBtn {
	font-size: var(--font-size--xs);
	margin: 0 var(--spacing--xs);
	width: calc(100% - var(--spacing--xs) * 2);

	&.collapsed {
		display: none;
	}
}

.home {
	padding: 0 var(--spacing--3xs) var(--spacing--2xs);

	&.collapsed {
		border-bottom: var(--border);
	}
}

.groupSpacer {
	height: var(--spacing--4xs);
}
</style>
