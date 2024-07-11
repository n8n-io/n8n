<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { snakeCase } from 'lodash-es';
import { useSessionStorage } from '@vueuse/core';

import { N8nButton, N8nInput, N8nTooltip } from 'n8n-design-system/components';
import { randomInt } from 'n8n-workflow';
import type { INodeProperties, NodePropertyAction } from 'n8n-workflow';

import type { INodeUi, IUpdateInformation } from '@/Interface';

import { useI18n } from '@/composables/useI18n';
import { useNDVStore } from '@/stores/ndv.store';
import { useToast } from '@/composables/useToast';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';

import { ASK_AI_LOADING_DURATION_MS } from '@/constants';

const emit = defineEmits<{
	submit: [code: string];
	valueChanged: [value: IUpdateInformation];
	startedLoading: [];
	finishedLoading: [];
}>();

const props = defineProps<{
	parameter: INodeProperties;
	value: string;
	path: string;
}>();

const nodeTypesStore = useNodeTypesStore();

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
	const { activeNode } = useNDVStore();
	const { showMessage } = useToast();
	const action: string | NodePropertyAction | undefined = props.parameter.typeOptions?.action;

	if (!action || !activeNode) return;

	if (typeof action === 'string') {
		switch (action) {
			default:
				return;
		}
	}

	emit('valueChanged', {
		name: ((props.path ? `${props.path}.` : '') + props.parameter.name) as string,
		value: prompt.value,
	});

	const { type, handler, target } = action;

	startLoading();

	try {
		const currentNodeParameters = activeNode.parameters;
		const actionResult = await nodeTypesStore.getNodeParameterActionResult({
			nodeTypeAndVersion: {
				name: activeNode.type,
				version: activeNode.typeVersion,
			},
			path: props.path,
			currentNodeParameters,
			credentials: activeNode.credentials,
			handler,
			payload: prompt.value,
		});

		if (actionResult === undefined) return;

		switch (type) {
			case 'updateProperty':
				//TODO: code editor does not displays updated value, needs to be closed and reopened
				emit('valueChanged', {
					name: ((props.path ? `${props.path}.` : '') + target) as string,
					value: actionResult,
				});
				break;
			default:
				return;
		}

		showMessage({
			type: 'success',
			title: i18n.baseText('codeNodeEditor.askAi.generationCompleted'),
		});

		stopLoading();
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
			<N8nTooltip :disabled="isSubmitEnabled">
				<div>
					<N8nButton
						:disabled="!isSubmitEnabled"
						size="small"
						@click="onSubmit"
						:loading="isLoading"
					>
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
