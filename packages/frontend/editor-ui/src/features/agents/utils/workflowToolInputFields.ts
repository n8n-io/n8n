import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, type INode, type JsonValue } from 'n8n-workflow';
import { SUPPORTED_WORKFLOW_TOOL_TRIGGERS } from '@n8n/api-types';
import type { IWorkflowDb } from '@/Interface';

export type WorkflowToolInputFieldDef = {
	name: string;
	type?: string;
};

const SUPPORTED_TRIGGER_TYPES = new Set<string>(SUPPORTED_WORKFLOW_TOOL_TRIGGERS);

/**
 * Mirror of the backend `detectTriggerNode` rule: the first node in workflow
 * order whose type is in `SUPPORTED_WORKFLOW_TOOL_TRIGGERS`. Keeping this in
 * sync prevents the UI from offering bindings for a trigger the runtime
 * ignores (e.g. an Execute Workflow Trigger placed after a Chat Trigger).
 */
export function detectWorkflowToolTrigger(workflow: IWorkflowDb | undefined): INode | undefined {
	if (!workflow) return undefined;
	return (workflow.nodes ?? []).find((node) => SUPPORTED_TRIGGER_TYPES.has(node.type));
}

/**
 * Read declared Execute Workflow Trigger input fields from a project workflow.
 * Returns an empty list unless the runtime-selected trigger is the Execute
 * Workflow Trigger and it is not in passthrough mode.
 */
export function listWorkflowToolInputFields(
	workflow: IWorkflowDb | undefined,
): WorkflowToolInputFieldDef[] {
	if (!workflow) return [];

	const trigger = detectWorkflowToolTrigger(workflow);
	if (!trigger || trigger.type !== EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE) return [];

	const params = trigger.parameters ?? {};
	// Mirror the runtime fallback `getNodeParameter(INPUT_SOURCE, 0, PASSTHROUGH)`:
	// absent inputSource (legacy / imported triggers) means passthrough, so no
	// field bindings are offered.
	const inputSource = (params.inputSource as string | undefined) ?? 'passthrough';

	if (inputSource === 'passthrough') return [];

	if (inputSource === 'jsonExample') {
		const jsonExample = params.jsonExample as string | undefined;
		if (!jsonExample) return [];
		let parsed: unknown;
		try {
			parsed = JSON.parse(jsonExample);
		} catch {
			return [];
		}
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return [];
		return Object.entries(parsed as Record<string, unknown>).map(([name, value]) => ({
			name,
			type: value === null ? 'any' : Array.isArray(value) ? 'array' : typeof value,
		}));
	}

	const workflowInputs = params.workflowInputs as
		| { values?: Array<{ name: string; type?: string }> }
		| undefined;

	return (workflowInputs?.values ?? []).filter(
		(field): field is WorkflowToolInputFieldDef =>
			typeof field.name === 'string' && field.name.length > 0,
	);
}

/** Format a stored fixed binding for the text input. */
export function formatWorkflowToolFixedValue(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

/**
 * Type guard for a recursive JSON value. Used to safely narrow `JSON.parse`
 * output before storing it as a fixed binding value typed `JsonValue`.
 */
function isJsonValue(value: unknown): value is JsonValue {
	if (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	) {
		return true;
	}
	if (Array.isArray(value)) {
		return value.every(isJsonValue);
	}
	if (typeof value === 'object') {
		return Object.values(value).every(isJsonValue);
	}
	return false;
}

/**
 * Convert a typed text-input value into the Execute Workflow Trigger field type.
 * Incomplete JSON / numbers stay as the raw string so the user can keep typing.
 */
export function parseWorkflowToolFixedValue(raw: string, type?: string): JsonValue {
	if (type === 'string' || type === undefined) return raw;

	const trimmed = raw.trim();
	if (trimmed === '') return null;

	switch (type) {
		case 'number': {
			const parsed = Number(trimmed);
			return Number.isFinite(parsed) ? parsed : raw;
		}
		case 'boolean': {
			const lower = trimmed.toLowerCase();
			if (lower === 'true') return true;
			if (lower === 'false') return false;
			return raw;
		}
		case 'array':
		case 'object': {
			try {
				const parsed: unknown = JSON.parse(trimmed);
				if (!isJsonValue(parsed)) return raw;
				if (type === 'array' && Array.isArray(parsed)) return parsed;
				if (
					type === 'object' &&
					typeof parsed === 'object' &&
					parsed !== null &&
					!Array.isArray(parsed)
				) {
					return parsed;
				}
			} catch {
				// Keep the in-progress text until it is valid JSON of the declared type.
			}
			return raw;
		}
		case 'any': {
			try {
				const parsed: unknown = JSON.parse(trimmed);
				if (isJsonValue(parsed)) return parsed;
			} catch {
				// Keep the in-progress text until it is valid JSON.
			}
			return raw;
		}
		default:
			return raw;
	}
}
