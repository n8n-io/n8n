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
	// A Map keeps names such as `constructor` and `__proto__` as plain keys.
	const defaults = new Map<string, NodeParameterValueType>();

	for (const property of properties ?? []) {
		if (defaults.has(property.name) || !isShownFor(property, context)) continue;
		defaults.set(property.name, property.default);
	}

	return Object.fromEntries(defaults);
}

/**
 * The resource and operation that a node uses: its own values, else the
 * defaults from its description. A node on its default operation often omits
 * the parameter, and without it the schema lookup would treat the node like a
 * trigger and could read a sibling trigger's `output.json`.
 */
export function defaultDiscriminators(
	properties: INodeProperties[] | undefined,
	{ resource, operation }: SchemaContext,
): SchemaContext {
	const asString = (value: unknown) => (typeof value === 'string' ? value : undefined);
	const effectiveResource = resource ?? asString(getParameterDefaults(properties, {}).resource);
	const effectiveOperation =
		operation ??
		asString(getParameterDefaults(properties, { resource: effectiveResource }).operation);
	return { resource: effectiveResource, operation: effectiveOperation };
}
