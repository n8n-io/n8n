<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { IMPORT_CURL_MODAL_KEY } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';

import { N8nButton } from '@n8n/design-system';
defineProps<{
	isReadOnly?: boolean;
}>();

const uiStore = useUIStore();
const i18n = useI18n();

function onImportCurlClicked() {
	uiStore.openModal(IMPORT_CURL_MODAL_KEY);
}
</script>

<template>
	<div :class="$style.importSection">
		<N8nButton
			variant="subtle"
			:label="i18n.baseText('importCurlParameter.label')"
			:disabled="isReadOnly"
			size="xsmall"
			@click="onImportCurlClicked"
		/>
	</div>
</template>

<style module lang="scss">
.importSection {
	display: flex;
	flex-direction: row-reverse;
	margin-top: var(--spacing--xs);
}
</style>
