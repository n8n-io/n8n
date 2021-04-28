<template>
	<div class="tags-container">
		<el-tag 
			v-for="tag in toDisplay" 
			:key="tag.id"
			:title="tag.title || tag.name"
			type="info"
			size="small"
		>
			{{tag.name}}
		</el-tag>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

import { ITag } from '@/Interface';

interface ITagEl extends ITag {
	title?: string;
}

const MAX_TAGS_TO_DISPLAY = 2;

const getNumberTag = (tags: ITag[]) => {
	const title = tags.reduce((accu: string, tag: ITag) => {
		return accu ? `${accu}, ${tag.name}` : tag.name;
	}, '');

	return {
		id: 'count',
		name: `+${tags.length}`,
		title,
	};
};

export default Vue.extend({
	name: 'TagsContainer',
	props: [
		"tagIds",
	],
	computed: {
		toDisplay(): ITagEl {
			const tagIds = this.$props.tagIds; 
			const tags = tagIds.map((tagId: string) => this.$store.getters['tags/getTagById'](tagId))
				.filter((tag: ITag) => !!tag);

			const toDisplay = tags.slice(0, MAX_TAGS_TO_DISPLAY);
			if (tags.length > MAX_TAGS_TO_DISPLAY) {
				const numberTag = getNumberTag(tags.slice(MAX_TAGS_TO_DISPLAY));

				toDisplay.push(numberTag);
			}

			return toDisplay;
		},
	},
});
</script>

<style lang="scss" scoped>
	.tags-container {
		display: inline-block;
	}

	.tags-container .el-tag {
		margin-right: 4px;
	}
</style>
