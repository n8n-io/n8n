<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import type { ITag } from '@/Interface';
import { createEventBus } from 'n8n-design-system';
import { computed } from 'vue';

export interface TagsInputProps {
	modelValue?: {
		isEditing: boolean;
		appliedTagIds: string[];
	};
	allTags: ITag[];
	tagsById: Record<string, ITag>;
	isLoading: boolean;
	startEditing: (field: string) => void;
	saveChanges: (field: string) => void;
	cancelEditing: (field: string) => void;
}

const props = withDefaults(defineProps<TagsInputProps>(), {
	modelValue: () => ({
		isEditing: false,
		appliedTagIds: [],
	}),
});

const emit = defineEmits<{ 'update:modelValue': [value: TagsInputProps['modelValue']] }>();

const locale = useI18n();
const tagsEventBus = createEventBus();
const getTagName = computed(() => (tagId: string) => {
	return props.tagsById[tagId]?.name ?? '';
});

function updateTags(tags: string[]) {
	const newTags = tags[0] ? [tags[0]] : [];
	emit('update:modelValue', {
		...props.modelValue,
		appliedTagIds: newTags,
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
			<div v-if="!modelValue.isEditing" :class="$style.tagsRead" @click="startEditing('tags')">
				<n8n-text v-if="modelValue.appliedTagIds.length === 0" size="small">
					{{ locale.baseText('testDefinition.edit.selectTag') }}
				</n8n-text>
				<n8n-tag
					v-for="tagId in modelValue.appliedTagIds"
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
			<TagsDropdown
				v-else
				:model-value="modelValue.appliedTagIds"
				:placeholder="locale.baseText('executionAnnotationView.chooseOrCreateATag')"
				:create-enabled="false"
				:all-tags="allTags"
				:is-loading="isLoading"
				:tags-by-id="tagsById"
				data-test-id="workflow-tags-dropdown"
				:event-bus="tagsEventBus"
				@update:model-value="updateTags"
				@esc="cancelEditing('tags')"
				@blur="saveChanges('tags')"
			/>
		</n8n-input-label>
		<n8n-text size="small" color="text-light">{{
			locale.baseText('testDefinition.edit.tagsHelpText')
		}}</n8n-text>
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
