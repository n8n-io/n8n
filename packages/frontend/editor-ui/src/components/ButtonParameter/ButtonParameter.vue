<script setup lang="ts">
import { type INodeProperties, type NodePropertyAction } from 'n8n-workflow';
import type { INodeUi, IUpdateInformation } from '@/Interface';
import { ref, computed, onMounted } from 'vue';
import { N8nButton, N8nInput, N8nTooltip } from '@n8n/design-system/components';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import { useNDVStore } from '@/stores/ndv.store';
import {
	getParentNodes,
	generateCodeForAiTransform,
	type TextareaRowData,
	getUpdatedTextareaValue,
	getTextareaCursorPosition,
} from './utils';
import { useTelemetry } from '@/composables/useTelemetry';

import { propertyNameFromExpression } from '../../utils/mappingUtils';

const AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT = 'codeGeneratedForPrompt';

const emit = defineEmits<{
	valueChanged: [value: IUpdateInformation];
}>();

export type Props = {
	parameter: INodeProperties;
	value: string;
	path: string;
	isReadOnly?: boolean;
};
const props = defineProps<Props>();

const ndvStore = useNDVStore();
const activeNode = computed(() => ndvStore.activeNode);

const i18n = useI18n();

const isLoading = ref(false);
const prompt = ref(props.value);
const parentNodes = ref<INodeUi[]>([]);
const textareaRowsData = ref<TextareaRowData | null>(null);

const hasExecutionData = computed(() => (useNDVStore().ndvInputData || []).length > 0);
const hasInputField = computed(() => props.parameter.typeOptions?.buttonConfig?.hasInputField);
const inputFieldMaxLength = computed(
	() => props.parameter.typeOptions?.buttonConfig?.inputFieldMaxLength,
);
const buttonLabel = computed(
	() => props.parameter.typeOptions?.buttonConfig?.label ?? props.parameter.displayName,
);
const isSubmitEnabled = computed(() => {
	if (!hasExecutionData.value || !prompt.value || props.isReadOnly) return false;

	const maxlength = inputFieldMaxLength.value;
	if (maxlength && prompt.value.length > maxlength) return false;

	return true;
});
const promptUpdated = computed(() => {
	const lastPrompt = activeNode.value?.parameters[AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT] as string;
	if (!lastPrompt) return false;
	return lastPrompt.trim() !== prompt.value.trim();
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
	const { showMessage } = useToast();
	const action: string | NodePropertyAction | undefined =
		props.parameter.typeOptions?.buttonConfig?.action;

	if (!action || !activeNode.value) return;

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
		switch (type) {
			case 'askAiCodeGeneration':
				const updateInformation = await generateCodeForAiTransform(
					prompt.value,
					getPath(target as string),
					5,
				);
				if (!updateInformation) return;

				//update code parameter
				emit('valueChanged', updateInformation);

				//update code generated for prompt parameter
				emit('valueChanged', {
					name: getPath(AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT),
					value: prompt.value,
				});

				useTelemetry().trackAiTransform('generationFinished', {
					prompt: prompt.value,
					code: updateInformation.value,
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

function cleanTextareaRowsData() {
	textareaRowsData.value = null;
}

async function onDrop(value: string, event: MouseEvent) {
	value = propertyNameFromExpression(value);

	prompt.value = getUpdatedTextareaValue(event, textareaRowsData.value, value);

	emit('valueChanged', {
		name: getPath(props.parameter.name),
		value: prompt.value,
	});
}

async function updateCursorPositionOnMouseMove(event: MouseEvent, activeDrop: boolean) {
	if (!activeDrop) return;

	const textarea = event.target as HTMLTextAreaElement;

	const position = getTextareaCursorPosition(
		textarea,
		textareaRowsData.value,
		event.clientX,
		event.clientY,
	);

	textarea.focus();
	textarea.setSelectionRange(position, position);
}
</script>

<template>
	<div>
		<n8n-input-label
			v-if="hasInputField"
			:label="i18n.nodeText(activeNode?.type).inputLabelDisplayName(parameter, path)"
			:tooltip-text="i18n.nodeText(activeNode?.type).inputLabelDescription(parameter, path)"
			:bold="false"
			size="small"
			color="text-dark"
		>
		</n8n-input-label>
		<div
			:class="[$style.inputContainer, { [$style.disabled]: isReadOnly }]"
			:hidden="!hasInputField"
		>
			<div :class="$style.meta">
				<span
					v-if="inputFieldMaxLength"
					v-show="prompt.length > 1"
					:class="$style.counter"
					v-text="`${prompt.length} / ${inputFieldMaxLength}`"
				/>
				<span
					v-if="promptUpdated"
					:class="$style['warning-text']"
					v-text="'Instructions changed'"
				/>
			</div>
			<DraggableTarget type="mapping" :disabled="isLoading" @drop="onDrop">
				<template #default="{ activeDrop, droppable }">
					<N8nInput
						v-model="prompt"
						:class="[
							$style.input,
							{ [$style.activeDrop]: activeDrop, [$style.droppable]: droppable },
						]"
						style="border: 1.5px solid var(--color-foreground-base)"
						type="textarea"
						:rows="6"
						:maxlength="inputFieldMaxLength"
						:placeholder="parameter.placeholder"
						:disabled="isReadOnly"
						@input="onPromptInput"
						@mousemove="updateCursorPositionOnMouseMove($event, activeDrop)"
						@mouseleave="cleanTextareaRowsData"
					/>
				</template>
			</DraggableTarget>
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
	border: 1.5px transparent !important;
}

.input {
	border-radius: var(--border-radius-base);
}

.input textarea {
	font-size: var(--font-size-2xs);
	padding-bottom: var(--spacing-2xl);
	font-family: var(--font-family);
	resize: none;
	margin: 0;
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
	padding-bottom: var(--spacing-2xs);
	padding-top: var(--spacing-2xs);
	bottom: 2px;
	left: var(--spacing-xs);
	right: var(--spacing-xs);
	gap: var(--spacing-2xs);
	align-items: end;
	z-index: 1;
	background-color: var(--color-foreground-xlight);

	* {
		font-size: var(--font-size-2xs);
		line-height: 1;
	}
}
.counter {
	color: var(--color-text-light);
	flex-shrink: 0;
}
.controls {
	padding: var(--spacing-2xs) 0;
	display: flex;
	justify-content: flex-end;
}
.warning-text {
	color: var(--color-warning);
	line-height: 1.2;
}
.droppable {
	border: 1.5px dashed var(--color-ndv-droppable-parameter) !important;
}
.activeDrop {
	border: 1.5px solid var(--color-success) !important;
	cursor: grabbing;
}
.disabled {
	.meta {
		background-color: var(--fill-disabled);
	}
}
</style>
