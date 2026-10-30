import { isRecord } from '@n8n/utils/is-record';
import { FORM_TRIGGER_NODE_TYPE, type INode } from 'n8n-workflow';

/**
 * The Webhook node's output keys. The mock model sometimes gives a Form Trigger this shape,
 * but a real Form Trigger puts the fields at the top level (nodes-base Form/utils/utils.ts).
 */
const WEBHOOK_ENVELOPE_KEYS = new Set([
	'headers',
	'query',
	'params',
	'body',
	'webhookUrl',
	'executionMode',
	'binary',
]);

/** Keys the Form Trigger adds next to the fields; never renamed. */
const FORM_OUTPUT_KEYS = new Set([
	'submittedAt',
	'formMode',
	'formQueryParameters',
	'headers',
	'user',
	'binary',
]);

interface DeclaredField {
	/** The key the node emits the field's value under. */
	key: string;
	/** Label and field name, the spellings a model may use instead. */
	spellings: string[];
}

function nonEmpty(value: unknown): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Case, whitespace, punctuation and symbols removed: `Customer (ID)` and `customer_id` agree. */
function normalizeKey(key: string): string {
	return key.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
}

function declaredFields(node: INode): DeclaredField[] {
	const formFields: unknown = node.parameters?.formFields;
	const values = isRecord(formFields) ? formFields.values : undefined;
	if (!Array.isArray(values)) return [];

	const fields: DeclaredField[] = [];
	for (const field of values) {
		// An html field is emitted under its elementName, not a label.
		if (!isRecord(field) || field.fieldType === 'html') continue;
		const label = nonEmpty(field.fieldLabel);
		const name = nonEmpty(field.fieldName);
		// Same rule as the Form Trigger's getFieldIdentifier.
		const key = node.typeVersion >= 2.4 && name ? name : (label ?? name);
		if (!key) continue;
		fields.push({ key, spellings: [label, name].filter((s): s is string => s !== undefined) });
	}
	return fields;
}

function unwrapWebhookEnvelope(
	node: INode,
	content: Record<string, unknown>,
	fields: DeclaredField[],
): Record<string, unknown> {
	const { body, headers, query, binary } = content;
	if (!isRecord(body) || fields.some((field) => field.key === 'body')) return content;
	// The model sometimes adds Form Trigger keys (submittedAt, formMode) to the envelope.
	const isEnvelopeKey = (key: string) =>
		WEBHOOK_ENVELOPE_KEYS.has(key) || FORM_OUTPUT_KEYS.has(key);
	if (!Object.keys(content).every(isEnvelopeKey)) return content;

	const flat: Record<string, unknown> = { ...body };
	for (const key of FORM_OUTPUT_KEYS) {
		if (WEBHOOK_ENVELOPE_KEYS.has(key) || content[key] === undefined) continue;
		if (flat[key] === undefined) flat[key] = content[key];
	}
	const options: unknown = node.parameters?.options;
	if (isRecord(options) && options.showHeaders === true && isRecord(headers)) {
		flat.headers = headers;
	}
	if (isRecord(query) && Object.keys(query).length > 0 && flat.formQueryParameters === undefined) {
		flat.formQueryParameters = query;
	}
	if (binary !== undefined && flat.binary === undefined) flat.binary = binary;
	return flat;
}

/** Rename a key to its field's emitted key, only when exactly one field matches it. */
function rekeyToDeclaredFields(
	content: Record<string, unknown>,
	fields: DeclaredField[],
): Record<string, unknown> {
	const emittedKeys = new Set(fields.map((field) => field.key));
	const renames = new Map<string, string>();
	const claims = new Map<string, number>();
	for (const key of Object.keys(content)) {
		if (emittedKeys.has(key) || FORM_OUTPUT_KEYS.has(key)) continue;
		const normalized = normalizeKey(key);
		if (normalized === '') continue;
		const matches = fields.filter((field) =>
			field.spellings.some((spelling) => normalizeKey(spelling) === normalized),
		);
		if (matches.length !== 1 || Object.hasOwn(content, matches[0].key)) continue;
		renames.set(key, matches[0].key);
		claims.set(matches[0].key, (claims.get(matches[0].key) ?? 0) + 1);
	}
	if (renames.size === 0) return content;

	const rekeyed: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(content)) {
		const target = renames.get(key);
		rekeyed[target !== undefined && claims.get(target) === 1 ? target : key] = value;
	}
	return rekeyed;
}

/** A declared field with no value is emitted as null (`addFormResponseDataToReturnItem`). */
function addMissingFields(
	content: Record<string, unknown>,
	fields: DeclaredField[],
): Record<string, unknown> {
	const missing = fields.filter((field) => !Object.hasOwn(content, field.key));
	if (missing.length === 0) return content;
	const filled = { ...content };
	for (const field of missing) filled[field.key] = null;
	return filled;
}

/**
 * Give model-written Form Trigger output the shape the real node emits: fields at the top
 * level under their emitted keys (null when missing), plus `submittedAt` and `formMode`.
 * Other triggers pass through.
 */
export function normalizeFormTriggerContent(
	node: INode,
	content: Record<string, unknown>,
	now = new Date(),
): Record<string, unknown> {
	if (node.type !== FORM_TRIGGER_NODE_TYPE) return content;

	const fields = declaredFields(node);
	const flat = addMissingFields(
		rekeyToDeclaredFields(unwrapWebhookEnvelope(node, content, fields), fields),
		fields,
	);
	return {
		...flat,
		submittedAt: flat.submittedAt ?? now.toISOString(),
		formMode: flat.formMode ?? 'production',
	};
}
