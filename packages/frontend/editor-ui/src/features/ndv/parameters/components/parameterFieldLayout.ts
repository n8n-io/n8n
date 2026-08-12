import type { InjectionKey, Ref } from 'vue';

/**
 * - `stacked`     label above control (the classic NDV layout)
 * - `horizontal`  label left, control right, for every field
 * - `auto`        horizontal for `options` and `number` only
 * - `compact`     horizontal for scalar fields; composites and editors stay full width
 */
export type ParameterFieldLayout = 'stacked' | 'horizontal' | 'auto' | 'compact';

/** Controls that need the full panel width and must never sit beside a label. */
const WIDE_PARAMETER_TYPES = new Set([
	'assignmentCollection',
	'collection',
	'fixedCollection',
	'filter',
	'resourceMapper',
	'resourceLocator',
	'json',
	'multiOptions',
	'workflowSelector',
	'curlImport',
	'button',
	'notice',
]);

/** Whether a parameter is simple enough to sit beside its label at panel width. */
export function isCompactLayoutCandidate(parameter: {
	type: string;
	typeOptions?: Record<string, unknown> | null;
}): boolean {
	if (WIDE_PARAMETER_TYPES.has(parameter.type)) return false;

	const opts = parameter.typeOptions ?? {};
	// Anything rendered as an editor, or a textarea taller than one row, needs width.
	if (opts.editor !== undefined) return false;
	if (typeof opts.rows === 'number' && opts.rows > 1) return false;

	return ['string', 'number', 'options', 'boolean', 'dateTime', 'color'].includes(parameter.type);
}

export const parameterFieldLayoutKey: InjectionKey<Readonly<Ref<ParameterFieldLayout>>> =
	Symbol('parameter-field-layout');
