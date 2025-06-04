<script lang="ts" setup>
import {
	EditableArea,
	EditableInput,
	EditablePreview,
	EditableRoot,
	useForwardPropsEmits,
} from 'reka-ui';
import { computed, useTemplateRef } from 'vue';

import type { EditableRootEmits, EditableRootProps } from '../../reka-ui';

const props = withDefaults(
	defineProps<EditableRootProps & { minWidth?: number; maxWidth?: number }>(),
	{
		maxLength: 100,
		placeholder: 'Enter text...',
		selectOnFocus: true,
		autoResize: true,
		submitMode: 'both',
		maxWidth: 200,
		minWidth: 64,
	},
);

const emit = defineEmits<EditableRootEmits>();
const forwarded = useForwardPropsEmits(props, emit);

const editableRoot = useTemplateRef('editableRoot');

function forceFocus() {
	if (!props.readonly) {
		editableRoot.value.edit();
	}
}

function forceCancel() {
	editableRoot.value?.cancel();
}

defineExpose({ forceFocus, forceCancel });

const computedInlineStyles = computed(() => {
	return {
		fieldSizing: 'content',
		minWidth: `${props.minWidth}px`,
		maxWidth: `${props.maxWidth}px`,
	};
});
</script>

<template>
	<EditableRoot v-bind="forwarded" ref="editableRoot" class="inline-text-edit">
		<EditableArea class="editable-area">
			<EditablePreview
				class="inline-rename-preview"
				data-test-id="inline-edit-preview"
				style="display: block"
				:style="computedInlineStyles"
			/>
			<EditableInput
				class="inline-rename-input"
				data-test-id="inline-edit-input"
				:style="computedInlineStyles"
			/>
		</EditableArea>
	</EditableRoot>
</template>

<style scoped>
.editable-area {
	border-width: 1px;
	border-style: solid;
	border-color: transparent;
	border-radius: var(--border-radius-base);
	padding: 4px;
	max-width: 100%;
	&:hover:not([data-focused]) {
		border-color: var(--color-foreground-base);
		cursor: pointer;
	}

	&[data-focused] {
		border-color: var(--color-secondary);
	}

	&[data-readonly] {
		pointer-events: none;
		border-color: transparent;
	}
}
</style>
