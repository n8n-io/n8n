import { z } from 'zod';

import {
	matchesDisplayOptions as matchesDisplayOptionsCore,
	type DisplayOptions,
	type DisplayOptionsContext,
} from './display-options';

// Re-export types from display-options for backward compatibility
export type { DisplayOptions, DisplayOptionsContext };

export type ResolveSchemaConfig = {
	parameters: Record<string, unknown>;
	schema: z.ZodTypeAny;
	required: boolean;
	displayOptions: DisplayOptions;
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
}: ResolveSchemaConfig): z.ZodTypeAny {
	const isVisible = matchesDisplayOptions(parameters, displayOptions);

	if (isVisible) {
		return required ? schema : schema.optional();
	} else {
		return z.unknown().optional();
	}
}
