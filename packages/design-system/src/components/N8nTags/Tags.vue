<template>
	<div :class="['n8n-tags', $style.tags]">
		<N8nTag
			v-for="tag in visibleTags"
			:key="tag.id"
			:text="tag.name"
			@click="emit('click:tag', tag.id, $event)"
		/>
		<N8nLink
			v-if="truncate && !showAll && hiddenTagsLength > 0"
			theme="text"
			underline
			size="small"
			@click.stop.prevent="onExpand"
		>
			{{ t('tags.showMore', [`${hiddenTagsLength}`]) }}
		</N8nLink>
	</div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import N8nTag from '../N8nTag';
import N8nLink from '../N8nLink';
import { useI18n } from '../../composables/useI18n';

export interface ITag {
	id: string;
	name: string;
}

interface TagsProp {
	tags?: ITag[];
	truncate?: boolean;
	truncateAt?: number;
}

defineOptions({ name: 'N8nTags' });
const props = withDefaults(defineProps<TagsProp>(), {
	tags: () => [],
	truncate: false,
	truncateAt: 3,
});

const emit = defineEmits<{
	expand: [value: boolean];
	'click:tag': [tagId: string, e: MouseEvent];
}>();

const { t } = useI18n();

const showAll = ref(false);

const visibleTags = computed((): ITag[] => {
	const { tags, truncate, truncateAt } = props;
	if (truncate && !showAll.value && tags.length > truncateAt) {
		return tags.slice(0, truncateAt);
	}
	return tags;
});

const hiddenTagsLength = computed((): number => props.tags.length - props.truncateAt);

const onExpand = () => {
	showAll.value = true;
	emit('expand', true);
};
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
