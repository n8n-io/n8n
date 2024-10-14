<script setup lang="ts">
import { ApplicationError, type INodeProperties, type NodePropertyAction } from 'n8n-workflow';
import type { INodeUi, IUpdateInformation } from '@/Interface';
import { ref, computed, onMounted } from 'vue';
import { N8nButton, N8nInput, N8nTooltip } from 'n8n-design-system/components';
import { useI18n } from '@/composables/useI18n';
import { useToast } from '@/composables/useToast';
import { useNDVStore } from '@/stores/ndv.store';
import { getSchemas, getParentNodes } from './utils';
import { useRootStore } from '@/stores/root.store';
import { useTelemetry } from '@/composables/useTelemetry';
import { generateCodeForPrompt } from '@/api/ai';

import { format } from 'prettier';
import jsParser from 'prettier/plugins/babel';
import * as estree from 'prettier/plugins/estree';
import { useSettingsStore } from '@/stores/settings.store';
import type { AskAiRequest } from '@/types/assistant.types';

const emit = defineEmits<{
	valueChanged: [value: IUpdateInformation];
}>();

const props = defineProps<{
	parameter: INodeProperties;
	value: string;
	path: string;
}>();

const rootStore = useRootStore();
const settingsStore = useSettingsStore();

const i18n = useI18n();

const isLoading = ref(false);
const prompt = ref(props.value);
const parentNodes = ref<INodeUi[]>([]);

const hasExecutionData = computed(() => (useNDVStore().ndvInputData || []).length > 0);
const hasInputField = computed(() => props.parameter.typeOptions?.buttonConfig?.hasInputField);
const inputFieldMaxLength = computed(
	() => props.parameter.typeOptions?.buttonConfig?.inputFieldMaxLength,
);
const buttonLabel = computed(
	() => props.parameter.typeOptions?.buttonConfig?.label ?? props.parameter.displayName,
);
const isSubmitEnabled = computed(() => {
	if (!hasExecutionData.value) return false;
	if (!prompt.value) return false;

	const maxlength = inputFieldMaxLength.value;
	if (maxlength && prompt.value.length > maxlength) return false;

	return true;
});

function startLoading() {
	isLoading.value = true;
}

function stopLoading() {
	setTimeout(() => {
		isLoading.value = false;
	}, 200);
}

function getPath(parameter: string) {
	return (props.path ? `${props.path}.` : '') + parameter;
}

async function onSubmit() {
	const { activeNode } = useNDVStore();
	const { showMessage } = useToast();
	const action: string | NodePropertyAction | undefined =
		props.parameter.typeOptions?.buttonConfig?.action;

	if (!action || !activeNode) return;

	if (typeof action === 'string') {
		switch (action) {
			default:
				return;
		}
	}

	emit('valueChanged', {
		name: getPath(props.parameter.name),
		value: prompt.value,
	});

	const { type, target } = action;

	startLoading();

	try {
		const schemas = getSchemas();

		const payload: AskAiRequest.RequestPayload = {
			question: prompt.value,
			context: {
				schema: schemas.parentNodesSchemas,
				inputSchema: schemas.inputSchema!,
				ndvPushRef: useNDVStore().pushRef,
				pushRef: rootStore.pushRef,
			},
			forNode: 'transform',
		};
		switch (type) {
			case 'askAiCodeGeneration':
				let value;
				if (settingsStore.isAskAiEnabled) {
					const { restApiContext } = useRootStore();
					const { code } = await generateCodeForPrompt(restApiContext, payload);
					value = code;
				} else {
					throw new ApplicationError('AI code generation is not enabled');
				}

				if (value === undefined) return;

				const formattedCode = await format(String(value), {
					parser: 'babel',
					plugins: [jsParser, estree],
				});

				const updateInformation = {
					name: getPath(target as string),
					value: formattedCode,
				};

				emit('valueChanged', updateInformation);

				useTelemetry().trackAiTransform('generationFinished', {
					prompt: prompt.value,
					code: formattedCode,
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
		useTelemetry().trackAiTransform('generationFinished', {
			prompt: prompt.value,
			code: '',
			hasError: true,
		});
		showMessage({
			type: 'error',
			title: i18n.baseText('codeNodeEditor.askAi.generationFailed'),
			message: error.message,
		});
		stopLoading();
	}
}

function onPromptInput(inputValue: string) {
	prompt.value = inputValue;
	emit('valueChanged', {
		name: getPath(props.parameter.name),
		value: inputValue,
	});
}

onMounted(() => {
	parentNodes.value = getParentNodes();
});
</script>

<template>
	<div>
		<n8n-input-label
			v-if="hasInputField"
			:label="i18n.nodeText().inputLabelDisplayName(parameter, path)"
			:tooltip-text="i18n.nodeText().inputLabelDescription(parameter, path)"
			:bold="false"
			size="small"
			color="text-dark"
		>
		</n8n-input-label>
		<div :class="$style.inputContainer" :hidden="!hasInputField">
			<div :class="$style.meta">
				<span
					v-if="inputFieldMaxLength"
					v-show="prompt.length > 1"
					:class="$style.counter"
					v-text="`${prompt.length} / ${inputFieldMaxLength}`"
				/>
			</div>
			<N8nInput
				v-model="prompt"
				:class="$style.input"
				style="border: 1px solid var(--color-foreground-base)"
				type="textarea"
				:rows="6"
				:maxlength="inputFieldMaxLength"
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
						:loading="isLoading"
						type="secondary"
						@click="onSubmit"
					>
						{{ buttonLabel }}
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
				</template>
			</N8nTooltip>
		</div>
	</div>
</template>

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
.inputContainer {
	position: relative;
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
