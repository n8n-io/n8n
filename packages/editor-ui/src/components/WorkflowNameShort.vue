<template>
	<span :title="name">
		<slot :shortenedName="shortenedName"></slot>
	</span>
</template>

<script lang="ts">
import Vue from "vue";

const DEFAULT_WORKFLOW_NAME_LIMIT = 25;
const WORKFLOW_NAME_END_COUNT_TO_KEEP = 4;

export default Vue.extend({
	name: "WorkflowNameShort",
	props: ["name", "limit"],
	computed: {
		shortenedName(): string {
			const name = this.$props.name;

			const limit = this.$props.limit || DEFAULT_WORKFLOW_NAME_LIMIT;
			if (name.length <= limit) {
				return name;
			}

			const first = name.slice(0, limit - WORKFLOW_NAME_END_COUNT_TO_KEEP);
			const last = name.slice(name.length - WORKFLOW_NAME_END_COUNT_TO_KEEP, name.length);

			return `${first}...${last}`;
		},
	},
});
</script>
