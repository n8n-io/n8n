import { ref } from 'vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { FORM_TRIGGER_NODE_TYPE, FORM_NODE_TYPE } from '@/app/constants/nodeTypes';
import type { INodeUi } from '@/Interface';
import { deepCopy } from 'n8n-workflow';

/**
 * Represents a form field with its identifier and label
 */
export interface FormFieldSnapshot {
	index: number;
	fieldLabel: string;
	fieldName?: string;
	fieldType?: string;
}

/**
 * Represents a detected field rename
 */
export interface FormFieldRename {
	oldLabel: string;
	newLabel: string;
	nodeName: string;
}

interface RawFormField {
	fieldLabel?: string;
	fieldName?: string;
	fieldType?: string;
}

/**
 * Extracts form fields from node parameters
 */
function extractFormFields(node: INodeUi | null): FormFieldSnapshot[] {
	if (!node) return [];

	const formFieldsParam = node.parameters?.formFields as { values?: RawFormField[] } | undefined;

	if (!formFieldsParam?.values) return [];

	return formFieldsParam.values.map((field, index) => ({
		index,
		fieldLabel: field.fieldLabel ?? '',
		fieldName: field.fieldName,
		fieldType: field.fieldType,
	}));
}

/**
 * Checks if a node is a Form-type node (Form Trigger or Form)
 */
function isFormNode(node: INodeUi | null): boolean {
	if (!node) return false;
	return node.type === FORM_TRIGGER_NODE_TYPE || node.type === FORM_NODE_TYPE;
}

/**
 * Composable for tracking form field renames between NDV open and close
 */
export function useFormFieldRenameTracking() {
	const workflowsStore = useWorkflowsStore();

	// Snapshot of form fields when NDV was opened
	const initialFormFields = ref<FormFieldSnapshot[]>([]);
	const trackedNodeName = ref<string | null>(null);

	/**
	 * Called when NDV opens for a Form node
	 * Captures the initial state of form fields
	 */
	function captureInitialFormFields(node: INodeUi | null): void {
		if (!isFormNode(node)) {
			initialFormFields.value = [];
			trackedNodeName.value = null;
			return;
		}

		trackedNodeName.value = node?.name ?? null;
		initialFormFields.value = deepCopy(extractFormFields(node));
	}

	/**
	 * Called when NDV closes
	 * Compares current fields with initial snapshot to detect renames
	 *
	 * Heuristic approach (until we have stable UUIDs):
	 * - Match fields by same index and same fieldType
	 * - If label changed, it's a rename
	 * - Skip if the old label still exists elsewhere (ambiguous)
	 */
	function detectFieldRenames(): FormFieldRename[] {
		if (!trackedNodeName.value) return [];

		const currentNode = workflowsStore.getNodeByName(trackedNodeName.value);
		if (!currentNode) return [];

		const currentFields = extractFormFields(currentNode);
		const renames: FormFieldRename[] = [];

		// Get all current labels for ambiguity check
		const currentLabels = new Set(currentFields.map((f) => f.fieldLabel));

		// Compare fields by index and type to detect renames
		for (const currentField of currentFields) {
			const initialField = initialFormFields.value.find(
				(f) => f.index === currentField.index && f.fieldType === currentField.fieldType,
			);

			if (!initialField) continue;
			if (initialField.fieldLabel === currentField.fieldLabel) continue;

			// Skip if the old label still exists in current fields (ambiguous case)
			// This handles the "rename A→B, add new A" scenario
			if (currentLabels.has(initialField.fieldLabel)) {
				continue;
			}

			renames.push({
				oldLabel: initialField.fieldLabel,
				newLabel: currentField.fieldLabel,
				nodeName: trackedNodeName.value,
			});
		}

		return renames;
	}

	/**
	 * Applies field renames to expressions across the workflow
	 * Uses Workflow.renameFormField() to update all expressions
	 */
	function applyFieldRenames(renames: FormFieldRename[]): void {
		if (renames.length === 0) return;

		// Get the workflow object
		const workflow = workflowsStore.cloneWorkflowObject();

		for (const rename of renames) {
			// Apply the rename to the workflow
			workflow.renameFormField(rename.nodeName, rename.oldLabel, rename.newLabel);
		}

		// Update the store with the modified nodes
		workflowsStore.setNodes(Object.values(workflow.nodes));
	}

	/**
	 * Clears the tracking state
	 */
	function clearTracking(): void {
		initialFormFields.value = [];
		trackedNodeName.value = null;
	}

	/**
	 * Full flow: detect renames and apply them
	 * Called when NDV closes
	 */
	function onNdvClose(): void {
		const renames = detectFieldRenames();
		applyFieldRenames(renames);
		clearTracking();
	}

	return {
		captureInitialFormFields,
		detectFieldRenames,
		applyFieldRenames,
		clearTracking,
		onNdvClose,
		// Expose for debugging/testing
		initialFormFields,
		trackedNodeName,
	};
}
