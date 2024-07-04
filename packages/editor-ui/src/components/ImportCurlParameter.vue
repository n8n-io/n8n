<script lang="ts" setup>
import { IMPORT_CURL_MODAL_KEY } from '@/constants';
import { useUIStore } from '@/stores/ui.store';

defineProps<{
	isReadOnly: boolean;
}>();

const uiStore = useUIStore();

function onImportCurlClicked() {
	uiStore.openModal(IMPORT_CURL_MODAL_KEY);
}
</script>

<template>
	<div :class="$style.importSection">
		<n8n-button
			type="secondary"
			:label="$locale.baseText('importCurlParameter.label')"
			:disabled="isReadOnly"
			size="mini"
			@click="onImportCurlClicked"
		/>
	</div>
</template>

<style module lang="scss">
.importSection {
	display: flex;
	flex-direction: row-reverse;
	margin-top: var(--spacing-xs);
}
</style>
