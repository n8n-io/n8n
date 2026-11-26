import { isRecord } from '@n8n/utils/is-record';

/**
 * Normalizes JSON schema parameter definitions for Google Gemini.
 *
 * Gemini's Schema protobuf expects a single scalar `type` enum. It rejects
 * array types such as `type: ['string', 'null']`. It also rejects `type: 'null'`.
 * This function converts nullable types into a single `type` with `nullable: true`,
 * and flattens `anyOf` / `oneOf` unions that include `null`.
 */
export function sanitizeGeminiSchema(schema: unknown): unknown {
	if (!isRecord(schema)) {
		if (Array.isArray(schema)) {
			return schema.map(sanitizeGeminiSchema);
		}
		return schema;
	}

	const newSchema: Record<string, unknown> = { ...schema };

	// 1. Handle array type: e.g. type: ['string', 'null'] or type: ['null', 'string']
	if (Array.isArray(newSchema.type)) {
		const types = newSchema.type.filter((t): t is string => typeof t === 'string');
		const hasNull = types.includes('null');
		const nonNullTypes = types.filter((t) => t !== 'null');

		if (hasNull) {
			newSchema.nullable = true;
		}

		if (nonNullTypes.length > 0) {
			newSchema.type = nonNullTypes[0];
		} else if (hasNull) {
			newSchema.type = 'string';
		} else {
			delete newSchema.type;
		}
	} else if (newSchema.type === 'null') {
		newSchema.type = 'string';
		newSchema.nullable = true;
	}

	// 2. Handle anyOf / oneOf with null: e.g. anyOf: [{ type: 'string' }, { type: 'null' }]
	for (const unionKey of ['anyOf', 'oneOf'] as const) {
		const union = newSchema[unionKey];
		if (Array.isArray(union)) {
			const hasNull = union.some(
				(item) =>
					isRecord(item) &&
					(item.type === 'null' || (Array.isArray(item.type) && item.type.includes('null'))),
			);
			const nonNullBranches = union.filter((item) => !isRecord(item) || item.type !== 'null');

			if (hasNull) {
				newSchema.nullable = true;
				if (nonNullBranches.length === 1 && isRecord(nonNullBranches[0])) {
					delete newSchema[unionKey];
					const branch = sanitizeGeminiSchema(nonNullBranches[0]) as Record<string, unknown>;
					Object.assign(newSchema, branch);
				} else if (nonNullBranches.length > 1) {
					newSchema[unionKey] = nonNullBranches.map(sanitizeGeminiSchema);
				} else {
					delete newSchema[unionKey];
					newSchema.type = 'string';
				}
			} else {
				newSchema[unionKey] = union.map(sanitizeGeminiSchema);
			}
		}
	}

	// 3. Recursively sanitize object properties
	if (isRecord(newSchema.properties)) {
		const sanitizedProperties: Record<string, unknown> = {};
		for (const [key, prop] of Object.entries(newSchema.properties)) {
			sanitizedProperties[key] = sanitizeGeminiSchema(prop);
		}
		newSchema.properties = sanitizedProperties;
	}

	// 4. Recursively sanitize array items
	if (newSchema.items) {
		newSchema.items = sanitizeGeminiSchema(newSchema.items);
	}

	// 5. Recursively sanitize allOf
	if (Array.isArray(newSchema.allOf)) {
		newSchema.allOf = newSchema.allOf.map(sanitizeGeminiSchema);
	}

	// 6. Recursively sanitize definitions / $defs if present
	if (isRecord(newSchema.definitions)) {
		const sanitizedDefs: Record<string, unknown> = {};
		for (const [key, def] of Object.entries(newSchema.definitions)) {
			sanitizedDefs[key] = sanitizeGeminiSchema(def);
		}
		newSchema.definitions = sanitizedDefs;
	}
	if (isRecord(newSchema.$defs)) {
		const sanitizedDefs: Record<string, unknown> = {};
		for (const [key, def] of Object.entries(newSchema.$defs)) {
			sanitizedDefs[key] = sanitizeGeminiSchema(def);
		}
		newSchema.$defs = sanitizedDefs;
	}

	return newSchema;
}

/**
 * Sanitizes tools for Generative AI function calling.
 *
 * Traverses tool declarations and normalizes the parameters schema for each
 * function declaration.
 */
export function sanitizeGenerativeAITools<T>(tools: T): T {
	if (!Array.isArray(tools)) return tools;

	return tools.map((tool) => {
		if (isRecord(tool) && Array.isArray(tool.functionDeclarations)) {
			return {
				...tool,
				functionDeclarations: tool.functionDeclarations.map((fn) => {
					if (isRecord(fn) && fn.parameters) {
						return {
							...fn,
							parameters: sanitizeGeminiSchema(fn.parameters),
						};
					}
					return fn;
				}),
			};
		}
		return tool;
	}) as T;
}
