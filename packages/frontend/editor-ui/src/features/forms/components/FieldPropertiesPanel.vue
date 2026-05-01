<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { N8nIcon, N8nInput } from '@n8n/design-system';
import { ElSwitch, ElSelect, ElOption } from 'element-plus';
import type { FormFieldDraft, FormFieldType } from '../composables/useFormFields';
import SaveButton from './SaveButton.vue';

const props = defineProps<{
	field: FormFieldDraft | null;
	fieldErrors: string[];
	selectedFormElement: 'title' | 'description' | 'submit' | null;
	formTitle: string;
	formDescription: string;
	submitLabel: string;
	hasUnsavedChanges: boolean;
	isSaving: boolean;
}>();

const emit = defineEmits<{
	'update:field': [patch: Partial<FormFieldDraft>];
	'update:formTitle': [value: string];
	'update:formDescription': [value: string];
	'update:submitLabel': [value: string];
	save: [];
}>();

const i18n = useI18n();

// ---------------------------------------------------------------------------
// Type visibility helpers
// ---------------------------------------------------------------------------

type FieldTypeGroup = 'input' | 'options' | 'file' | 'html' | 'hidden';

function typeGroup(t: FormFieldType): FieldTypeGroup {
	if (['dropdown', 'checkbox', 'radio'].includes(t)) return 'options';
	if (t === 'file') return 'file';
	if (t === 'html') return 'html';
	if (t === 'hiddenField') return 'hidden';
	return 'input';
}

const group = computed(() => (props.field ? typeGroup(props.field.fieldType) : null));

const showLabel = computed(
	() => props.field?.fieldType !== 'hiddenField' && props.field?.fieldType !== 'html',
);
const labelHasError = computed(() => props.fieldErrors.includes('label'));
const showFieldName = computed(() => props.field !== null);
const showRequired = computed(() => props.field?.fieldType !== 'html');
const showPlaceholder = computed(
	() =>
		props.field !== null &&
		!['dropdown', 'date', 'file', 'html', 'hiddenField', 'radio', 'checkbox'].includes(
			props.field.fieldType,
		),
);
const showDefaultValue = computed(
	() => props.field !== null && !['file', 'html', 'hiddenField'].includes(props.field.fieldType),
);
const showMultiselect = computed(() => props.field?.fieldType === 'dropdown');
const showLimitSelection = computed(() => props.field?.fieldType === 'checkbox');
const showMultipleFiles = computed(() => props.field?.fieldType === 'file');
const showAcceptFileTypes = computed(() => props.field?.fieldType === 'file');

// ---------------------------------------------------------------------------
// Options list helpers
// ---------------------------------------------------------------------------

const optionValues = computed(() => props.field?.fieldOptions?.values ?? []);

function addOption() {
	if (!props.field) return;
	const values = [...optionValues.value, { option: '' }];
	emit('update:field', { fieldOptions: { values } });
}

function removeOption(idx: number) {
	if (!props.field) return;
	const values = optionValues.value.filter((_, i) => i !== idx);
	emit('update:field', { fieldOptions: { values } });
}

function updateOption(idx: number, value: string) {
	if (!props.field) return;
	const values = optionValues.value.map((o, i) => (i === idx ? { option: value } : o));
	emit('update:field', { fieldOptions: { values } });
}

// ---------------------------------------------------------------------------
// Limit selection options
// ---------------------------------------------------------------------------

const limitSelectionOptions: Array<{ value: string; labelKey: BaseTextKey }> = [
	{ value: 'unlimited', labelKey: 'formStep.fields.props.limitSelection.unlimited' },
	{ value: 'exact', labelKey: 'formStep.fields.props.limitSelection.exact' },
	{ value: 'range', labelKey: 'formStep.fields.props.limitSelection.range' },
];
</script>

<template>
	<div :class="$style.panel">
		<!-- Empty state -->
		<div v-if="!field && !selectedFormElement" :class="$style.emptyState">
			<N8nIcon icon="mouse-pointer" size="xlarge" />
			<span :class="$style.emptyStateText">{{
				i18n.baseText('formStep.fields.props.emptyState')
			}}</span>
		</div>

		<!-- Form-level properties (title / description / submit) -->
		<div v-else-if="selectedFormElement" :class="$style.propsScroll">
			<h4 :class="$style.sectionTitle">
				{{ i18n.baseText('formStep.fields.props.formSettings') }}
			</h4>

			<div :class="$style.row">
				<label :class="$style.label">{{ i18n.baseText('formStep.fields.props.formTitle') }}</label>
				<N8nInput
					:model-value="formTitle"
					size="small"
					:placeholder="i18n.baseText('formStep.fields.canvas.titlePlaceholder')"
					@update:model-value="(v) => emit('update:formTitle', v)"
				/>
			</div>

			<div :class="$style.row">
				<label :class="$style.label">{{
					i18n.baseText('formStep.fields.props.formDescription')
				}}</label>
				<N8nInput
					:model-value="formDescription"
					type="textarea"
					:rows="3"
					:placeholder="i18n.baseText('formStep.fields.canvas.descriptionPlaceholder')"
					@update:model-value="(v) => emit('update:formDescription', v)"
				/>
			</div>

			<div :class="$style.row">
				<label :class="$style.label">{{
					i18n.baseText('formStep.fields.props.submitLabel')
				}}</label>
				<N8nInput
					:model-value="submitLabel"
					size="small"
					:placeholder="i18n.baseText('formStep.fields.canvas.submitPlaceholder')"
					@update:model-value="(v) => emit('update:submitLabel', v)"
				/>
			</div>
		</div>

		<!-- Field properties -->
		<div v-else-if="field" :class="$style.propsScroll">
			<h4 :class="$style.sectionTitle">
				{{ i18n.baseText('formStep.fields.props.title') }}
			</h4>

			<!-- Label -->
			<div v-if="showLabel" :class="$style.row">
				<label :class="[$style.label, { [$style.labelError]: labelHasError }]">
					{{ i18n.baseText('formStep.fields.props.label') }}
					<span v-if="labelHasError" :class="$style.errorHint">{{
						i18n.baseText('formStep.fields.props.required')
					}}</span>
				</label>
				<N8nInput
					:model-value="field.fieldLabel"
					size="small"
					:placeholder="i18n.baseText('formStep.fields.props.labelPlaceholder')"
					@update:model-value="(v) => emit('update:field', { fieldLabel: v })"
				/>
			</div>

			<!-- Custom field name -->
			<div v-if="showFieldName" :class="$style.row">
				<label :class="$style.label">{{ i18n.baseText('formStep.fields.props.fieldName') }}</label>
				<N8nInput
					:model-value="field.fieldName ?? ''"
					size="small"
					:placeholder="i18n.baseText('formStep.fields.props.fieldNamePlaceholder')"
					@update:model-value="(v) => emit('update:field', { fieldName: v })"
				/>
			</div>

			<!-- Required -->
			<div v-if="showRequired" :class="[$style.row, $style.rowInline]">
				<label :class="$style.label">{{ i18n.baseText('formStep.fields.props.required') }}</label>
				<ElSwitch
					:model-value="field.requiredField ?? false"
					size="small"
					@update:model-value="(v) => emit('update:field', { requiredField: Boolean(v) })"
				/>
			</div>

			<!-- Placeholder -->
			<div v-if="showPlaceholder" :class="$style.row">
				<label :class="$style.label">{{
					i18n.baseText('formStep.fields.props.placeholder')
				}}</label>
				<N8nInput
					:model-value="field.placeholder ?? ''"
					size="small"
					@update:model-value="(v) => emit('update:field', { placeholder: v })"
				/>
			</div>

			<!-- Default value -->
			<div v-if="showDefaultValue" :class="$style.row">
				<label :class="$style.label">{{
					i18n.baseText('formStep.fields.props.defaultValue')
				}}</label>
				<N8nInput
					:model-value="field.defaultValue ?? ''"
					size="small"
					@update:model-value="(v) => emit('update:field', { defaultValue: v })"
				/>
			</div>

			<!-- Options (dropdown / checkbox / radio) -->
			<div v-if="group === 'options'" :class="$style.row">
				<label :class="$style.label">{{ i18n.baseText('formStep.fields.props.options') }}</label>
				<div :class="$style.optionsList">
					<div v-for="(opt, idx) in optionValues" :key="idx" :class="$style.optionRow">
						<N8nInput
							:model-value="opt.option"
							size="small"
							:placeholder="`Option ${idx + 1}`"
							@update:model-value="(v) => updateOption(idx, v)"
						/>
						<button :class="$style.removeOptionBtn" @click="removeOption(idx)">
							<N8nIcon icon="circle-minus" size="xsmall" />
						</button>
					</div>
					<button :class="$style.addOptionBtn" @click="addOption">
						<N8nIcon icon="circle-plus" size="xsmall" />
						{{ i18n.baseText('formStep.fields.props.addOption') }}
					</button>
				</div>
			</div>

			<!-- Multiselect (dropdown only) -->
			<div v-if="showMultiselect" :class="[$style.row, $style.rowInline]">
				<label :class="$style.label">{{
					i18n.baseText('formStep.fields.props.multiselect')
				}}</label>
				<ElSwitch
					:model-value="field.multiselect ?? false"
					size="small"
					@update:model-value="(v) => emit('update:field', { multiselect: Boolean(v) })"
				/>
			</div>

			<!-- Limit selection (checkbox only) -->
			<div v-if="showLimitSelection" :class="$style.row">
				<label :class="$style.label">{{
					i18n.baseText('formStep.fields.props.limitSelection')
				}}</label>
				<ElSelect
					:model-value="field.limitSelection ?? 'unlimited'"
					size="small"
					:class="$style.selectFull"
					@change="
						(v: string) =>
							emit('update:field', { limitSelection: v as 'exact' | 'range' | 'unlimited' })
					"
				>
					<ElOption
						v-for="opt in limitSelectionOptions"
						:key="opt.value"
						:value="opt.value"
						:label="i18n.baseText(opt.labelKey)"
					/>
				</ElSelect>
				<N8nInput
					v-if="field.limitSelection === 'exact'"
					:model-value="field.numberOfSelections ?? undefined"
					type="number"
					size="small"
					:min="1"
					:placeholder="i18n.baseText('formStep.fields.props.numberOfSelections')"
					@update:model-value="(v) => emit('update:field', { numberOfSelections: Number(v) })"
				/>
				<div v-if="field.limitSelection === 'range'" :class="$style.rangeRow">
					<N8nInput
						:model-value="field.minSelections ?? undefined"
						type="number"
						size="small"
						:min="0"
						:placeholder="i18n.baseText('formStep.fields.props.minSelections')"
						@update:model-value="(v) => emit('update:field', { minSelections: Number(v) })"
					/>
					<span :class="$style.rangeSep">–</span>
					<N8nInput
						:model-value="field.maxSelections ?? undefined"
						type="number"
						size="small"
						:min="1"
						:placeholder="i18n.baseText('formStep.fields.props.maxSelections')"
						@update:model-value="(v) => emit('update:field', { maxSelections: Number(v) })"
					/>
				</div>
			</div>

			<!-- File: multiple files -->
			<div v-if="showMultipleFiles" :class="[$style.row, $style.rowInline]">
				<label :class="$style.label">{{
					i18n.baseText('formStep.fields.props.multipleFiles')
				}}</label>
				<ElSwitch
					:model-value="field.multipleFiles ?? false"
					size="small"
					@update:model-value="(v) => emit('update:field', { multipleFiles: Boolean(v) })"
				/>
			</div>

			<!-- File: accept types -->
			<div v-if="showAcceptFileTypes" :class="$style.row">
				<label :class="$style.label">{{
					i18n.baseText('formStep.fields.props.acceptFileTypes')
				}}</label>
				<N8nInput
					:model-value="field.acceptFileTypes ?? ''"
					size="small"
					:placeholder="i18n.baseText('formStep.fields.props.acceptFileTypesPlaceholder')"
					@update:model-value="(v) => emit('update:field', { acceptFileTypes: v })"
				/>
			</div>

			<!-- HTML content -->
			<div v-if="group === 'html'" :class="$style.row">
				<label :class="$style.label">{{
					i18n.baseText('formStep.fields.props.htmlContent')
				}}</label>
				<N8nInput
					:model-value="field.html ?? ''"
					type="textarea"
					:rows="5"
					:placeholder="i18n.baseText('formStep.fields.props.htmlContentPlaceholder')"
					@update:model-value="(v) => emit('update:field', { html: v })"
				/>
			</div>

			<!-- Hidden field: field value -->
			<div v-if="group === 'hidden'" :class="$style.row">
				<label :class="$style.label">{{ i18n.baseText('formStep.fields.props.fieldValue') }}</label>
				<N8nInput
					:model-value="field.fieldValue ?? ''"
					size="small"
					@update:model-value="(v) => emit('update:field', { fieldValue: v })"
				/>
			</div>
		</div>

		<!-- Save button pinned at bottom -->
		<div :class="$style.footer">
			<SaveButton
				:has-unsaved-changes="hasUnsavedChanges"
				:is-saving="isSaving"
				:class="$style.saveButton"
				@save="emit('save')"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-width: 0;
	overflow: hidden;
}

.emptyState {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--sm);
	color: var(--color--text--tint-2);
	text-align: center;
}

.emptyStateText {
	font-size: var(--font-size--2xs);
}

.propsScroll {
	flex: 1;
	min-width: 0;
	overflow-x: hidden;
	overflow-y: auto;
	padding-right: var(--spacing--3xs);
	padding-left: var(--spacing--2xs);
}

.sectionTitle {
	margin: 0 0 var(--spacing--xs);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.06em;
}

.row {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	margin-bottom: var(--spacing--sm);
}

.rowInline {
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
}

.label {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.labelError {
	color: var(--color--danger);
}

.errorHint {
	font-size: var(--font-size--3xs);
	color: var(--color--danger);
}

.optionsList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.optionRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.removeOptionBtn {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	border: none;
	background: none;
	cursor: pointer;
	color: var(--color--text--tint-2);
	padding: var(--spacing--5xs);
	border-radius: var(--radius--sm);

	&:hover {
		color: var(--color--danger);
	}
}

.addOptionBtn {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	border: none;
	background: none;
	cursor: pointer;
	color: var(--color--primary);
	font-size: var(--font-size--2xs);
	padding: var(--spacing--5xs) 0;

	&:hover {
		text-decoration: underline;
	}
}

.selectFull {
	width: 100%;
}

.rangeRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);

	> * {
		min-width: 0;
	}
}

.rangeSep {
	flex-shrink: 0;
	color: var(--color--text--tint-2);
	font-size: var(--font-size--sm);
}

.footer {
	flex-shrink: 0;
	display: flex;
	justify-content: flex-end;
	padding-top: var(--spacing--sm);
	padding-left: var(--spacing--2xs);
	padding-right: var(--spacing--3xs);
	border-top: var(--border);
	margin-top: auto;
}

.saveButton {
	min-width: 96px;
}
</style>
