<template>
	<div :class="$style.importSection">
		<n8n-button
			type="secondary"
			:label="$locale.baseText('importParameter.label')"
			:disabled="isReadOnly"
			size="mini"
			@click="onImportCurlClicked"
		/>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { IMPORT_CURL_MODAL_KEY } from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import { mapStores } from 'pinia';

export default defineComponent({
	name: 'import-parameter',
	props: {
		isReadOnly: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		...mapStores(useUIStore),
	},
	methods: {
		onImportCurlClicked() {
			this.uiStore.openModal(IMPORT_CURL_MODAL_KEY);
		},
	},
});
</script>

<style module lang="scss">
.importSection {
	display: flex;
	flex-direction: row-reverse;
	margin-top: 10px;
}
</style>
