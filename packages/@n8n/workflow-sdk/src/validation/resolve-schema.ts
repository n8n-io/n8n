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
 * Booleans are shown without quotes, strings are quoted.
 */
function formatValue(val: unknown): string {
	if (typeof val === 'boolean') return String(val);
	if (typeof val === 'string') return `"${val}"`;
	return String(val);
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
				requirements.push(`${key}=${valStr}`);
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
}: ResolveSchemaConfig): z.ZodTypeAny {
	const context: DisplayOptionsContext = { parameters, defaults };
	const isVisible = matchesDisplayOptionsCore(context, displayOptions);

	if (isVisible) {
		return required ? schema : schema.optional();
	} else {
		// Use z.any().refine() instead of z.undefined() to provide a descriptive error message
		const requirements = formatDisplayOptionsRequirements(displayOptions);
		return z.any().refine((val) => val === undefined, {
			message: requirements
				? `This field requires: ${requirements}`
				: 'This field is not applicable for the current configuration',
		});
	}
}
