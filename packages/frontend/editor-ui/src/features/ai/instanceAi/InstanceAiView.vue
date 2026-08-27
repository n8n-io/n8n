<script lang="ts" setup>
import { computed, onMounted, onUnmounted, provide, ref, watch } from 'vue';
import { onBeforeRouteLeave, RouterView, useRoute, useRouter } from 'vue-router';
import { N8nResizeWrapper } from '@n8n/design-system';
import { useEventListener, useSessionStorage } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import { claimDocumentTitle, useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUIStore } from '@/app/stores/ui.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useInstanceAiStore } from './instanceAi.store';
import { useInstanceAiSettingsStore } from './instanceAiSettings.store';
import InstanceAiThreadList from './components/InstanceAiThreadList.vue';
import { INSTANCE_AI_VIEW, isInstanceAiChatRoute } from './constants';
import { SidebarStateKey } from './instanceAiLayout';
import InstanceAiOnboardingView from './onboarding/InstanceAiOnboardingView.vue';

const store = useInstanceAiStore();
const settingsStore = useInstanceAiSettingsStore();
const appSettingsStore = useSettingsStore();
const i18n = useI18n();
const documentTitle = useDocumentTitle();
const route = useRoute();
const router = useRouter();
const uiStore = useUIStore();
const rootStore = useRootStore();
const usersStore = useUsersStore();
const telemetry = useTelemetry();
const { isCtrlKeyPressed } = useDeviceSupport();
const setupCompletionState = computed(
	() => appSettingsStore.moduleSettings['instance-ai']?.setupCompleted,
);
const setupWasIncomplete = setupCompletionState.value === false;
let setupWasObservedIncomplete = setupWasIncomplete;
const onboardingCompletionPending = useSessionStorage(
	'instanceAi.onboarding.completionPending',
	setupWasIncomplete,
);
if (setupCompletionState.value === true) onboardingCompletionPending.value = false;
else if (setupWasIncomplete) onboardingCompletionPending.value = true;
const onboardingActive = ref(
	setupCompletionState.value !== true && (setupWasIncomplete || onboardingCompletionPending.value),
);
const showOnboarding = computed(
	() =>
		settingsStore.canManage &&
		!settingsStore.isProxyEnabled &&
		!settingsStore.isCloudManaged &&
		onboardingActive.value,
);

watch(setupCompletionState, (setupCompleted) => {
	if (setupCompleted === true) {
		onboardingCompletionPending.value = false;
		if (!setupWasObservedIncomplete) onboardingActive.value = false;
	} else if (setupCompleted === false) {
		setupWasObservedIncomplete = true;
		onboardingCompletionPending.value = true;
		onboardingActive.value = true;
	}
});

// The tab is named after the conversation, by whichever inner view is mounted
// (thread → its title, empty → the default below). Claiming the title keeps the
// workflow canvas embedded in a thread from renaming the tab after its workflow.
claimDocumentTitle();
documentTitle.set(i18n.baseText('instanceAi.view.title'));

// --- Sidebar collapse & resize ---
// Session-scoped: survives page refresh, resets when the user navigates away
// from the AI chat namespace (see onBeforeRouteLeave below).
const sidebarCollapsed = useSessionStorage('instanceAi.sidebarCollapsed', true);
const sidebarWidth = ref(260);

function toggleSidebarCollapse() {
	sidebarCollapsed.value = !sidebarCollapsed.value;
}

function handleSidebarResize({ width }: { width: number }) {
	// Drag below min-width threshold → auto-collapse
	if (width <= 200) {
		sidebarCollapsed.value = true;
		return;
	}
	sidebarWidth.value = width;
}

function handleOnboardingCompleted() {
	onboardingCompletionPending.value = false;
	onboardingActive.value = false;
}

provide(SidebarStateKey, {
	collapsed: sidebarCollapsed,
	width: sidebarWidth,
	toggle: toggleSidebarCollapse,
});

// Reset to collapsed when leaving the AI chat namespace, so the next entry
// starts collapsed by default. Refreshes (which don't trigger the guard) keep
// the user's current open/closed state.
onBeforeRouteLeave((to) => {
	if (!isInstanceAiChatRoute(to.name)) {
		sidebarCollapsed.value = true;
	}
});

useEventListener(document, 'keydown', (event: KeyboardEvent) => {
	if (
		event.key.toLowerCase() === 'o' &&
		isCtrlKeyPressed(event) &&
		event.shiftKey &&
		!uiStore.isAnyModalOpen
	) {
		event.preventDefault();
		event.stopPropagation();
		void router.push({ name: INSTANCE_AI_VIEW, force: true });
	}
});

// --- Page-level lifecycle ---
// These run once when the user enters the InstanceAi feature. Route changes
// (empty ↔ thread) don't remount the layout, so the listeners persist.
onMounted(() => {
	if (showOnboarding.value && route.name !== INSTANCE_AI_VIEW) {
		void router.replace({ name: INSTANCE_AI_VIEW });
	}
	// New owners land here instead of the homepage, so the signup modals
	// (personalization survey → community registration) must trigger here too.
	void usersStore.showPersonalizationSurvey();
	// In-app navigations expose the previous route via history state; direct
	// visits (bookmark, external link) fall back to the document referrer.
	const previousRoute = router.options.history.state.back;
	const sourceUrl = typeof previousRoute === 'string' ? previousRoute : document.referrer || null;

	telemetry.track('User viewed AI assistant', {
		instance_id: rootStore.instanceId,
		source_url: sourceUrl,
	});

	void store.loadThreads();
	void store.fetchCredits();

	// Subscribe to push + fetch backend gateway state. The backend keeps the
	// pairing alive across reloads, so the client never contacts the daemon
	// on mount — only in response to explicit user action in the setup modal.
	void settingsStore
		.refreshModuleSettings()
		.catch(() => {})
		.then(async () => await settingsStore.ensurePreferencesLoaded())
		.catch(() => {})
		.then(() => {
			const browserUseEnabled = settingsStore.isBrowserUseEnabledByAdmin;
			const computerUseEnabled = !settingsStore.isLocalGatewayDisabledByAdmin;
			if (!browserUseEnabled && !computerUseEnabled) return;
			settingsStore.startGatewayPushListener();
			if (browserUseEnabled) void settingsStore.fetchBrowserStatus();
			if (computerUseEnabled && !settingsStore.isLocalGatewayDisabled) {
				void settingsStore.fetchGatewayStatus();
			}
		});
});

// React to admin or user toggling local gateway
watch(
	() => settingsStore.isLocalGatewayDisabled,
	(disabled) => {
		if (disabled) {
			if (
				settingsStore.isLocalGatewayDisabledByAdmin &&
				!settingsStore.isBrowserUseEnabledByAdmin
			) {
				settingsStore.stopGatewayPushListener();
			}
		} else {
			settingsStore.startGatewayPushListener();
			void settingsStore.fetchGatewayStatus();
			void settingsStore.fetchBrowserStatus();
		}
	},
);

onUnmounted(() => {
	// On a transient remount the new instance mounts before this one unmounts, so
	// only tear down when the route actually left the module (isInstanceAiChatRoute).
	// Stopping the store-level push listeners on a remount would kill the ones the
	// new instance relies on (its start calls no-op while the old one is registered).
	if (!isInstanceAiChatRoute(route.name)) {
		settingsStore.stopGatewayPushListener();
	}
});
</script>

<template>
	<div :class="$style.container" data-test-id="instance-ai-container">
		<InstanceAiOnboardingView v-if="showOnboarding" @completed="handleOnboardingCompleted" />
		<template v-else>
			<!-- Resizable sidebar -->
			<Transition name="sidebar-slide">
				<N8nResizeWrapper
					v-if="!sidebarCollapsed"
					:class="$style.sidebar"
					:width="sidebarWidth"
					:style="{ width: `${sidebarWidth}px` }"
					:supported-directions="['right']"
					:is-resizing-enabled="true"
					:min-width="200"
					:max-width="400"
					@resize="handleSidebarResize"
				>
					<InstanceAiThreadList @collapse="toggleSidebarCollapse" />
				</N8nResizeWrapper>
			</Transition>

			<!-- Inner route — Empty for `/assistant`, Thread for `/assistant/:threadId` -->
			<RouterView v-slot="{ Component }">
				<component :is="Component" :key="String(route.params.threadId ?? 'empty')" />
			</RouterView>
		</template>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	height: 100%;
	width: 100%;
	min-width: 0;
	overflow: hidden;
}

.sidebar {
	min-width: 200px;
	max-width: 400px;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	border-right: var(--border);
}
</style>

<style lang="scss">
.sidebar-slide-enter-active,
.sidebar-slide-leave-active {
	transition:
		width 0.2s cubic-bezier(0.16, 1, 0.3, 1),
		min-width 0.2s cubic-bezier(0.16, 1, 0.3, 1),
		opacity 0.2s ease;
	overflow: hidden;
}

.sidebar-slide-enter-from,
.sidebar-slide-leave-to {
	width: 0 !important;
	min-width: 0 !important;
	opacity: 0;
}
</style>
