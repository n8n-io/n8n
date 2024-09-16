<script setup lang="ts">
import type { ViewUpdate } from '@codemirror/view';
import type { CodeExecutionMode, CodeNodeEditorLanguage } from 'n8n-workflow';
import { format } from 'prettier';
import jsParser from 'prettier/plugins/babel';
import * as estree from 'prettier/plugins/estree';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { CODE_NODE_TYPE } from '@/constants';
import { codeNodeEditorEventBus } from '@/event-bus';
import { useRootStore } from '@/stores/root.store';
import { usePostHog } from '@/stores/posthog.store';

import { useMessage } from '@/composables/useMessage';
import AskAI from './AskAI/AskAI.vue';
import { CODE_PLACEHOLDERS } from './constants';
import { useLinter } from './linter';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { useCodeEditor } from '@/composables/useCodeEditor';

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
const tabs = ref(['code', 'ask-ai']);
const activeTab = ref('code');
const isLoadingAIResponse = ref(false);
const codeNodeEditorRef = ref<HTMLDivElement>();
const codeNodeEditorContainerRef = ref<HTMLDivElement>();

const linter = useLinter(
	() => props.mode,
	() => props.language,
	editor,
);

const rootStore = useRootStore();
const posthog = usePostHog();
const i18n = useI18n();
const telemetry = useTelemetry();

const extensions = computed(() => [linter.value]);

const {} = useCodeEditor({
	editorRef: codeNodeEditorRef.value,
	language: () => props.language,
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
});

onMounted(() => {
	if (!props.isReadOnly) codeNodeEditorEventBus.on('error-line-number', highlightLine);
	codeNodeEditorEventBus.on('codeDiffApplied', diffApplied);
});

onBeforeUnmount(() => {
	codeNodeEditorEventBus.off('codeDiffApplied', diffApplied);
	if (!props.isReadOnly) codeNodeEditorEventBus.off('highlightLine', highlightLine);
});

const aiEnabled = computed(() => {
	return posthog.isAiEnabled() && props.language === 'javaScript';
});

const placeholder = computed(() => CODE_PLACEHOLDERS[props.language]?.[props.mode] ?? '');

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

watch(
	aiEnabled,
	async (isEnabled) => {
		if (isEnabled && !props.modelValue) {
			emit('update:modelValue', placeholder.value);
		}
		await nextTick();
		hasChanges.value = props.modelValue !== placeholder.value;
	},
	{ immediate: true },
);

async function onBeforeTabLeave(_activeName: string, oldActiveName: string) {
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

function onEditorUpdate(viewUpdate: ViewUpdate) {
	trackCompletion(viewUpdate);

	const value = readEditorValue();
	if (value) {
		emit('update:modelValue', value);
	}
}

function refreshPlaceholder() {
	if (!editor.value) return;

	editor.value.dispatch({
		changes: { from: 0, to: getCurrentEditorContent().length, insert: placeholder.value },
	});
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
</script>

<template>
	<div
		ref="codeNodeEditorContainerRef"
		:class="['code-node-editor', $style['code-node-editor-container'], language]"
		@mouseover="onMouseOver"
		@mouseout="onMouseOut"
	>
		<el-tabs
			v-if="aiEnabled"
			ref="tabs"
			v-model="activeTab"
			type="card"
			:before-leave="onBeforeTabLeave"
		>
			<el-tab-pane
				:label="$locale.baseText('codeNodeEditor.tabs.code')"
				name="code"
				data-test-id="code-node-tab-code"
			>
				<div
					ref="codeNodeEditorRef"
					:class="['ph-no-capture', 'code-editor-tabs', $style.editorInput]"
				/>
				<slot name="suffix" />
			</el-tab-pane>
			<el-tab-pane
				:label="$locale.baseText('codeNodeEditor.tabs.askAi')"
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
			<div ref="codeNodeEditorRef" :class="['ph-no-capture', $style.fillHeight]" />
			<slot name="suffix" />
		</div>
	</div>
</template>

<style scoped lang="scss">
:deep(.el-tabs) {
	.code-editor-tabs .cm-editor {
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
.code-node-editor-container {
	position: relative;
}

.fillHeight {
	height: 100%;
}
</style>
