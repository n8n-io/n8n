<script setup lang="ts">
import { type INodeProperties, type NodePropertyAction } from 'n8n-workflow';
import type { INodeUi, IUpdateInformation } from '@/Interface';
import { ref, computed, onMounted } from 'vue';
import { N8nButton, N8nInput, N8nTooltip } from 'n8n-design-system/components';
import { useI18n } from '@/composables/useI18n';
import { useToast } from '@/composables/useToast';
import { useNDVStore } from '@/stores/ndv.store';
import { getParentNodes, generateCodeForAiTransform } from './utils';
import { useTelemetry } from '@/composables/useTelemetry';
import { useUIStore } from '@/stores/ui.store';

import { propertyNameFromExpression } from '../../utils/mappingUtils';

const AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT = 'codeGeneratedForPrompt';

const emit = defineEmits<{
	valueChanged: [value: IUpdateInformation];
}>();

const props = defineProps<{
	parameter: INodeProperties;
	value: string;
	path: string;
}>();

const { activeNode } = useNDVStore();

const i18n = useI18n();

const isLoading = ref(false);
const prompt = ref(props.value);
const parentNodes = ref<INodeUi[]>([]);
const textareaRowsData = ref<{
	rows: string[];
	linesToRowsMap: number[][];
} | null>(null);

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
const promptUpdated = computed(() => {
	const lastPrompt = activeNode?.parameters[AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT] as string;
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
		switch (type) {
			case 'askAiCodeGeneration':
				const updateInformation = await generateCodeForAiTransform(
					prompt.value,
					getPath(target as string),
				);
				if (!updateInformation) return;

				//updade code parameter
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

function useDarkBackdrop(): string {
	const theme = useUIStore().appliedTheme;

	if (theme === 'light') {
		return 'background-color: var(--color-background-xlight);';
	} else {
		return 'background-color: var(--color-background-light);';
	}
}

onMounted(() => {
	parentNodes.value = getParentNodes();
});

function cleanTextareaRowsData() {
	textareaRowsData.value = null;
}

function splitText(textarea: HTMLTextAreaElement) {
	if (textareaRowsData.value) return textareaRowsData.value;
	const rows: string[] = [];
	const linesToRowsMap: number[][] = [];
	const style = window.getComputedStyle(textarea);

	const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
	const border = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
	const textareaWidth = textarea.clientWidth - padding - border;

	const context = createTextContext(style);

	const lines = textarea.value.split('\n');

	lines.forEach((_) => {
		linesToRowsMap.push([]);
	});
	lines.forEach((line, index) => {
		if (line === '') {
			rows.push(line);
			linesToRowsMap[index].push(rows.length - 1);
			return;
		}
		let currentLine = '';
		const words = line.split(/(\s+)/);

		words.forEach((word) => {
			const testLine = currentLine + word;
			const testWidth = context.measureText(testLine).width;

			if (testWidth <= textareaWidth) {
				currentLine = testLine;
			} else {
				rows.push(currentLine.trimEnd());
				linesToRowsMap[index].push(rows.length - 1);
				currentLine = word;
			}
		});

		if (currentLine) {
			rows.push(currentLine.trimEnd());
			linesToRowsMap[index].push(rows.length - 1);
		}
	});

	return { rows, linesToRowsMap };
}

function createTextContext(style: CSSStyleDeclaration): CanvasRenderingContext2D {
	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d')!;
	context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
	return context;
}

const getRowIndex = (textareaY: number, lineHeight: string) => {
	const rowHeight = parseInt(lineHeight, 10);
	const snapPosition = textareaY - rowHeight / 2 - 1;
	return Math.floor(snapPosition / rowHeight);
};

const getColumnIndex = (rowText: string, textareaX: number, font: string) => {
	const span = document.createElement('span');
	span.style.font = font;
	span.style.visibility = 'hidden';
	span.style.position = 'absolute';
	span.style.whiteSpace = 'pre';
	document.body.appendChild(span);

	let left = 0;
	let right = rowText.length;
	let col = 0;

	while (left <= right) {
		const mid = Math.floor((left + right) / 2);
		span.textContent = rowText.substring(0, mid);
		const width = span.getBoundingClientRect().width;

		if (width <= textareaX) {
			col = mid;
			left = mid + 1;
		} else {
			right = mid - 1;
		}
	}

	document.body.removeChild(span);

	return rowText.length === col ? col : col - 1;
};

async function onDrop(value: string, event: MouseEvent) {
	value = propertyNameFromExpression(value);
	const textarea = event.target as HTMLTextAreaElement;

	const rect = textarea.getBoundingClientRect();
	const textareaX = event.clientX - rect.left;
	const textareaY = event.clientY - rect.top;
	const { lineHeight, font } = window.getComputedStyle(textarea);

	const rowIndex = getRowIndex(textareaY, lineHeight);

	const { rows, linesToRowsMap } = splitText(textarea);

	if (rows[rowIndex] === undefined) {
		prompt.value = `${prompt.value} ${value}`;
		emit('valueChanged', {
			name: getPath(props.parameter.name),
			value: prompt.value,
		});
		return;
	}

	const rowText = rows[rowIndex];

	if (rowText === '') {
		rows[rowIndex] = value;
	} else {
		const col = getColumnIndex(rowText, textareaX, font);
		rows[rowIndex] = [
			rows[rowIndex].slice(0, col).trim(),
			value,
			rows[rowIndex].slice(col).trim(),
		].join(' ');
	}

	const newText = linesToRowsMap
		.map((lineMap) => {
			return lineMap.map((index) => rows[index]).join(' ');
		})
		.join('\n');

	prompt.value = newText;
	emit('valueChanged', {
		name: getPath(props.parameter.name),
		value: prompt.value,
	});
}

async function highlightCursorPosition(event: MouseEvent, activeDrop: boolean) {
	if (!activeDrop) return;

	const textarea = event.target as HTMLTextAreaElement;
	const rect = textarea.getBoundingClientRect();
	const textareaX = event.clientX - rect.left;
	const textareaY = event.clientY - rect.top;
	const { lineHeight, font } = window.getComputedStyle(textarea);

	const rowIndex = getRowIndex(textareaY, lineHeight);
	const { rows } = splitText(textarea);

	if (rowIndex < 0 || rowIndex >= rows.length) {
		textarea.setSelectionRange(textarea.value.length, textarea.value.length);
		return;
	}

	const rowText = rows[rowIndex];

	const col = getColumnIndex(rowText, textareaX, font);

	const position = rows.slice(0, rowIndex).reduce((acc, curr) => acc + curr.length + 1, 0) + col;

	textarea.focus();
	textarea.setSelectionRange(position, position);
}
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
			<div :class="$style.meta" :style="useDarkBackdrop()">
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
						@input="onPromptInput"
						@mousemove="highlightCursorPosition($event, activeDrop)"
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
	padding-bottom: var(--spacing-2xs);
	padding-top: var(--spacing-2xs);
	margin: 1px;
	margin-right: var(--spacing-s);
	bottom: 0;
	left: var(--spacing-xs);
	right: var(--spacing-xs);
	gap: 10px;
	align-items: end;
	z-index: 1;

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
</style>
