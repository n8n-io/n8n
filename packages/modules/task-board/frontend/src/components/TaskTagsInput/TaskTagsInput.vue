<script setup lang="ts">
import { TASK_BOARD_MAX_TAGS } from '@n8n/api-types';
import { N8nBadge, N8nTagsInput2, N8nText, type TagsInputValue } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import { normalizeTag, normalizeTags } from '../../task-board.utils';

/**
 * Free text tags. Enter or a comma adds a tag. The tags that the board already uses show
 * below the field, and a click adds one.
 */
const props = defineProps<{
	modelValue: string[];
	suggestions: string[];
	inputId: string;
	disabled?: boolean;
}>();
const emit = defineEmits<{ 'update:modelValue': [tags: string[]] }>();
const i18n = useI18n();

// The field holds its own list. A tag that the normalization drops then leaves the field
// too, also when the parent sees no change and sends no new list.
const tags = ref<string[]>([...props.modelValue]);
watch(
	() => props.modelValue,
	(next) => {
		tags.value = [...next];
	},
);

const isFull = computed(() => tags.value.length >= TASK_BOARD_MAX_TAGS);
const openSuggestions = computed(() =>
	props.disabled || isFull.value
		? []
		: props.suggestions.filter((tag) => !tags.value.includes(tag)),
);

function setTags(next: string[]) {
	tags.value = normalizeTags(next);
	emit('update:modelValue', tags.value);
}

function onUpdate(value: TagsInputValue[]) {
	setTags(value.filter((tag): tag is string => typeof tag === 'string'));
}
</script>

<template>
	<div :class="$style.root">
		<N8nTagsInput2
			:id="inputId"
			:model-value="tags"
			size="medium"
			:max="TASK_BOARD_MAX_TAGS"
			:disabled="disabled"
			:convert-value="normalizeTag"
			:placeholder="i18n.baseText('taskBoard.tags.placeholder')"
			add-on-blur
			add-on-paste
			:data-test-id="inputId"
			@update:model-value="onUpdate"
		/>
		<div
			v-if="openSuggestions.length > 0"
			:class="$style.suggestions"
			data-test-id="task-board-tag-suggestions"
		>
			<N8nText size="xsmall" color="text-light">
				{{ i18n.baseText('taskBoard.tags.suggestions') }}
			</N8nText>
			<N8nBadge
				v-for="tag in openSuggestions"
				:key="tag"
				variant="outline"
				size="xsmall"
				clickable
				data-test-id="task-board-tag-suggestion"
				@click="setTags([...tags, tag])"
			>
				{{ tag }}
			</N8nBadge>
		</div>
	</div>
</template>

<style lang="scss" module>
.root {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.suggestions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--4xs);
}
</style>
