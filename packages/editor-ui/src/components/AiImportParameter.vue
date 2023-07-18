<template>
	<n8n-button
		type="secondary"
		:label="$locale.baseText('aiImportParameter.label')"
		:disabled="isReadOnly"
		size="mini"
		@click="onImportCurlClicked"
	/>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { AI_CONNECT_MODAL_KEY } from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import { mapStores } from 'pinia';

export default defineComponent({
	name: 'ai-import-parameter',
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
			this.uiStore.openModal(AI_CONNECT_MODAL_KEY);
		},
	},
});
</script>
