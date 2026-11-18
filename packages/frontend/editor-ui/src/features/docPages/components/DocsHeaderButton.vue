<script setup lang="ts">
import { computed } from 'vue';
import type { DocPageResourceType } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { DOC_PAGES_MODULE_NAME } from '../constants';
import { useOpenDocPage } from '../composables/useOpenDocPage';

/** The parent decides if the resource is documentable and hides this button if not. */
const props = defineProps<{
	resourceType: DocPageResourceType;
	resourceId: string;
}>();

const i18n = useI18n();
const settingsStore = useSettingsStore();
const { openDocPage, opening } = useOpenDocPage();

const isAvailable = computed(() => settingsStore.isModuleActive(DOC_PAGES_MODULE_NAME));
</script>

<template>
	<N8nTooltip v-if="isAvailable" :content="i18n.baseText('docPages.headerButton.tooltip')">
		<N8nButton
			variant="ghost"
			size="small"
			:loading="opening"
			data-testid="docs-header-button"
			data-attr="docs-header-button"
			@click="openDocPage(props.resourceType, props.resourceId)"
		>
			<N8nIcon icon="book-open" size="small" />
			{{ i18n.baseText('docPages.headerButton') }}
		</N8nButton>
	</N8nTooltip>
</template>
