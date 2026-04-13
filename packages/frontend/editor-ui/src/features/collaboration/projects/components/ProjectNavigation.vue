<script lang="ts" setup>
import { useGlobalEntityCreation } from '@/app/composables/useGlobalEntityCreation';
import { useCalloutHelpers } from '@/app/composables/useCalloutHelpers';
import { VIEWS } from '@/app/constants';
import { sourceControlEventBus } from '@/features/integrations/sourceControl.ee/sourceControl.eventBus';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { IMenuItem } from '@n8n/design-system/types';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeMount, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useProjectsStore } from '../projects.store';
import type { ProjectListItem } from '../projects.types';
import { CHAT_VIEW } from '@/features/ai/chatHub/constants';
import { INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';
import { AGENT_BUILDER_VIEW, NEW_AGENT_VIEW } from '@/features/agents/constants';
import { listAllAgents } from '@/features/agents/composables/useAgentApi';

import { BetaTag, N8nMenuItem, N8nPopover, N8nText, N8nButton } from '@n8n/design-system';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { useTelemetry } from '@/app/composables/useTelemetry';

type Props = {
	collapsed: boolean;
	planName?: string;
};

const props = defineProps<Props>();

const locale = useI18n();
const route = useRoute();
const globalEntityCreation = useGlobalEntityCreation();
const { isCalloutDismissed, dismissCallout } = useCalloutHelpers();

const projectsStore = useProjectsStore();
const settingsStore = useSettingsStore();
const usersStore = useUsersStore();
const rootStore = useRootStore();
const telemetry = useTelemetry();

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

// Refresh agents list when returning from agent builder
watch(
	() => route.name,
	() => {
		if (isAgentsAvailable.value) {
			void fetchAgents();
		}
	},
);

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

const activeTabId = computed(() => {
	return (
		(Array.isArray(projectsStore.projectNavActiveId)
			? projectsStore.projectNavActiveId[0]
			: projectsStore.projectNavActiveId) ?? undefined
	);
});

const instanceAi = computed<IMenuItem>(() => ({
	id: 'instance-ai',
	icon: 'sparkles',
	label: 'Instance AI',
	route: { to: { name: INSTANCE_AI_VIEW } },
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
	void fetchAgents();
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
		<template v-if="isAgentsAvailable && !props.collapsed">
			<N8nPopover :open="isCoachmarkVisible">
				<template #trigger>
					<div :class="$style.agentsLabel">
						<N8nText size="small" bold color="text-light">{{
							locale.baseText('agents.sidebar.label')
						}}</N8nText>
						<BetaTag />
					</div>
				</template>
				<div :class="$style.coachmark">
					<N8nText size="small">
						{{ locale.baseText('agents.sidebar.coachmark') }}
					</N8nText>
					<N8nButton
						size="mini"
						type="secondary"
						:label="locale.baseText('agents.sidebar.coachmark.dismiss')"
						@click="
							dismissCallout('agents_sidebar_coachmark');
							telemetry.track('User dismissed agents coachmark');
						"
					/>
				</div>
			</N8nPopover>
			<div :class="$style.agentItems">
				<N8nMenuItem
					v-for="agent in agentsList"
					:key="agent.id"
					:item="getAgentMenuItem(agent)"
					:compact="false"
					:active="activeAgentId === agent.id"
					data-test-id="agent-menu-item"
				/>
				<N8nMenuItem
					:item="newAgentItem"
					:compact="false"
					:active="false"
					data-test-id="new-agent-menu-item"
				/>
			</div>
		</template>
		<N8nText
			v-if="
				!props.collapsed && projectsStore.isTeamProjectFeatureEnabled && displayProjects.length > 0
			"
			:class="[$style.projectsLabel]"
			size="small"
			bold
			role="heading"
			color="text-light"
		>
			{{ locale.baseText('projects.menu.title') }}
		</N8nText>
		<div
			v-if="projectsStore.isTeamProjectFeatureEnabled || isFoldersFeatureEnabled"
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

.agentsLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: 0 var(--spacing--xs);
	margin-top: var(--spacing--2xs);
}

.agentItems {
	padding: var(--spacing--4xs) var(--spacing--3xs);
}

.coachmark {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
	max-width: 240px;
}
</style>
