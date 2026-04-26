<script lang="ts" setup>
import { computed } from 'vue';
import { FORM_TRIGGER_NODE_TYPE } from '@/app/constants';
import { useCanvasNode } from '@/features/workflows/canvas/composables/useCanvasNode';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { INodeParameters } from 'n8n-workflow';

const emit = defineEmits<{
	activate: [id: string, event: MouseEvent];
}>();

const { id } = useCanvasNode();

function onActivate(event: MouseEvent) {
	emit('activate', id.value, event);
}
const workflowsStore = useWorkflowsStore();

const node = computed(() => workflowsStore.workflow.nodes.find((n) => n.id === id.value));
const isTrigger = computed(() => node.value?.type === FORM_TRIGGER_NODE_TYPE);
const isCompletion = computed(() => node.value?.parameters?.operation === 'completion');

const formTitle = computed(() => {
	const params = node.value?.parameters;
	if (!params) return '';
	if (isCompletion.value) return (params.completionTitle as string) || 'Form Submitted';
	const raw = isTrigger.value ? params.formTitle : (params.options as INodeParameters)?.formTitle;
	return (raw as string) ?? '';
});

const formDescription = computed(() => {
	const params = node.value?.parameters;
	if (!params) return '';
	if (isCompletion.value) return (params.completionMessage as string) ?? '';
	const raw = isTrigger.value
		? params.formDescription
		: (params.options as INodeParameters)?.formDescription;
	return (raw as string) ?? '';
});

const buttonLabel = computed(() => {
	const options = node.value?.parameters?.options as INodeParameters | undefined;
	return (options?.buttonLabel as string) || 'Submit';
});

type FieldPreview = {
	label: string;
	type: string;
	required: boolean;
	options: string[];
};

const formFields = computed((): FieldPreview[] => {
	const raw = node.value?.parameters?.formFields as { values?: INodeParameters[] } | undefined;
	return (raw?.values ?? [])
		.filter((f) => f.fieldType !== 'hiddenField')
		.slice(0, 4)
		.map((f) => ({
			label: (f.fieldLabel as string) ?? '',
			type: (f.fieldType as string) || 'text',
			required: Boolean(f.requiredField),
			options: ((f.fieldOptions as { values?: Array<{ option: string }> })?.values ?? []).map(
				(o) => o.option,
			),
		}));
});

function isMultiChoice(type: string) {
	return type === 'checkbox' || type === 'radio';
}
function isSelect(type: string) {
	return type === 'dropdown';
}
function isTextarea(type: string) {
	return type === 'textarea';
}
</script>

<template>
	<!-- Styles mirrored from form-trigger.handlebars — keep in sync when updating that file -->
	<div class="n8n-form-preview" @dblclick.stop="onActivate">
		<div class="n8n-form-scaler">
			<form class="card">
				<div class="form-header">
					<h1 v-if="formTitle">{{ formTitle }}</h1>
					<p v-if="formDescription">{{ formDescription }}</p>
				</div>
				<div v-if="!isCompletion && formFields.length" class="inputs-wrapper">
					<div v-for="(field, i) in formFields" :key="i" class="form-group">
						<label :class="field.required ? 'form-required' : ''">{{ field.label }}</label>

						<textarea v-if="isTextarea(field.type)" class="form-input" disabled />

						<div v-else-if="isSelect(field.type)" class="select-input">
							<select disabled>
								<option>Select an option...</option>
							</select>
						</div>

						<div v-else-if="isMultiChoice(field.type)" class="multiselect">
							<div v-for="opt in field.options.slice(0, 3)" :key="opt" class="multiselect-option">
								<input type="checkbox" class="multiselect-checkbox" disabled />
								<label>{{ opt }}</label>
							</div>
						</div>

						<input v-else class="form-input" type="text" disabled />
					</div>
				</div>
				<button v-if="!isCompletion" id="submit-btn" type="button" disabled>
					{{ buttonLabel }}
				</button>
			</form>
		</div>
	</div>
</template>

<!-- NOT scoped — mirrors form-trigger.handlebars CSS, namespaced under .n8n-form-preview -->
<!-- When updating form-trigger.handlebars styles, update this block accordingly -->
<style>
.n8n-form-preview {
	/*
	 * Width is constant (202px = 448px card × zoom 0.45).
	 * Height is dynamic — the wrapper grows to the card's actual rendered size
	 * plus 20px top/bottom padding for consistent vertical whitespace.
	 * VueFlow measures the wrapper and places connection handles at top:50%
	 * (vertical center of the padded wrapper).
	 * Canvas mapping shifts X by -53px to center the 202px-wide card on the
	 * original 96px node position.
	 */
	width: 202px;
	padding: 20px 0;
	position: relative;
	pointer-events: auto;
	user-select: none;
	cursor: default;

	--color--card-bg: #fff;
	--color--card-border: #dbdfe7;
	--color--card-shadow: rgba(99, 77, 255, 0.06);
	--color--header: #525356;
	--color--label: #555;
	--color--link: #7e8186;
	--color--input-border: #dbdfe7;
	--color--input-text: #71747a;
	--color--input-bg: #fff;
	--color--submit-btn-bg: #ff6d5a;
	--color--submit-btn-text: #fff;
	--color--required: #ff6d5a;
	--radius--card: 8px;
	--radius--input: 6px;
	--padding--card: 24px;
	--padding--form-input: 12px;
	--padding--container-top: 24px;
	--submit-btn--height: 48px;
	--font-size--header: 20px;
	--font-size--label: 14px;
	--font-size--input: 14px;
	--font-size--paragraph: 14px;
	--checkbox--size: 18px;
	--shadow--card: 0 4px 16px 0 var(--color--card-shadow);
}

.n8n-form-scaler {
	zoom: 0.45;
	width: 448px;
	font-family: 'Open Sans', sans-serif;
	font-weight: 400;
	font-size: 12px;
	pointer-events: none;
}

.n8n-form-preview .card {
	padding: var(--padding--card);
	background-color: var(--color--card-bg);
	border: 1px solid var(--color--card-border);
	border-radius: var(--radius--card);
	box-shadow: var(--shadow--card);
}

.n8n-form-preview .form-header h1 {
	color: var(--color--header);
	font-size: var(--font-size--header);
	font-weight: 400;
	margin: 0;
}

.n8n-form-preview .form-header p {
	padding-top: 8px;
	color: var(--color--link);
	font-size: var(--font-size--paragraph);
	font-weight: 400;
	margin: 0;
}

.n8n-form-preview .inputs-wrapper {
	padding-top: var(--padding--container-top);
	padding-bottom: var(--padding--container-top);
}

.n8n-form-preview .form-group {
	margin-bottom: 16px;
}

.n8n-form-preview .form-group:last-child {
	margin-bottom: 0;
}

.n8n-form-preview label {
	display: block;
	text-align: left;
	font-size: var(--font-size--label);
	font-weight: 600;
	color: var(--color--label);
	padding-bottom: 6px;
	margin: 0;
}

.n8n-form-preview label.form-required::after {
	content: ' *';
	color: var(--color--required);
}

.n8n-form-preview .form-input {
	border: 1px solid var(--color--input-border);
	border-radius: var(--radius--input);
	width: 100%;
	font-size: var(--font-size--input);
	color: var(--color--input-text);
	background-color: var(--color--input-bg);
	font-weight: 400;
	padding: var(--padding--form-input);
	box-sizing: border-box;
	font-family: 'Open Sans', sans-serif;
}

.n8n-form-preview textarea.form-input {
	height: 80px;
	resize: none;
	display: block;
}

.n8n-form-preview .select-input {
	border: 1px solid var(--color--input-border);
	border-radius: var(--radius--input);
}

.n8n-form-preview select {
	outline: transparent;
	border: none;
	border-radius: var(--radius--input);
	width: 100%;
	font-size: var(--font-size--input);
	color: var(--color--input-text);
	font-weight: 400;
	background-color: var(--color--card-bg);
	padding: var(--padding--form-input);
	border-right: 12px solid transparent;
}

.n8n-form-preview .multiselect {
	padding-left: 6px;
	padding-right: 6px;
}

.n8n-form-preview .multiselect-option {
	padding-top: 6px;
	display: flex;
	align-items: center;
}

.n8n-form-preview .multiselect-option label {
	padding-left: 12px;
	color: var(--color--link);
	font-weight: 400;
	padding-bottom: 0;
}

.n8n-form-preview .multiselect-checkbox {
	appearance: none;
	min-width: var(--checkbox--size);
	width: var(--checkbox--size);
	height: var(--checkbox--size);
	border: 1px solid var(--color--input-border);
	border-radius: 3px;
}

.n8n-form-preview #submit-btn {
	width: 100%;
	height: var(--submit-btn--height);
	padding: var(--padding--form-input);
	border-radius: var(--radius--input);
	border: 0;
	font-size: var(--font-size--input);
	font-weight: 600;
	font-family: 'Open Sans', sans-serif;
	background-color: var(--color--submit-btn-bg);
	color: var(--color--submit-btn-text);
	cursor: default;
	display: block;
}
</style>
