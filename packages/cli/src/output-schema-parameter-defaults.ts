import type { INodeProperties, NodeParameterValueType } from 'n8n-workflow';

interface SchemaContext {
	resource?: string;
	operation?: string;
}

/** A property whose `displayOptions.show` lists other values than ours is not shown. */
function isShownFor(property: INodeProperties, context: SchemaContext): boolean {
	const show = property.displayOptions?.show;
	if (!show) return true;

	return (['resource', 'operation'] as const).every((key) => {
		const shownValues = show[key];
		const value = context[key];
		return !Array.isArray(shownValues) || value === undefined || shownValues.includes(value);
	});
}

/**
 * Defaults of the parameters that apply to one resource/operation, so a
 * parameter missing from a saved node can still pick its schema variant.
 * The first matching property wins when a name repeats per operation.
 */
export function getParameterDefaults(
	properties: INodeProperties[] | undefined,
	context: SchemaContext,
): Record<string, NodeParameterValueType> {
	const defaults: Record<string, NodeParameterValueType> = {};

	for (const property of properties ?? []) {
		if (property.name in defaults || !isShownFor(property, context)) continue;
		defaults[property.name] = property.default;
	}

	return defaults;
}
