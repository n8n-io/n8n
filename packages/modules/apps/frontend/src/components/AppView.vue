<script setup lang="ts">
import type { AppResponse } from '@n8n/api-types';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { useToast } from '@n8n/composables/useToast';
import { N8nEmptyState, N8nLoading } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';

import { getApp } from '../apps.api';
import type { AppViewTab } from '../apps.constants';
import { useAppVersions } from '../composables/useAppVersions';
import AppHeader from './AppHeader.vue';
import AppPreview from './AppPreview.vue';
import AppConfigure from './configure/AppConfigure.vue';
import {
	DEFAULT_APP_CONFIGURE_TAB,
	isAppConfigureTab,
	type AppConfigureTab,
} from './configure/appConfigureTabs';

const props = defineProps<{ projectId: string; appId: string }>();

const emit = defineEmits<{ deleted: [appId: string] }>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const latestFetch = useLatestFetch();

const app = ref<AppResponse | null>(null);
const loading = ref(true);
const versions = useAppVersions(
	() => props.projectId,
	() => app.value?.id,
);
// `<tab>` or `<tab>.<sub-tab>`, for example `configure.authentication`.
const section = defineModel<string>('section', { default: 'preview' });
const sectionParts = computed(() => section.value.split('.'));
const activeTab = computed<AppViewTab>({
	get: () => (sectionParts.value[0] === 'configure' ? 'configure' : 'preview'),
	set: (tab) => {
		section.value = tab;
	},
});
const configureTab = computed<AppConfigureTab>({
	get: () => {
		const subTab = sectionParts.value[1];
		return isAppConfigureTab(subTab) ? subTab : DEFAULT_APP_CONFIGURE_TAB;
	},
	set: (tab) => {
		section.value = `configure.${tab}`;
	},
});

async function loadApp(keepView = false) {
	const isLatest = latestFetch.next();
	if (!keepView) {
		app.value = null;
		loading.value = true;
	}
	try {
		const result = await getApp(rootStore.restApiContext, props.projectId, props.appId);
		if (!isLatest()) return;
		app.value = result;
	} catch (error) {
		if (!isLatest()) return;
		if (error instanceof ResponseError && error.httpStatusCode === 404) {
			app.value = null;
		} else {
			toast.showError(error, i18n.baseText('apps.detail.loadError'));
		}
	}
	loading.value = false;
}

async function refresh() {
	await Promise.all([loadApp(true), versions.refresh()]);
}

watch(
	() => [props.projectId, props.appId],
	async () => await loadApp(),
	{ immediate: true },
);

defineExpose({ refresh });
</script>

<template>
	<div :class="$style.view" data-test-id="app-view">
		<AppHeader
			v-if="loading || app"
			v-model:tab="activeTab"
			:project-id="projectId"
			:app="app"
			:publishable-version="versions.latestBuilt.value"
			@updated="app = $event"
			@deleted="emit('deleted', $event)"
		/>

		<main :class="[$style.content, { [$style.flush]: app && activeTab === 'preview' }]">
			<N8nLoading v-if="loading" :loading="true" :rows="3" data-test-id="app-view-loading" />

			<N8nEmptyState
				v-else-if="!app"
				:heading="i18n.baseText('apps.detail.notFound.heading')"
				:description="i18n.baseText('apps.detail.notFound.description')"
				data-test-id="app-view-not-found"
			/>

			<template v-else>
				<AppPreview
					v-if="activeTab === 'preview'"
					:project-id="projectId"
					:app="app"
					:versions="versions"
				/>
				<AppConfigure
					v-else
					v-model:tab="configureTab"
					:app="app"
					:versions="versions"
					@updated="app = $event"
				/>
			</template>
		</main>
	</div>
</template>

<style lang="scss" module>
.view {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
}

.content {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	padding: var(--spacing--md);
	overflow: auto;
}

.flush {
	padding: 0;
	overflow: hidden;
}
</style>
