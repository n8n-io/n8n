<template>
	<span :class="$style.container">
		<n8n-button v-if="isDirty || isNewWorkflow" label="Save" :disabled="isWorkflowSaving" @click="save" />
		<span :class="$style.saved" v-else>Saved</span>
	</span>
</template>

<script lang="ts">
import mixins from "vue-typed-mixins";
import { mapGetters } from "vuex";

import { workflowHelpers } from "@/components/mixins/workflowHelpers";

export default mixins(workflowHelpers).extend({
	name: "SaveWorkflowButton",
	computed: {
		...mapGetters({
			isDirty: "getStateIsDirty",
		}),
		isWorkflowSaving(): boolean {
			return this.$store.getters.isActionActive("workflowSaving");
		},
		isNewWorkflow(): boolean {
			return !this.$route.params.name;
		},
		isSaved(): boolean {
			return !this.isWorkflowSaving && !this.isDirty && !this.isNewWorkflow;
		},
	},
	methods: {
		save() {
			this.saveCurrentWorkflow();
		},
	},
});
</script>

<style lang="scss" module>
.container {
	width: 65px;
}

.saved {
	color: $--custom-font-very-light;
	font-size: 12px;
	font-weight: 600;
	line-height: 12px;
	text-align: center;
	padding: var(--spacing-2xs) var(--spacing-xs);
}
</style>
