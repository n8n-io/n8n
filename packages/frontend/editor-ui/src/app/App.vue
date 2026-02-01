<script setup lang="ts">
import BaseLayout from '@/app/layouts/BaseLayout.vue';
import AppBanners from '@/app/components/app/AppBanners.vue';
import AppModals from '@/app/components/app/AppModals.vue';
import AppCommandBar from '@/app/components/app/AppCommandBar.vue';
import AppLayout from '@/app/components/app/AppLayout.vue';
import AppChatPanel from '@/app/components/app/AppChatPanel.vue';

import { useHistoryHelper } from '@/app/composables/useHistoryHelper';
import { useBackendStatus } from '@/app/composables/useBackendStatus';
import { useTelemetryContext } from '@/app/composables/useTelemetryContext';
import { useTelemetryInitializer } from '@/app/composables/useTelemetryInitializer';
import { useWorkflowDiffRouting } from '@/app/composables/useWorkflowDiffRouting';
import { CODEMIRROR_TOOLTIP_CONTAINER_ELEMENT_ID, HIRING_BANNER, VIEWS } from '@/app/constants';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import LoadingView from '@/app/views/LoadingView.vue';
import { locale } from '@n8n/design-system';
import { setLanguage } from '@n8n/i18n';
// Note: no need to import en.json here; default 'en' is handled via setLanguage
import { useRootStore } from '@n8n/stores/useRootStore';
import axios from 'axios';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStyles } from '@/app/composables/useStyles';
import { useExposeCssVar } from '@/app/composables/useExposeCssVar';
import { useFloatingUiOffsets } from '@/app/composables/useFloatingUiOffsets';

const route = useRoute();
const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const ndvStore = useNDVStore();
const { setAppZIndexes } = useStyles();
const { toastBottomOffset, askAiFloatingButtonBottomOffset } = useFloatingUiOffsets();

// Initialize undo/redo
useHistoryHelper(route);

// Initialize workflow diff routing management
useWorkflowDiffRouting();

useTelemetryInitializer();

// Initialize global backend status tracking
useBackendStatus();

const loading = ref(true);
const defaultLocale = computed(() => rootStore.defaultLocale);
const isDemoMode = computed(() => route.name === VIEWS.DEMO);
const hasContentFooter = ref(false);

useTelemetryContext({ ndv_source: computed(() => ndvStore.lastSetActiveNodeSource) });

onMounted(async () => {
	setAppZIndexes();
	logHiringBanner();
	loading.value = false;
});

const logHiringBanner = () => {
	if (settingsStore.isHiringBannerEnabled && !isDemoMode.value) {
		console.log(HIRING_BANNER);
	}
};

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

const layoutRef = ref<Element | null>(null);

const setLayoutRef = (el: Element) => {
	layoutRef.value = el;
};

useExposeCssVar('--toast--offset', toastBottomOffset);
useExposeCssVar('--ask-assistant--floating-button--margin-bottom', askAiFloatingButtonBottomOffset);
</script>

<template>
	<LoadingView v-if="loading" />
	<BaseLayout v-else id="n8n-app" :class="$style.app">
		<template #banners>
			<AppBanners />
		</template>
		<AppLayout @mounted="setLayoutRef">
			<RouterView />
		</AppLayout>
		<AppModals />
		<AppCommandBar />
		<div :id="CODEMIRROR_TOOLTIP_CONTAINER_ELEMENT_ID" />
		<template #aside>
			<AppChatPanel v-if="layoutRef" :layout-ref="layoutRef" />
		</template>
	</BaseLayout>
</template>

<style lang="scss" module>
// On the root level, whole app is a flex container
// with app grid and assistant sidebar as children
.app {
	height: 100vh;
	overflow: hidden;
}
</style>
