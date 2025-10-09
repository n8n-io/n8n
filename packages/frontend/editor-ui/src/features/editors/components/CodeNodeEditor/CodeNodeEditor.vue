<script setup lang="ts">
import type { ViewUpdate } from '@codemirror/view';
import type { CodeExecutionMode, CodeNodeEditorLanguage } from 'n8n-workflow';
import { format } from 'prettier';
import jsParser from 'prettier/plugins/babel';
import * as estree from 'prettier/plugins/estree';
import { computed, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue';

import { CODE_NODE_TYPE } from '@/constants';
import { codeNodeEditorEventBus } from '@/event-bus';
import { useRootStore } from '@n8n/stores/useRootStore';

import { useCodeEditor } from '../../composables/useCodeEditor';
import { useI18n } from '@n8n/i18n';
import { useMessage } from '@/composables/useMessage';
import { useTelemetry } from '@/composables/useTelemetry';
import AskAI from './AskAI/AskAI.vue';
import { CODE_PLACEHOLDERS } from './constants';
import { useLinter } from './linter';
import { useSettingsStore } from '@/stores/settings.store';
import { dropInCodeEditor } from '../../plugins/codemirror/dragAndDrop';
import type { TargetNodeParameterContext } from '@/Interface';
import { valueToInsert } from './utils';
import DraggableTarget from '@/components/DraggableTarget.vue';

import { ElTabPane, ElTabs } from 'element-plus';
export type CodeNodeLanguageOption = CodeNodeEditorLanguage | 'pythonNative';

type Props = {
	mode: CodeExecutionMode;
	modelValue: string;
	aiButtonEnabled?: boolean;
	fillParent?: boolean;
	language?: CodeNodeLanguageOption;
	isReadOnly?: boolean;
	rows?: number;
	id?: string;
	targetNodeParameterContext?: TargetNodeParameterContext;
	disableAskAi?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	aiButtonEnabled: false,
	fillParent: false,
	language: 'javaScript',
	isReadOnly: false,
	rows: 4,
	id: () => crypto.randomUUID(),
	targetNodeParameterContext: undefined,
	disableAskAi: false,
});
const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();

const message = useMessage();
const tabs = ref(['code', 'ask-ai']);
const activeTab = ref('code');
const isLoadingAIResponse = ref(false);
const codeNodeEditorRef = ref<HTMLDivElement>();
const codeNodeEditorContainerRef = ref<HTMLDivElement>();
const hasManualChanges = ref(false);

const rootStore = useRootStore();
const i18n = useI18n();
const telemetry = useTelemetry();
const settingsStore = useSettingsStore();

const linter = useLinter(
	() => props.mode,
	() => (props.language === 'pythonNative' ? 'python' : props.language),
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

const askAiEnabled = computed(() => {
	return !props.disableAskAi && settingsStore.isAskAiEnabled && props.language === 'javaScript';
});

watch([() => props.language, () => props.mode], (_, [prevLanguage, prevMode]) => {
	if (readEditorValue().trim() === CODE_PLACEHOLDERS[prevLanguage]?.[prevMode]) {
		emit('update:modelValue', placeholder.value);
	}
});

async function onBeforeTabLeave(_activeName: string | number, oldActiveName: string | number) {
	// Confirm dialog if leaving ask-ai tab during loading
	if (oldActiveName === 'ask-ai' && isLoadingAIResponse.value) {
		const confirmModal = await message.alert(i18n.baseText('codeNodeEditor.askAi.sureLeaveTab'), {
			title: i18n.baseText('codeNodeEditor.askAi.areYouSure'),
			confirmButtonText: i18n.baseText('codeNodeEditor.askAi.switchTab'),
			showClose: true,
			showCancelButton: true,
		});

		return confirmModal === 'confirm';
	}

	return true;
}

async function onAiReplaceCode(code: string) {
	const formattedCode = await format(code, {
		parser: 'babel',
		plugins: [jsParser, estree],
	});

	emit('update:modelValue', formattedCode);

	activeTab.value = 'code';
	hasManualChanges.value = false;
}

function onEditorUpdate(viewUpdate: ViewUpdate) {
	trackCompletion(viewUpdate);
	hasManualChanges.value = true;
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

function onAiLoadStart() {
	isLoadingAIResponse.value = true;
}

function onAiLoadEnd() {
	isLoadingAIResponse.value = false;
}

async function onDrop(value: string, event: MouseEvent) {
	if (!editor.value) return;

	await dropInCodeEditor(
		toRaw(editor.value),
		event,
		valueToInsert(value, props.language, props.mode),
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
		<ElTabs
			v-if="askAiEnabled"
			ref="tabs"
			v-model="activeTab"
			type="card"
			:before-leave="onBeforeTabLeave"
			:class="$style.tabs"
		>
			<ElTabPane
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
			</ElTabPane>
			<ElTabPane
				:label="i18n.baseText('codeNodeEditor.tabs.askAi')"
				name="ask-ai"
				data-test-id="code-node-tab-ai"
			>
				<!-- Key the AskAI tab to make sure it re-mounts when changing tabs -->
				<AskAI
					:key="activeTab"
					:has-changes="hasManualChanges"
					:is-read-only="props.isReadOnly"
					@replace-code="onAiReplaceCode"
					@started-loading="onAiLoadStart"
					@finished-loading="onAiLoadEnd"
				/>
			</ElTabPane>
		</ElTabs>
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
		border-color: var(--color--success);
		border-style: solid;
		cursor: grabbing;
		border-width: 1px;
	}
}
</style>
