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
import AppHeader from './AppHeader.vue';
import AppPreview from './AppPreview.vue';

const props = defineProps<{ projectId: string; appId: string }>();

const emit = defineEmits<{ deleted: [appId: string] }>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const latestFetch = useLatestFetch();

const app = ref<AppResponse | null>(null);
const loading = ref(true);
// `<tab>` or `<tab>.<sub-tab>`, for example `configure.authentication`.
const section = defineModel<string>('section', { default: 'preview' });
const activeTab = computed<AppViewTab>({
	get: () => (section.value.split('.')[0] === 'configure' ? 'configure' : 'preview'),
	set: (tab) => {
		section.value = tab;
	},
});

async function loadApp() {
	const isLatest = latestFetch.next();
	app.value = null;
	loading.value = true;
	try {
		const result = await getApp(rootStore.restApiContext, props.projectId, props.appId);
		if (!isLatest()) return;
		app.value = result;
	} catch (error) {
		if (!isLatest()) return;
		app.value = null;
		if (!(error instanceof ResponseError && error.httpStatusCode === 404)) {
			toast.showError(error, i18n.baseText('apps.detail.loadError'));
		}
	}
	loading.value = false;
}

watch(() => [props.projectId, props.appId], loadApp, { immediate: true });
</script>

<template>
	<div :class="$style.view" data-test-id="app-view">
		<AppHeader
			v-if="loading || app"
			v-model:tab="activeTab"
			:project-id="projectId"
			:app="app"
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
				<AppPreview v-if="activeTab === 'preview'" :project-id="projectId" :app="app" />
				<div v-else :class="$style.configure" data-test-id="app-view-configure">
					<N8nEmptyState
						:icon="{ type: 'icon', value: 'settings' }"
						:heading="i18n.baseText('apps.detail.configure.heading')"
						:description="i18n.baseText('apps.detail.configure.description')"
					/>
				</div>
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

.configure {
	width: 100%;
	max-width: 56rem;
	margin-inline: auto;
	padding-block: var(--spacing--xl);
}
</style>
