<script setup lang="ts">
import {
	computed,
	nextTick,
	onBeforeMount,
	onBeforeUnmount,
	onMounted,
	ref,
	useTemplateRef,
	watch,
} from 'vue';
import { useRoute } from 'vue-router';
import { N8nTooltip, updatedIconSet, type IconOrEmoji } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { VIEWS } from '@/app/constants';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { promotionEventBus } from '@n8n/frontend-module-promotions';
import { useUIStore } from '@/app/stores/ui.store';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import { useKeybindings } from '@/app/composables/useKeybindings';
import { useDocumentVisibility } from '@/app/composables/useDocumentVisibility';
import MainSidebarAccountMenu from '@/app/components/MainSidebarAccountMenu.vue';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { sourceControlEventBus } from '@/features/integrations/sourceControl.ee/sourceControl.eventBus';
import { useInstanceAiAvailable } from '@/features/ai/instanceAi/composables/useInstanceAiAvailability';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';
import { useInstanceAiSettingsStore } from '@/features/ai/instanceAi/instanceAiSettings.store';
import { useAssistantAgentThreadsStore } from '@/features/ai/instanceAi/assistantAgent/assistantAgentThreads.store';
import { AGENT_N8N_CHAT_RECENT_THREADS_LIMIT } from '@/features/agents/constants';
import { useAgentsN8nChatFlag } from '@/features/agents/composables/useAgentsN8nChatFlag';
import { useAgentTelemetry } from '@/features/agents/composables/useAgentTelemetry';
import { useAgentN8nChatThreadsStore } from '@/features/agents/n8nChatPage/n8nChatThreads.store';
import AppNavigationPanel from './AppNavigationPanel.vue';
import { ASSISTANT_ITEM_ID, useAppNavigation, type AppNavLink } from './useAppNavigation';
import { useNavigationPeek } from './useNavigationPeek';

const route = useRoute();
const i18n = useI18n();
const telemetry = useTelemetry();
const settingsStore = useSettingsStore();

// Insights has no pages of its own to list, so it is a plain link above the account menu.
const isInsightsAvailable = computed(
	() =>
		settingsStore.isModuleActive('insights') &&
		hasPermission(['rbac'], { rbac: { scope: 'insights:list' } }),
);
const isInsightsActive = computed(() => route.name === VIEWS.INSIGHTS);

function onInsightsClick() {
	telemetry.track('User clicked insights link from side menu');
}
const uiStore = useUIStore();
const projectsStore = useProjectsStore();
const agentTelemetry = useAgentTelemetry();

const { railItems, activeItemId, sectionsFor, railItemById } = useAppNavigation();

const isExpanded = computed(() => !(uiStore.sidebarMenuCollapsed ?? false));

// Pinning a floating panel keeps showing that item until the next navigation. A navigation
// does not close the floating panel: it stays until the pointer leaves for the page, so a
// click on the rail does not make it flash open and shut.
const pinnedItemId = ref<string | null>(null);
watch(
	() => route.fullPath,
	() => {
		pinnedItemId.value = null;
	},
);

// A standalone page, such as Insights, docks no panel even when the panel is open. The rail
// then works as if the panel were collapsed: hovering an item floats its panel.
const dockedItemId = computed(() =>
	isExpanded.value ? (pinnedItemId.value ?? activeItemId.value) : null,
);
const isDocked = computed(() => dockedItemId.value !== null);
const peek = useNavigationPeek({ enabled: () => !isDocked.value, carryOver: true });

const panelItemId = computed(() =>
	isDocked.value ? dockedItemId.value : peek.peekItemId.value,
);
const panelItem = computed(() => railItemById(panelItemId.value));
const panelSections = computed(() => sectionsFor(panelItem.value?.id));

const mainItems = computed(() => railItems.value.filter((item) => item.group === 'main'));
const projectItems = computed(() => railItems.value.filter((item) => item.group === 'project'));

/** The active item shows the solid twin of its icon, when the icon set has one */
function railIcon(icon: IconOrEmoji, isActive: boolean): IconOrEmoji {
	if (!isActive || icon.type !== 'icon') return icon;
	const filled = `${icon.value}-filled`;
	return filled in updatedIconSet ? { type: 'icon', value: filled } : icon;
}

function toggle() {
	if (isDocked.value) {
		pinnedItemId.value = null;
		uiStore.toggleSidebarMenuCollapse();
		return;
	}
	// Pin the floating panel. On a standalone page the panel setting is already open.
	pinnedItemId.value = peek.peekItemId.value;
	peek.close();
	if (!isExpanded.value) uiStore.toggleSidebarMenuCollapse();
}

function onRailItemClick(itemId: string) {
	if (itemId === ASSISTANT_ITEM_ID) agentTelemetry.trackClickedSidebarItem({ item: 'new_chat' });
}

const favoritesStore = useFavoritesStore();

async function onUnfavorite(link: AppNavLink) {
	if (!link.favorite) return;
	await favoritesStore.toggleFavorite(link.favorite.resourceId, link.favorite.resourceType);
}

function onLinkNavigate(link: AppNavLink) {
	// A starred workflow can live in any project, so it opens without a current project.
	if (link.favorite?.resourceType === 'workflow') projectsStore.setCurrentProject(null);
	if (link.id === 'new-chat') {
		agentTelemetry.trackClickedSidebarItem({ item: 'new_chat' });
	} else if (link.chat) {
		agentTelemetry.trackClickedSidebarItem({
			item: 'chat',
			chatType: link.chat.kind === 'agent' ? 'agent' : 'assistant',
		});
	}
}

function openCommandBar(event: MouseEvent) {
	event.stopPropagation();
	void nextTick(() => {
		document.dispatchEvent(
			new KeyboardEvent('keydown', {
				key: 'k',
				code: 'KeyK',
				metaKey: true,
				bubbles: true,
				cancelable: true,
			}),
		);
	});
}

useKeybindings({ bracketleft: () => toggle() });

// Recent chats for the Assistant panel. Split so a flag turning on later only fetches
// agent threads, not the Instance AI list too.
const isAssistantAvailable = useInstanceAiAvailable();
const isAgentsN8nChatFlag = useAgentsN8nChatFlag();
const instanceAiStore = useInstanceAiStore();
const instanceAiSettingsStore = useInstanceAiSettingsStore();
const agentThreadsStore = useAgentN8nChatThreadsStore();
const assistantAgentThreadsStore = useAssistantAgentThreadsStore();

function loadChats({ threads = true }: { threads?: boolean } = {}) {
	if (!isAssistantAvailable.value) return;
	if (threads) void instanceAiStore.loadThreads();
	if (isAgentsN8nChatFlag.value)
		void agentThreadsStore.fetchRecent(AGENT_N8N_CHAT_RECENT_THREADS_LIMIT);
	if (instanceAiSettingsStore.isAssistantAgentEnabled)
		void assistantAgentThreadsStore.fetchRecent();
}

watch(isAssistantAvailable, () => loadChats(), { immediate: true });
watch([isAgentsN8nChatFlag, () => instanceAiSettingsStore.isAssistantAgentEnabled], () =>
	loadChats({ threads: false }),
);
// Another tab can start a chat; refresh the list when the user comes back to this one.
useDocumentVisibility().onDocumentVisible(() => loadChats());

/** A pull or an applied package can create and delete projects behind the navigation. */
async function reloadMyProjects() {
	await projectsStore.getMyProjects();
}

onBeforeMount(() => {
	sourceControlEventBus.on('pull', reloadMyProjects);
	promotionEventBus.on('applied', reloadMyProjects);
	promotionEventBus.on('projectRemoved', reloadMyProjects);
});

// A panel carried over from the previous layout stays only while the pointer is still on the
// navigation. The new navigation mounts off screen first, so it cannot read the hover state,
// and the pointer may have moved to the page meanwhile without a leave event. The next
// pointer move tells where the pointer is.
const navigationRef = useTemplateRef<HTMLElement>('navigation');
function onFirstPointerMove(event: PointerEvent) {
	const target = event.target;
	if (!(target instanceof Node) || !navigationRef.value?.contains(target)) peek.onLeave();
}
onMounted(() => {
	if (peek.peekItemId.value === null) return;
	document.addEventListener('pointermove', onFirstPointerMove, { once: true });
});
onBeforeUnmount(() => document.removeEventListener('pointermove', onFirstPointerMove));

onBeforeUnmount(() => {
	sourceControlEventBus.off('pull', reloadMyProjects);
	promotionEventBus.off('applied', reloadMyProjects);
	promotionEventBus.off('projectRemoved', reloadMyProjects);
});
</script>

<template>
	<div
		id="side-menu"
		ref="navigation"
		:class="[$style.navigation, { [$style.expanded]: isExpanded }]"
		data-test-id="app-navigation"
	>
		<div
			:class="$style.rail"
			data-test-id="app-nav-rail"
			@mouseenter="peek.onPanelEnter"
			@mouseleave="peek.onLeave"
		>
			<template v-for="group in [mainItems, projectItems]" :key="group[0]?.group">
				<div
					v-if="group.length > 0"
					:class="[$style.railGroup, { [$style.railProjects]: group[0].group === 'project' }]"
				>
					<N8nTooltip
						v-for="item in group"
						:key="item.id"
						:content="item.label"
						placement="right"
						:disabled="!isDocked"
						:show-after="300"
					>
						<RouterLink
							:to="item.to"
							:class="[
								$style.railItem,
								{
									[$style.railItemActive]: item.id === activeItemId,
									[$style.railItemPeeked]: !isDocked && item.id === peek.peekItemId.value,
								},
							]"
							:aria-label="item.label"
							:aria-current="item.id === activeItemId ? 'page' : undefined"
							:data-test-id="item.testId"
							:data-item-id="item.id"
							@mouseenter="peek.onItemEnter(item.id)"
							@focus="peek.onItemEnter(item.id)"
							@click="onRailItemClick(item.id)"
						>
							<ProjectIcon
								:icon="railIcon(item.icon, item.id === activeItemId)"
								size="small"
								border-less
								color="text-dark"
							/>
						</RouterLink>
					</N8nTooltip>
				</div>
				<div
					v-if="group === mainItems && projectItems.length > 0"
					:class="$style.divider"
					role="separator"
				/>
			</template>
			<div :class="$style.account">
				<N8nTooltip
					v-if="isInsightsAvailable"
					:content="i18n.baseText('mainSidebar.insights')"
					placement="right"
					:show-after="300"
				>
					<RouterLink
						:to="{ name: VIEWS.INSIGHTS }"
						:class="[$style.railItem, { [$style.railItemActive]: isInsightsActive }]"
						:aria-label="i18n.baseText('mainSidebar.insights')"
						:aria-current="isInsightsActive ? 'page' : undefined"
						data-test-id="app-nav-insights"
						@mouseenter="peek.onLeave"
						@click="onInsightsClick"
					>
						<ProjectIcon
							:icon="{ type: 'icon', value: 'chart-column-decreasing' }"
							size="small"
							border-less
							color="text-dark"
						/>
					</RouterLink>
				</N8nTooltip>
				<MainSidebarAccountMenu :is-collapsed="true" />
			</div>
		</div>

		<div v-if="isDocked && panelItem" :class="$style.docked" data-test-id="app-nav-docked">
			<AppNavigationPanel
				:title="panelItem.label"
				:sections="panelSections"
				:is-expanded="true"
				@toggle="toggle"
				@search="openCommandBar"
				@navigate="onLinkNavigate"
				@unfavorite="onUnfavorite"
			/>
		</div>

		<Transition
			:enter-from-class="$style.floatingHidden"
			:leave-to-class="$style.floatingHidden"
			:enter-active-class="$style.floatingAnimating"
			:leave-active-class="$style.floatingAnimating"
		>
			<div
				v-if="!isDocked && panelItem"
				:class="$style.floating"
				data-test-id="app-nav-floating"
				@mouseenter="peek.onPanelEnter"
				@mouseleave="peek.onLeave"
			>
				<AppNavigationPanel
					:title="panelItem.label"
					:sections="panelSections"
					:is-expanded="false"
					@toggle="toggle"
					@search="openCommandBar"
					@navigate="onLinkNavigate"
					@unfavorite="onUnfavorite"
				/>
			</div>
		</Transition>
	</div>
</template>

<style lang="scss" module>
$rail-width: 52px;
$panel-width: 240px;

.navigation {
	position: relative;
	// Lifts the floating panel above the page next to it.
	z-index: 2;
	display: flex;
	height: 100%;
}

.rail {
	// The account avatar rings its unread dot with the menu background.
	--menu--color--background: var(--app-shell--rail--color--background);

	background-color: var(--app-shell--rail--color--background);
	display: flex;
	flex-direction: column;
	align-items: center;
	width: $rail-width;
	flex: none;
	padding-top: var(--spacing--2xs);
}

.railGroup {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--4xs);

	// Tooltips wrap each item in a span.
	> span {
		display: flex;
	}
}

// Many projects scroll inside the rail; the account menu stays at the bottom.
.railProjects {
	flex: 0 1 auto;
	min-height: 0;
	overflow-y: auto;
	scrollbar-width: none;
	padding-bottom: var(--spacing--2xs);
}

.railItem {
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	border-radius: var(--radius);
	color: var(--text-color--subtle);
	transition: background-color var(--duration--snappy) var(--easing--ease-out);

	&:hover,
	&.railItemPeeked {
		background-color: var(--background--hover);
	}

	&.railItemActive {
		background-color: var(--background--active);
	}

	&:focus-visible {
		outline: var(--focus--border-width, 1px) solid var(--focus--border-color);
		outline-offset: 1px;
	}
}

.divider {
	flex: none;
	width: var(--spacing--md);
	height: var(--border-width);
	margin: var(--spacing--2xs) 0;
	background-color: var(--border-color);
}

.account {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-top: auto;
	padding-top: var(--spacing--2xs);

	// The account row draws its own top hairline for the old sidebar; the rail does not need it.
	> div {
		border-top: none;
	}
}

.docked {
	width: $panel-width;
	flex: none;
	min-height: 0;
	background-color: var(--app-shell--nav-panel--color--background);
}

.floating {
	position: absolute;
	top: var(--spacing--2xs);
	bottom: var(--spacing--2xs);
	left: $rail-width;
	width: $panel-width;
	border: 0.5px solid var(--app-shell--panel--border-color);
	border-radius: var(--radius--sm);
	background-color: var(--app-shell--nav-panel--color--background);
	box-shadow: var(--shadow--md);
	overflow: hidden;
}

.floatingAnimating {
	transition:
		opacity var(--duration--snappy) var(--easing--ease-out),
		transform var(--duration--snappy) var(--easing--ease-out);
}

.floatingHidden {
	opacity: 0;
	transform: translateX(calc(var(--spacing--4xs) * -1));
}

@media (prefers-reduced-motion: reduce) {
	.railItem,
	.floatingAnimating {
		transition: none;
	}

	.floatingHidden {
		transform: none;
	}
}
</style>
