<script lang="ts" setup>
import { GENERATE_CURL_MODAL_KEY, IMPORT_CURL_MODAL_KEY } from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import { useAIStore } from '@/stores/ai.store';

defineProps({
	isReadOnly: {
		type: Boolean,
		default: false,
	},
});

const uiStore = useUIStore();
const aiStore = useAIStore();

function onImportCurlClicked() {
	uiStore.openModal(IMPORT_CURL_MODAL_KEY);
}

function onGenerateCurlClicked() {
	uiStore.openModal(GENERATE_CURL_MODAL_KEY);
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

		<n8n-button
			v-if="aiStore.isGenerateCurlEnabled"
			class="mr-2xs"
			type="secondary"
			:label="$locale.baseText('generateCurlParameter.label')"
			:disabled="isReadOnly"
			size="mini"
			@click="onGenerateCurlClicked"
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
