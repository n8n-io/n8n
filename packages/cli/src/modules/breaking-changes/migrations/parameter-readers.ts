import { isNodeParameters } from 'n8n-workflow';
import type { INodeParameters } from 'n8n-workflow';

/**
 * Returns a parameter value as a plain parameter object, or `undefined` for any other value.
 * The `isNodeParameters` guard alone leaves special value types in the union, such as icons.
 */
export function asParameters(value: unknown): INodeParameters | undefined {
	return isNodeParameters(value) ? value : undefined;
}

/** An n8n expression is a string that starts with `=`. */
export const isExpression = (value: unknown): boolean =>
	typeof value === 'string' && value.startsWith('=');

/**
 * Reads a whole-number parameter that a migration must compute with.
 * Saved workflows omit default values, so `fallback` stands in for a missing one.
 * Throws for expressions and out-of-range values, because the migration cannot prove
 * what they mean at run time.
 */
export function readInteger(
	parameters: INodeParameters,
	key: string,
	fallback: number,
	label: string,
	{ min, max }: { min?: number; max?: number } = {},
): number {
	const value = parameters[key] ?? fallback;
	const parsed =
		typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))
			? Number(value)
			: Number.NaN;

	if (
		!Number.isInteger(parsed) ||
		(min !== undefined && parsed < min) ||
		(max !== undefined && parsed > max)
	) {
		throw new Error(
			`"${label}" is an expression or has a value that has no exact replacement, so the node cannot be migrated automatically.`,
		);
	}

	return parsed;
}

/** Reads a text option parameter. Throws for expressions and other value types. */
export function readString(
	parameters: INodeParameters,
	key: string,
	fallback: string,
	label: string,
): string {
	const value = parameters[key] ?? fallback;
	if (typeof value !== 'string' || isExpression(value)) {
		throw new Error(
			`"${label}" is an expression or has an unsupported value, so the node cannot be migrated automatically.`,
		);
	}
	return value;
}

/** Reads the `options` collection of a node. A missing collection is empty. */
export function readOptions(parameters: INodeParameters): INodeParameters {
	if (parameters.options === undefined) return {};

	const options = asParameters(parameters.options);
	if (!options) throw new Error('The options of this node are not in a supported format.');
	return options;
}

/** Copies the listed parameters that the old node has set. */
export function pickDefined(parameters: INodeParameters, keys: string[]): INodeParameters {
	const picked: INodeParameters = {};
	for (const key of keys) {
		const value = parameters[key];
		if (value !== undefined) picked[key] = value;
	}
	return picked;
}
