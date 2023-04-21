<template>
	<div :class="['n8n-tags', $style.tags]">
		<n8n-tag
			v-for="tag in visibleTags"
			:key="tag.id"
			:text="tag.name"
			@click="$emit('click', tag.id, $event)"
		/>
		<n8n-link
			v-if="truncate && !showAll && hiddenTagsLength > 0"
			theme="text"
			underline
			size="small"
			@click.stop.prevent="onExpand"
		>
			{{ t('tags.showMore', `${hiddenTagsLength}`) }}
		</n8n-link>
	</div>
</template>

<script lang="ts">
import N8nTag from '../N8nTag';
import N8nLink from '../N8nLink';
import Locale from '../../mixins/locale';
import { defineComponent, PropType } from 'vue';

export interface ITag {
	id: string;
	name: string;
}

export default defineComponent({
	name: 'n8n-tags',
	mixins: [Locale],
	components: {
		N8nTag,
		N8nLink,
	},
	data() {
		return {
			showAll: false,
		};
	},
	props: {
		tags: {
			type: Array as PropType<ITag[]>,
			default: () => [],
		},
		truncate: {
			type: Boolean,
			default: false,
		},
		truncateAt: {
			type: Number,
			default: 3,
		},
	},
	computed: {
		visibleTags(): ITag[] {
			if (this.truncate && !this.showAll && this.tags.length > this.truncateAt) {
				return this.tags.slice(0, this.truncateAt);
			}

			return this.tags;
		},
		hiddenTagsLength(): number {
			return this.tags.length - this.truncateAt;
		},
	},
	methods: {
		onExpand() {
			this.showAll = true;
			this.$emit('expand', true);
		},
	},
});
</script>

<style lang="scss" module>
.tags {
	display: inline-flex;
	flex-wrap: wrap;
	align-items: center;
	overflow-x: scroll;

	/* Hide scrollbar for Chrome, Safari and Opera */
	&::-webkit-scrollbar {
		display: none;
	}

	/* Hide scrollbar for IE, Edge and Firefox */
	-ms-overflow-style: none; /* IE and Edge */
	scrollbar-width: none; /* Firefox */

	margin-top: calc(var(--spacing-4xs) * -1); // Cancel out top margin of first tags row

	* {
		margin: var(--spacing-4xs) var(--spacing-4xs) 0 0;
	}
}
</style>
