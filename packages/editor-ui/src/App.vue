<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { v4 as uuid } from 'uuid';
import LoadingView from '@/views/LoadingView.vue';
import BannerStack from '@/components/banners/BannerStack.vue';
import AskAssistantChat from '@/components/AskAssistant/AskAssistantChat.vue';
import Modals from '@/components/Modals.vue';
import Telemetry from '@/components/Telemetry.vue';
import AskAssistantFloatingButton from '@/components/AskAssistant/AskAssistantFloatingButton.vue';
import { loadLanguage } from '@/plugins/i18n';
import { APP_MODALS_ELEMENT_ID, HIRING_BANNER, VIEWS } from '@/constants';
import { useRootStore } from '@/stores/root.store';
import { useAssistantStore } from '@/stores/assistant.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useHistoryHelper } from '@/composables/useHistoryHelper';
import { useStyles } from './composables/useStyles';

// Polyfill crypto.randomUUID
if (!('randomUUID' in crypto)) {
	Object.defineProperty(crypto, 'randomUUID', { value: uuid });
}

const route = useRoute();
const rootStore = useRootStore();
const assistantStore = useAssistantStore();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const settingsStore = useSettingsStore();

const { setAppZIndexes } = useStyles();

// Initialize undo/redo
useHistoryHelper(route);

const loading = ref(true);
const defaultLocale = computed(() => rootStore.defaultLocale);
const isDemoMode = computed(() => route.name === VIEWS.DEMO);
const showAssistantButton = computed(() => assistantStore.canShowAssistantButtonsOnCanvas);
const hasContentFooter = ref(false);
const appGrid = ref<Element | null>(null);

const assistantSidebarWidth = computed(() => assistantStore.chatWidth);

onMounted(async () => {
	setAppZIndexes();
	logHiringBanner();
	loading.value = false;
	window.addEventListener('resize', updateGridWidth);
	await updateGridWidth();
});

onBeforeUnmount(() => {
	window.removeEventListener('resize', updateGridWidth);
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

// As assistant sidebar width changes, recalculate the total width regularly
watch(assistantSidebarWidth, async () => {
	await updateGridWidth();
});

watch(route, (r) => {
	hasContentFooter.value = r.matched.some(
		(matchedRoute) => matchedRoute.components?.footer !== undefined,
	);
});

watch(defaultLocale, (newLocale) => {
	void loadLanguage(newLocale);
});
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
				<div :class="$style.contentWrapper">
					<router-view v-slot="{ Component }">
						<keep-alive v-if="$route.meta.keepWorkflowAlive" include="NodeViewSwitcher" :max="1">
							<component :is="Component" />
						</keep-alive>
						<component :is="Component" v-else />
					</router-view>
				</div>
				<div v-if="hasContentFooter" :class="$style.contentFooter">
					<router-view name="footer" />
				</div>
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
	display: grid;
	grid-template-columns: 1fr auto;
}

// App grid is the main app layout including modals and other absolute positioned elements
.app-grid {
	position: relative;
	display: grid;
	height: 100vh;
	grid-template-areas:
		'banners banners'
		'sidebar header'
		'sidebar content';
	grid-template-columns: auto 1fr;
	grid-template-rows: auto auto 1fr;
}

.banners {
	grid-area: banners;
	z-index: var(--z-index-top-banners);
}
.content {
	display: flex;
	flex-direction: column;
	align-items: center;
	overflow: auto;
	grid-area: content;
}

.contentFooter {
	height: auto;
	z-index: 10;
	width: 100%;
	display: none;

	// Only show footer if there's content
	&:has(*) {
		display: block;
	}
}
.contentWrapper {
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
	z-index: var(--z-index-app-header);
	min-width: 0;
	min-height: 0;
}

.sidebar {
	grid-area: sidebar;
	z-index: var(--z-index-app-sidebar);
}

.modals {
	width: 100%;
}
</style>
