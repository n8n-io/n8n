<script lang="ts" setup>
import { onMounted } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nHeading } from '@n8n/design-system';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import LogStreamingPaywall from '@/features/integrations/logStreaming.ee/components/LogStreamingPaywall.vue';

const i18n = useI18n();
const documentTitle = useDocumentTitle();

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.log-streaming.heading'));
});
</script>

<template>
	<div>
		<div class="mb-2xl">
			<N8nHeading size="2xlarge">
				{{ i18n.baseText('settings.log-streaming.heading') }}
			</N8nHeading>
		</div>
		<LogStreamingPaywall />
	</div>
</template>
