<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import snakeCase from 'lodash/snakeCase';
import { useSessionStorage } from '@vueuse/core';

import { N8nButton, N8nCircleLoader, N8nIcon, N8nInput, N8nTooltip } from '@n8n/design-system';
import { randomInt } from 'n8n-workflow';
import type { CodeExecutionMode, INodeExecutionData } from 'n8n-workflow';

import type { BaseTextKey } from '@n8n/i18n';
import type { INodeUi, Schema } from '@/Interface';
import { generateCodeForPrompt } from '@/api/ai';
import { useTelemetry } from '@/composables/useTelemetry';
import { useDataSchema } from '@/composables/useDataSchema';
import { useI18n } from '@n8n/i18n';
import { useMessage } from '@/composables/useMessage';
import { useToast } from '@/composables/useToast';
import { useNDVStore } from '@/stores/ndv.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { executionDataToJson } from '@/utils/nodeTypesUtils';
import {
	ASK_AI_MAX_PROMPT_LENGTH,
	ASK_AI_MIN_PROMPT_LENGTH,
	ASK_AI_LOADING_DURATION_MS,
} from '@/constants';
import type { AskAiRequest } from '@/features/assistant/assistant.types';
const emit = defineEmits<{
	submit: [code: string];
	replaceCode: [code: string];
	startedLoading: [];
	finishedLoading: [];
}>();

const props = withDefaults(
	defineProps<{
		hasChanges: boolean;
		isReadOnly?: boolean;
	}>(),
	{
		isReadOnly: false,
	},
);

const { getSchemaForExecutionData, getInputDataWithPinned } = useDataSchema();
const i18n = useI18n();

const loadingPhraseIndex = ref(0);
const loaderProgress = ref(0);

const isLoading = ref(false);
const prompt = ref('');
const parentNodes = ref<INodeUi[]>([]);

const isSubmitEnabled = computed(() => {
	return (
		!isEachItemMode.value &&
		prompt.value.length >= ASK_AI_MIN_PROMPT_LENGTH &&
		hasExecutionData.value
	);
});
const hasExecutionData = computed(
	() => (useNDVStore().ndvInputDataWithPinnedData || []).length > 0,
);
const loadingString = computed(() =>
	i18n.baseText(`codeNodeEditor.askAi.loadingPhrase${loadingPhraseIndex.value}` as BaseTextKey),
);
const isEachItemMode = computed(() => {
	const mode = useNDVStore().activeNode?.parameters.mode as CodeExecutionMode;

	return mode === 'runOnceForEachItem';
});

function getErrorMessageByStatusCode(statusCode: number, message: string | undefined): string {
	const errorMessages: Record<number, string> = {
		[413]: i18n.baseText('codeNodeEditor.askAi.generationFailedTooLarge'),
		[400]: i18n.baseText('codeNodeEditor.askAi.generationFailedUnknown'),
		[429]: i18n.baseText('codeNodeEditor.askAi.generationFailedRate'),
		[500]: message
			? i18n.baseText('codeNodeEditor.askAi.generationFailedWithReason', {
					interpolate: {
						error: message,
					},
				})
			: i18n.baseText('codeNodeEditor.askAi.generationFailedUnknown'),
	};

	return errorMessages[statusCode] || i18n.baseText('codeNodeEditor.askAi.generationFailedUnknown');
}

function getParentNodes() {
	const activeNode = useNDVStore().activeNode;
	const { workflowObject, getNodeByName } = useWorkflowsStore();

	if (!activeNode || !workflowObject) return [];

	return workflowObject
		.getParentNodesByDepth(activeNode?.name)
		.filter(({ name }, i, nodes) => {
			return name !== activeNode.name && nodes.findIndex((node) => node.name === name) === i;
		})
		.map((n) => getNodeByName(n.name))
		.filter((n) => n !== null);
}

function getSchemas() {
	const parentNodesNames = parentNodes.value.map((node) => node?.name);
	const parentNodesSchemas: Array<{ nodeName: string; schema: Schema }> = parentNodes.value
		.map((node) => {
			const inputData: INodeExecutionData[] = getInputDataWithPinned(node);

			return {
				nodeName: node?.name || '',
				schema: getSchemaForExecutionData(executionDataToJson(inputData), true),
			};
		})
		.filter((node) => node.schema?.value.length > 0);

	// Account for empty objects
	const inputSchema = parentNodesSchemas.shift() ?? {
		nodeName: parentNodesNames[0] ?? '',
		schema: { path: '', type: 'undefined', value: '' },
	};

	return {
		parentNodesNames,
		inputSchema,
		parentNodesSchemas,
	};
}

function startLoading() {
	emit('startedLoading');
	loaderProgress.value = 0;
	isLoading.value = true;

	triggerLoadingChange();
}

function stopLoading() {
	loaderProgress.value = 100;
	emit('finishedLoading');

	setTimeout(() => {
		isLoading.value = false;
	}, 200);
}

async function onSubmit() {
	const { restApiContext } = useRootStore();
	const { activeNode } = useNDVStore();
	const { showMessage } = useToast();
	const { alert } = useMessage();
	if (!activeNode) return;
	const schemas = getSchemas();

	if (props.hasChanges) {
		const confirmModal = await alert(i18n.baseText('codeNodeEditor.askAi.areYouSureToReplace'), {
			title: i18n.baseText('codeNodeEditor.askAi.replaceCurrentCode'),
			confirmButtonText: i18n.baseText('codeNodeEditor.askAi.generateCodeAndReplace'),
			showClose: true,
			showCancelButton: true,
		});

		if (confirmModal === 'cancel') {
			return;
		}
	}

	startLoading();

	const rootStore = useRootStore();

	const payload: AskAiRequest.RequestPayload = {
		question: prompt.value,
		context: {
			schema: schemas.parentNodesSchemas,
			inputSchema: schemas.inputSchema,
			ndvPushRef: useNDVStore().pushRef,
			pushRef: rootStore.pushRef,
		},
		forNode: 'code',
	};

	try {
		const { code } = await generateCodeForPrompt(restApiContext, payload);

		stopLoading();
		emit('replaceCode', code);
		showMessage({
			type: 'success',
			title: i18n.baseText('codeNodeEditor.askAi.generationCompleted'),
		});
		useTelemetry().trackAskAI('askAi.generationFinished', {
			prompt: prompt.value,
			code,
		});
	} catch (error) {
		showMessage({
			type: 'error',
			title: i18n.baseText('codeNodeEditor.askAi.generationFailed'),
			message: getErrorMessageByStatusCode(
				error.httpStatusCode || error?.response.status,
				error?.message,
			),
		});
		stopLoading();
		useTelemetry().trackAskAI('askAi.generationFinished', {
			prompt: prompt.value,
			code: '',
			hasError: true,
		});
	}
}
function triggerLoadingChange() {
	const loadingPhraseUpdateMs = 2000;
	const loadingPhrasesCount = 8;
	let start: number | null = null;
	let lastPhraseChange = 0;
	const step = (timestamp: number) => {
		if (!start) start = timestamp;

		// Loading phrase change
		if (!lastPhraseChange || timestamp - lastPhraseChange >= loadingPhraseUpdateMs) {
			loadingPhraseIndex.value = randomInt(loadingPhrasesCount);
			lastPhraseChange = timestamp;
		}

		// Loader progress change
		const elapsed = timestamp - start;
		loaderProgress.value = Math.min((elapsed / ASK_AI_LOADING_DURATION_MS) * 100, 100);

		if (!isLoading.value) return;
		if (loaderProgress.value < 100 || lastPhraseChange + loadingPhraseUpdateMs > timestamp) {
			window.requestAnimationFrame(step);
		}
	};

	window.requestAnimationFrame(step);
}

function getSessionStoragePrompt() {
	const codeNodeName = (useNDVStore().activeNode?.name as string) ?? '';
	const hashedCode = snakeCase(codeNodeName);

	return useSessionStorage(`ask_ai_prompt__${hashedCode}`, '');
}

function onPromptInput(inputValue: string) {
	getSessionStoragePrompt().value = inputValue;
}

onMounted(() => {
	// Restore prompt from session storage(with empty string fallback)
	prompt.value = getSessionStoragePrompt().value;
	parentNodes.value = getParentNodes();
});
</script>

<template>
	<div>
		<p :class="$style.intro" v-text="i18n.baseText('codeNodeEditor.askAi.intro')" />
		<div :class="$style.inputContainer">
			<N8nInput
				v-model="prompt"
				:class="$style.input"
				type="textarea"
				:rows="6"
				:maxlength="ASK_AI_MAX_PROMPT_LENGTH"
				:placeholder="i18n.baseText('codeNodeEditor.askAi.placeholder')"
				data-test-id="ask-ai-prompt-input"
				:readonly="props.isReadOnly"
				@input="onPromptInput"
			/>
			<div :class="$style.meta">
				<span
					v-show="prompt.length > 1"
					:class="$style.counter"
					data-test-id="ask-ai-prompt-counter"
					v-text="`${prompt.length} / ${ASK_AI_MAX_PROMPT_LENGTH}`"
				/>
				<a href="https://docs.n8n.io/code-examples/ai-code" target="_blank" :class="$style.help">
					<N8nIcon icon="circle-help" color="text-light" size="large" />{{
						i18n.baseText('codeNodeEditor.askAi.help')
					}}
				</a>
			</div>
		</div>
		<div :class="$style.controls">
			<div v-if="isLoading" :class="$style.loader">
				<Transition name="text-fade-in-out" mode="out-in">
					<div :key="loadingPhraseIndex" v-text="loadingString" />
				</Transition>
				<N8nCircleLoader :radius="8" :progress="loaderProgress" :stroke-width="3" />
			</div>
			<N8nTooltip v-else :disabled="isSubmitEnabled">
				<div>
					<N8nButton
						:disabled="!isSubmitEnabled"
						size="small"
						data-test-id="ask-ai-cta"
						@click="onSubmit"
					>
						{{ i18n.baseText('codeNodeEditor.askAi.generateCode') }}
					</N8nButton>
				</div>
				<template #content>
					<span
						v-if="!hasExecutionData"
						data-test-id="ask-ai-cta-tooltip-no-input-data"
						v-text="i18n.baseText('codeNodeEditor.askAi.noInputData')"
					/>
					<span
						v-else-if="prompt.length === 0"
						data-test-id="ask-ai-cta-tooltip-no-prompt"
						v-text="i18n.baseText('codeNodeEditor.askAi.noPrompt')"
					/>
					<span
						v-else-if="isEachItemMode"
						data-test-id="ask-ai-cta-tooltip-only-all-items-mode"
						v-text="i18n.baseText('codeNodeEditor.askAi.onlyAllItemsMode')"
					/>
					<span
						v-else-if="prompt.length < ASK_AI_MIN_PROMPT_LENGTH"
						data-test-id="ask-ai-cta-tooltip-prompt-too-short"
						v-text="
							i18n.baseText('codeNodeEditor.askAi.promptTooShort', {
								interpolate: { minLength: ASK_AI_MIN_PROMPT_LENGTH.toString() },
							})
						"
					/>
				</template>
			</N8nTooltip>
		</div>
	</div>
</template>

<style scoped>
.text-fade-in-out-enter-active,
.text-fade-in-out-leave-active {
	transition:
		opacity 0.5s ease-in-out,
		transform 0.5s ease-in-out;
}
.text-fade-in-out-enter,
.text-fade-in-out-leave-to {
	opacity: 0;
	transform: translateX(10px);
}
.text-fade-in-out-enter-to,
.text-fade-in-out-leave {
	opacity: 1;
}
</style>

<style module lang="scss">
.input * {
	border: 0 !important;
	border-radius: 0 !important;
}
.input textarea {
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	resize: none;

	/* Custom scrollbar */
	&::-webkit-scrollbar {
		width: 4px;
	}
	&::-webkit-scrollbar-track {
		background: transparent;
	}
	&::-webkit-scrollbar-thumb {
		background: var(--color--foreground);
		border-radius: 2px;
	}
	&::-webkit-scrollbar-thumb:hover {
		background: var(--color--foreground--shade-1);
	}
}
.intro {
	font-weight: var(--font-weight--bold);
	font-size: var(--font-size--2xs);
	color: var(--color--text--shade-1);
	padding: var(--spacing--2xs) var(--spacing--xs) 0;
}
.loader {
	font-size: var(--font-size--2xs);
	color: var(--color--text--shade-1);
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
.inputContainer {
	position: relative;
}
.help {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	text-decoration: underline;
	margin-left: auto;
	color: #909399;
}
.meta {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing--2xs) var(--spacing--xs);
	background-color: var(--color--foreground--tint-2);
	border-top: 1px solid var(--border-color);

	* {
		font-size: var(--font-size--2xs);
		line-height: 1;
	}
}
.counter {
	color: var(--color--text--tint-1);
}
.controls {
	padding: var(--spacing--2xs) var(--spacing--xs);
	display: flex;
	justify-content: flex-end;
	border-top: 1px solid var(--border-color);
}
</style>
