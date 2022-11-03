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
import { IMPORT_CURL_MODAL_KEY } from '@/constants';
import mixins from 'vue-typed-mixins';
import { showMessage } from './mixins/showMessage';

export default mixins(showMessage).extend({
	name: 'import-parameter',
	props: {
		isReadOnly: {
			type: Boolean,
			default: false,
		},
	},
	methods: {
		onImportCurlClicked() {
			this.$store.dispatch('ui/openModal', IMPORT_CURL_MODAL_KEY);
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
