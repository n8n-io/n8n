<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import LoadingView from '@/views/LoadingView.vue';
import BannerStack from '@/components/banners/BannerStack.vue';
import AskAssistantChat from '@/components/AskAssistant/AskAssistantChat.vue';
import Modals from '@/components/Modals.vue';
import Telemetry from '@/components/Telemetry.vue';
import AskAssistantFloatingButton from '@/components/AskAssistant/AskAssistantFloatingButton.vue';
import { loadLanguage } from '@/plugins/i18n';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { HIRING_BANNER, VIEWS } from '@/constants';
import { useRootStore } from '@/stores/root.store';
import { useAssistantStore } from './stores/assistant.store';
import { useUIStore } from './stores/ui.store';
import { useUsersStore } from './stores/users.store';
import { useSettingsStore } from './stores/settings.store';
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
const showAssistantButton = computed(() => assistantStore.canShowAssistantButtons);

watch(defaultLocale, (newLocale) => {
	void loadLanguage(newLocale);
});

const logHiringBanner = () => {
	if (settingsStore.isHiringBannerEnabled && !isDemoMode.value) {
		console.log(HIRING_BANNER);
	}
};

onMounted(async () => {
	logHiringBanner();
	void useExternalHooks().run('app.mount');
	loading.value = false;
});
</script>

<template>
	<div :class="[$style.app, 'root-container']">
		<LoadingView v-if="loading" />
		<div
			v-else
			id="app"
			:class="{
				[$style.container]: true,
				[$style.sidebarCollapsed]: uiStore.sidebarMenuCollapsed,
			}"
		>
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
			<AskAssistantChat />
			<Modals />
			<Telemetry />
			<AskAssistantFloatingButton v-if="showAssistantButton" />
		</div>
	</div>
</template>

<style lang="scss" module>
.app {
	height: 100vh;
	overflow: hidden;
}

.container {
	display: grid;
	grid-template-areas:
		'banners banners rightsidebar'
		'sidebar header rightsidebar'
		'sidebar content rightsidebar';
	grid-auto-columns: minmax(0, max-content) minmax(100px, auto) minmax(0, max-content);
	grid-template-rows: auto fit-content($header-height) 1fr;
	height: 100vh;
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
</style>
