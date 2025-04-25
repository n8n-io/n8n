<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import type { ITag } from '@/Interface';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed } from 'vue';
import type { EditableField } from '../types';

export interface TagsInputProps {
	modelValue: EditableField<string[]>;
	allTags: ITag[];
	tagsById: Record<string, ITag>;
	isLoading: boolean;
	startEditing: (field: 'tags') => void;
	saveChanges: (field: 'tags') => void;
	cancelEditing: (field: 'tags') => void;
	createTag?: (name: string) => Promise<ITag>;
}

const props = withDefaults(defineProps<TagsInputProps>(), {
	modelValue: () => ({
		isEditing: false,
		value: [],
		tempValue: [],
	}),
	createTag: undefined,
});

const emit = defineEmits<{ 'update:modelValue': [value: TagsInputProps['modelValue']] }>();

const locale = useI18n();
const tagsEventBus = createEventBus();

/**
 * Compute the tag name by ID
 */
const getTagName = computed(() => (tagId: string) => {
	return props.tagsById[tagId]?.name ?? '';
});

/**
 * Update the tempValue of the tags when the dropdown changes.
 * This does not finalize the changes; that happens on blur or hitting enter.
 */
function updateTags(tags: string[]) {
	emit('update:modelValue', {
		...props.modelValue,
		tempValue: tags,
	});
}
</script>

<template>
	<div data-test-id="workflow-tags-field">
		<n8n-input-label
			:label="locale.baseText('testDefinition.edit.tagName')"
			:bold="false"
			size="small"
		>
			<!-- Read-only view -->
			<div v-if="!modelValue.isEditing" :class="$style.tagsRead" @click="startEditing('tags')">
				<n8n-text v-if="modelValue.value.length === 0" size="small">
					{{ locale.baseText('testDefinition.edit.selectTag') }}
				</n8n-text>
				<n8n-tag
					v-for="tagId in modelValue.value"
					:key="tagId"
					:text="getTagName(tagId)"
					data-test-id="evaluation-tag-field"
				/>
				<n8n-icon-button
					:class="$style.editInputButton"
					icon="pen"
					type="tertiary"
					size="small"
					transparent
				/>
			</div>

			<!-- Editing view -->
			<TagsDropdown
				v-else
				:model-value="modelValue.tempValue"
				:placeholder="locale.baseText('executionAnnotationView.chooseOrCreateATag')"
				:create-enabled="modelValue.tempValue.length === 0"
				:all-tags="allTags"
				:is-loading="isLoading"
				:tags-by-id="tagsById"
				data-test-id="workflow-tags-dropdown"
				:event-bus="tagsEventBus"
				:create-tag="createTag"
				:manage-enabled="false"
				:multiple-limit="1"
				@update:model-value="updateTags"
				@esc="cancelEditing('tags')"
				@blur="saveChanges('tags')"
			/>
		</n8n-input-label>
	</div>
</template>

<style module lang="scss">
.tagsRead {
	&:hover .editInputButton {
		opacity: 1;
	}
}

.editInputButton {
	opacity: 0;
	border: none;
	--button-font-color: var(--prim-gray-490);
}
</style>
