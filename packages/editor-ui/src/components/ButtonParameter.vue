<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { snakeCase } from 'lodash-es';
import { useSessionStorage } from '@vueuse/core';

import { N8nButton, N8nInput, N8nTooltip } from 'n8n-design-system/components';
import { randomInt } from 'n8n-workflow';
import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';

import type { INodeUi, Schema } from '@/Interface';
import { generateCodeForPrompt } from '@/api/ai';
import { useDataSchema } from '@/composables/useDataSchema';
import { useI18n } from '@/composables/useI18n';
import { useNDVStore } from '@/stores/ndv.store';
import { useToast } from '@/composables/useToast';
import { useRootStore } from '@/stores/root.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { executionDataToJson } from '@/utils/nodeTypesUtils';
import { ASK_AI_LOADING_DURATION_MS } from '@/constants';

const emit = defineEmits<{
	submit: [code: string];
	replaceCode: [code: string];
	startedLoading: [];
	finishedLoading: [];
}>();

const props = defineProps<{
	parameter: INodeProperties;
	value: string;
	path: string;
}>();

const { getSchemaForExecutionData, getInputDataWithPinned } = useDataSchema();
const i18n = useI18n();

const loadingPhraseIndex = ref(0);
const loaderProgress = ref(0);

const isLoading = ref(false);
const prompt = ref('');
const parentNodes = ref<INodeUi[]>([]);

const isSubmitEnabled = computed(() => {
	if (!hasExecutionData.value) return false;
	if (
		props.parameter.typeOptions?.buttonInputFieldMaxLength &&
		prompt.value.length > props.parameter.typeOptions.buttonInputFieldMaxLength
	) {
		return false;
	}

	return true;
});
const hasExecutionData = computed(() => (useNDVStore().ndvInputData || []).length > 0);

function getParentNodes() {
	const activeNode = useNDVStore().activeNode;
	const { getCurrentWorkflow, getNodeByName } = useWorkflowsStore();
	const workflow = getCurrentWorkflow();

	if (!activeNode || !workflow) return [];

	return workflow
		.getParentNodesByDepth(activeNode?.name)
		.filter(({ name }, i, nodes) => {
			return name !== activeNode.name && nodes.findIndex((node) => node.name === name) === i;
		})
		.map((n) => getNodeByName(n.name))
		.filter((n) => n !== null) as INodeUi[];
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

	const inputSchema = parentNodesSchemas.shift();

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
	if (!activeNode) return;
	const schemas = getSchemas();

	startLoading();

	const rootStore = useRootStore();

	try {
		const version = rootStore.versionCli;
		const model = 'gpt-3.5-turbo-16k';

		const { code } = await generateCodeForPrompt(restApiContext, {
			question: prompt.value,
			context: {
				schema: schemas.parentNodesSchemas,
				inputSchema: schemas.inputSchema!,
				ndvPushRef: useNDVStore().pushRef,
				pushRef: rootStore.pushRef,
			},
			model,
			n8nVersion: version,
		});

		stopLoading();
		emit('replaceCode', code);
		showMessage({
			type: 'success',
			title: i18n.baseText('codeNodeEditor.askAi.generationCompleted'),
		});
	} catch (error) {
		showMessage({
			type: 'error',
			title: i18n.baseText('codeNodeEditor.askAi.generationFailed'),
			message: error.message,
		});
		stopLoading();
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
		<p
			:class="$style.intro"
			v-text="parameter.displayName"
			:hidden="!parameter.typeOptions?.buttonHasInputField"
		/>
		<div :class="$style.inputContainer" :hidden="!parameter.typeOptions?.buttonHasInputField">
			<div :class="$style.meta">
				<span
					v-if="parameter.typeOptions?.buttonInputFieldMaxLength"
					v-show="prompt.length > 1"
					:class="$style.counter"
					v-text="`${prompt.length} / ${parameter.typeOptions?.buttonInputFieldMaxLength}`"
				/>
			</div>
			<N8nInput
				v-model="prompt"
				:class="$style.input"
				style="border: 1px solid var(--color-foreground-base)"
				type="textarea"
				:rows="6"
				:maxlength="parameter.typeOptions?.buttonInputFieldMaxLength"
				:placeholder="parameter.placeholder"
				@input="onPromptInput"
			/>
		</div>
		<div :class="$style.controls">
			<div v-if="isLoading" :class="$style.loader">
				<n8n-circle-loader :radius="8" :progress="loaderProgress" :stroke-width="3" />
			</div>
			<N8nTooltip v-else :disabled="isSubmitEnabled">
				<div>
					<N8nButton :disabled="!isSubmitEnabled" size="small" @click="onSubmit">
						{{ parameter.typeOptions?.buttonLabel ?? parameter.displayName }}
					</N8nButton>
				</div>
				<template #content>
					<span
						v-if="!hasExecutionData"
						v-text="i18n.baseText('codeNodeEditor.askAi.noInputData')"
					/>
					<span
						v-else-if="prompt.length === 0"
						v-text="i18n.baseText('codeNodeEditor.askAi.noPrompt')"
					/>
					<span
						v-else-if="prompt.length < 15"
						v-text="
							i18n.baseText('codeNodeEditor.askAi.promptTooShort', {
								interpolate: { minLength: '15' },
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
}
.input textarea {
	font-size: var(--font-size-2xs);
	padding-bottom: var(--spacing-2xl);
	font-family: var(--font-family);
	resize: none;
}
.intro {
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-2xs);
	color: var(--color-text-dark);
	padding: var(--spacing-2xs) 0 0;
}
.loader {
	font-size: var(--font-size-2xs);
	color: var(--color-text-dark);
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
}
.inputContainer {
	position: relative;
}
.help {
	text-decoration: underline;
	margin-left: auto;
	color: #909399;
}
.meta {
	display: flex;
	justify-content: space-between;
	position: absolute;
	bottom: var(--spacing-2xs);
	left: var(--spacing-xs);
	right: var(--spacing-xs);
	z-index: 1;

	* {
		font-size: var(--font-size-2xs);
		line-height: 1;
	}
}
.counter {
	color: var(--color-text-light);
}
.controls {
	padding: var(--spacing-2xs) 0;
	display: flex;
	justify-content: flex-end;
}
</style>
