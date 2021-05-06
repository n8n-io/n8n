<template>
	<BreakpointsHandler>
		<template v-slot="{ size }">
			<TagsContainer :tagIds="tagIds" :limit="getLimit(size)" :nowrap="true" />
		</template>
	</BreakpointsHandler>
</template>

<script lang="ts">
import Vue from "vue";
import TagsContainer from "@/components/TagsContainer.vue";
import BreakpointsHandler from "./BreakpointsHandler.vue";
import { SIZES } from "@/constants";

export default Vue.extend({
	name: "TagsContainerResponsive",
	components: {
		TagsContainer,
		BreakpointsHandler,
	},
	props: [
		'tagIds',
		'limit',
		'limitSM',
		'limitMD',
		'limitLG',
		'limitXL',
	],
	methods: {
		getLimit(windowSize: string): number {
			const matchingSize = SIZES.find((size) => size === windowSize && this.$props[`limit${size}`]);
			return this.$props[`limit${matchingSize}`] || this.$props.limit;
		},
	}
});
</script>