<script setup lang="ts">
import { type INodeProperties } from 'n8n-workflow';
import type { INodeUi, IUpdateInformation } from '@/Interface';
import { ref, computed, onMounted } from 'vue';
import { N8nButton, N8nInput, N8nInputLabel } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { injectNDVStore } from '@/features/ndv/shared/ndv.store';
import {
	getParentNodes,
	type TextareaRowData,
	getUpdatedTextareaValue,
	getTextareaCursorPosition,
} from '../../utils/buttonParameter.utils';
import DraggableTarget from '@/app/components/DraggableTarget.vue';

import { propertyNameFromExpression } from '@/app/utils/mappingUtils';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

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

const ndvStore = injectNDVStore();
const workflowDocumentStore = injectWorkflowDocumentStore();

const activeNode = computed(() => ndvStore.value.activeNode);

const i18n = useI18n();

const prompt = ref(props.value);
const parentNodes = ref<INodeUi[]>([]);
const textareaRowsData = ref<TextareaRowData | null>(null);

const hasInputField = computed(() => props.parameter.typeOptions?.buttonConfig?.hasInputField);
const inputFieldMaxLength = computed(
	() => props.parameter.typeOptions?.buttonConfig?.inputFieldMaxLength,
);
const buttonLabel = computed(
	() => props.parameter.typeOptions?.buttonConfig?.label ?? props.parameter.displayName,
);
const isSubmitEnabled = computed(() => {
	if (props.isReadOnly) return false;

	const maxlength = inputFieldMaxLength.value;
	if (maxlength && prompt.value.length > maxlength) return false;

	return true;
});
function getPath(parameter: string) {
	return (props.path ? `${props.path}.` : '') + parameter;
}

function onSubmit() {
	const action = props.parameter.typeOptions?.buttonConfig?.action;

	if (!action || !activeNode.value) return;

	emit('valueChanged', {
		name: getPath(props.parameter.name),
		value: prompt.value,
	});
}

function onPromptInput(inputValue: string) {
	prompt.value = inputValue;
	emit('valueChanged', {
		name: getPath(props.parameter.name),
		value: inputValue,
	});
}

onMounted(() => {
	parentNodes.value = getParentNodes(
		workflowDocumentStore.value.documentId,
		ndvStore.value.activeNode,
	);
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
		<N8nInputLabel
			v-if="hasInputField"
			:label="i18n.nodeText(activeNode?.type).inputLabelDisplayName(parameter, path)"
			:tooltip-text="i18n.nodeText(activeNode?.type).inputLabelDescription(parameter, path)"
			:bold="false"
			size="small"
			color="text-dark"
		>
		</N8nInputLabel>
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
			</div>
			<DraggableTarget type="mapping" @drop="onDrop">
				<template #default="{ activeDrop, droppable }">
					<N8nInput
						v-model="prompt"
						:class="[
							$style.input,
							{ [$style.activeDrop]: activeDrop, [$style.droppable]: droppable },
						]"
						style="border: 1.5px solid var(--color--foreground)"
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
			<N8nButton variant="subtle" :disabled="!isSubmitEnabled" size="small" @click="onSubmit">
				{{ buttonLabel }}
			</N8nButton>
		</div>
	</div>
</template>

<style module lang="scss">
.input * {
	border: 1.5px transparent !important;
}

.input {
	border-radius: var(--radius);
}

.input textarea {
	font-size: var(--font-size--2xs);
	padding-bottom: var(--spacing--2xl);
	font-family: var(--font-family);
	resize: none;
	margin: 0;
}

.intro {
	font-weight: var(--font-weight--bold);
	font-size: var(--font-size--2xs);
	color: var(--color--text--shade-1);
	padding: var(--spacing--2xs) 0 0;
}
.inputContainer {
	position: relative;
}
.meta {
	display: flex;
	justify-content: space-between;
	position: absolute;
	padding-bottom: var(--spacing--2xs);
	padding-top: var(--spacing--2xs);
	bottom: 2px;
	left: var(--spacing--xs);
	right: var(--spacing--xs);
	gap: var(--spacing--2xs);
	align-items: end;
	z-index: 1;
	background-color: var(--color--foreground--tint-2);

	* {
		font-size: var(--font-size--2xs);
		line-height: 1;
	}
}
.counter {
	color: var(--color--text--tint-1);
	flex-shrink: 0;
}
.controls {
	padding: var(--spacing--2xs) 0;
	display: flex;
	justify-content: flex-end;
}
.droppable {
	border: 1.5px dashed var(--ndv--droppable-parameter--color) !important;
}
.activeDrop {
	border: 1.5px solid var(--color--success) !important;
	cursor: grabbing;
}
.disabled {
	.meta {
		background-color: var(--input--color--background--disabled);
	}
}
</style>
