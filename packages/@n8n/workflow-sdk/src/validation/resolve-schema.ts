import { z } from 'zod';

export type DisplayOptions = {
	show?: Record<string, unknown[]>;
	hide?: Record<string, unknown[]>;
};

export type ResolveSchemaConfig = {
	parameters: Record<string, unknown>;
	schema: z.ZodTypeAny;
	required: boolean;
	displayOptions: DisplayOptions;
};

export type ResolveSchemaFn = (config: ResolveSchemaConfig) => z.ZodTypeAny;

export function matchesDisplayOptions(
	parameters: Record<string, unknown>,
	displayOptions: DisplayOptions,
): boolean {
	if (displayOptions.show) {
		for (const [key, allowedValues] of Object.entries(displayOptions.show)) {
			if (!allowedValues.includes(parameters[key])) {
				return false;
			}
		}
	}

	if (displayOptions.hide) {
		for (const [key, hiddenValues] of Object.entries(displayOptions.hide)) {
			if (hiddenValues.includes(parameters[key])) {
				return false;
			}
		}
	}

	return true;
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
