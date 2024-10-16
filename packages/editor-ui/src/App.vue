<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import LoadingView from '@/views/LoadingView.vue';
import BannerStack from '@/components/banners/BannerStack.vue';
import AskAssistantChat from '@/components/AskAssistant/AskAssistantChat.vue';
import Modals from '@/components/Modals.vue';
import Telemetry from '@/components/Telemetry.vue';
import AskAssistantFloatingButton from '@/components/AskAssistant/AskAssistantFloatingButton.vue';
import { loadLanguage } from '@/plugins/i18n';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { APP_MODALS_ELEMENT_ID, HIRING_BANNER, VIEWS } from '@/constants';
import { useRootStore } from '@/stores/root.store';
import { useAssistantStore } from '@/stores/assistant.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useHistoryHelper } from '@/composables/useHistoryHelper';

const route = useRoute();
const rootStore = useRootStore();
const assistantStore = useAssistantStore();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const settingsStore = useSettingsStore();

// Initialize undo/redo
useHistoryHelper(route);

const loading = ref(true);
const defaultLocale = computed(() => rootStore.defaultLocale);
const isDemoMode = computed(() => route.name === VIEWS.DEMO);
const showAssistantButton = computed(() => assistantStore.canShowAssistantButtonsOnCanvas);

const appGrid = ref<Element | null>(null);

const assistantSidebarWidth = computed(() => assistantStore.chatWidth);

watch(defaultLocale, (newLocale) => {
	void loadLanguage(newLocale);
});

onMounted(async () => {
	logHiringBanner();
	void useExternalHooks().run('app.mount');
	loading.value = false;
	window.addEventListener('resize', updateGridWidth);
	await updateGridWidth();
});

onBeforeUnmount(() => {
	window.removeEventListener('resize', updateGridWidth);
});

// As assistant sidebar width changes, recalculate the total width regularly
watch(assistantSidebarWidth, async () => {
	await updateGridWidth();
});

const logHiringBanner = () => {
	if (settingsStore.isHiringBannerEnabled && !isDemoMode.value) {
		console.log(HIRING_BANNER);
	}
};

const updateGridWidth = async () => {
	await nextTick();
	if (appGrid.value) {
		uiStore.appGridWidth = appGrid.value.clientWidth;
	}
};
</script>

<template>
	<LoadingView v-if="loading" />
	<div
		v-else
		id="n8n-app"
		:class="{
			[$style.container]: true,
			[$style.sidebarCollapsed]: uiStore.sidebarMenuCollapsed,
		}"
	>
		<div id="app-grid" ref="appGrid" :class="$style['app-grid']">
			<div id="banners" :class="$style.banners">
				<BannerStack v-if="!isDemoMode" />
			</div>
			<div id="header" :class="$style.header">
				<router-view name="header"></router-view>
			</div>
			<div v-if="usersStore.currentUser" id="sidebar" :class="$style.sidebar">
				<router-view name="sidebar"></router-view>
			</div>
			<div id="content" :class="$style.content">
				<router-view v-slot="{ Component }">
					<keep-alive v-if="$route.meta.keepWorkflowAlive" include="NodeViewSwitcher" :max="1">
						<component :is="Component" />
					</keep-alive>
					<component :is="Component" v-else />
				</router-view>
			</div>
			<div :id="APP_MODALS_ELEMENT_ID" :class="$style.modals">
				<Modals />
			</div>
			<Telemetry />
			<AskAssistantFloatingButton v-if="showAssistantButton" />
		</div>
		<AskAssistantChat />
	</div>
</template>

<style lang="scss" module>
// On the root level, whole app is a flex container
// with app grid and assistant sidebar as children
.container {
	height: 100vh;
	overflow: hidden;
	display: flex;
}

// App grid is the main app layout including modals and other absolute positioned elements
.app-grid {
	position: relative;
	display: grid;
	height: 100vh;
	flex-basis: 100%;
	grid-template-areas:
		'banners banners'
		'sidebar header'
		'sidebar content';
	grid-auto-columns: minmax(0, max-content) 1fr;
	grid-template-rows: auto fit-content($header-height) 1fr;
}

.banners {
	grid-area: banners;
	z-index: 999;
}

.content {
	display: flex;
	grid-area: content;
	position: relative;
	overflow: auto;
	height: 100%;
	width: 100%;
	justify-content: center;

	main {
		width: 100%;
		height: 100%;
	}
}

.header {
	grid-area: header;
	z-index: 99;
}

.sidebar {
	grid-area: sidebar;
	height: 100%;
	z-index: 999;
}

.modals {
	width: 100%;
}
</style>
