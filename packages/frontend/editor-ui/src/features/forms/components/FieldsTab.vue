<script lang="ts" setup>
import { useFormFields } from '../composables/useFormFields';
import FieldTypePalette from './FieldTypePalette.vue';
import FormCanvas from './FormCanvas.vue';
import FieldPropertiesPanel from './FieldPropertiesPanel.vue';
import type { FormFieldType } from '../composables/useFormFields';

const props = defineProps<{
	nodeId: string;
}>();

const formFields = useFormFields(props.nodeId);
</script>

<template>
	<div :class="$style.layout">
		<!-- Left: field type palette -->
		<FieldTypePalette @add="(type: FormFieldType) => formFields.addField(type)" />

		<!-- Center: form canvas -->
		<FormCanvas
			:fields="formFields.fields.value"
			:selected-field-id="formFields.selectedFieldId.value"
			:field-errors="formFields.fieldErrors.value"
			:form-title="formFields.formTitle.value"
			:form-description="formFields.formDescription.value"
			:submit-label="formFields.submitLabel.value"
			@update:fields="(v) => (formFields.fields.value = v)"
			@update:form-title="(v) => (formFields.formTitle.value = v)"
			@update:form-description="(v) => (formFields.formDescription.value = v)"
			@update:submit-label="(v) => (formFields.submitLabel.value = v)"
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
