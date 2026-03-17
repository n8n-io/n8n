import type { WorkflowSettings } from 'n8n-workflow';

const VIEWER_INPUT_TYPES: WorkflowSettings.ViewerInputType[] = [
	'text',
	'textarea',
	'number',
	'boolean',
	'file',
];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isViewerInputType(value: unknown): value is WorkflowSettings.ViewerInputType {
	return typeof value === 'string' && VIEWER_INPUT_TYPES.includes(value as WorkflowSettings.ViewerInputType);
}

function sanitizeViewerInputField(
	value: unknown,
): WorkflowSettings.ViewerInputField | null {
	if (!isRecord(value)) return null;

	const key = typeof value.key === 'string' ? value.key.trim() : '';
	const label = typeof value.label === 'string' ? value.label.trim() : '';
	const type = isViewerInputType(value.type) ? value.type : null;

	if (!key || !label || !type) return null;

	const field: WorkflowSettings.ViewerInputField = { key, label, type };

	if (typeof value.required === 'boolean') {
		field.required = value.required;
	}

	if (typeof value.placeholder === 'string' && value.placeholder.trim()) {
		field.placeholder = value.placeholder.trim();
	}

	if (typeof value.helpText === 'string' && value.helpText.trim()) {
		field.helpText = value.helpText.trim();
	}

	if (type === 'file' && typeof value.accept === 'string' && value.accept.trim()) {
		field.accept = value.accept.trim();
	}

	return field;
}

export function sanitizeViewerInputs(value: unknown): WorkflowSettings.ViewerInputField[] {
	if (!Array.isArray(value)) return [];

	const usedKeys = new Set<string>();
	const inputs: WorkflowSettings.ViewerInputField[] = [];

	for (const candidate of value) {
		const field = sanitizeViewerInputField(candidate);
		if (!field || usedKeys.has(field.key)) continue;
		usedKeys.add(field.key);
		inputs.push(field);
	}

	return inputs;
}

export function parseViewerInputsJson(value: string): {
	inputs: WorkflowSettings.ViewerInputField[];
	error?: 'invalid-json' | 'invalid-schema';
} {
	if (!value.trim()) return { inputs: [] };

	let parsed: unknown;
	try {
		parsed = JSON.parse(value);
	} catch {
		return { inputs: [], error: 'invalid-json' };
	}

	if (!Array.isArray(parsed)) {
		return { inputs: [], error: 'invalid-schema' };
	}

	const inputs = sanitizeViewerInputs(parsed);

	if (inputs.length !== parsed.length) {
		return { inputs: [], error: 'invalid-schema' };
	}

	return { inputs };
}
