<template>
	<n8n-tooltip class="primary-color" placement="bottom-end" >
		<div slot="content">
			<span v-html="$baseText('executionDetails.readOnly.youreViewingTheLogOf')"></span>
		</div>
		<div>
			<font-awesome-icon icon="exclamation-triangle" />
			<span v-html="$baseText('executionDetails.readOnly.readOnly')"></span>
		</div>
	</n8n-tooltip>
</template>

<script lang="ts">
import { renderText } from "@/components/mixins/renderText";
import mixins from "vue-typed-mixins";

export default mixins(renderText).extend({
	name: "ReadOnly",
});
</script>

<style scoped>
svg {
	margin-right: 6px;
}
</style>