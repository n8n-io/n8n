<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { useMessage } from '@/composables/useMessage';
import type { ITag } from '@/Interface';

export interface TagsInputProps {
	selectedTags: ITag[];
}
const props = withDefaults(defineProps<TagsInputProps>(), {
	selectedTags: () => [],
});

const emit = defineEmits<{
	addTag: [];
}>();
</script>

<template>
	<div data-test-id="workflow-tags-field">
		<n8n-input-label :bold="false" size="small">
			<div :class="$style.tagsRead">
				Use all executions that are tagged with {{ selectedTags[0]?.name }}
				<br />
				<br />
				<n8n-button type="primary" size="small" transparent @click="emit('addTag')"
					>Select Executions</n8n-button
				>
			</div>
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
