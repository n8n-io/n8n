<script setup lang="ts">
import { N8nButton, N8nTooltip } from '@n8n/design-system';
import { usePageStore } from '@n8n/frontend-module-page';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { useUpdatePageWithAi } from '../composables/useUpdatePageWithAi';

/**
 * Asks the assistant to bring a page up to date with the resources that it links.
 * It renders nothing when the assistant or the pages are not available to this user, and while the page loads.
 * `started` fires after the assistant thread opened.
 */
const props = defineProps<{
	pageId: string;
}>();

const emit = defineEmits<{ started: [] }>();

const i18n = useI18n();
const pageStore = usePageStore();
const { isAvailable, isStarting, updatePage } = useUpdatePageWithAi();

const page = computed(() => pageStore.pagesById[props.pageId]);

async function startUpdating(): Promise<void> {
	if (page.value !== undefined && (await updatePage(page.value))) {
		emit('started');
	}
}
</script>

<template>
	<N8nTooltip v-if="isAvailable && page" :content="i18n.baseText('page.updateWithAi.tooltip')">
		<N8nButton
			variant="ghost"
			size="small"
			icon="sparkles"
			:loading="isStarting"
			:label="i18n.baseText('page.updateWithAi.label')"
			data-test-id="page-update-with-ai-button"
			@click="startUpdating"
		/>
	</N8nTooltip>
</template>
