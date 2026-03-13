import { SyntaxKind, type Node } from 'ts-morph';

interface JsonSchema {
	type?: string;
	properties?: Record<string, JsonSchema>;
	required?: string[];
	items?: JsonSchema;
	enum?: string[];
	minimum?: number;
	maximum?: number;
	minLength?: number;
	maxLength?: number;
	default?: unknown;
	optional?: boolean;
}

/**
 * Converts a Zod AST expression (e.g., z.string().optional()) to JSON Schema.
 * Walks the method chain from outside in, collecting modifiers.
 * Returns null if the expression is not a recognized Zod call.
 */
export function zodCallToJsonSchema(node: Node): JsonSchema | null {
	return parseZodNode(node);
}

function parseZodNode(node: Node): JsonSchema | null {
	if (!node.isKind(SyntaxKind.CallExpression)) return null;

	const expr = node.getExpression();

	// Handle z.method() -- PropertyAccessExpression on 'z'
	if (expr.isKind(SyntaxKind.PropertyAccessExpression)) {
		const objectText = expr.getExpression().getText();
		const methodName = expr.getName();

		// Base types: z.string(), z.number(), z.boolean()
		if (objectText === 'z') {
			return parseZodBaseType(methodName, node);
		}

		// Chained modifiers: something.optional(), something.min(3), etc.
		const innerCall = expr.getExpression();
		const innerSchema = parseZodNode(innerCall);
		if (innerSchema) {
			return applyModifier(innerSchema, methodName, node);
		}
	}

	return null;
}

function parseZodBaseType(methodName: string, callNode: Node): JsonSchema | null {
	if (!callNode.isKind(SyntaxKind.CallExpression)) return null;

	switch (methodName) {
		case 'string':
			return { type: 'string' };
		case 'number':
			return { type: 'number' };
		case 'boolean':
			return { type: 'boolean' };
		case 'object':
			return parseZodObject(callNode);
		case 'array':
			return parseZodArray(callNode);
		case 'enum':
			return parseZodEnum(callNode);
		default:
			return null;
	}
}

function parseZodObject(callNode: Node): JsonSchema | null {
	if (!callNode.isKind(SyntaxKind.CallExpression)) return null;
	const args = callNode.getArguments();
	if (args.length === 0) return { type: 'object', properties: {}, required: [] };

	const objLiteral = args[0];
	if (!objLiteral.isKind(SyntaxKind.ObjectLiteralExpression)) return null;

	const properties: Record<string, JsonSchema> = {};
	const required: string[] = [];

	for (const prop of objLiteral.getProperties()) {
		if (!prop.isKind(SyntaxKind.PropertyAssignment)) continue;
		const key = prop.getName();
		const init = prop.getInitializer();
		if (!init) continue;

		const fieldSchema = parseZodNode(init);
		if (!fieldSchema) continue;

		// Check if optional -- remove the flag from the stored schema
		const isOptional = fieldSchema.optional === true;
		const { optional: _, ...cleanSchema } = fieldSchema;
		properties[key] = cleanSchema;

		if (!isOptional) {
			required.push(key);
		}
	}

	return { type: 'object', properties, required };
}

function parseZodArray(callNode: Node): JsonSchema | null {
	if (!callNode.isKind(SyntaxKind.CallExpression)) return null;
	const args = callNode.getArguments();
	if (args.length === 0) return { type: 'array' };

	const itemSchema = parseZodNode(args[0]);
	return { type: 'array', items: itemSchema ?? undefined };
}

function parseZodEnum(callNode: Node): JsonSchema | null {
	if (!callNode.isKind(SyntaxKind.CallExpression)) return null;
	const args = callNode.getArguments();
	if (args.length === 0) return { type: 'string' };

	const arrLiteral = args[0];
	if (!arrLiteral.isKind(SyntaxKind.ArrayLiteralExpression)) return null;

	const values: string[] = [];
	for (const el of arrLiteral.getElements()) {
		if (el.isKind(SyntaxKind.StringLiteral)) {
			values.push(el.getLiteralText());
		}
	}

	return { type: 'string', enum: values };
}

function applyModifier(schema: JsonSchema, modifier: string, callNode: Node): JsonSchema {
	if (!callNode.isKind(SyntaxKind.CallExpression)) return schema;
	const args = callNode.getArguments();

	switch (modifier) {
		case 'optional':
			return { ...schema, optional: true };

		case 'default': {
			if (args.length > 0) {
				const defaultVal = extractLiteralValue(args[0]);
				if (defaultVal !== undefined) {
					return { ...schema, default: defaultVal };
				}
			}
			return schema;
		}

		case 'min': {
			const val = extractNumericValue(args[0]);
			if (val !== undefined) {
				if (schema.type === 'string') return { ...schema, minLength: val };
				return { ...schema, minimum: val };
			}
			return schema;
		}

		case 'max': {
			const val = extractNumericValue(args[0]);
			if (val !== undefined) {
				if (schema.type === 'string') return { ...schema, maxLength: val };
				return { ...schema, maximum: val };
			}
			return schema;
		}

		default:
			// Unknown modifier -- pass through
			return schema;
	}
}

function extractNumericValue(node: Node | undefined): number | undefined {
	if (!node) return undefined;
	if (node.isKind(SyntaxKind.NumericLiteral)) {
		return parseFloat(node.getText());
	}
	// Handle negative numbers: PrefixUnaryExpression with -
	if (node.isKind(SyntaxKind.PrefixUnaryExpression)) {
		const text = node.getText();
		const num = parseFloat(text);
		if (!isNaN(num)) return num;
	}
	return undefined;
}

function extractLiteralValue(node: Node): unknown {
	if (node.isKind(SyntaxKind.StringLiteral)) return node.getLiteralText();
	if (node.isKind(SyntaxKind.NumericLiteral)) return parseFloat(node.getText());
	if (node.isKind(SyntaxKind.TrueKeyword)) return true;
	if (node.isKind(SyntaxKind.FalseKeyword)) return false;
	return undefined;
}
