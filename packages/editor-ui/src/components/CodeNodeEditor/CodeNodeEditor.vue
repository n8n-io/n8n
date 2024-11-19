<script setup lang="ts">
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import type { LanguageSupport } from '@codemirror/language';
import type { Extension, Line } from '@codemirror/state';
import { Compartment, EditorState } from '@codemirror/state';
import type { ViewUpdate } from '@codemirror/view';
import { EditorView } from '@codemirror/view';
import type { CodeExecutionMode, CodeNodeEditorLanguage } from 'n8n-workflow';
import { format } from 'prettier';
import jsParser from 'prettier/plugins/babel';
import * as estree from 'prettier/plugins/estree';
import { type Ref, computed, nextTick, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue';

import { CODE_NODE_TYPE } from '@/constants';
import { codeNodeEditorEventBus } from '@/event-bus';
import { useRootStore } from '@/stores/root.store';

import { useMessage } from '@/composables/useMessage';
import AskAI from './AskAI/AskAI.vue';
import { readOnlyEditorExtensions, writableEditorExtensions } from './baseExtensions';
import { useCompleter } from './completer';
import { CODE_PLACEHOLDERS } from './constants';
import { useLinter } from './linter';
import { codeNodeEditorTheme } from './theme';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { dropInCodeEditor, mappingDropCursor } from '@/plugins/codemirror/dragAndDrop';
import { useSettingsStore } from '@/stores/settings.store';

type Props = {
	mode: CodeExecutionMode;
	modelValue: string;
	aiButtonEnabled?: boolean;
	fillParent?: boolean;
	language?: CodeNodeEditorLanguage;
	isReadOnly?: boolean;
	rows?: number;
};

const props = withDefaults(defineProps<Props>(), {
	aiButtonEnabled: false,
	fillParent: false,
	language: 'javaScript',
	isReadOnly: false,
	rows: 4,
});
const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();

const message = useMessage();
const editor = ref(null) as Ref<EditorView | null>;
const languageCompartment = ref(new Compartment());
const dragAndDropCompartment = ref(new Compartment());
const linterCompartment = ref(new Compartment());
const isEditorHovered = ref(false);
const isEditorFocused = ref(false);
const tabs = ref(['code', 'ask-ai']);
const activeTab = ref('code');
const hasChanges = ref(false);
const isLoadingAIResponse = ref(false);
const codeNodeEditorRef = ref<HTMLDivElement>();
const codeNodeEditorContainerRef = ref<HTMLDivElement>();

const { autocompletionExtension } = useCompleter(() => props.mode, editor);
const { createLinter } = useLinter(() => props.mode, editor);

const rootStore = useRootStore();
const i18n = useI18n();
const telemetry = useTelemetry();
const settingsStore = useSettingsStore();

onMounted(() => {
	if (!props.isReadOnly) codeNodeEditorEventBus.on('highlightLine', highlightLine);

	codeNodeEditorEventBus.on('codeDiffApplied', diffApplied);

	const { isReadOnly, language } = props;
	const extensions: Extension[] = [
		...readOnlyEditorExtensions,
		EditorState.readOnly.of(isReadOnly),
		EditorView.editable.of(!isReadOnly),
		codeNodeEditorTheme({
			isReadOnly,
			maxHeight: props.fillParent ? '100%' : '40vh',
			minHeight: '20vh',
			rows: props.rows,
		}),
	];

	if (!isReadOnly) {
		const linter = createLinter(language);
		if (linter) {
			extensions.push(linterCompartment.value.of(linter));
		}

		extensions.push(
			...writableEditorExtensions,
			dragAndDropCompartment.value.of(dragAndDropExtension.value),
			EditorView.domEventHandlers({
				focus: () => {
					isEditorFocused.value = true;
				},
				blur: () => {
					isEditorFocused.value = false;
				},
			}),

			EditorView.updateListener.of((viewUpdate) => {
				if (!viewUpdate.docChanged) return;

				trackCompletion(viewUpdate);

				const value = editor.value?.state.doc.toString();
				if (value) {
					emit('update:modelValue', value);
				}
				hasChanges.value = true;
			}),
		);
	}

	const [languageSupport, ...otherExtensions] = languageExtensions.value;
	extensions.push(languageCompartment.value.of(languageSupport), ...otherExtensions);

	const state = EditorState.create({
		doc: props.modelValue ?? placeholder.value,
		extensions,
	});

	editor.value = new EditorView({
		parent: codeNodeEditorRef.value,
		state,
	});

	// empty on first load, default param value
	if (!props.modelValue) {
		refreshPlaceholder();
		emit('update:modelValue', placeholder.value);
	}
});

onBeforeUnmount(() => {
	codeNodeEditorEventBus.off('codeDiffApplied', diffApplied);
	if (!props.isReadOnly) codeNodeEditorEventBus.off('highlightLine', highlightLine);
});

const askAiEnabled = computed(() => {
	return settingsStore.isAskAiEnabled && props.language === 'javaScript';
});

const placeholder = computed(() => {
	return CODE_PLACEHOLDERS[props.language]?.[props.mode] ?? '';
});

const dragAndDropEnabled = computed(() => {
	return !props.isReadOnly && props.mode === 'runOnceForEachItem';
});

const dragAndDropExtension = computed(() => (dragAndDropEnabled.value ? mappingDropCursor() : []));

// eslint-disable-next-line vue/return-in-computed-property
const languageExtensions = computed<[LanguageSupport, ...Extension[]]>(() => {
	switch (props.language) {
		case 'javaScript':
			return [javascript(), autocompletionExtension('javaScript')];
		case 'python':
			return [python(), autocompletionExtension('python')];
	}
});

watch(
	() => props.modelValue,
	(newValue) => {
		if (!editor.value) {
			return;
		}
		const current = editor.value.state.doc.toString();
		if (current === newValue) {
			return;
		}
		editor.value.dispatch({
			changes: { from: 0, to: getCurrentEditorContent().length, insert: newValue },
		});
	},
);

watch(
	() => props.mode,
	(_newMode, previousMode: CodeExecutionMode) => {
		reloadLinter();

		if (getCurrentEditorContent().trim() === CODE_PLACEHOLDERS[props.language]?.[previousMode]) {
			refreshPlaceholder();
		}
	},
);

watch(dragAndDropExtension, (extension) => {
	editor.value?.dispatch({
		effects: dragAndDropCompartment.value.reconfigure(extension),
	});
});

watch(
	() => props.language,
	(_newLanguage, previousLanguage: CodeNodeEditorLanguage) => {
		if (getCurrentEditorContent().trim() === CODE_PLACEHOLDERS[previousLanguage]?.[props.mode]) {
			refreshPlaceholder();
		}

		const [languageSupport] = languageExtensions.value;
		editor.value?.dispatch({
			effects: languageCompartment.value.reconfigure(languageSupport),
		});
		reloadLinter();
	},
);
watch(
	askAiEnabled,
	async (isEnabled) => {
		if (isEnabled && !props.modelValue) {
			emit('update:modelValue', placeholder.value);
		}
		await nextTick();
		hasChanges.value = props.modelValue !== placeholder.value;
	},
	{ immediate: true },
);

function getCurrentEditorContent() {
	return editor.value?.state.doc.toString() ?? '';
}

async function onBeforeTabLeave(_activeName: string, oldActiveName: string) {
	// Confirm dialog if leaving ask-ai tab during loading
	if (oldActiveName === 'ask-ai' && isLoadingAIResponse.value) {
		const confirmModal = await message.alert(i18n.baseText('codeNodeEditor.askAi.sureLeaveTab'), {
			title: i18n.baseText('codeNodeEditor.askAi.areYouSure'),
			confirmButtonText: i18n.baseText('codeNodeEditor.askAi.switchTab'),
			showClose: true,
			showCancelButton: true,
		});

		if (confirmModal === 'confirm') {
			return true;
		}

		return false;
	}

	return true;
}

async function onReplaceCode(code: string) {
	const formattedCode = await format(code, {
		parser: 'babel',
		plugins: [jsParser, estree],
	});

	editor.value?.dispatch({
		changes: { from: 0, to: getCurrentEditorContent().length, insert: formattedCode },
	});

	activeTab.value = 'code';
	hasChanges.value = false;
}

function onMouseOver(event: MouseEvent) {
	const fromElement = event.relatedTarget as HTMLElement;
	const containerRef = codeNodeEditorContainerRef.value;

	if (!containerRef?.contains(fromElement)) isEditorHovered.value = true;
}

function onMouseOut(event: MouseEvent) {
	const fromElement = event.relatedTarget as HTMLElement;
	const containerRef = codeNodeEditorContainerRef.value;

	if (!containerRef?.contains(fromElement)) isEditorHovered.value = false;
}

function reloadLinter() {
	if (!editor.value) return;

	const linter = createLinter(props.language);
	if (linter) {
		editor.value.dispatch({
			effects: linterCompartment.value.reconfigure(linter),
		});
	}
}

function refreshPlaceholder() {
	if (!editor.value) return;

	editor.value.dispatch({
		changes: { from: 0, to: getCurrentEditorContent().length, insert: placeholder.value },
	});
}

function getLine(lineNumber: number): Line | null {
	try {
		return editor.value?.state.doc.line(lineNumber) ?? null;
	} catch {
		return null;
	}
}

function diffApplied() {
	codeNodeEditorContainerRef.value?.classList.add('flash-editor');
	codeNodeEditorContainerRef.value?.addEventListener('animationend', () => {
		codeNodeEditorContainerRef.value?.classList.remove('flash-editor');
	});
}

function highlightLine(lineNumber: number | 'final') {
	if (!editor.value) return;

	if (lineNumber === 'final') {
		editor.value.dispatch({
			selection: { anchor: (props.modelValue ?? getCurrentEditorContent()).length },
		});
		return;
	}

	const line = getLine(lineNumber);

	if (!line) return;

	editor.value.dispatch({
		selection: { anchor: line.from },
	});
}

function trackCompletion(viewUpdate: ViewUpdate) {
	const completionTx = viewUpdate.transactions.find((tx) => tx.isUserEvent('input.complete'));

	if (!completionTx) return;

	try {
		// @ts-expect-error - undocumented fields
		const { fromA, toB } = viewUpdate?.changedRanges[0];
		const full = getCurrentEditorContent().slice(fromA, toB);
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

function onAiLoadStart() {
	isLoadingAIResponse.value = true;
}

function onAiLoadEnd() {
	isLoadingAIResponse.value = false;
}

async function onDrop(value: string, event: MouseEvent) {
	if (!editor.value) return;

	await dropInCodeEditor(toRaw(editor.value), event, value);
}
</script>

<template>
	<div
		ref="codeNodeEditorContainerRef"
		:class="['code-node-editor', $style['code-node-editor-container'], language]"
		@mouseover="onMouseOver"
		@mouseout="onMouseOut"
	>
		<el-tabs
			v-if="askAiEnabled"
			ref="tabs"
			v-model="activeTab"
			type="card"
			:before-leave="onBeforeTabLeave"
			:class="$style.tabs"
		>
			<el-tab-pane
				:label="i18n.baseText('codeNodeEditor.tabs.code')"
				name="code"
				data-test-id="code-node-tab-code"
				:class="$style.fillHeight"
			>
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
								'code-editor-tabs',
								$style.editorInput,
								$style.fillHeight,
								{ [$style.activeDrop]: activeDrop, [$style.droppable]: droppable },
							]"
						/>
					</template>
				</DraggableTarget>
				<slot name="suffix" />
			</el-tab-pane>
			<el-tab-pane
				:label="i18n.baseText('codeNodeEditor.tabs.askAi')"
				name="ask-ai"
				data-test-id="code-node-tab-ai"
			>
				<!-- Key the AskAI tab to make sure it re-mounts when changing tabs -->
				<AskAI
					:key="activeTab"
					:has-changes="hasChanges"
					@replace-code="onReplaceCode"
					@started-loading="onAiLoadStart"
					@finished-loading="onAiLoadEnd"
				/>
			</el-tab-pane>
		</el-tabs>
		<!-- If AskAi not enabled, there's no point in rendering tabs -->
		<div v-else :class="$style.fillHeight">
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
:deep(.el-tabs) {
	.cm-editor {
		border: 0;
	}
}

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
.tabs {
	height: 100%;
	display: flex;
	flex-direction: column;
}

.code-node-editor-container {
	position: relative;
}

.fillHeight {
	height: 100%;
}

.editorInput.droppable {
	:global(.cm-editor) {
		border-color: var(--color-ndv-droppable-parameter);
		border-style: dashed;
		border-width: 1.5px;
	}
}

.editorInput.activeDrop {
	:global(.cm-editor) {
		border-color: var(--color-success);
		border-style: solid;
		cursor: grabbing;
		border-width: 1px;
	}
}
</style>
