<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { ClusterInfoResponse } from '@n8n/api-types';
import * as instanceRegistryApi from '@n8n/rest-api-client/api/instance-registry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useI18n } from '@n8n/i18n';
import { N8nHeading, N8nLoading } from '@n8n/design-system';

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const rootStore = useRootStore();

const loading = ref(true);
const clusterInfo = ref<ClusterInfoResponse | null>(null);
const error = ref<string | null>(null);

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.instanceRegistry.title'));

	try {
		clusterInfo.value = await instanceRegistryApi.getClusterInfo(rootStore.restApiContext);
	} catch (e) {
		console.error('Failed to load instance registry', e);
		error.value = i18n.baseText('settings.instanceRegistry.error');
	} finally {
		loading.value = false;
	}
});
</script>

<template>
	<div :class="$style.container">
		<N8nHeading size="2xlarge" :class="$style.heading">
			{{ i18n.baseText('settings.instanceRegistry.title') }}
		</N8nHeading>

		<N8nLoading v-if="loading" :rows="4" />

		<div v-else-if="error" :class="$style.error">
			{{ error }}
		</div>

		<pre v-else :class="$style.json">{{ JSON.stringify(clusterInfo, null, 2) }}</pre>
	</div>
</template>

<style module lang="scss">
.container {
	padding: var(--spacing--lg);
}

.heading {
	margin-bottom: var(--spacing--lg);
}

.json {
	background-color: var(--color--background--shade-1);
	border: var(--border);
	border-radius: var(--radius--lg);
	padding: var(--spacing--sm);
	overflow: auto;
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
	color: var(--color--text);
	max-height: 600px;
}

.error {
	color: var(--color--text--danger);
	padding: var(--spacing--sm);
}
</style>
