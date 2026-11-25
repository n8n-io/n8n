import { z } from 'zod';

import {
	matchesDisplayOptions as matchesDisplayOptionsCore,
	type DisplayOptions,
	type DisplayOptionsContext,
} from '../display-options';

// Re-export types from display-options for backward compatibility
export type { DisplayOptions, DisplayOptionsContext };

function isDisplayCondition(val: unknown): val is { _cnd: Record<string, unknown> } {
	return (
		val !== null &&
		typeof val === 'object' &&
		'_cnd' in val &&
		typeof val._cnd === 'object' &&
		val._cnd !== null
	);
}

/**
 * Format a value for display in error messages.
 * Booleans are shown without quotes, strings are quoted,
 * _cnd conditions are formatted as readable operators.
 */
function formatValue(val: unknown): string {
	if (typeof val === 'boolean') return String(val);
	if (typeof val === 'string') return `"${val}"`;
	if (typeof val === 'number') return String(val);

	// Handle _cnd conditions
	if (isDisplayCondition(val)) {
		const entry = Object.entries(val._cnd)[0];
		if (!entry) return JSON.stringify(val);
		const [operator, operand] = entry;
		switch (operator) {
			case 'exists':
				return 'exists';
			case 'eq':
				return `equals ${formatValue(operand)}`;
			case 'not':
				return `not ${formatValue(operand)}`;
			case 'gte':
				return `>= ${String(operand)}`;
			case 'lte':
				return `<= ${String(operand)}`;
			case 'gt':
				return `> ${String(operand)}`;
			case 'lt':
				return `< ${String(operand)}`;
			case 'includes':
				return `includes "${String(operand)}"`;
			case 'startsWith':
				return `starts with "${String(operand)}"`;
			case 'endsWith':
				return `ends with "${String(operand)}"`;
			case 'regex':
				return `matches /${String(operand)}/`;
			case 'between': {
				if (
					operand !== null &&
					typeof operand === 'object' &&
					'from' in operand &&
					'to' in operand
				) {
					return `between ${String(operand.from)} and ${String(operand.to)}`;
				}
				return JSON.stringify(val);
			}
			default:
				return JSON.stringify(val);
		}
	}

	return JSON.stringify(val);
}

/**
 * Format a regex path pattern into a human-readable string.
 * Example: '/guardrails.(jailbreak|nsfw|custom)' becomes 'guardrails.jailbreak, guardrails.nsfw, or guardrails.custom'
 */
function formatRegexPath(path: string): string {
	// Remove leading /
	const cleanPath = path.startsWith('/') ? path.slice(1) : path;

	// Check if it contains alternation pattern like (a|b|c)
	const match = cleanPath.match(/^(.+)\.\(([^)]+)\)$/);
	if (match) {
		const prefix = match[1];
		const alternatives = match[2].split('|');
		const paths = alternatives.map((alt) => `${prefix}.${alt}`);
		if (paths.length === 1) return paths[0];
		if (paths.length === 2) return `${paths[0]} or ${paths[1]}`;
		return paths.slice(0, -1).join(', ') + ', or ' + paths[paths.length - 1];
	}

	return cleanPath;
}

/**
 * Check if a property path contains regex metacharacters.
 */
function isRegexPath(path: string): boolean {
	return path.includes('|') || path.includes('(');
}

/**
 * Format a map of displayOptions conditions (show or hide) into readable clauses.
 * Example: { sendBody: [true], contentType: ["raw"] }
 * Returns: ['sendBody=true', 'contentType="raw"']
 */
function formatConditionEntries(conditions: Record<string, unknown[]>): string[] {
	const entries: string[] = [];

	for (const [key, values] of Object.entries(conditions)) {
		if (!Array.isArray(values) || values.length === 0) continue;

		const valStr =
			values.length === 1 ? formatValue(values[0]) : values.map(formatValue).join(' or ');

		if (isRegexPath(key)) {
			const formattedPath = formatRegexPath(key);
			entries.push(`one of ${formattedPath} ${valStr}`);
		} else if (values.length === 1 && isDisplayCondition(values[0])) {
			entries.push(`${key} ${valStr}`);
		} else {
			entries.push(`${key}=${valStr}`);
		}
	}

	return entries;
}

type FormattedDisplayOptions = {
	show: string;
	hide: string;
};

/**
 * Format displayOptions show and hide conditions into readable strings.
 * Show conditions are ANDed (comma-separated); hide conditions are ORed (" or ").
 */
function formatDisplayOptionsRequirements(displayOptions: DisplayOptions): FormattedDisplayOptions {
	const show = displayOptions.show ? formatConditionEntries(displayOptions.show).join(', ') : '';
	const hide = displayOptions.hide ? formatConditionEntries(displayOptions.hide).join(' or ') : '';
	return { show, hide };
}

/**
 * Build an error message explaining why a field is not allowed in the current configuration.
 */
function formatHiddenFieldMessage(displayOptions: DisplayOptions): string {
	const { show, hide } = formatDisplayOptionsRequirements(displayOptions);

	if (show && hide) {
		return `This field is only allowed when: ${show} (hidden when: ${hide})`;
	}
	if (show) {
		return `This field is only allowed when: ${show}`;
	}
	if (hide) {
		return `This field is hidden when: ${hide}`;
	}
	return 'This field is not applicable for the current configuration';
}

/**
 * Format one variant's displayOptions for resolveOneOfSchemas error messages.
 */
function formatVariantRequirements(displayOptions: DisplayOptions): string {
	const { show, hide } = formatDisplayOptionsRequirements(displayOptions);

	if (show && hide) {
		return `${show}, not (${hide})`;
	}
	if (show) {
		return show;
	}
	if (hide) {
		return `not (${hide})`;
	}
	return '';
}

export type ResolveSchemaConfig = {
	parameters: Record<string, unknown>;
	schema: z.ZodTypeAny;
	required: boolean;
	displayOptions: DisplayOptions;
	/** Default values for properties referenced in displayOptions (used when property is not set) */
	defaults?: Record<string, unknown>;
	/** Whether this node is a tool (for @tool conditions in displayOptions) */
	isToolNode?: boolean;
};

export type ResolveSchemaFn = (config: ResolveSchemaConfig) => z.ZodTypeAny;

/**
 * Check if a field should be visible based on displayOptions and current parameter values.
 *
 * This is a backward-compatible wrapper around the centralized matchesDisplayOptions.
 * For advanced features (root paths, @version, _cnd operators), use the context-based
 * version from display-options.ts directly.
 *
 * @param parameters - Current parameter values
 * @param displayOptions - The show/hide conditions
 * @returns true if the field should be displayed
 */
export function matchesDisplayOptions(
	parameters: Record<string, unknown>,
	displayOptions: DisplayOptions,
): boolean {
	const context: DisplayOptionsContext = { parameters };
	return matchesDisplayOptionsCore(context, displayOptions);
}

export function resolveSchema({
	parameters,
	schema,
	required,
	displayOptions,
	defaults = {},
	isToolNode,
}: ResolveSchemaConfig): z.ZodTypeAny {
	const context: DisplayOptionsContext = { parameters, defaults, isToolNode };
	const isVisible = matchesDisplayOptionsCore(context, displayOptions);

	if (isVisible) {
		return required ? schema : schema.optional();
	} else {
		// Use z.any().refine() instead of z.undefined() to provide a descriptive error message
		return z.any().refine((val) => val === undefined, {
			message: formatHiddenFieldMessage(displayOptions),
		});
	}
}

export type ResolveOneOfSchemasVariant = {
	schema: z.ZodTypeAny;
	required: boolean;
	displayOptions: DisplayOptions;
	defaults?: Record<string, unknown>;
};

export type ResolveOneOfSchemasConfig = {
	parameters: Record<string, unknown>;
	variants: ResolveOneOfSchemasVariant[];
	defaults?: Record<string, unknown>;
	isToolNode?: boolean;
};

export type ResolveOneOfSchemasFn = (config: ResolveOneOfSchemasConfig) => z.ZodTypeAny;

/**
 * Pick the first variant whose displayOptions match the current parameters and
 * return its schema. Use this for properties declared multiple times with
 * mutually exclusive displayOptions — the declarations are OR alternatives,
 * not AND constraints, so naively unioning their show/hide produces a
 * self-contradicting predicate that rejects every value.
 *
 * A z.union of per-variant resolveSchema calls would also be wrong: each
 * inactive variant's "must-be-undefined" branch would silently match any
 * concrete value the active variant rejects, and any required-when-visible
 * validation would be lost.
 */
export function resolveOneOfSchemas({
	parameters,
	variants,
	defaults = {},
	isToolNode,
}: ResolveOneOfSchemasConfig): z.ZodTypeAny {
	for (const variant of variants) {
		const context: DisplayOptionsContext = {
			parameters,
			defaults: { ...defaults, ...(variant.defaults ?? {}) },
			isToolNode,
		};
		if (matchesDisplayOptionsCore(context, variant.displayOptions)) {
			return variant.required ? variant.schema : variant.schema.optional();
		}
	}

	const requirementParts = variants
		.map((v) => formatVariantRequirements(v.displayOptions))
		.filter(Boolean);
	const message = requirementParts.length
		? `This field is only allowed when one of: ${requirementParts.map((r) => `(${r})`).join(' or ')}`
		: 'This field is not applicable for the current configuration';
	return z.any().refine((val) => val === undefined, { message });
}
