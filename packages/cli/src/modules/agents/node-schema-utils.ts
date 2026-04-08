import type { INodeProperties, INodePropertyCollection, INodePropertyOptions } from 'n8n-workflow';

export interface NodeParameterOption {
	name: string;
	value: string | number | boolean;
	description?: string;
}

export interface NodeParameterInfo {
	/** Human-readable label shown in the UI */
	displayName: string;
	/** Property type — string | number | boolean | options | multiOptions | collection | fixedCollection | json | etc. */
	type: string;
	description?: string;
	required?: boolean;
	default?: unknown;
	/** For options / multiOptions: the allowed values */
	options?: NodeParameterOption[];
	/** For options / multiOptions: if true, values outside the listed options are valid */
	allowArbitraryValues?: boolean;
	/** For collection: the fields each item can have */
	fields?: Record<string, NodeParameterInfo>;
	/** For fixedCollection: named groups, each with their own fields */
	groups?: Record<string, { displayName: string; fields: Record<string, NodeParameterInfo> }>;
	/** For number type: minimum allowed value */
	min?: number;
	/** For number type: maximum allowed value */
	max?: number;
	/** For string type with a code editor: the editor dialect (e.g. "sql", "json") */
	editor?: string;
	/** True if this parameter is only shown under certain conditions (has displayOptions) */
	conditional?: boolean;
}

export type NodeParametersSchema = Record<string, NodeParameterInfo>;

export interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

const SKIP_TYPES = new Set([
	'notice',
	'callout',
	'button',
	'hidden',
	'icon',
	'curlImport',
	'workflowSelector',
	'credentialsSelect',
	'credentials',
]);

/**
 * Returns true if `value` is an n8n expression string.
 * Expressions start with `=` or use `{{ }}` template syntax and are resolved at
 * runtime, so they cannot be statically validated against type constraints.
 */
export function isN8nExpression(value: unknown): boolean {
	return (
		typeof value === 'string' &&
		(value.startsWith('=') || (value.includes('{{') && value.includes('}}')))
	);
}

function isPropertyOptions(
	item: INodePropertyOptions | INodeProperties | INodePropertyCollection,
): item is INodePropertyOptions {
	return 'value' in item && !('values' in item) && !('type' in item && 'default' in item);
}

function isPropertyCollection(
	item: INodePropertyOptions | INodeProperties | INodePropertyCollection,
): item is INodePropertyCollection {
	return 'values' in item && Array.isArray((item as INodePropertyCollection).values);
}

function isNestedProperty(
	item: INodePropertyOptions | INodeProperties | INodePropertyCollection,
): item is INodeProperties {
	return 'type' in item && 'default' in item;
}

/**
 * Recursively builds a {@link NodeParameterInfo} descriptor for a single node property.
 */
function buildParameterInfo(prop: INodeProperties): NodeParameterInfo {
	const info: NodeParameterInfo = {
		displayName: prop.displayName,
		type: prop.type,
	};

	if (prop.description) info.description = prop.description;
	if (prop.required) info.required = true;
	if (prop.default !== undefined && prop.default !== '') info.default = prop.default;
	if (prop.displayOptions) info.conditional = true;
	if (prop.allowArbitraryValues) info.allowArbitraryValues = true;

	switch (prop.type) {
		case 'options':
		case 'multiOptions': {
			if (Array.isArray(prop.options)) {
				const opts: NodeParameterOption[] = prop.options.filter(isPropertyOptions).map((o) => ({
					name: o.name,
					value: o.value,
					...(o.description ? { description: o.description } : {}),
				}));
				if (opts.length > 0) info.options = opts;
			}
			break;
		}

		case 'collection': {
			if (Array.isArray(prop.options)) {
				const fields: Record<string, NodeParameterInfo> = {};
				for (const item of prop.options) {
					if (isNestedProperty(item) && !SKIP_TYPES.has(item.type)) {
						fields[item.name] = buildParameterInfo(item);
					}
				}
				if (Object.keys(fields).length > 0) info.fields = fields;
			}
			break;
		}

		case 'fixedCollection': {
			if (Array.isArray(prop.options)) {
				const groups: Record<
					string,
					{ displayName: string; fields: Record<string, NodeParameterInfo> }
				> = {};
				for (const item of prop.options) {
					if (isPropertyCollection(item)) {
						const fields: Record<string, NodeParameterInfo> = {};
						for (const field of item.values) {
							if (!SKIP_TYPES.has(field.type)) {
								fields[field.name] = buildParameterInfo(field);
							}
						}
						groups[item.name] = { displayName: item.displayName, fields };
					}
				}
				if (Object.keys(groups).length > 0) info.groups = groups;
			}
			break;
		}

		case 'number': {
			if (prop.typeOptions?.minValue !== undefined) info.min = prop.typeOptions.minValue;
			if (prop.typeOptions?.maxValue !== undefined) info.max = prop.typeOptions.maxValue;
			break;
		}

		case 'string': {
			if (prop.typeOptions?.editor) info.editor = prop.typeOptions.editor as string;
			break;
		}

		case 'resourceLocator': {
			// Expose available lookup modes (e.g. "By ID", "By URL", "From list")
			if (Array.isArray(prop.modes)) {
				info.options = prop.modes.map((mode) => ({
					name: mode.displayName,
					value: mode.name,
				}));
			}
			break;
		}

		case 'resourceMapper':
		case 'filter':
		case 'assignmentCollection': {
			// Complex structured types — represent as json so the LLM knows to
			// provide a plain object and isn't confused by the internal type name.
			info.type = 'json';
			if (!info.description) {
				info.description = `Complex ${prop.type} parameter — provide as a JSON object`;
			}
			break;
		}
	}

	return info;
}

/**
 * Derives a {@link NodeParametersSchema} from a node type's property list.
 *
 * UI-only entries (notice, callout, button, hidden, icon, curlImport,
 * workflowSelector, credentialsSelect, credentials) and node-settings properties
 * are excluded. All other properties are included; conditionally-visible ones are
 * marked with `conditional: true`.
 *
 * Complex nested types (collection, fixedCollection) are recursively expanded.
 */
export function extractNodeParametersSchema(properties: INodeProperties[]): NodeParametersSchema {
	const schema: NodeParametersSchema = {};

	for (const prop of properties) {
		if (SKIP_TYPES.has(prop.type)) continue;
		if (prop.isNodeSetting) continue;
		schema[prop.name] = buildParameterInfo(prop);
	}

	return schema;
}

/**
 * Validates a set of node parameters against a {@link NodeParametersSchema}.
 *
 * n8n expression strings (starting with `=` or using `{{ }}` syntax) bypass all
 * type checks because they are resolved at runtime.
 *
 * Rules applied:
 * - Non-conditional required parameters must be present
 * - `options` values must be in the allowed set (unless `allowArbitraryValues`)
 * - `number` values must respect min/max bounds
 * - `boolean` values must be actual booleans
 * - Unknown parameters produce warnings rather than errors
 */
export function validateNodeParameters(
	schema: NodeParametersSchema,
	params: Record<string, unknown>,
): ValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	for (const [key, info] of Object.entries(schema)) {
		if (info.required && !info.conditional && !(key in params)) {
			errors.push(`Required parameter "${key}" (${info.displayName}) is missing`);
		}
	}

	for (const [key, value] of Object.entries(params)) {
		const info = schema[key];

		if (!info) {
			warnings.push(`Unknown parameter "${key}" — not defined in the node schema`);
			continue;
		}

		if (isN8nExpression(value)) continue;

		switch (info.type) {
			case 'options': {
				if (info.options && !info.allowArbitraryValues) {
					if (!info.options.some((o) => o.value === value)) {
						const allowed = info.options.map((o) => `"${String(o.value)}"`).join(', ');
						errors.push(
							`Parameter "${key}" has invalid value ${JSON.stringify(value)}. Allowed: ${allowed}`,
						);
					}
				}
				break;
			}

			case 'multiOptions': {
				if (info.options && !info.allowArbitraryValues && Array.isArray(value)) {
					const validValues = new Set(info.options.map((o) => o.value));
					const invalid = (value as unknown[]).filter((v) => !validValues.has(v as string));
					if (invalid.length > 0) {
						const allowed = info.options.map((o) => `"${String(o.value)}"`).join(', ');
						errors.push(
							`Parameter "${key}" contains invalid values ${JSON.stringify(invalid)}. Allowed: ${allowed}`,
						);
					}
				}
				break;
			}

			case 'number': {
				if (typeof value !== 'number') {
					errors.push(
						`Parameter "${key}" (${info.displayName}) must be a number, got ${typeof value}`,
					);
				} else {
					if (info.min !== undefined && value < info.min) {
						errors.push(`Parameter "${key}" value ${value} is below minimum ${info.min}`);
					}
					if (info.max !== undefined && value > info.max) {
						errors.push(`Parameter "${key}" value ${value} exceeds maximum ${info.max}`);
					}
				}
				break;
			}

			case 'boolean': {
				if (typeof value !== 'boolean') {
					errors.push(
						`Parameter "${key}" (${info.displayName}) must be a boolean, got ${typeof value}`,
					);
				}
				break;
			}
		}
	}

	return { valid: errors.length === 0, errors, warnings };
}
