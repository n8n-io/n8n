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
import { ITag } from '@/Interface';
import Vue from 'vue';

export default Vue.extend({
	name: 'TagContainer',
	props: [
		"tags",
	],
	computed: {
		toDisplay(): {id: string, name: string, title?: string} {
			const tags = this.$props.tags || []; 

			const toDisplay = tags.slice(0, 2);
			if (tags.length > 2) {
				const hidden = tags.slice(2);
				const title = hidden.reduce((accu: string, tag: ITag) => {
					return accu ? `${accu}, ${tag.name}` : tag.name;
				}, '');

				toDisplay.push({
					id: 'count',
					name: `+${tags.length - 2}`,
					title,
				});
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
