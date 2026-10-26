<script setup lang="ts">
import type { AppResponse } from '@n8n/api-types';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { useToast } from '@n8n/composables/useToast';
import { N8nEmptyState, N8nHeading, N8nIcon, N8nLoading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import { getApp } from '../apps.api';
import { PROJECT_APPS } from '../apps.constants';
import AppActions from './AppActions.vue';
import AppPublicationBadge from './AppPublicationBadge.vue';

const props = defineProps<{ projectId: string; appId: string }>();

const emit = defineEmits<{ deleted: [appId: string] }>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const latestFetch = useLatestFetch();

const app = ref<AppResponse | null>(null);
const loading = ref(true);

async function loadApp() {
	const isLatest = latestFetch.next();
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
		<RouterLink
			:to="{ name: PROJECT_APPS, params: { projectId } }"
			:class="$style.back"
			data-test-id="app-view-back"
		>
			<N8nIcon icon="arrow-left" size="small" />
			{{ i18n.baseText('apps.detail.back') }}
		</RouterLink>

		<N8nLoading v-if="loading" :loading="true" :rows="3" data-test-id="app-view-loading" />

		<N8nEmptyState
			v-else-if="!app"
			:heading="i18n.baseText('apps.detail.notFound.heading')"
			:description="i18n.baseText('apps.detail.notFound.description')"
			data-test-id="app-view-not-found"
		/>

		<template v-else>
			<header :class="$style.header">
				<div :class="$style.title">
					<N8nHeading tag="h1" size="xlarge" bold data-test-id="app-view-name">
						{{ app.name }}
					</N8nHeading>
					<N8nText size="small" color="text-light">
						{{ app.namespace }} | {{ i18n.baseText(`apps.card.visibility.${app.visibility}`) }}
					</N8nText>
				</div>
				<div :class="$style.actions">
					<AppPublicationBadge :app="app" />
					<AppActions :app="app" @deleted="emit('deleted', $event)" />
				</div>
			</header>

			<N8nEmptyState
				:icon="{ type: 'icon', value: 'eye' }"
				:heading="i18n.baseText('apps.detail.preview.heading')"
				:description="i18n.baseText('apps.detail.preview.description')"
				data-test-id="app-view-preview"
			/>
		</template>
	</div>
</template>

<style lang="scss" module>
.view {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.back {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	text-decoration: none;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.title {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
