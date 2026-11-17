/**
 * The Structured Output Parser (`@n8n/n8n-nodes-langchain.outputParserStructured`) at convert
 * time.
 *
 * The v1 node makes a JSON Schema from its parameters, a zod schema from that
 * (`@n8n/json-schema-to-zod`), and puts the zod schema in `{ output }`. LangChain then prints
 * the zod schema as JSON Schema again in the format instructions of the prompt, and zod checks
 * the answer of the model. This file does the three steps for a subset of JSON Schema where
 * each step is exact: it gives the text of the format instructions, and the shape that the
 * library node checks the answer with. For every other schema it gives the reason, and the
 * cluster runs in the fallback host.
 *
 * `ai-output-schema.test.ts` compares the instructions and the check with the real libraries.
 */
import { isRecord } from './types.ts';

/**
 * What zod checks for one value. `kind`: `string`, `number`, `integer`, `boolean`, `null`,
 * `any`, `enum` (`values`), `array` (`items`), `record` (an object with any keys), or `object`
 * (`keys`, and for each key its shape and whether the key is required).
 */
export interface OutputShape {
	kind: string;
	values?: string[];
	items?: OutputShape;
	keys?: string[];
	shapes?: OutputShape[];
	required?: boolean[];
	/** Keys that the schema does not name: `strip` drops them, `strict` fails, `keep` keeps them. */
	extra?: string;
}

/** The parser as the library node gets it. */
export interface StructuredOutput {
	/** The text that v1 adds to the prompt after a line break. */
	instructions: string;
	shape: OutputShape;
	/** False for versions before 1.3: the answer can have no `output`. */
	outputRequired: boolean;
}

/** A shape, and the JSON Schema that LangChain prints for it. */
interface Built {
	shape: OutputShape;
	json: Record<string, unknown>;
}

/** The deepest schema that the library node checks: the check calls itself for each level. */
const MAX_DEPTH = 16;

/** Keywords without a meaning for zod. */
const IGNORED = new Set(['$schema', '$id', '$comment', 'title', 'examples']);

const PRIMITIVES = new Set(['string', 'number', 'integer', 'boolean', 'null']);

/** A key that a plain object has without the answer of the model: zod reads it from the prototype. */
function unsafeKey(key: string): boolean {
	return (
		key === '__proto__' ||
		key === 'prototype' ||
		key === 'getPrototypeOf' ||
		Object.hasOwn(Object.prototype, key)
	);
}

function described(built: Built, description: unknown): Built | string {
	if (description === undefined || description === '') return built;
	if (typeof description !== 'string') return 'schema description';
	return { shape: built.shape, json: { ...built.json, description } };
}

/** The JSON Schema of an object shape, as `zod-to-json-schema` writes it. */
function objectJson(
	keys: string[],
	children: Built[],
	required: boolean[],
	extra: string,
): Record<string, unknown> {
	const properties: Record<string, unknown> = {};
	keys.forEach((key, k) => {
		properties[key] = children[k].json;
	});
	// A value of any type is never required.
	const names = keys.filter((_, k) => required[k] && children[k].shape.kind !== 'any');
	return {
		type: 'object',
		properties,
		...(names.length > 0 ? { required: names } : {}),
		additionalProperties: extra === 'keep' ? {} : false,
	};
}

function objectOf(keys: string[], children: Built[], required: boolean[], extra: string): Built {
	return {
		shape: { kind: 'object', keys, shapes: children.map((c) => c.shape), required, extra },
		json: objectJson(keys, children, required, extra),
	};
}

function arrayOf(items: Built): Built {
	return {
		shape: { kind: 'array', items: items.shape },
		json: items.shape.kind === 'any' ? { type: 'array' } : { type: 'array', items: items.json },
	};
}

const ANY: Built = { shape: { kind: 'any' }, json: {} };

/** The shape of one JSON Schema, as `@n8n/json-schema-to-zod` reads it, or the reason. */
function fromSchema(schema: unknown, depth: number): Built | string {
	if (depth > MAX_DEPTH) return 'schema depth';
	if (!isRecord(schema)) return 'schema is not an object';
	const allowed = (names: string[]): string | undefined => {
		for (const name of Object.keys(schema)) {
			if (name === 'type' || name === 'description' || IGNORED.has(name)) continue;
			if (!names.includes(name)) return `schema keyword ${name}`;
		}
		return undefined;
	};
	const type = schema.type;
	let built: Built;
	if (type === undefined) {
		const refused = allowed([]);
		if (refused !== undefined) return refused;
		built = ANY;
	} else if (typeof type !== 'string') {
		return 'schema type list';
	} else if (type === 'string' && schema.enum !== undefined) {
		const refused = allowed(['enum']);
		if (refused !== undefined) return refused;
		const values = schema.enum;
		if (!Array.isArray(values) || values.length < 2) return 'schema enum';
		const texts: string[] = [];
		for (const value of values) {
			if (typeof value !== 'string' || texts.includes(value)) return 'schema enum';
			texts.push(value);
		}
		built = { shape: { kind: 'enum', values: texts }, json: { type: 'string', enum: texts } };
	} else if (PRIMITIVES.has(type)) {
		const refused = allowed([]);
		if (refused !== undefined) return refused;
		built = { shape: { kind: type }, json: { type } };
	} else if (type === 'array') {
		const refused = allowed(['items']);
		if (refused !== undefined) return refused;
		// Without items, or with a false value, the items have any type. A list is a tuple.
		if (schema.items !== undefined && !isRecord(schema.items)) return 'schema items';
		const items = schema.items === undefined ? ANY : fromSchema(schema.items, depth + 1);
		if (typeof items === 'string') return items;
		built = arrayOf(items);
	} else if (type === 'object') {
		const refused = allowed(['properties', 'required', 'additionalProperties']);
		if (refused !== undefined) return refused;
		const properties = schema.properties;
		const additional = schema.additionalProperties;
		if (properties === undefined) {
			if (additional !== undefined || schema.required !== undefined) return 'schema record';
			built = {
				shape: { kind: 'record' },
				json: { type: 'object', additionalProperties: {} },
			};
		} else {
			if (!isRecord(properties)) return 'schema properties';
			if (schema.required !== undefined && !Array.isArray(schema.required)) {
				return 'schema required';
			}
			if (additional !== undefined && typeof additional !== 'boolean') {
				return 'schema additionalProperties';
			}
			const names: unknown[] = schema.required ?? [];
			const keys = Object.keys(properties);
			const children: Built[] = [];
			for (const key of keys) {
				if (unsafeKey(key)) return 'schema property name';
				const child = fromSchema(properties[key], depth + 1);
				if (typeof child === 'string') return child;
				children.push(child);
			}
			const required = keys.map((key) => names.includes(key));
			// With no property, the false value has no effect; the true value is another zod type.
			if (keys.length === 0 && additional !== undefined) return 'schema additionalProperties';
			const extra = additional === undefined ? 'strip' : additional ? 'keep' : 'strict';
			built = objectOf(keys, children, required, extra);
		}
	} else {
		return `schema type ${type}`;
	}
	return described(built, schema.description);
}

function exampleType(value: unknown): string {
	if (value === null) return 'null';
	if (Array.isArray(value)) return 'array';
	return typeof value;
}

function primitiveOf(type: string): Built {
	return { shape: { kind: type }, json: { type } };
}

/**
 * The shape of the schema that `generate-schema` makes from an example
 * (`generateSchemaFromExample` of v1). With `allRequired` (version 1.3 of the parser) every
 * property is required. Lists with items of more than one form give the reason: the generator
 * merges them.
 */
function fromExample(value: unknown, allRequired: boolean, depth: number): Built | string {
	if (depth > MAX_DEPTH) return 'example depth';
	const type = exampleType(value);
	if (Array.isArray(value)) {
		if (value.length === 0) return arrayOf(ANY);
		const types = value.map(exampleType);
		if (types.some((t) => t !== types[0])) return 'example list with mixed types';
		if (types[0] === 'array') return arrayOf(arrayOf(ANY));
		if (types[0] !== 'object') return arrayOf(primitiveOf(types[0]));
		const first: unknown = value[0];
		if (value.length === 1) {
			const items = fromExample(first, allRequired, depth + 1);
			return typeof items === 'string' ? items : arrayOf(items);
		}
		// More than one object: the generator merges the properties. The same keys with the same
		// primitive types give one object with all keys required.
		if (!isRecord(first)) return 'example list';
		const keys = Object.keys(first);
		const children: Built[] = [];
		for (const key of keys) {
			if (unsafeKey(key)) return 'example property name';
			const keyType = exampleType(first[key]);
			if (keyType === 'object' || keyType === 'array') return 'example list of nested objects';
			for (const other of value) {
				if (!isRecord(other) || Object.keys(other).join('\n') !== keys.join('\n')) {
					return 'example list of different objects';
				}
				if (exampleType(other[key]) !== keyType) return 'example list of different objects';
			}
			children.push(primitiveOf(keyType));
		}
		// The generator gives no list of required keys for objects without keys.
		return arrayOf(
			objectOf(
				keys,
				children,
				keys.map(() => true),
				'strip',
			),
		);
	}
	if (isRecord(value)) {
		const keys = Object.keys(value);
		const children: Built[] = [];
		for (const key of keys) {
			if (unsafeKey(key)) return 'example property name';
			const child = fromExample(value[key], allRequired, depth + 1);
			if (typeof child === 'string') return child;
			children.push(child);
		}
		return objectOf(
			keys,
			children,
			keys.map(() => allRequired),
			'strip',
		);
	}
	if (type === 'string' || type === 'number' || type === 'boolean' || type === 'null') {
		return primitiveOf(type);
	}
	return 'example value';
}

/** `getFormatInstructions` of LangChain's StructuredOutputParser for a printed schema. */
export function formatInstructions(schema: unknown): string {
	return `You must format your output as a JSON value that adheres to a given "JSON Schema" instance.

"JSON Schema" is a declarative language that allows you to annotate and validate JSON documents.

For example, the example "JSON Schema" instance {{"properties": {{"foo": {{"description": "a list of test words", "type": "array", "items": {{"type": "string"}}}}}}, "required": ["foo"]}}}}
would match an object with one required property, "foo". The "type" property specifies "foo" must be an "array", and the "description" property semantically describes it as "a list of test words". The items within "foo" must be strings.
Thus, the object {{"foo": ["bar", "baz"]}} is a well-formatted instance of this example "JSON Schema". The object {{"properties": {{"foo": ["bar", "baz"]}}}} is not well-formatted.

Your output will be parsed and type-checked according to the provided schema instance, so make sure all fields in your output match the schema exactly and there are no trailing commas!

Here is the JSON Schema instance your output must adhere to. Include the enclosing markdown codeblock:
\`\`\`json
${JSON.stringify(schema)}
\`\`\`
`;
}

/** The text of a schema parameter: a string, or an object that a generated workflow stores. */
function schemaText(raw: unknown): string | undefined {
	if (typeof raw === 'string') return raw.startsWith('=') ? undefined : raw;
	if (typeof raw === 'object' && raw !== null) return JSON.stringify(raw);
	return undefined;
}

/**
 * The parser of versions 1.2 and 1.3 without auto-fixing, from the parameters of the
 * sub-node, or the reason why the cluster stays in the host. The schema is a literal: an
 * expression can give another schema for each item.
 */
export function structuredOutput(
	version: number,
	parameters: Record<string, unknown>,
): StructuredOutput | string {
	if (version !== 1.2 && version !== 1.3) return `output parser version ${version}`;
	if ((parameters.autoFix ?? false) !== false) return 'auto-fixing output parser';
	const schemaType = parameters.schemaType ?? 'fromJson';
	let built: Built | string;
	if (schemaType === 'fromJson') {
		// The default of the parameter is an example of the node description.
		const text = schemaText(parameters.jsonSchemaExample);
		if (text === undefined) return 'output parser example';
		let example: unknown;
		try {
			example = JSON.parse(text);
		} catch {
			return 'output parser example is not JSON';
		}
		// The generator reads a text as the title of a schema without a value.
		if (typeof example === 'string') return 'output parser: example is a text';
		built = fromExample(example, version >= 1.3, 0);
	} else if (schemaType === 'manual') {
		const text = schemaText(parameters.inputSchema);
		if (text === undefined) return 'output parser schema';
		let schema: unknown;
		try {
			schema = JSON.parse(text);
		} catch {
			return 'output parser schema is not JSON';
		}
		built = fromSchema(schema, 0);
	} else {
		return 'output parser schema type';
	}
	if (typeof built === 'string') return `output parser: ${built}`;
	const outputRequired = version >= 1.3;
	const wrapper = {
		...objectJson(['output'], [built], [outputRequired], 'strip'),
		$schema: 'http://json-schema.org/draft-07/schema#',
	};
	return { instructions: formatInstructions(wrapper), shape: built.shape, outputRequired };
}
