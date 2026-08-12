/**
 * Coerce an eval mock's structured-output content to the schema the workflow
 * node declared.
 *
 * Information Extractor / Text Classifier nodes declare a strict JSON Schema
 * (`additionalProperties: false`, fixed properties) and deliver it to the model
 * as prompt text (LangChain `StructuredOutputParser` format instructions), so
 * the mock LLM can invent extra fields or a stray wrapper key that the node then
 * rejects with "Model output doesn't fit required format". A real OpenAI
 * structured-output response conforms to the schema; this makes the mock do the
 * same by pruning the generated content to the declared shape.
 *
 * Every step degrades to a no-op on anything unexpected (no schema found,
 * non-JSON content, unparseable instructions), so the common no-schema path is
 * never disturbed.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A parsed JSON value is treated as a schema only if it carries schema markers. */
function looksLikeJsonSchema(value: unknown): value is Record<string, unknown> {
	return (
		isRecord(value) &&
		('properties' in value || 'additionalProperties' in value || value.type === 'object')
	);
}

/** Flatten a message `content` field (string or content-part array) to text. */
function contentToText(content: unknown): string {
	if (typeof content === 'string') return content;
	if (Array.isArray(content)) {
		return content
			.map((part) =>
				typeof part === 'string'
					? part
					: isRecord(part) && typeof part.text === 'string'
						? part.text
						: '',
			)
			.join('\n');
	}
	return '';
}

const FENCED_JSON = /```(?:json)?\s*([\s\S]*?)```/gi;

/**
 * Find the structured-output JSON Schema a `/v1/responses` or chat-completions
 * request declares, from any of: native Responses `text.format.schema`, native
 * chat `response_format.json_schema.schema`, or a fenced ```json``` schema block
 * embedded in the conversation as StructuredOutputParser format instructions.
 * Returns undefined when none is present.
 */
export function discoverStructuredOutputSchema(body: unknown): Record<string, unknown> | undefined {
	if (!isRecord(body)) return undefined;

	// (1) native Responses API — text.format.schema
	const text = body.text;
	if (isRecord(text) && isRecord(text.format) && looksLikeJsonSchema(text.format.schema)) {
		return text.format.schema;
	}

	// (2) native chat-completions — response_format.json_schema.schema
	const responseFormat = body.response_format;
	if (
		isRecord(responseFormat) &&
		isRecord(responseFormat.json_schema) &&
		looksLikeJsonSchema(responseFormat.json_schema.schema)
	) {
		return responseFormat.json_schema.schema;
	}

	// (3) format-instructions prose — the last fenced ```json``` block that is a schema
	const items = Array.isArray(body.input)
		? body.input
		: Array.isArray(body.messages)
			? body.messages
			: [];
	let found: Record<string, unknown> | undefined;
	for (const item of items) {
		if (!isRecord(item)) continue;
		const itemText = contentToText(item.content);
		if (!itemText.includes('```')) continue;
		FENCED_JSON.lastIndex = 0;
		let match: RegExpExecArray | null;
		while ((match = FENCED_JSON.exec(itemText)) !== null) {
			try {
				const parsed: unknown = JSON.parse(match[1].trim());
				if (looksLikeJsonSchema(parsed)) found = parsed; // keep the last schema-shaped block
			} catch {
				// not JSON — ignore this fence
			}
		}
	}
	return found;
}

function schemaProperties(schema: unknown): Record<string, unknown> | undefined {
	return isRecord(schema) && isRecord(schema.properties) ? schema.properties : undefined;
}

function isStrictObject(schema: unknown): boolean {
	return isRecord(schema) && schema.additionalProperties === false;
}

/**
 * Drop keys a strict object schema doesn't declare; recurse into declared
 * properties and array items. Leaves values untouched when the schema isn't
 * strict or doesn't describe the value's shape.
 */
function pruneToSchema(value: unknown, schema: unknown): unknown {
	if (isRecord(value)) {
		const props = schemaProperties(schema);
		if (!props) return value;
		const strict = isStrictObject(schema);
		const out: Record<string, unknown> = {};
		for (const [key, val] of Object.entries(value)) {
			const declared = key in props;
			if (strict && !declared) continue; // drop what the schema forbids
			out[key] = declared ? pruneToSchema(val, props[key]) : val;
		}
		return out;
	}
	if (Array.isArray(value) && isRecord(schema) && schema.type === 'array') {
		return value.map((element) => pruneToSchema(element, schema.items));
	}
	return value;
}

/**
 * Conform a generated content string to a declared schema: unwrap a stray
 * single-key wrapper the schema doesn't declare, then prune keys the strict
 * schema forbids. No schema, non-JSON content, or any failure => return the
 * content unchanged. Re-wraps in a ```json``` block only if the input was fenced.
 */
export function conformContentToSchema(
	content: string,
	schema: Record<string, unknown> | undefined,
): string {
	if (!schema) return content;

	const fenced = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(content.trim());
	const jsonText = fenced ? fenced[1].trim() : content.trim();

	let parsed: unknown;
	try {
		parsed = JSON.parse(jsonText);
	} catch {
		return content;
	}

	// Unwrap a stray single-key wrapper (e.g. `{ output: {...} }`) that the schema
	// does not declare. A wrapper the schema DOES declare (e.g. `__structured__output`)
	// is a property, so it fails this test and is preserved.
	if (isRecord(parsed) && isStrictObject(schema)) {
		const keys = Object.keys(parsed);
		const props = schemaProperties(schema) ?? {};
		const soleKey = keys[0];
		if (keys.length === 1 && !(soleKey in props) && isRecord(parsed[soleKey])) {
			parsed = parsed[soleKey];
		}
	}

	const conformed = pruneToSchema(parsed, schema);
	const serialized = JSON.stringify(conformed);
	return fenced ? `\`\`\`json\n${serialized}\n\`\`\`` : serialized;
}

/** Discover the declared schema from the request body and conform `content` to it. */
export function applyStructuredOutputConformance(content: string, body: unknown): string {
	return conformContentToSchema(content, discoverStructuredOutputSchema(body));
}
