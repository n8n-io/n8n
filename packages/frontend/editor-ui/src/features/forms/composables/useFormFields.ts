import { ref, computed } from 'vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import type { INodeParameters } from 'n8n-workflow';
import { FORM_TRIGGER_NODE_TYPE } from '@/app/constants';
import type { INodeUi } from '@/Interface';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FormFieldType =
	| 'text'
	| 'email'
	| 'number'
	| 'password'
	| 'date'
	| 'textarea'
	| 'dropdown'
	| 'checkbox'
	| 'radio'
	| 'file'
	| 'html'
	| 'hiddenField';

export type FieldOptionItem = { option: string };

export type FormFieldDraft = {
	_id: string; // local-only tracking key, never written to node params
	fieldType: FormFieldType;
	fieldLabel: string;
	fieldName?: string;
	requiredField?: boolean;
	placeholder?: string;
	defaultValue?: string;
	fieldOptions?: { values: FieldOptionItem[] };
	multiselect?: boolean;
	multipleFiles?: boolean;
	acceptFileTypes?: string;
	html?: string;
	fieldValue?: string;
	limitSelection?: 'exact' | 'range' | 'unlimited';
	numberOfSelections?: number;
	minSelections?: number;
	maxSelections?: number;
	formatDate?: string;
};

export const FIELD_TYPES_WITH_OPTIONS = new Set<FormFieldType>(['dropdown', 'checkbox', 'radio']);

// Properties that are specific to certain field types and must be stripped
// when the type changes so we never pollute the fixed-collection output.
const TYPE_EXCLUSIVE_KEYS: Array<keyof FormFieldDraft> = [
	'fieldOptions',
	'multiselect',
	'limitSelection',
	'numberOfSelections',
	'minSelections',
	'maxSelections',
	'multipleFiles',
	'acceptFileTypes',
	'html',
	'fieldValue',
	'formatDate',
	'placeholder',
	'defaultValue',
];

// ---------------------------------------------------------------------------
// Serialisation helpers
// ---------------------------------------------------------------------------

function toNodeParam(draft: FormFieldDraft): INodeParameters {
	const { _id, ...rest } = draft;
	return Object.fromEntries(
		Object.entries(rest).filter(([, v]) => v !== undefined && v !== ''),
	) as INodeParameters;
}

function fromNodeParam(param: INodeParameters): FormFieldDraft {
	return {
		_id: crypto.randomUUID(),
		fieldType: (param.fieldType as FormFieldType) || 'text',
		fieldLabel: (param.fieldLabel as string) || '',
		fieldName: param.fieldName as string | undefined,
		requiredField: param.requiredField as boolean | undefined,
		placeholder: param.placeholder as string | undefined,
		defaultValue: param.defaultValue as string | undefined,
		fieldOptions: param.fieldOptions as { values: FieldOptionItem[] } | undefined,
		multiselect: param.multiselect as boolean | undefined,
		multipleFiles: param.multipleFiles as boolean | undefined,
		acceptFileTypes: param.acceptFileTypes as string | undefined,
		html: param.html as string | undefined,
		fieldValue: param.fieldValue as string | undefined,
		limitSelection: param.limitSelection as 'exact' | 'range' | 'unlimited' | undefined,
		numberOfSelections: param.numberOfSelections as number | undefined,
		minSelections: param.minSelections as number | undefined,
		maxSelections: param.maxSelections as number | undefined,
		formatDate: param.formatDate as string | undefined,
	};
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useFormFields(nodeId: string) {
	const workflowsStore = useWorkflowsStore();
	const nodeHelpers = useNodeHelpers();

	const node = computed<INodeUi | undefined>(() =>
		workflowsStore.workflow.nodes.find((n) => n.id === nodeId),
	);

	const isTrigger = computed(() => node.value?.type === FORM_TRIGGER_NODE_TYPE);
	const isCompletion = computed(() => node.value?.parameters?.operation === 'completion');

	const triggerNode = computed<INodeUi | undefined>(() =>
		isTrigger.value
			? undefined
			: workflowsStore.workflow.nodes.find((n) => n.type === FORM_TRIGGER_NODE_TYPE),
	);

	const inheritedTitle = computed<string>(
		() => (triggerNode.value?.parameters?.formTitle as string) || '',
	);

	const inheritedDescription = computed<string>(
		() => (triggerNode.value?.parameters?.formDescription as string) || '',
	);

	const inheritedSubmitLabel = computed<string>(() => {
		const opts = triggerNode.value?.parameters?.options as INodeParameters | undefined;
		return (opts?.buttonLabel as string) || '';
	});

	// -------------------------------------------------------------------------
	// Local state
	// -------------------------------------------------------------------------

	const respondWith = ref<string>('text');

	const fields = ref<FormFieldDraft[]>([]);
	const formTitle = ref('');
	const formDescription = ref('');
	const submitLabel = ref('');
	const completionTitle = ref('');
	const completionMessage = ref('');
	const redirectUrl = ref('');
	const responseText = ref('');
	const selectedFieldId = ref<string | null>(null);
	const selectedFormElement = ref<'title' | 'description' | 'submit' | null>(null);

	// -------------------------------------------------------------------------
	// Init
	// -------------------------------------------------------------------------

	function initFromNode() {
		if (!node.value) return;
		const params = node.value.parameters;
		const options = params.options as INodeParameters | undefined;

		if (isCompletion.value) {
			respondWith.value = (params.respondWith as string) || 'text';
			completionTitle.value = (params.completionTitle as string) || '';
			completionMessage.value = (params.completionMessage as string) || '';
			redirectUrl.value = (params.redirectUrl as string) || '';
			responseText.value = (params.responseText as string) || '';
		} else {
			const rawFields = (params.formFields as { values?: INodeParameters[] })?.values ?? [];
			fields.value = rawFields.map(fromNodeParam);

			if (isTrigger.value) {
				formTitle.value = (params.formTitle as string) || '';
				formDescription.value = (params.formDescription as string) || '';
			} else {
				formTitle.value = (options?.formTitle as string) || '';
				formDescription.value = (options?.formDescription as string) || '';
			}
			submitLabel.value = (options?.buttonLabel as string) || '';
		}
		selectedFieldId.value = null;
	}

	initFromNode();

	// -------------------------------------------------------------------------
	// Unsaved-changes detection
	// -------------------------------------------------------------------------

	function savedTitle(): string {
		if (!node.value) return '';
		const p = node.value.parameters;
		if (isTrigger.value) return (p.formTitle as string) || '';
		return ((p.options as INodeParameters | undefined)?.formTitle as string) || '';
	}

	function savedDescription(): string {
		if (!node.value) return '';
		const p = node.value.parameters;
		if (isTrigger.value) return (p.formDescription as string) || '';
		return ((p.options as INodeParameters | undefined)?.formDescription as string) || '';
	}

	function savedSubmitLabel(): string {
		const opts = node.value?.parameters?.options as INodeParameters | undefined;
		return (opts?.buttonLabel as string) || '';
	}

	function savedFields(): INodeParameters[] {
		return (node.value?.parameters?.formFields as { values?: INodeParameters[] })?.values ?? [];
	}

	const hasUnsavedChanges = computed(() => {
		if (isCompletion.value) {
			const p = node.value?.parameters ?? {};
			if (respondWith.value !== ((p.respondWith as string) || 'text')) return true;
			if (completionTitle.value !== ((p.completionTitle as string) || '')) return true;
			if (completionMessage.value !== ((p.completionMessage as string) || '')) return true;
			if (redirectUrl.value !== ((p.redirectUrl as string) || '')) return true;
			if (responseText.value !== ((p.responseText as string) || '')) return true;
			return false;
		}
		if (formTitle.value !== savedTitle()) return true;
		if (formDescription.value !== savedDescription()) return true;
		if (submitLabel.value !== savedSubmitLabel()) return true;
		const canonicalize = (p: Record<string, unknown>) =>
			Object.fromEntries(
				Object.entries(p)
					.filter(([, v]) => v !== undefined && v !== '')
					.sort(([a], [b]) => a.localeCompare(b)),
			);
		const current = JSON.stringify(fields.value.map(toNodeParam).map(canonicalize));
		const saved = JSON.stringify(savedFields().map(canonicalize));
		return current !== saved;
	});

	// -------------------------------------------------------------------------
	// Field operations
	// -------------------------------------------------------------------------

	const selectedField = computed(
		() => fields.value.find((f) => f._id === selectedFieldId.value) ?? null,
	);

	// -------------------------------------------------------------------------
	// Validation
	// -------------------------------------------------------------------------

	function getFieldErrors(field: FormFieldDraft): string[] {
		const errors: string[] = [];
		if (field.fieldType !== 'html' && field.fieldType !== 'hiddenField' && !field.fieldLabel) {
			errors.push('label');
		}
		return errors;
	}

	const fieldErrors = computed<Record<string, string[]>>(() =>
		Object.fromEntries(fields.value.map((f) => [f._id, getFieldErrors(f)])),
	);

	function addField(type: FormFieldType, atIndex?: number): string {
		const draft: FormFieldDraft = {
			_id: crypto.randomUUID(),
			fieldType: type,
			fieldLabel: '',
			fieldName: '',
			...(FIELD_TYPES_WITH_OPTIONS.has(type) ? { fieldOptions: { values: [{ option: '' }] } } : {}),
		};
		if (atIndex !== undefined) {
			fields.value.splice(atIndex, 0, draft);
		} else {
			fields.value.push(draft);
		}
		return draft._id;
	}

	function removeField(id: string) {
		const idx = fields.value.findIndex((f) => f._id === id);
		if (idx === -1) return;
		fields.value.splice(idx, 1);
		if (selectedFieldId.value === id) {
			selectedFieldId.value = fields.value[idx]?._id ?? fields.value[idx - 1]?._id ?? null;
		}
	}

	function updateField(id: string, patch: Partial<FormFieldDraft>) {
		const field = fields.value.find((f) => f._id === id);
		if (!field) return;

		// When switching type, strip all type-exclusive props first to avoid stale keys.
		if (patch.fieldType && patch.fieldType !== field.fieldType) {
			for (const key of TYPE_EXCLUSIVE_KEYS) {
				delete (field as Record<string, unknown>)[key];
			}
			if (FIELD_TYPES_WITH_OPTIONS.has(patch.fieldType)) {
				field.fieldOptions = { values: [{ option: '' }] };
			}
		}

		Object.assign(field, patch);
	}

	function selectField(id: string | null) {
		selectedFieldId.value = id;
		selectedFormElement.value = null;
	}

	function selectFormElement(el: 'title' | 'description' | 'submit' | null) {
		selectedFormElement.value = el;
		selectedFieldId.value = null;
	}

	// -------------------------------------------------------------------------
	// Save
	// -------------------------------------------------------------------------

	const isSaving = ref(false);

	async function save() {
		if (!node.value || !workflowsStore.workflowId) return;

		const nodeIdx = workflowsStore.workflow.nodes.findIndex((n) => n.id === nodeId);
		if (nodeIdx === -1) return;

		const target = workflowsStore.workflow.nodes[nodeIdx];
		const newParams = { ...target.parameters };

		if (isCompletion.value) {
			newParams.respondWith = respondWith.value;
			const rw = respondWith.value;
			if (rw === 'text' || rw === 'returnBinary') {
				newParams.completionTitle = completionTitle.value;
				newParams.completionMessage = completionMessage.value;
			} else if (rw === 'redirect') {
				newParams.redirectUrl = redirectUrl.value;
			} else if (rw === 'showText') {
				newParams.responseText = responseText.value;
			}
		} else {
			// formFields fixed collection
			newParams.formFields = { values: fields.value.map(toNodeParam) };

			// title / description
			if (isTrigger.value) {
				newParams.formTitle = formTitle.value;
				newParams.formDescription = formDescription.value;
			} else {
				const opts = { ...((newParams.options as Record<string, unknown>) ?? {}) };
				if (formTitle.value) opts.formTitle = formTitle.value;
				else delete opts.formTitle;
				if (formDescription.value) opts.formDescription = formDescription.value;
				else delete opts.formDescription;
				newParams.options = opts as INodeParameters;
			}

			// button label (always in options)
			const opts = { ...((newParams.options as Record<string, unknown>) ?? {}) };
			if (submitLabel.value) opts.buttonLabel = submitLabel.value;
			else delete opts.buttonLabel;
			newParams.options = opts as INodeParameters;
		}

		workflowsStore.workflow.nodes[nodeIdx].parameters = newParams;
		nodeHelpers.updateNodeParameterIssuesByName(target.name);

		isSaving.value = true;
		try {
			await workflowsStore.updateWorkflow(workflowsStore.workflowId, {
				nodes: workflowsStore.workflow.nodes,
				versionId: workflowsStore.workflow.versionId,
			});
		} finally {
			isSaving.value = false;
		}
	}

	return {
		fields,
		formTitle,
		formDescription,
		submitLabel,
		completionTitle,
		completionMessage,
		redirectUrl,
		responseText,
		respondWith,
		inheritedTitle,
		inheritedDescription,
		inheritedSubmitLabel,
		selectedField,
		selectedFieldId,
		selectedFormElement,
		isTrigger,
		isCompletion,
		hasUnsavedChanges,
		isSaving,
		fieldErrors,
		addField,
		removeField,
		updateField,
		selectField,
		selectFormElement,
		save,
	};
}
