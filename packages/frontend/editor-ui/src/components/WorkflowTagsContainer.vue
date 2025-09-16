<script lang="ts" setup>
import { computed } from 'vue';
import TagsContainer from './TagsContainer.vue';
import { useTagsStore } from '@/stores/tags.store';
import type { Tag } from '@n8n/api-types';

interface Props {
	tagIds: string[];
	limit?: number;
	clickable?: boolean;
	responsive?: boolean;
	hoverable?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
	click: [tagId: string];
}>();

const annotationTagsStore = useTagsStore();

const tagsById = computed<Record<string, Tag>>(() => annotationTagsStore.tagsById);

function onClick(tagId: string) {
	emit('click', tagId);
}
</script>

<template>
	<TagsContainer
		:tag-ids="tagIds"
		:tags-by-id="tagsById"
		:limit="limit"
		:clickable="clickable"
		:responsive="responsive"
		:hoverable="hoverable"
		@click="onClick"
	/>
</template>
