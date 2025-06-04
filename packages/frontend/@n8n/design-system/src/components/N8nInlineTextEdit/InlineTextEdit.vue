<script lang="ts" setup>
import {
	EditableArea,
	EditableInput,
	EditablePreview,
	EditableRoot,
	useForwardPropsEmits,
} from 'reka-ui';
import { useTemplateRef } from 'vue';

import type { EditableRootEmits, EditableRootProps } from '../../reka-ui';

const props = withDefaults(defineProps<EditableRootProps>(), {
	maxLength: 100,
	placeholder: 'Enter text...',
	selectOnFocus: true,
	autoResize: true,
	submitMode: 'both',
});

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
</script>

<template>
	<EditableRoot v-bind="forwarded" ref="editableRoot" class="inline-text-edit">
		<EditableArea class="editable-area">
			<EditablePreview class="inline-rename-preview" data-test-id="inline-edit-preview" />
			<EditableInput class="inline-rename-input" data-test-id="inline-edit-input" />
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
