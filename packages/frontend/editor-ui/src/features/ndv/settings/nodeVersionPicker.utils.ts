import type {
	INodeProperties,
	INodePropertyCollection,
	INodePropertyOptions,
	NodeParameterValueType,
} from 'n8n-workflow';

const MASK = '••••••';

/**
 * Returns the versions that the version picker lists, highest first, and the version to tag as latest.
 * A hidden version is listed only when the node uses it.
 */
export function getNodeVersionChoices(
	versions: number[],
	isHidden: (version: number) => boolean,
	currentVersion: number,
	defaultVersion: number | undefined,
): { latest: number | undefined; listed: number[] } {
	const visible = versions.filter((version) => !isHidden(version));
	const listed = versions
		.filter((version) => !isHidden(version) || version === currentVersion)
		.sort((a, b) => b - a);

	const latest =
		defaultVersion !== undefined && visible.includes(defaultVersion)
			? defaultVersion
			: visible.length > 0
				? Math.max(...visible)
				: undefined;

	return { latest, listed };
}

/** Returns the name of every password parameter, at any depth. */
export function collectPasswordNames(
	properties: Array<INodeProperties | INodePropertyOptions | INodePropertyCollection>,
	names = new Set<string>(),
): Set<string> {
	for (const property of properties) {
		if ('typeOptions' in property && property.typeOptions?.password) names.add(property.name);
		if ('options' in property && property.options) collectPasswordNames(property.options, names);
		if ('values' in property) collectPasswordNames(property.values, names);
	}

	return names;
}

/**
 * Returns the text that the version change banner shows for a value.
 * `properties` are the parameters of the version that the value belongs to.
 */
// ponytail: a nested option value renders raw, and masking is by name, so a parameter that
// shares its name with a password parameter is masked too. With no names, nothing is masked.
// Resolve the parameter by path if either becomes a problem.
export function formatVersionChangeValue(
	value: NodeParameterValueType,
	path: Array<string | number>,
	properties: INodeProperties[],
	passwordNames: Set<string>,
): string {
	const leaf = path.findLast((segment) => typeof segment === 'string');
	if (typeof leaf === 'string' && passwordNames.has(leaf)) return MASK;

	if (path.length === 1) {
		for (const property of properties) {
			if (property.name !== path[0] || property.type !== 'options') continue;
			const option = property.options?.find((item) => 'value' in item && item.value === value);
			if (option) return option.name;
		}
	}

	if (typeof value === 'object') {
		return JSON.stringify(value, (key, nested: unknown) =>
			passwordNames.has(key) ? MASK : nested,
		);
	}

	return String(value);
}
