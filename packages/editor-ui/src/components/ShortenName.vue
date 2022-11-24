<template>
	<span :title="name">
		<slot :shortenedName="shortenedName"></slot>
	</span>
</template>

<script lang="ts">
import Vue from "vue";
import { shorten } from "@/utils";

const DEFAULT_WORKFLOW_NAME_LIMIT = 25;
const WORKFLOW_NAME_END_COUNT_TO_KEEP = 4;

export default Vue.extend({
	name: "ShortenName",
	props: ["name", "limit"],
	computed: {
		shortenedName(): string {
			return shorten(this.name, this.limit || DEFAULT_WORKFLOW_NAME_LIMIT, WORKFLOW_NAME_END_COUNT_TO_KEEP);
		},
	},
});
</script>
