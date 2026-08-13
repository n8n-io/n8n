<script lang="ts" setup>
import { useFormFields } from '../composables/useFormFields';
import FieldTypePalette from './FieldTypePalette.vue';
import FormCanvas from './FormCanvas.vue';
import FieldPropertiesPanel from './FieldPropertiesPanel.vue';
import type { FormFieldType } from '../composables/useFormFields';
import type { BaseTextKey } from '@n8n/i18n';
import type { IconName } from '@n8n/design-system';

const props = defineProps<{
	nodeId: string;
}>();

const formFields = useFormFields(props.nodeId);

defineExpose({
	get hasUnsavedChanges() {
		return formFields.hasUnsavedChanges.value;
	},
	save: formFields.save,
});

const COMPLETION_MODES: Array<{ value: string; icon: IconName; labelKey: BaseTextKey }> = [
	{
		value: 'text',
		icon: 'square-check',
		labelKey: 'formStep.fields.completion.showCompletionScreen',
	},
	{ value: 'redirect', icon: 'external-link', labelKey: 'formStep.fields.completion.redirect' },
	{ value: 'showText', icon: 'scroll-text', labelKey: 'formStep.fields.completion.showText' },
	{
		value: 'returnBinary',
		icon: 'file-text',
		labelKey: 'formStep.fields.completion.returnBinary',
	},
];
</script>

<template>
	<div :class="$style.layout">
		<!-- Left: field type palette OR completion mode selector -->
		<FieldTypePalette
			v-if="formFields.isCompletion.value"
			:selectable-items="COMPLETION_MODES"
			:selected="formFields.respondWith.value"
			title="formStep.fields.completion.paletteTitle"
			@update:selected="(v) => (formFields.respondWith.value = v)"
		/>
		<FieldTypePalette v-else @add="(type: FormFieldType) => formFields.addField(type)" />

		<!-- Center: form canvas -->
		<FormCanvas
			:fields="formFields.fields.value"
			:selected-field-id="formFields.selectedFieldId.value"
			:field-errors="formFields.fieldErrors.value"
			:form-title="formFields.formTitle.value"
			:form-description="formFields.formDescription.value"
			:submit-label="formFields.submitLabel.value"
			:inherited-title="formFields.inheritedTitle.value"
			:inherited-description="formFields.inheritedDescription.value"
			:inherited-submit-label="formFields.inheritedSubmitLabel.value"
			:is-completion="formFields.isCompletion.value"
			:respond-with="formFields.respondWith.value"
			:completion-title="formFields.completionTitle.value"
			:completion-message="formFields.completionMessage.value"
			:redirect-url="formFields.redirectUrl.value"
			:response-text="formFields.responseText.value"
			@update:fields="(v) => (formFields.fields.value = v)"
			@update:form-title="(v) => (formFields.formTitle.value = v)"
			@update:form-description="(v) => (formFields.formDescription.value = v)"
			@update:submit-label="(v) => (formFields.submitLabel.value = v)"
			@update:completion-title="(v: string) => (formFields.completionTitle.value = v)"
			@update:completion-message="(v: string) => (formFields.completionMessage.value = v)"
			@update:redirect-url="(v: string) => (formFields.redirectUrl.value = v)"
			@update:response-text="(v: string) => (formFields.responseText.value = v)"
			@select-field="formFields.selectField"
			@select-form-element="formFields.selectFormElement"
			@delete-field="formFields.removeField"
		/>

		<!-- Right: properties + save -->
		<FieldPropertiesPanel
			:field="formFields.selectedField.value"
			:field-errors="
				formFields.selectedField.value
					? (formFields.fieldErrors.value[formFields.selectedField.value._id] ?? [])
					: []
			"
			:selected-form-element="formFields.selectedFormElement.value"
			:form-title="formFields.formTitle.value"
			:form-description="formFields.formDescription.value"
			:submit-label="formFields.submitLabel.value"
			:inherited-title="formFields.inheritedTitle.value"
			:inherited-description="formFields.inheritedDescription.value"
			:inherited-submit-label="formFields.inheritedSubmitLabel.value"
			:is-completion="formFields.isCompletion.value"
			:respond-with="formFields.respondWith.value"
			:completion-title="formFields.completionTitle.value"
			:completion-message="formFields.completionMessage.value"
			:redirect-url="formFields.redirectUrl.value"
			:response-text="formFields.responseText.value"
			:has-unsaved-changes="formFields.hasUnsavedChanges.value"
			:is-saving="formFields.isSaving.value"
			@update:field="
				(patch) =>
					formFields.selectedField.value &&
					formFields.updateField(formFields.selectedField.value._id, patch)
			"
			@update:form-title="(v: string) => (formFields.formTitle.value = v)"
			@update:form-description="(v: string) => (formFields.formDescription.value = v)"
			@update:submit-label="(v: string) => (formFields.submitLabel.value = v)"
			@update:completion-title="(v: string) => (formFields.completionTitle.value = v)"
			@update:completion-message="(v: string) => (formFields.completionMessage.value = v)"
			@update:redirect-url="(v: string) => (formFields.redirectUrl.value = v)"
			@update:response-text="(v: string) => (formFields.responseText.value = v)"
			@save="formFields.save"
		/>
	</div>
</template>

<style lang="scss" module>
.layout {
	flex: 1;
	min-height: 0;
	display: grid;
	grid-template-columns: 2fr 5fr 2fr;
	gap: var(--spacing--lg);
	overflow: hidden;

	> * {
		min-width: 0;
	}
}
</style>
