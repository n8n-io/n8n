<template>
	<span>
		{{ shortenedName }}
	</span>
</template>

<script lang="ts">
import Vue from "vue";

const WORKFLOW_NAME_LIMIT = 25;
const WORKFLOW_NAME_END_COUNT_TO_KEEP = 4;

export default Vue.extend({
	name: "TagContainer",
	props: ["name"],
	computed: {
		shortenedName(): string {
			const name = this.$props.name;

			if (name.length <= WORKFLOW_NAME_LIMIT) {
				return name;
			}

			const first = name.slice(0, WORKFLOW_NAME_LIMIT - WORKFLOW_NAME_END_COUNT_TO_KEEP);
			const last = name.slice(name.length - WORKFLOW_NAME_END_COUNT_TO_KEEP, name.length);

			return `${first}...${last}`;
		},
	},
});
</script>
