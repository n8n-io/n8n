<template>
	<n8n-notice theme="info"
		>You need <span v-html="appNodeCounts"></span> account to setup this template</n8n-notice
	>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import N8nNotice from 'n8n-design-system/components/N8nNotice';
import type { AppCredentials } from './setupTemplate.store.getters';
import { useSetupTemplateStore } from '@/views/SetupWorkflowFromTemplateView/setupTemplate.store';
import { storeToRefs } from 'pinia';

const store = useSetupTemplateStore();
const { appCredentials } = storeToRefs(store);

const formatApp = (app: AppCredentials) => `<b>${app.credentials.length}x ${app.appName}</b>`;

const appNodeCounts = computed(() => {
	if (appCredentials.value.length === 0) {
		return '';
	}

	if (appCredentials.value.length <= 1) {
		const first = appCredentials.value[0];
		return formatApp(first);
	}

	const allButLast = appCredentials.value.slice(0, -1);
	const last = appCredentials.value.slice(-1)[0];
	return `${allButLast.map(formatApp).join(', ')} and ${formatApp(last)}`;
});
</script>
