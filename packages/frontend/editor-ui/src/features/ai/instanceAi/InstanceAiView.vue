<script lang="ts" setup>
import { onMounted, onUnmounted, provide, ref, watch } from 'vue';
import { onBeforeRouteLeave, RouterView, useRoute, useRouter } from 'vue-router';
import { N8nResizeWrapper } from '@n8n/design-system';
import { useEventListener, useSessionStorage } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useUIStore } from '@/app/stores/ui.store';
import { useInstanceAiStore } from './instanceAi.store';
import { useInstanceAiSettingsStore } from './instanceAiSettings.store';
import InstanceAiThreadList from './components/InstanceAiThreadList.vue';
import { INSTANCE_AI_VIEW, INSTANCE_AI_THREAD_VIEW } from './constants';
import { SidebarStateKey } from './instanceAiLayout';

const store = useInstanceAiStore();
const settingsStore = useInstanceAiSettingsStore();
const i18n = useI18n();
const documentTitle = useDocumentTitle();
const route = useRoute();
const router = useRouter();
const uiStore = useUIStore();
const { isCtrlKeyPressed } = useDeviceSupport();

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

provide(SidebarStateKey, {
	collapsed: sidebarCollapsed,
	width: sidebarWidth,
	toggle: toggleSidebarCollapse,
});

// Reset to collapsed when leaving the AI chat namespace, so the next entry
// starts collapsed by default. Refreshes (which don't trigger the guard) keep
// the user's current open/closed state.
const CHAT_ROUTE_NAMES = new Set<string>([INSTANCE_AI_VIEW, INSTANCE_AI_THREAD_VIEW]);
onBeforeRouteLeave((to) => {
	const name = typeof to.name === 'string' ? to.name : undefined;
	if (!name || !CHAT_ROUTE_NAMES.has(name)) {
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
	void store.loadThreads();
	void store.fetchCredits();
	store.startCreditsPushListener();

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
	store.stopCreditsPushListener();
	settingsStore.stopGatewayPushListener();
});
</script>

<template>
	<div :class="$style.container" data-test-id="instance-ai-container">
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
