<script setup lang="ts">
import type { ViewUpdate } from '@codemirror/view';
import type { CodeExecutionMode, CodeNodeEditorLanguage } from 'n8n-workflow';
import { computed, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue';

import { CODE_NODE_TYPE } from '@/app/constants';
import { codeNodeEditorEventBus } from '@/app/event-bus';
import { useRootStore } from '@n8n/stores/useRootStore';

import { useCodeEditor } from '../../composables/useCodeEditor';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { CODE_PLACEHOLDERS } from './constants';
import { useLinter } from './linter';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { dropInCodeEditor } from '../../plugins/codemirror/dragAndDrop';
import type { TargetNodeParameterContext } from '@/Interface';
import { valueToInsert } from './utils';
import DraggableTarget from '@/app/components/DraggableTarget.vue';

export type CodeNodeLanguageOption = CodeNodeEditorLanguage | 'pythonNative';

type Props = {
	mode: CodeExecutionMode;
	modelValue: string;
	fillParent?: boolean;
	language?: CodeNodeLanguageOption;
	isReadOnly?: boolean;
	rows?: number;
	id?: string;
	targetNodeParameterContext?: TargetNodeParameterContext;
};

const props = withDefaults(defineProps<Props>(), {
	fillParent: false,
	language: 'javaScript',
	isReadOnly: false,
	rows: 4,
	id: () => crypto.randomUUID(),
	targetNodeParameterContext: undefined,
});
const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();

const codeNodeEditorRef = ref<HTMLDivElement>();
const codeNodeEditorContainerRef = ref<HTMLDivElement>();

const rootStore = useRootStore();
const telemetry = useTelemetry();
const workflowDocumentStore = injectWorkflowDocumentStore();

const linter = useLinter(
	() => props.mode,
	() => (props.language === 'pythonNative' ? 'python' : props.language),
	() => workflowDocumentStore?.value?.settings?.binaryMode,
);
const extensions = computed(() => [linter.value]);
const placeholder = computed(() => CODE_PLACEHOLDERS[props.language]?.[props.mode] ?? '');
const dragAndDropEnabled = computed(() => {
	return !props.isReadOnly;
});

const { highlightLine, readEditorValue, editor, focus } = useCodeEditor({
	id: props.id,
	editorRef: codeNodeEditorRef,
	language: () => props.language,
	languageParams: () => ({ mode: props.mode }),
	editorValue: () => props.modelValue,
	placeholder,
	extensions,
	isReadOnly: () => props.isReadOnly,
	theme: {
		maxHeight: props.fillParent ? '100%' : '40vh',
		minHeight: '20vh',
		rows: props.rows,
	},
	onChange: onEditorUpdate,
	targetNodeParameterContext: () => props.targetNodeParameterContext,
});

onMounted(() => {
	if (!props.isReadOnly) codeNodeEditorEventBus.on('highlightLine', highlightLine);
	codeNodeEditorEventBus.on('codeDiffApplied', diffApplied);

	if (!props.modelValue) {
		emit('update:modelValue', placeholder.value);
	}
});

onBeforeUnmount(() => {
	codeNodeEditorEventBus.off('codeDiffApplied', diffApplied);
	if (!props.isReadOnly) codeNodeEditorEventBus.off('highlightLine', highlightLine);
});

watch([() => props.language, () => props.mode], (_, [prevLanguage, prevMode]) => {
	if (readEditorValue().trim() === CODE_PLACEHOLDERS[prevLanguage]?.[prevMode]) {
		emit('update:modelValue', placeholder.value);
	}
});

function onEditorUpdate(viewUpdate: ViewUpdate) {
	trackCompletion(viewUpdate);
	emit('update:modelValue', readEditorValue());
}

function diffApplied() {
	codeNodeEditorContainerRef.value?.classList.add('flash-editor');
	codeNodeEditorContainerRef.value?.addEventListener('animationend', () => {
		codeNodeEditorContainerRef.value?.classList.remove('flash-editor');
	});
}

function trackCompletion(viewUpdate: ViewUpdate) {
	const completionTx = viewUpdate.transactions.find((tx) => tx.isUserEvent('input.complete'));

	if (!completionTx) return;

	try {
		// @ts-expect-error - undocumented fields
		const { fromA, toB } = viewUpdate?.changedRanges[0];
		const full = viewUpdate.state.doc.slice(fromA, toB).toString();
		const lastDotIndex = full.lastIndexOf('.');

		let context = null;
		let insertedText = null;

		if (lastDotIndex === -1) {
			context = '';
			insertedText = full;
		} else {
			context = full.slice(0, lastDotIndex);
			insertedText = full.slice(lastDotIndex + 1);
		}

		// TODO: Still has to get updated for Python and JSON
		telemetry.track('User autocompleted code', {
			instance_id: rootStore.instanceId,
			node_type: CODE_NODE_TYPE,
			field_name: props.mode === 'runOnceForAllItems' ? 'jsCodeAllItems' : 'jsCodeEachItem',
			field_type: 'code',
			context,
			inserted_text: insertedText,
		});
	} catch {}
}

async function onDrop(value: string, event: MouseEvent) {
	if (!editor.value) return;

	await dropInCodeEditor(
		toRaw(editor.value),
		event,
		valueToInsert(
			value,
			props.language,
			props.mode,
			workflowDocumentStore?.value?.settings?.binaryMode,
		),
	);
}

defineExpose({
	focus,
});
</script>

<template>
	<div
		ref="codeNodeEditorContainerRef"
		:class="['code-node-editor', $style['code-node-editor-container']]"
	>
		<div :class="$style.fillHeight">
			<DraggableTarget
				type="mapping"
				:disabled="!dragAndDropEnabled"
				:class="$style.fillHeight"
				@drop="onDrop"
			>
				<template #default="{ activeDrop, droppable }">
					<div
						ref="codeNodeEditorRef"
						:class="[
							'ph-no-capture',
							$style.fillHeight,
							$style.editorInput,
							{ [$style.activeDrop]: activeDrop, [$style.droppable]: droppable },
						]"
					/>
				</template>
			</DraggableTarget>
			<slot name="suffix" />
		</div>
	</div>
</template>

<style scoped lang="scss">
@keyframes backgroundAnimation {
	0% {
		background-color: none;
	}
	30% {
		background-color: rgba(41, 163, 102, 0.1);
	}
	100% {
		background-color: none;
	}
}

.flash-editor {
	:deep(.cm-editor),
	:deep(.cm-gutter) {
		animation: backgroundAnimation 1.5s ease-in-out;
	}
}
</style>

<style lang="scss" module>
.code-node-editor-container {
	position: relative;
}

.fillHeight {
	height: 100%;
}

.editorInput.droppable {
	:global(.cm-editor) {
		border-color: transparent;
		outline: 1.5px dashed var(--ndv--droppable-parameter--color);
		outline-offset: -1.5px;
	}
}

.editorInput.activeDrop {
	:global(.cm-editor) {
		border-color: var(--color--success);
		border-style: solid;
		cursor: grabbing;
		border-width: 1px;
		outline: none;
	}
}
</style>
