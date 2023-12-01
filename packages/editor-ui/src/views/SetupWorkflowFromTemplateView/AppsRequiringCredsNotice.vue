<script setup lang="ts">
import { computed } from 'vue';
import N8nNotice from 'n8n-design-system/components/N8nNotice';
import type { AppCredentials } from '@/views/SetupWorkflowFromTemplateView/setupTemplate.store';
import { useSetupTemplateStore } from '@/views/SetupWorkflowFromTemplateView/setupTemplate.store';
import { storeToRefs } from 'pinia';
import { formatList } from '@/utils/formatters/listFormatter';
import { useI18n } from '@/composables/useI18n';

const i18n = useI18n();
const store = useSetupTemplateStore();
const { appCredentials } = storeToRefs(store);

const formatApp = (app: AppCredentials) => `<b>${app.credentials.length}x ${app.appName}</b>`;

const appNodeCounts = computed(() => {
	return formatList(appCredentials.value, {
		formatFn: formatApp,
		i18n,
	});
});
</script>

<template>
	<n8n-notice :class="$style.notice" theme="info">
		<i18n-t tag="span" keypath="templateSetup.instructions" scope="global">
			<span v-html="appNodeCounts" />
		</i18n-t>
	</n8n-notice>
</template>

<style lang="scss" module>
.notice {
	margin-top: 0;
}
</style>
