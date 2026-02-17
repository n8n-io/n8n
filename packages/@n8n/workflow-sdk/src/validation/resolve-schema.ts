import { z } from 'zod';

import {
	matchesDisplayOptions as matchesDisplayOptionsCore,
	type DisplayOptions,
	type DisplayOptionsContext,
} from './display-options';

// Re-export types from display-options for backward compatibility
export type { DisplayOptions, DisplayOptionsContext };

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
	if (val !== null && typeof val === 'object' && '_cnd' in val) {
		const cnd = (val as { _cnd: Record<string, unknown> })._cnd;
		const [operator, operand] = Object.entries(cnd)[0];
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
				const { from, to } = operand as { from: number; to: number };
				return `between ${from} and ${to}`;
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
 * Format displayOptions conditions into a human-readable requirements string.
 * Example: { show: { sendBody: [true], contentType: ["raw"] } }
 * Returns: 'sendBody=true, contentType="raw"'
 */
function formatDisplayOptionsRequirements(displayOptions: DisplayOptions): string {
	const requirements: string[] = [];

	if (displayOptions.show) {
		for (const [key, values] of Object.entries(displayOptions.show)) {
			if (Array.isArray(values)) {
				const valStr =
					values.length === 1 ? formatValue(values[0]) : values.map(formatValue).join(' or ');

				// Format regex paths more readably
				if (isRegexPath(key)) {
					const formattedPath = formatRegexPath(key);
					requirements.push(`one of ${formattedPath} ${valStr}`);
				} else {
					requirements.push(`${key}=${valStr}`);
				}
			}
		}
	}

	return requirements.join(', ');
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
		const requirements = formatDisplayOptionsRequirements(displayOptions);
		return z.any().refine((val) => val === undefined, {
			message: requirements
				? `This field is only allowed when: ${requirements}`
				: 'This field is not applicable for the current configuration',
		});
	}
}
