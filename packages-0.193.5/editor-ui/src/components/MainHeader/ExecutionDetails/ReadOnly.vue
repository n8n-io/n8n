<template>
	<n8n-tooltip class="primary-color" placement="bottom-end" >
		<div slot="content">
			<span v-html="$locale.baseText('executionDetails.readOnly.youreViewingTheLogOf')"></span>
		</div>
		<div>
			<font-awesome-icon icon="exclamation-triangle" />
			<span v-text="$locale.baseText('executionDetails.readOnly.readOnly')"></span>
		</div>
	</n8n-tooltip>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: "ReadOnly",
});
</script>

<style scoped>
svg {
	margin-right: 6px;
}
</style>
