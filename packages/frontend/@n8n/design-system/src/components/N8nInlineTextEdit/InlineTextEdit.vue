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
	autoResize: false,
	submitMode: 'both',
});

const emit = defineEmits<EditableRootEmits>();
const forwarded = useForwardPropsEmits(props, emit);

const editableRoot = useTemplateRef('editableRoot');

function forceFocus() {
	if (!props.readonly) {
		editableRoot.value?.edit();
	}
}

function forceCancel() {
	editableRoot.value?.cancel();
}

defineExpose({ forceFocus, forceCancel });

function splitStringByEndLength(str: string, endLength: number): [string, string] {
	if (str.length <= endLength) {
		return [str, ''];
	}
	return [str.slice(0, str.length - endLength), str.slice(-endLength)];
}
</script>

<template>
	<EditableRoot v-bind="forwarded" ref="editableRoot" class="inline-text-edit">
		<EditableArea class="editable-area">
			<EditablePreview class="inline-rename-preview" data-test-id="inline-edit-preview" as="div">
				<template v-if="props.modelValue">
					<div
						v-for="(segment, index) in splitStringByEndLength(props.modelValue, 4)"
						:key="index"
						class="text-clamp"
					>
						{{ segment }}
					</div>
				</template>
			</EditablePreview>
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
	border-color: var(--color-foreground-base);
	padding: 4px;
	max-width: 350px;
	min-width: 64px;
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

.inline-rename-input {
	field-sizing: content;
	max-width: 100%;
	width: 100%;
	border: 0;
	outline: 0;
}

.inline-rename-preview {
	white-space: pre;
	user-select: none;
	padding: 2px 0;
	display: grid;
	grid-template-columns: 1fr auto;
	max-width: 100%;
	&[hidden] {
		display: none;
	}
}

.text-clamp {
	white-space: nowrap;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
