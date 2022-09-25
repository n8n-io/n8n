<template>
	<div class="import-section">
		<n8n-button
			type="secondary"
			:label="$locale.baseText('importParameter.label')"
			size="mini"
			@click="onImportCurlClicked"
		/>
	</div>
</template>

<script lang="ts">
import { IMPORT_CURL } from '@/constants';
import mixins from 'vue-typed-mixins';
import { showMessage } from './mixins/showMessage';

export default mixins(showMessage).extend({
	name: 'ImportParameter',
	methods: {
		onImportCurlClicked() {
			this.$store.dispatch('ui/openModal', IMPORT_CURL);
		},
	},
});
</script>

<style lang="scss">
.import-section {
	display: flex;
	flex-direction: row-reverse;
	margin-top: 10px;
}
</style>
