<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import ExpressionFunctionIcon from '@/components/ExpressionFunctionIcon.vue';
import InlineExpressionEditorInput from '@/components/InlineExpressionEditor/InlineExpressionEditorInput.vue';
import InlineExpressionEditorOutput from '@/components/InlineExpressionEditor/InlineExpressionEditorOutput.vue';
import { useNDVStore } from '@/stores/ndv.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createExpressionTelemetryPayload } from '@/utils/telemetryUtils';

import { useTelemetry } from '@/composables/useTelemetry';
import type { Segment } from '@/types/expressions';
import { createEventBus, type EventBus } from 'n8n-design-system/utils';
import type { IDataObject } from 'n8n-workflow';
import type { EditorState, SelectionRange } from '@codemirror/state';

const isFocused = ref(false);
const segments = ref<Segment[]>([]);
const editorState = ref<EditorState>();
const selection = ref<SelectionRange>();
const inlineInput = ref<InstanceType<typeof InlineExpressionEditorInput>>();

type Props = {
	path: string;
	modelValue: string;
	isReadOnly: boolean;
	rows: number;
	isAssignment: boolean;
	additionalExpressionData: IDataObject;
	eventBus: EventBus;
};

const props = withDefaults(defineProps<Props>(), {
	rows: 5,
	isAssignment: false,
	additionalExpressionData: () => ({}),
	eventBus: () => createEventBus(),
});

const emit = defineEmits<{
	(event: 'modal-opener-click'): void;
	(event: 'update:model-value', value: string): void;
	(event: 'focus'): void;
	(event: 'blur'): void;
}>();

const telemetry = useTelemetry();
const ndvStore = useNDVStore();
const workflowsStore = useWorkflowsStore();

const isDragging = computed(() => ndvStore.isDraggableDragging);

function focus() {
	if (inlineInput.value) {
		inlineInput.value.focus();
	}
}

function onFocus() {
	isFocused.value = true;
	emit('focus');
}

function onBlur(event?: FocusEvent | KeyboardEvent) {
	if (
		event?.target instanceof Element &&
		Array.from(event.target.classList).some((_class) => _class.includes('resizer'))
	) {
		return; // prevent blur on resizing
	}

	const wasFocused = isFocused.value;

	isFocused.value = false;

	if (wasFocused) {
		emit('blur');

		const telemetryPayload = createExpressionTelemetryPayload(
			segments.value,
			props.modelValue,
			workflowsStore.workflowId,
			ndvStore.pushRef,
			ndvStore.activeNode?.type ?? '',
		);

		telemetry.track('User closed Expression Editor', telemetryPayload);
	}
}

function onValueChange({ value, segments: newSegments }: { value: string; segments: Segment[] }) {
	segments.value = newSegments;

	if (isDragging.value) return;
	if (value === '=' + props.modelValue) return; // prevent report on change of target item

	emit('update:model-value', value);
}

function onSelectionChange({
	state: newState,
	selection: newSelection,
}: {
	state: EditorState;
	selection: SelectionRange;
}) {
	editorState.value = newState;
	selection.value = newSelection;
}

watch(isDragging, (newIsDragging) => {
	if (newIsDragging) {
		onBlur();
	}
});

defineExpose({ focus });
</script>

<template>
	<div
		v-on-click-outside="onBlur"
		:class="$style['expression-parameter-input']"
		@keydown.tab="onBlur"
	>
		<div
			:class="[
				$style['all-sections'],
				{ [$style.focused]: isFocused, [$style.assignment]: isAssignment },
			]"
		>
			<div :class="[$style['prepend-section'], 'el-input-group__prepend']">
				<span v-if="isAssignment">=</span>
				<ExpressionFunctionIcon v-else />
			</div>
			<InlineExpressionEditorInput
				ref="inlineInput"
				:model-value="modelValue"
				:path="path"
				:is-read-only="isReadOnly"
				:rows="rows"
				:additional-data="additionalExpressionData"
				:event-bus="eventBus"
				@focus="onFocus"
				@blur="onBlur"
				@update:model-value="onValueChange"
				@update:selection="onSelectionChange"
			/>
			<n8n-button
				v-if="!isDragging"
				square
				outline
				type="tertiary"
				icon="external-link-alt"
				size="xsmall"
				:class="$style['expression-editor-modal-opener']"
				data-test-id="expander"
				@click="emit('modal-opener-click')"
			/>
		</div>
		<InlineExpressionEditorOutput
			:unresolved-expression="modelValue"
			:selection="selection"
			:editor-state="editorState"
			:segments="segments"
			:is-read-only="isReadOnly"
			:visible="isFocused"
		/>
	</div>
</template>

<style lang="scss" module>
.expression-parameter-input {
	position: relative;

	:global(.cm-editor) {
		background-color: var(--color-code-background);
	}

	.all-sections {
		height: 30px;
		display: inline-table;
		width: 100%;
	}

	.prepend-section {
		padding: 0;
		padding-top: 2px;
		width: 22px;
		text-align: center;
	}
}

.assignment {
	.prepend-section {
		vertical-align: top;
		padding-top: 4px;
	}
}

.expression-editor-modal-opener {
	position: absolute;
	right: 0;
	bottom: 0;
	background-color: var(--color-code-background);
	padding: 3px;
	line-height: 9px;
	border: var(--input-border-color, var(--border-color-base))
		var(--input-border-style, var(--border-style-base))
		var(--input-border-width, var(--border-width-base));
	cursor: pointer;
	border-radius: 0;
	border-top-left-radius: var(--border-radius-base);

	&:hover {
		border: var(--input-border-color, var(--border-color-base))
			var(--input-border-style, var(--border-style-base))
			var(--input-border-width, var(--border-width-base));
	}

	svg {
		width: 9px !important;
		height: 9px;
		transform: rotate(270deg);
	}
}

.focused > .prepend-section {
	border-color: var(--color-secondary);
	border-bottom-left-radius: 0;
}

.focused :global(.cm-editor) {
	border-color: var(--color-secondary);
}

.focused > .expression-editor-modal-opener {
	border-color: var(--color-secondary);
	border-bottom-right-radius: 0;
	background-color: var(--color-code-background);
}
</style>
