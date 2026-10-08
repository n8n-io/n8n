<script lang="ts" setup>
import { useGlobalEntityCreation } from '@/app/composables/useGlobalEntityCreation';
import { VIEWS } from '@/app/constants';
import { sourceControlEventBus } from '@/features/integrations/sourceControl.ee/sourceControl.eventBus';
import { promotionEventBus } from '@/features/integrations/promotions.ee/promotions.eventBus';
import { useUsersStore } from '@n8n/stores/users.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { N8nIcon, N8nMenuItem } from '@n8n/design-system';
import type { IMenuItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeMount, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useProjectsStore } from '../projects.store';
import { DEFAULT_PROJECT_ICON } from '../projects.constants';
import type { ProjectListItem } from '../projects.types';
import { CHAT_VIEW } from '@/features/ai/chatHub/constants';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import { useFavoriteNavItems } from '../composables/useFavoriteNavItems';
import ProjectNavigationSectionHeader from './ProjectNavigationSectionHeader.vue';
import { INSTANCE_AI_THREAD_VIEW, INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';
import { useInstanceAiAvailable } from '@/features/ai/instanceAi/composables/useInstanceAiAvailability';
import AssistantChatsSection from '@/features/ai/instanceAi/navigation/AssistantChatsSection.vue';
import AssistantAutomationsSection from '@/features/ai/instanceAi/navigation/AssistantAutomationsSection.vue';
import SimpleSidebarSections from '@/features/ai/instanceAi/navigation/SimpleSidebarSections.vue';
import { useExperienceMode } from '@/features/ai/instanceAi/experience/useExperienceMode';
import { WORKFLOW_REVIEW_REQUESTS_VIEW } from '@/features/workflow-reviews/constants';
import { useWorkflowReviewsFeature } from '@/features/workflow-reviews/composables/useWorkflowReviewsFeature';

import { hasPermission } from '@/app/utils/rbac/permissions';

const PROJECTS_COLLAPSED_KEY = 'n8n:sidebar:projects-collapsed';

type Props = {
	collapsed: boolean;
	planName?: string;
};

const props = defineProps<Props>();

const locale = useI18n();
const route = useRoute();
const globalEntityCreation = useGlobalEntityCreation();

const projectsStore = useProjectsStore();
const settingsStore = useSettingsStore();
const usersStore = useUsersStore();
const favoritesStore = useFavoritesStore();

const {
	favoriteGroups,
	activeTabId,
	onFavoriteProjectClick,
	onFavoriteWorkflowClick,
	onUnpinFavorite,
} = useFavoriteNavItems();

const displayProjects = computed(() => globalEntityCreation.displayProjects.value);
const isFoldersFeatureEnabled = computed(() => settingsStore.isFoldersFeatureEnabled);
const canBrowseProjects = computed(
	() => projectsStore.isTeamProjectFeatureEnabled || isFoldersFeatureEnabled.value,
);
const isChatLinkAvailable = computed(
	() =>
		settingsStore.isChatFeatureEnabled &&
		hasPermission(['rbac'], { rbac: { scope: 'chatHub:message' } }),
);
const isInstanceAiNavVisible = useInstanceAiAvailable();
// Simple mode keeps the chats on top and moves the other pages into the Workspace.
const { isSimple } = useExperienceMode();
const workspaceOpen = ref(false);
const showWorkspaceItems = computed(() => !isSimple.value || workspaceOpen.value);
const hasMultipleVerifiedUsers = computed(
	() => usersStore.allUsers.filter((user) => !user.isPendingUser).length > 1,
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
	icon: (project.icon ?? DEFAULT_PROJECT_ICON) as IMenuItem['icon'],
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
	preview: true,
}));

const isInstanceAiThreadView = computed(() => route.name === INSTANCE_AI_THREAD_VIEW);
const sidebarActiveTabId = computed(() =>
	isInstanceAiThreadView.value ? undefined : activeTabId.value,
);

const { isWorkflowReviewsEnabled: isWorkflowReviewsNavVisible } = useWorkflowReviewsFeature();

const workflowReviews = computed<IMenuItem>(() => ({
	id: 'workflow-reviews',
	icon: 'message-square-text',
	label: locale.baseText('workflowReviews.menu.title'),
	route: { to: { name: WORKFLOW_REVIEW_REQUESTS_VIEW } },
}));
const chat = computed<IMenuItem>(() => ({
	id: 'chat',
	icon: 'message-circle',
	label: locale.baseText('projects.menu.chat'),
	position: 'bottom',
	route: { to: { name: CHAT_VIEW } },
}));

// The pages below Overview that the user can open. Simple mode moves them into the Workspace.
const pageItems = computed(() =>
	[
		{
			item: personalProject.value,
			show: !!projectsStore.personalProject?.id && canBrowseProjects.value,
			testId: 'project-personal-menu-item',
		},
		{
			item: shared.value,
			show: canBrowseProjects.value && hasMultipleVerifiedUsers.value,
			testId: 'project-shared-menu-item',
		},
		{
			item: workflowReviews.value,
			show: isWorkflowReviewsNavVisible.value,
			testId: 'project-workflow-reviews-menu-item',
		},
		{ item: chat.value, show: isChatLinkAvailable.value, testId: 'project-chat-menu-item' },
	].filter((entry) => entry.show),
);
const topGroupItems = computed(() => (isSimple.value ? [] : pageItems.value));
// The Workspace rows below the pages, so that the Workspace knows when it holds the current page.
const workspaceNestedItemIds = computed(() => [
	...favoriteGroups.value.flatMap((group) => group.items.map((entry) => entry.menuItem.id)),
	...(canBrowseProjects.value ? displayProjects.value.map((project) => project.id) : []),
]);

/** A pull or an applied package can create and delete projects behind the sidebar. */
async function reloadMyProjects() {
	await projectsStore.getMyProjects();
}

onBeforeMount(async () => {
	await usersStore.fetchUsers({ filter: { isPending: false }, take: 2 });
	sourceControlEventBus.on('pull', reloadMyProjects);
	promotionEventBus.on('applied', reloadMyProjects);
	promotionEventBus.on('projectRemoved', reloadMyProjects);
});

onBeforeUnmount(() => {
	sourceControlEventBus.off('pull', reloadMyProjects);
	promotionEventBus.off('applied', reloadMyProjects);
	promotionEventBus.off('projectRemoved', reloadMyProjects);
});
</script>

<template>
	<div :class="[$style.projects, { [$style.inWorkspace]: isSimple && !props.collapsed }]">
		<div :class="[$style.home, props.collapsed ? $style.collapsed : '']">
			<N8nMenuItem
				v-if="isInstanceAiNavVisible"
				:item="instanceAi"
				:compact="props.collapsed"
				:active="activeTabId === 'instance-ai' && !isInstanceAiThreadView"
				:class="{ [$style.instanceAiParentInactive]: isInstanceAiThreadView }"
				data-test-id="project-instance-ai-menu-item"
			/>
			<N8nMenuItem
				:item="home"
				:compact="props.collapsed"
				:active="sidebarActiveTabId === 'home'"
				data-test-id="project-home-menu-item"
			/>
			<N8nMenuItem
				v-for="entry in topGroupItems"
				:key="entry.testId"
				:item="entry.item"
				:compact="props.collapsed"
				:active="sidebarActiveTabId === entry.item.id"
				:data-test-id="entry.testId"
			/>
		</div>
		<SimpleSidebarSections
			v-if="isSimple"
			v-model:workspace-open="workspaceOpen"
			:collapsed="props.collapsed"
			:items="pageItems"
			:nested-item-ids="workspaceNestedItemIds"
			:active-tab-id="sidebarActiveTabId"
		/>
		<template v-if="hasFavorites && showWorkspaceItems">
			<ProjectNavigationSectionHeader
				v-if="!props.collapsed"
				v-model:collapsed="favoritesCollapsed"
				:title="locale.baseText('favorites.menu.title')"
				:in-workspace="isSimple"
				chevron-size="xsmall"
			/>
			<div v-if="props.collapsed || !favoritesCollapsed" :class="$style.projectItems">
				<template v-for="(group, groupIndex) in favoriteGroups" :key="group.type">
					<div v-if="!props.collapsed && groupIndex > 0" :class="$style.groupSpacer" />
					<template v-for="entry in group.items" :key="entry.menuItem.id">
						<div
							:class="[$style.favoriteItem, props.collapsed && $style.collapsed]"
							@click="
								group.type === 'project'
									? onFavoriteProjectClick(entry.resourceId)
									: group.type === 'workflow'
										? onFavoriteWorkflowClick()
										: undefined
							"
						>
							<N8nMenuItem
								:item="entry.menuItem"
								:compact="props.collapsed"
								:active="sidebarActiveTabId === entry.menuItem.id"
							/>
							<button
								v-if="!props.collapsed"
								:class="$style.unpinButton"
								:aria-label="locale.baseText('favorites.remove')"
								data-test-id="favorite-unpin-button"
								@click.stop.prevent="onUnpinFavorite(entry.resourceId, entry.resourceType)"
							>
								<N8nIcon icon="x" size="small" />
							</button>
						</div>
					</template>
				</template>
			</div>
		</template>
		<AssistantChatsSection v-if="!isSimple" :collapsed="props.collapsed" />
		<AssistantAutomationsSection v-if="!isSimple" :collapsed="props.collapsed" />
		<template v-if="projectsStore.isTeamProjectFeatureEnabled && displayProjects.length > 0">
			<ProjectNavigationSectionHeader
				v-if="!props.collapsed && showWorkspaceItems"
				v-model:collapsed="projectsCollapsed"
				:title="locale.baseText('projects.menu.title')"
				:in-workspace="isSimple"
				chevron-size="small"
			/>
		</template>
		<div
			v-if="
				canBrowseProjects &&
				(!projectsStore.isTeamProjectFeatureEnabled || !projectsCollapsed || props.collapsed) &&
				showWorkspaceItems
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
				:active="sidebarActiveTabId === project.id"
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

// In Simple mode the Workspace holds these rows, so they start one step in from its title.
.inWorkspace .projectItems {
	padding-inline-start: calc(var(--spacing--3xs) + var(--spacing--xs));
}

.instanceAiParentInactive {
	:global(.router-link-active) {
		background-color: transparent;
	}

	:global(.router-link-active:hover) {
		background-color: var(--color--background--light-1);
		color: var(--color--text--shade-1);
	}
}

.upgradeLink {
	color: var(--color--primary);
	cursor: pointer;
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
	padding: var(--spacing--3xs) var(--spacing--2xs);

	&.collapsed {
		border-bottom: var(--border);
		padding-inline: var(--spacing--3xs);
	}
}

.groupSpacer {
	height: var(--spacing--5xs);
}

.favoriteItem {
	position: relative;

	&:hover .unpinButton,
	.unpinButton:focus-visible {
		opacity: 1;
		pointer-events: auto;
	}

	&:not(.collapsed):hover a[role='menuitem'] {
		background-color: var(--color--background--light-1);
		color: var(--color--text--shade-1);
		padding-right: var(--spacing--lg);
	}
}

.unpinButton {
	position: absolute;
	right: var(--spacing--4xs);
	top: 50%;
	transform: translateY(-50%);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--5xs);
	background: none;
	border: none;
	color: var(--color--text--tint-2);
	cursor: pointer;
	opacity: 0;
	pointer-events: none;
	transition: opacity 0.15s ease;

	&:hover,
	&:focus-visible {
		color: var(--color--text);
	}
}
</style>
