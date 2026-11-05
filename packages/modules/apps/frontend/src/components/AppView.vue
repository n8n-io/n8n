<script setup lang="ts">
import type { AppPreviewElement, AppResponse } from '@n8n/api-types';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useToast } from '@n8n/composables/useToast';
import { N8nEmptyState, N8nLoading } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { computed, ref, watch } from 'vue';

import { getApp } from '../apps.api';
import type { AppViewTab } from '../apps.constants';
import { useAppVersions } from '../composables/useAppVersions';
import AppHeader from './AppHeader.vue';
import AppPreview from './AppPreview.vue';
import AppConfigure from './configure/AppConfigure.vue';
import AppVersionsPanel from './versions/AppVersionsPanel.vue';

const props = defineProps<{
	projectId: string;
	appId: string;
	inspectable?: boolean;
	elementSelected?: boolean;
}>();

const emit = defineEmits<{
	deleted: [appId: string];
	'element-selected': [element: AppPreviewElement];
}>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const latestFetch = useLatestFetch();
const telemetry = useTelemetry();

const app = ref<AppResponse | null>(null);
const loading = ref(true);
const versionsOpen = ref(false);
const versions = useAppVersions(
	() => props.projectId,
	() => app.value?.id,
);
const section = defineModel<string>('section', { default: 'preview' });
const activeTab = computed<AppViewTab>({
	get: () => (section.value === 'configure' ? 'configure' : 'preview'),
	set: (tab) => {
		section.value = tab;
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
		if (!keepView) {
			telemetry.track(TELEMETRY_EVENT.APPS.USER_OPENED_APP_BUILDER, {
				app_id: result.id,
				project_id: result.projectId,
				is_published: result.publishedVersionId !== null,
			});
		}
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
	await loadApp(true);
	await versions.refresh();
}

// A publish also saves the version name, so the version list reloads when the published version changes.
function onAppUpdated(updated: AppResponse) {
	const publishChanged = updated.publishedVersionId !== app.value?.publishedVersionId;
	app.value = updated;
	if (publishChanged) void versions.refresh();
}

watch(
	() => [props.projectId, props.appId],
	async () => {
		versionsOpen.value = false;
		await loadApp();
	},
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
			@updated="onAppUpdated"
			@deleted="emit('deleted', $event)"
			@show-versions="versionsOpen = true"
		/>

		<div :class="$style.workspace">
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
						:inspectable="inspectable"
						:element-selected="elementSelected"
						@element-selected="emit('element-selected', $event)"
					/>
					<AppConfigure v-else :app="app" :versions="versions" @updated="onAppUpdated" />
				</template>
			</main>
			<AppVersionsPanel
				v-if="app && versionsOpen"
				:app="app"
				:versions="versions"
				@updated="onAppUpdated"
				@restored="refresh"
				@close="versionsOpen = false"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.view {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
}

.workspace {
	position: relative;
	display: flex;
	flex: 1;
	min-height: 0;
	min-width: 0;
	container-type: inline-size;
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
