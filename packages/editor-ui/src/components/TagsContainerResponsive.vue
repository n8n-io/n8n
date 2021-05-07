<template>
	<TagsContainer :tagIds="tagIds" :limit="2" />
</template>

<script lang="ts">
import Vue from "vue";
import TagsContainer from "@/components/TagsContainer.vue";

export default Vue.extend({
	name: "TagsContainerResponsive",
	components: {
		TagsContainer,
	},
	props: ['tagIds'],
});
</script>