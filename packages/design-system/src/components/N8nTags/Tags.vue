<template>
	<div :class="['n8n-tags', $style.tags]">
		<n8n-tag v-for="tag in visibleTags" :key="tag.id" :text="tag.name" @click="$emit('click', tag.id, $event)"/>
		<n8n-link
			v-if="truncate && !showAll && hiddenTagsLength > 0"
			theme="text"
			underline
			size="small"
			@click.stop.prevent="showAll = true"
		>
			+{{ hiddenTagsLength }} more
		</n8n-link>
	</div>
</template>

<script lang="ts">
import N8nTag from '../N8nTag';
import N8nLink from '../N8nLink';
import Vue, {PropType} from 'vue';

interface ITag {
	id: string;
	name: string;
}

export default Vue.extend({
	name: 'n8n-tags',
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
			type: Array as PropType<Array<ITag>>,
			default: () => [],
		},
		truncate: {
			type: Boolean,
			default: false,
		},
		truncateAt: {
			type: Number,
			default: 3,
		}
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
		}
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


	* {
		margin: var(--spacing-4xs) var(--spacing-4xs) 0 0;
	}
}
</style>
