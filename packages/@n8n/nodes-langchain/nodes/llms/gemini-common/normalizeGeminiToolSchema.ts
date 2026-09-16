import { toJsonSchema } from '@langchain/core/utils/json_schema';
import { isInteropZodSchema } from '@langchain/core/utils/types';

type JsonObject = Record<string, unknown>;

const UNSUPPORTED_SCHEMA_KEYS = new Set([
	'$schema',
	'$defs',
	'$ref',
	'additionalProperties',
	'allOf',
	'const',
	'default',
	'definitions',
	'else',
	'examples',
	'exclusiveMaximum',
	'exclusiveMinimum',
	'if',
	'maximum',
	'maxLength',
	'minimum',
	'minLength',
	'multipleOf',
	'not',
	'pattern',
	'patternProperties',
	'propertyNames',
	'strict',
	'then',
	'title',
	'unevaluatedProperties',
]);

function isJsonObject(value: unknown): value is JsonObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullSchema(schema: unknown) {
	return isJsonObject(schema) && schema.type === 'null';
}

function geminiSchemaError(reason: string): Error {
	return new Error(`Google Gemini does not support this tool schema. ${reason}`);
}

function withNullable(schema: unknown, baseSchema: JsonObject = {}) {
	if (!isJsonObject(schema)) return schema;

	return {
		...baseSchema,
		...schema,
		nullable: true,
	};
}

function normalizeTypeArray(typeValues: unknown[]) {
	const stringTypes = typeValues.filter((type): type is string => typeof type === 'string');
	const uniqueTypes = Array.from(new Set(stringTypes));
	const hasNull = uniqueTypes.includes('null');
	const nonNullTypes = uniqueTypes.filter((type) => type !== 'null');

	if (nonNullTypes.length === 0) {
		throw geminiSchemaError('Null-only types cannot be represented in function parameters.');
	}

	if (nonNullTypes.length === 1) return { type: nonNullTypes[0], nullable: hasNull };

	throw geminiSchemaError('Union types must be flattened before they can be used with Gemini.');
}

function normalizeCombinator(schema: JsonObject, key: 'anyOf' | 'oneOf') {
	const branches = Array.isArray(schema[key])
		? schema[key].map((branch) => normalizeGeminiSchemaInternal(branch))
		: [];

	const nonNullBranches = branches.filter((branch) => !isNullSchema(branch));
	const hasNull = nonNullBranches.length !== branches.length;

	if (nonNullBranches.length === 1) {
		const baseSchema = { ...schema };
		delete baseSchema.anyOf;
		delete baseSchema.oneOf;
		const normalizedBaseSchema = normalizeGeminiSchemaInternal(baseSchema) as JsonObject;
		const normalizedBranch = nonNullBranches[0] as JsonObject;
		return hasNull
			? withNullable(normalizedBranch, normalizedBaseSchema)
			: { ...normalizedBaseSchema, ...normalizedBranch };
	}

	if (nonNullBranches.length === 0) {
		throw geminiSchemaError('Null-only unions cannot be represented in function parameters.');
	}

	throw geminiSchemaError(
		`${key} union types must be flattened before they can be used with Gemini.`,
	);
}

function normalizeRequired(value: unknown, properties: unknown) {
	if (!Array.isArray(value) || !isJsonObject(properties)) return value;

	const propertyNames = new Set(Object.keys(properties));
	return value.filter(
		(name): name is string => typeof name === 'string' && propertyNames.has(name),
	);
}

function normalizeEnumValues(value: unknown[]) {
	const enumValues = value.filter((enumValue) => enumValue !== null);
	if (enumValues.length === 0) {
		throw geminiSchemaError(
			'Empty or null-only enums cannot be represented in function parameters.',
		);
	}

	return enumValues;
}

function normalizeGeminiSchemaInternal(schema: unknown): unknown {
	if (Array.isArray(schema)) {
		return schema.map((item) => normalizeGeminiSchemaInternal(item));
	}

	if (!isJsonObject(schema)) {
		return schema;
	}

	if ('anyOf' in schema) {
		return normalizeCombinator(schema, 'anyOf');
	}

	if ('oneOf' in schema) {
		return normalizeCombinator(schema, 'oneOf');
	}

	const normalizedSchema: JsonObject = {};
	let nullableFromType = false;

	for (const [key, value] of Object.entries(schema)) {
		if (key === 'const') {
			normalizedSchema.enum = normalizeEnumValues([value]);
			continue;
		}

		if (UNSUPPORTED_SCHEMA_KEYS.has(key)) {
			continue;
		}

		if (key === 'type' && Array.isArray(value)) {
			const normalizedType = normalizeTypeArray(value);

			normalizedSchema.type = normalizedType.type;
			nullableFromType = normalizedType.nullable;
			continue;
		}

		if (key === 'enum' && Array.isArray(value)) {
			const enumValues = normalizeEnumValues(value);
			normalizedSchema.enum = enumValues;
			if (enumValues.length !== value.length) nullableFromType = true;
			continue;
		}

		if (key === 'required') {
			normalizedSchema.required = normalizeRequired(value, schema.properties);
			continue;
		}

		normalizedSchema[key] = normalizeGeminiSchemaInternal(value);
	}

	if (nullableFromType) {
		normalizedSchema.nullable = true;
	}

	return normalizedSchema;
}

function cloneTool<T extends JsonObject>(tool: T): T {
	return Object.defineProperties(
		Object.create(Object.getPrototypeOf(tool)) as T,
		Object.getOwnPropertyDescriptors(tool),
	);
}

function normalizeTool(tool: unknown): unknown {
	if (!isJsonObject(tool)) return tool;

	if (Array.isArray(tool.functionDeclarations)) {
		return {
			...tool,
			functionDeclarations: tool.functionDeclarations.map((declaration) => {
				if (!isJsonObject(declaration) || !('parameters' in declaration)) return declaration;

				return {
					...declaration,
					parameters: normalizeGeminiSchemaInternal(declaration.parameters),
				};
			}),
		};
	}

	if (!('schema' in tool) || tool.schema === undefined) return tool;

	const schema = isInteropZodSchema(tool.schema) ? toJsonSchema(tool.schema) : tool.schema;
	const clonedTool = cloneTool(tool);
	clonedTool.schema = normalizeGeminiSchemaInternal(schema);

	return clonedTool;
}

export function normalizeGeminiToolSchema(schema: unknown) {
	return normalizeGeminiSchemaInternal(schema);
}

export function wrapGeminiBindTools<T extends { bindTools?: unknown }>(model: T): T {
	if (typeof model.bindTools !== 'function') return model;

	const originalBindTools = model.bindTools.bind(model) as (
		tools: unknown[],
		kwargs?: unknown,
	) => unknown;

	model.bindTools = ((tools: unknown[], kwargs?: unknown) => {
		if (!Array.isArray(tools)) return originalBindTools(tools, kwargs);

		return originalBindTools(
			tools.map((tool) => normalizeTool(tool)),
			kwargs,
		);
	}) as T['bindTools'];

	return model;
}
