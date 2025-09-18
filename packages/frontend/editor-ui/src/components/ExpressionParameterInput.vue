<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue';
import { onClickOutside } from '@vueuse/core';

import ExpressionFunctionIcon from '@/components/ExpressionFunctionIcon.vue';
import InlineExpressionEditorInput from '@/components/InlineExpressionEditor/InlineExpressionEditorInput.vue';
import InlineExpressionEditorOutput from '@/components/InlineExpressionEditor/InlineExpressionEditorOutput.vue';
import { useNDVStore } from '@/stores/ndv.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createExpressionTelemetryPayload } from '@/utils/telemetryUtils';

import { useTelemetry } from '@/composables/useTelemetry';
import { dropInExpressionEditor } from '@/plugins/codemirror/dragAndDrop';
import type { Segment } from '@/types/expressions';
import { startCompletion } from '@codemirror/autocomplete';
import type { EditorState, SelectionRange } from '@codemirror/state';
import type { IDataObject } from 'n8n-workflow';
import { createEventBus, type EventBus } from '@n8n/utils/event-bus';
import { CanvasKey } from '@/constants';
import { useIsInExperimentalNdv } from '@/components/canvas/experimental/composables/useIsInExperimentalNdv';

const isFocused = ref(false);
const segments = ref<Segment[]>([]);
const editorState = ref<EditorState>();
const selection = ref<SelectionRange>();
const inlineInput = ref<InstanceType<typeof InlineExpressionEditorInput>>();
const container = ref<HTMLDivElement>();
const outputPopover = ref<InstanceType<typeof InlineExpressionEditorOutput>>();

type Props = {
	path: string;
	modelValue: string;
	rows?: number;
	additionalExpressionData?: IDataObject;
	isReadOnly?: boolean;
	isAssignment?: boolean;
	eventBus?: EventBus;
};

const props = withDefaults(defineProps<Props>(), {
	rows: 5,
	isAssignment: false,
	isReadOnly: false,
	additionalExpressionData: () => ({}),
	eventBus: () => createEventBus(),
});

const emit = defineEmits<{
	'modal-opener-click': [];
	'update:model-value': [value: string];
	focus: [];
	blur: [FocusEvent | KeyboardEvent | undefined];
}>();

const telemetry = useTelemetry();
const ndvStore = useNDVStore();
const workflowsStore = useWorkflowsStore();

const canvas = inject(CanvasKey, undefined);
const isInExperimentalNdv = useIsInExperimentalNdv();

const isDragging = computed(() => ndvStore.isDraggableDragging);
const isOutputPopoverVisible = computed(
	() => isFocused.value && (!isInExperimentalNdv.value || !canvas?.isPaneMoving.value),
);

function select() {
	if (inlineInput.value) {
		inlineInput.value.selectAll();
	}
}

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

	if (event?.target instanceof Element && outputPopover.value?.contentRef?.contains(event.target)) {
		return;
	}

	const wasFocused = isFocused.value;

	isFocused.value = false;

	if (wasFocused) {
		emit('blur', event);

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

async function onDrop(value: string, event: MouseEvent) {
	if (!inlineInput.value) return;
	const { editor, setCursorPosition } = inlineInput.value;

	if (!editor) return;

	const droppedSelection = await dropInExpressionEditor(toRaw(editor), event, value);

	if (!ndvStore.isMappingOnboarded) ndvStore.setMappingOnboarded();

	if (!ndvStore.isAutocompleteOnboarded) {
		setCursorPosition((droppedSelection.ranges.at(0)?.head ?? 3) - 3);
		setTimeout(() => {
			startCompletion(editor);
		});
	}
}

async function onDropOnFixedInput() {
	await nextTick();

	if (!inlineInput.value) return;
	const { editor, setCursorPosition } = inlineInput.value;

	if (!editor || ndvStore.isAutocompleteOnboarded) return;

	setCursorPosition('lastExpression');
	setTimeout(() => {
		focus();
		startCompletion(editor);
	});
}

onMounted(() => {
	props.eventBus.on('drop', onDropOnFixedInput);
});

onBeforeUnmount(() => {
	props.eventBus.off('drop', onDropOnFixedInput);
});

watch(isDragging, (newIsDragging) => {
	// The input must stay focused in experimental NDV so that the input panel popover is open while dragging
	if (newIsDragging && !isInExperimentalNdv.value) {
		onBlur();
	}
});

onClickOutside(container, (event) => onBlur(event));

defineExpose({ focus, select });
</script>

<template>
	<div ref="container" :class="$style['expression-parameter-input']" @keydown.tab="onBlur">
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
			<DraggableTarget type="mapping" :disabled="isReadOnly" @drop="onDrop">
				<template #default="{ activeDrop, droppable }">
					<InlineExpressionEditorInput
						ref="inlineInput"
						:model-value="modelValue"
						:path="path"
						:is-read-only="isReadOnly"
						:rows="rows"
						:additional-data="additionalExpressionData"
						:class="{ [$style.activeDrop]: activeDrop, [$style.droppable]: droppable }"
						@focus="onFocus"
						@blur="onBlur"
						@update:model-value="onValueChange"
						@update:selection="onSelectionChange"
					/>
				</template>
			</DraggableTarget>
			<n8n-button
				v-if="!isDragging"
				square
				outline
				type="tertiary"
				icon="external-link"
				size="mini"
				:class="$style['expression-editor-modal-opener']"
				data-test-id="expander"
				@click="emit('modal-opener-click')"
			/>
		</div>

		<InlineExpressionEditorOutput
			ref="outputPopover"
			:visible="isOutputPopoverVisible"
			:unresolved-expression="modelValue"
			:selection="selection"
			:editor-state="editorState"
			:segments="segments"
			:is-read-only="isReadOnly"
			:virtual-ref="container"
		/>
	</div>
</template>

<style lang="scss" module>
.expression-parameter-input {
	position: relative;
	flex-grow: 1;

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

.droppable {
	--input-border-color: var(--color-ndv-droppable-parameter);
	--input-border-right-color: var(--color-ndv-droppable-parameter);
	--input-border-style: dashed;

	:global(.cm-editor) {
		border-width: 1.5px;
	}
}

.activeDrop {
	--input-border-color: var(--color-success);
	--input-border-right-color: var(--color-success);
	--input-background-color: var(--color-foreground-xlight);
	--input-border-style: solid;

	:global(.cm-editor) {
		cursor: grabbing !important;
		border-width: 1px;
	}
}
</style>
