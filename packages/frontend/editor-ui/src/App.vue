<script setup lang="ts">
import '@/polyfills';

import AssistantsHub from '@/features/assistant/components/AssistantsHub.vue';
import AskAssistantFloatingButton from '@/features/assistant/components/Chat/AskAssistantFloatingButton.vue';
import BannerStack from '@/components/banners/BannerStack.vue';
import Modals from '@/components/Modals.vue';
import Telemetry from '@/components/Telemetry.vue';
import { useHistoryHelper } from '@/composables/useHistoryHelper';
import { useTelemetryContext } from '@/composables/useTelemetryContext';
import { useWorkflowDiffRouting } from '@/composables/useWorkflowDiffRouting';
import {
	APP_MODALS_ELEMENT_ID,
	CODEMIRROR_TOOLTIP_CONTAINER_ELEMENT_ID,
	HIRING_BANNER,
	VIEWS,
} from '@/constants';
import { useChatPanelStore } from '@/features/assistant/chatPanel.store';
import { useAssistantStore } from '@/features/assistant/assistant.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import LoadingView from '@/views/LoadingView.vue';
import { locale, N8nCommandBar } from '@n8n/design-system';
import { setLanguage } from '@n8n/i18n';
// Note: no need to import en.json here; default 'en' is handled via setLanguage
import { useRootStore } from '@n8n/stores/useRootStore';
import axios from 'axios';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStyles } from './composables/useStyles';
import { useExposeCssVar } from '@/composables/useExposeCssVar';
import { useFloatingUiOffsets } from '@/composables/useFloatingUiOffsets';
import { useCommandBar } from '@/features/ui/commandBar/composables/useCommandBar';
import { hasPermission } from './utils/rbac/permissions';

const route = useRoute();
const rootStore = useRootStore();
const assistantStore = useAssistantStore();
const chatPanelStore = useChatPanelStore();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const settingsStore = useSettingsStore();
const ndvStore = useNDVStore();

const {
	initialize: initializeCommandBar,
	isEnabled: isCommandBarEnabled,
	items,
	onCommandBarChange,
	onCommandBarNavigateTo,
} = useCommandBar();

const showCommandBar = computed(
	() => isCommandBarEnabled.value && hasPermission(['authenticated']),
);

const { setAppZIndexes } = useStyles();
const { toastBottomOffset, askAiFloatingButtonBottomOffset } = useFloatingUiOffsets();

// Initialize undo/redo
useHistoryHelper(route);

// Initialize workflow diff routing management
useWorkflowDiffRouting();

const loading = ref(true);
const defaultLocale = computed(() => rootStore.defaultLocale);
const isDemoMode = computed(() => route.name === VIEWS.DEMO);
const hasContentFooter = ref(false);
const appGrid = ref<Element | null>(null);

const chatPanelWidth = computed(() => chatPanelStore.width);

useTelemetryContext({ ndv_source: computed(() => ndvStore.lastSetActiveNodeSource) });

onMounted(async () => {
	setAppZIndexes();
	logHiringBanner();
	loading.value = false;
	window.addEventListener('resize', updateGridWidth);
	await updateGridWidth();
});

watch(showCommandBar, (newVal) => {
	if (newVal) {
		void initializeCommandBar();
	}
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
		const { width, height } = appGrid.value.getBoundingClientRect();
		uiStore.appGridDimensions = { width, height };
	}
};
// As chat panel width changes, recalculate the total width regularly
watch(chatPanelWidth, async () => {
	await updateGridWidth();
});

watch(route, (r) => {
	hasContentFooter.value = r.matched.some(
		(matchedRoute) => matchedRoute.components?.footer !== undefined,
	);
});

watch(
	defaultLocale,
	async (newLocale) => {
		setLanguage(newLocale);

		axios.defaults.headers.common['Accept-Language'] = newLocale;
		void locale.use(newLocale);
	},
	{ immediate: true },
);

useExposeCssVar('--toast-bottom-offset', toastBottomOffset);
useExposeCssVar('--ask-assistant-floating-button-bottom-offset', askAiFloatingButtonBottomOffset);
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
				<RouterView name="header" />
			</div>
			<div v-if="usersStore.currentUser" id="sidebar" :class="$style.sidebar">
				<RouterView name="sidebar" />
			</div>
			<div id="content" :class="$style.content">
				<div :class="$style.contentWrapper">
					<RouterView v-slot="{ Component }">
						<KeepAlive v-if="$route.meta.keepWorkflowAlive" include="NodeView" :max="1">
							<component :is="Component" />
						</KeepAlive>
						<component :is="Component" v-else />
					</RouterView>
				</div>
				<div v-if="hasContentFooter" :class="$style.contentFooter">
					<RouterView name="footer" />
				</div>
			</div>
			<div :id="APP_MODALS_ELEMENT_ID" :class="$style.modals">
				<Modals />
			</div>

			<N8nCommandBar
				v-if="showCommandBar"
				:items="items"
				@input-change="onCommandBarChange"
				@navigate-to="onCommandBarNavigateTo"
			/>
			<Telemetry />
			<AskAssistantFloatingButton v-if="assistantStore.isFloatingButtonShown" />
		</div>
		<AssistantsHub />
		<div :id="CODEMIRROR_TOOLTIP_CONTAINER_ELEMENT_ID" />
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
