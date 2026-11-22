import type { CustomActionDraft, CustomActionInput } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import type { EditableEntry, EditableInput, EditableRequest, LocalIssue } from './wizard.types';

/** The same rule as the server: an input name is a camelCase identifier. */
export const INPUT_NAME_PATTERN = /^[a-z][A-Za-z0-9]*$/;

/** Parameter names that the generated node uses itself. The server rejects them as input names. */
const RESERVED_INPUT_NAMES = [
	'operation',
	'resource',
	'authentication',
	'requestOptions',
	'additionalFields',
	'customActionId',
	'customActionName',
];

const PLACEHOLDER_PATTERN = /\{([^{}]*)\}/g;

let idCounter = 0;
const nextId = () => `wizard-${++idCounter}`;

export function createEntry(key = '', value = ''): EditableEntry {
	return { id: nextId(), key, value };
}

export function createInput(partial: Partial<Omit<EditableInput, 'id'>> = {}): EditableInput {
	return {
		name: '',
		displayName: '',
		description: '',
		type: 'string',
		required: false,
		defaultText: '',
		optionsText: '',
		target: 'body',
		key: '',
		...partial,
		id: nextId(),
	};
}

export function emptyRequest(): EditableRequest {
	return { method: 'GET', url: '', headers: [], query: [], bodyType: 'none', bodyText: '' };
}

/** `line_items[0].price` becomes `lineItems0Price`, `X-Api-Version` becomes `xApiVersion`. */
export function toIdentifier(key: string): string {
	const parts = key.split(/[^A-Za-z0-9]+/).filter(Boolean);
	if (parts.length === 0) return 'value';
	const camel = parts
		.map((part, index) =>
			index === 0
				? part.charAt(0).toLowerCase() + part.slice(1)
				: part.charAt(0).toUpperCase() + part.slice(1),
		)
		.join('');
	return INPUT_NAME_PATTERN.test(camel) ? camel : `field${camel}`;
}

/** `line_items[0].unit_price` becomes `Unit Price`. */
export function toDisplayName(key: string): string {
	const last =
		key
			.split(/[.[\]]+/)
			.filter(Boolean)
			.pop() ?? key;
	const words = last
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.split(/[^A-Za-z0-9]+/)
		.filter(Boolean);
	return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'Value';
}

/** Adds a number to the name until no other input and no reserved name uses it. */
export function uniqueName(base: string, used: Set<string>): string {
	let name = base;
	for (let suffix = 2; used.has(name) || RESERVED_INPUT_NAMES.includes(name); suffix++) {
		name = `${base}${suffix}`;
	}
	used.add(name);
	return name;
}

/** The placeholder names in the path of a URL. The server allows placeholders only there. */
export function urlPlaceholders(url: string): string[] {
	const split = url.search(/[?#]/);
	const path = split === -1 ? url : url.slice(0, split);
	const names = [...path.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1]);
	return [...new Set(names.filter((name) => INPUT_NAME_PATTERN.test(name)))];
}

/** Adds a URL input for each new placeholder and removes the URL inputs without a placeholder. */
export function syncUrlInputs(url: string, inputs: EditableInput[]): EditableInput[] {
	const names = urlPlaceholders(url);
	const kept = inputs.filter((input) => input.target !== 'url' || names.includes(input.key));
	const added = names
		.filter((name) => !kept.some((input) => input.target === 'url' && input.key === name))
		.map((name) =>
			createInput({
				name,
				key: name,
				target: 'url',
				required: true,
				displayName: toDisplayName(name),
			}),
		);
	return [...kept, ...added];
}

function parseOptions(text: string): NonNullable<CustomActionInput['options']> {
	return text
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const separator = line.indexOf('=');
			if (separator === -1) return { name: line, value: line };
			const name = line.slice(0, separator).trim();
			const value = line.slice(separator + 1).trim();
			return { name: name || value, value: value || name };
		});
}

function formatOptions(options: CustomActionInput['options']): string {
	return (options ?? [])
		.map((option) =>
			option.name === option.value ? option.name : `${option.name}=${option.value}`,
		)
		.join('\n');
}

function parseDefault(input: EditableInput): {
	value?: CustomActionInput['default'];
	valid: boolean;
} {
	const text = input.defaultText;
	if (text.trim() === '') return { valid: true };
	switch (input.type) {
		case 'number': {
			const value = Number(text);
			return Number.isFinite(value) ? { value, valid: true } : { valid: false };
		}
		case 'boolean':
			if (text === 'true' || text === 'false') return { value: text === 'true', valid: true };
			return { valid: false };
		default:
			return { value: text, valid: true };
	}
}

function entriesToRecord(
	entries: EditableEntry[],
	path: string,
	issues: LocalIssue[],
): Record<string, string> {
	const record: Record<string, string> = {};
	for (const entry of entries) {
		const key = entry.key.trim();
		if (key === '' && entry.value === '') continue;
		if (key === '') {
			issues.push({ path, code: 'missing_key' });
			continue;
		}
		record[key] = entry.value;
	}
	return record;
}

function parseBody(request: EditableRequest, issues: LocalIssue[]): Record<string, unknown> {
	if (request.bodyType === 'none' || request.bodyText.trim() === '') return {};
	try {
		const parsed: unknown = JSON.parse(request.bodyText);
		if (isRecord(parsed)) return parsed;
	} catch {
		// Reported below.
	}
	issues.push({ path: 'request.body', code: 'invalid_json' });
	return {};
}

export interface DraftSource {
	name: string;
	description: string;
	request: EditableRequest;
	inputs: EditableInput[];
}

/**
 * Builds the draft that the server checks. Keeps every input in its place, so the issue path
 * `inputs[2]` of the server points to the third input in the wizard.
 */
export function buildDraft(source: DraftSource): {
	draft: CustomActionDraft;
	issues: LocalIssue[];
} {
	const issues: LocalIssue[] = [];
	const { request } = source;

	if (source.name.trim() === '') issues.push({ path: 'name', code: 'required' });
	if (request.url.trim() === '') issues.push({ path: 'request.url', code: 'required' });

	const inputs = source.inputs.map((input, index): CustomActionInput => {
		const at = (field: string) => `inputs[${index}].${field}`;
		if (!INPUT_NAME_PATTERN.test(input.name)) {
			issues.push({ path: at('name'), code: 'invalid_input_name' });
		}
		if (input.displayName.trim() === '') issues.push({ path: at('displayName'), code: 'required' });
		if (input.key.trim() === '') issues.push({ path: at('key'), code: 'required' });
		const parsedDefault = parseDefault(input);
		if (!parsedDefault.valid) {
			issues.push({
				path: at('default'),
				code: input.type === 'number' ? 'invalid_number' : 'invalid_boolean',
			});
		}
		return {
			name: input.name,
			displayName: input.displayName.trim(),
			description: input.description.trim() || undefined,
			type: input.type,
			options: input.type === 'options' ? parseOptions(input.optionsText) : undefined,
			required: input.required,
			default: parsedDefault.value,
			target: input.target,
			key: input.key.trim(),
		};
	});

	const draft: CustomActionDraft = {
		name: source.name.trim(),
		description: source.description.trim() || undefined,
		inputs,
		request: {
			method: request.method,
			url: request.url.trim(),
			headers: entriesToRecord(request.headers, 'request.headers', issues),
			query: entriesToRecord(request.query, 'request.query', issues),
			bodyType: request.bodyType,
			body: parseBody(request, issues),
		},
	};
	return { draft, issues };
}

/** Turns a stored draft into the form that the wizard edits. */
export function draftToSource(draft: CustomActionDraft): DraftSource {
	const { request } = draft;
	const hasBody = Object.keys(request.body).length > 0;
	return {
		name: draft.name,
		description: draft.description ?? '',
		request: {
			method: request.method,
			url: request.url,
			headers: Object.entries(request.headers).map(([key, value]) => createEntry(key, value)),
			query: Object.entries(request.query).map(([key, value]) => createEntry(key, value)),
			bodyType: request.bodyType,
			bodyText: hasBody ? JSON.stringify(request.body, null, 2) : '',
		},
		inputs: draft.inputs.map((input) =>
			createInput({
				name: input.name,
				displayName: input.displayName,
				description: input.description ?? '',
				type: input.type,
				required: input.required,
				defaultText: input.default === undefined ? '' : String(input.default),
				optionsText: formatOptions(input.options),
				target: input.target,
				key: input.key,
			}),
		),
	};
}
