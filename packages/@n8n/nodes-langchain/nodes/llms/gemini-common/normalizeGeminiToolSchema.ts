import { toJsonSchema } from '@langchain/core/utils/json_schema';
import { isInteropZodSchema } from '@langchain/core/utils/types';

type JsonObject = Record<string, unknown>;

type NormalizedType = {
	type: string;
	nullable: boolean;
};

function isJsonObject(value: unknown): value is JsonObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toolSchemaError(toolName: string, path: string, reason: string): Error {
	return new Error(
		[
			`Google Gemini does not support this tool schema for "${toolName}".`,
			`Path: ${path}.`,
			`Reason: ${reason}.`,
			'Use a flat object schema with optional fields instead of unions (anyOf/oneOf or multi-type arrays).',
		].join(' '),
	);
}

function normalizeTypeArray(typeValues: unknown[], toolName: string, path: string): NormalizedType {
	if (typeValues.length === 0) {
		throw toolSchemaError(toolName, path, 'empty type array');
	}

	if (!typeValues.every((value) => typeof value === 'string')) {
		throw toolSchemaError(toolName, path, 'type array contains non-string values');
	}

	const uniqueTypes = Array.from(new Set(typeValues as string[]));
	const nonNullTypes = uniqueTypes.filter((type) => type !== 'null');
	const hasNull = uniqueTypes.includes('null');

	if (nonNullTypes.length === 1) {
		return {
			type: nonNullTypes[0],
			nullable: hasNull,
		};
	}

	throw toolSchemaError(toolName, path, `unsupported type union ${JSON.stringify(uniqueTypes)}`);
}

function normalizeGeminiSchemaInternal(schema: unknown, toolName: string, path: string): unknown {
	if (Array.isArray(schema)) {
		return schema.map((item, index) =>
			normalizeGeminiSchemaInternal(item, toolName, `${path}[${index}]`),
		);
	}

	if (!isJsonObject(schema)) {
		return schema;
	}

	const normalizedSchema: JsonObject = {};
	let nullableFromType = false;

	for (const [key, value] of Object.entries(schema)) {
		const currentPath = `${path}.${key}`;

		if (key === 'additionalProperties' || key === '$schema' || key === 'strict') {
			continue;
		}

		if (key === 'anyOf' || key === 'oneOf') {
			throw toolSchemaError(toolName, currentPath, `${key} is not supported`);
		}

		if (key === 'type' && Array.isArray(value)) {
			const normalizedType = normalizeTypeArray(value, toolName, currentPath);
			normalizedSchema.type = normalizedType.type;
			nullableFromType = normalizedType.nullable;
			continue;
		}

		normalizedSchema[key] = normalizeGeminiSchemaInternal(value, toolName, currentPath);
	}

	if (nullableFromType) {
		normalizedSchema.nullable = true;
	}

	return normalizedSchema;
}

function normalizeTool(inputTool: unknown): unknown {
	if (!isJsonObject(inputTool)) {
		return inputTool;
	}

	if (Array.isArray(inputTool.functionDeclarations)) {
		return {
			...inputTool,
			functionDeclarations: inputTool.functionDeclarations.map((functionDeclaration, index) => {
				if (!isJsonObject(functionDeclaration)) {
					return functionDeclaration;
				}

				const toolName =
					typeof functionDeclaration.name === 'string'
						? functionDeclaration.name
						: `functionDeclaration[${index}]`;

				if (
					!('parameters' in functionDeclaration) ||
					functionDeclaration.parameters === undefined
				) {
					return functionDeclaration;
				}

				return {
					...functionDeclaration,
					parameters: normalizeGeminiSchemaInternal(
						functionDeclaration.parameters,
						toolName,
						`${toolName}.parameters`,
					),
				};
			}),
		};
	}

	if (
		typeof inputTool.name === 'string' &&
		'schema' in inputTool &&
		inputTool.schema !== undefined
	) {
		const toolSchema = isInteropZodSchema(inputTool.schema)
			? toJsonSchema(inputTool.schema)
			: inputTool.schema;

		return {
			...inputTool,
			schema: normalizeGeminiSchemaInternal(toolSchema, inputTool.name, `${inputTool.name}.schema`),
		};
	}

	return inputTool;
}

export function wrapGeminiBindTools<T extends { bindTools?: unknown }>(model: T): T {
	if (typeof model.bindTools !== 'function') {
		return model;
	}

	const originalBindTools = model.bindTools.bind(model) as (
		tools: unknown[],
		kwargs?: unknown,
	) => unknown;

	model.bindTools = ((tools: unknown[], kwargs?: unknown) => {
		const normalizedTools = tools.map((tool) => normalizeTool(tool));
		return originalBindTools(normalizedTools, kwargs);
	}) as T['bindTools'];

	return model;
}

export function normalizeGeminiToolSchema(schema: unknown, toolName: string): unknown {
	return normalizeGeminiSchemaInternal(schema, toolName, `${toolName}.schema`);
}
