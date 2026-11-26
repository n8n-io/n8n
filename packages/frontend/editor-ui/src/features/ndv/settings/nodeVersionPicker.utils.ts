import {
	NodeHelpers,
	isINodeProperties,
	isINodePropertyCollection,
	isINodePropertyOptions,
	type INodeProperties,
	type INodePropertyCollection,
	type INodePropertyOptions,
	type NodeParameterValueType,
} from 'n8n-workflow';
import { MASK } from '@/app/utils/maskSecret';

/**
 * Returns the versions that the version picker lists, highest first, and the version to tag as latest.
 * A hidden version, or a version above the latest one, is listed only when the node uses it.
 */
export function getNodeVersionChoices(
	versions: number[],
	isHidden: (version: number) => boolean,
	currentVersion: number,
	defaultVersion: number | undefined,
): { latest: number | undefined; listed: number[] } {
	const visible = versions.filter((version) => !isHidden(version));

	const latest =
		defaultVersion !== undefined && visible.includes(defaultVersion)
			? defaultVersion
			: visible.length > 0
				? Math.max(...visible)
				: undefined;

	const listed = versions
		.filter(
			(version) =>
				version === currentVersion ||
				(!isHidden(version) && (latest === undefined || version <= latest)),
		)
		.sort((a, b) => b - a);

	return { latest, listed };
}

/** Returns the name of every password parameter, at any depth. */
export function collectPasswordNames(
	properties: Array<INodeProperties | INodePropertyOptions | INodePropertyCollection>,
	names = new Set<string>(),
): Set<string> {
	for (const property of properties) {
		if (isINodePropertyCollection(property)) {
			collectPasswordNames(property.values, names);
		} else if (isINodeProperties(property)) {
			if (property.typeOptions?.password) names.add(property.name);
			if (property.options) collectPasswordNames(property.options, names);
		}
	}

	return names;
}

/**
 * Returns the text that the version change banner shows for a value.
 * `properties` are the parameters of the version that the value belongs to.
 */
export function formatVersionChangeValue(
	value: NodeParameterValueType,
	path: Array<string | number>,
	properties: INodeProperties[],
	passwordNames: Set<string>,
): string {
	// ponytail: masking is by name, so a parameter that shares its name with a password
	// parameter is masked too, and a nested option value renders raw. Resolve the parameter
	// by path if either becomes a problem. A caller with no description has no names to pass,
	// so the banner masks every value in that case.
	const leaf = path.findLast((segment) => typeof segment === 'string');
	if (typeof leaf === 'string' && passwordNames.has(leaf)) return MASK;

	if (path.length === 1) {
		for (const property of properties) {
			if (property.name !== path[0] || property.type !== 'options') continue;
			const option = property.options?.find(
				(item) => isINodePropertyOptions(item) && item.value === value,
			);
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

/**
 * Returns the lookup keys of what the new version adds: a parameter path such as `options.timeout`,
 * or `path=value` for a new dropdown value.
 */
export function getNewParameterPaths(
	...args: Parameters<typeof NodeHelpers.getNodeVersionAdditions>
): string[] {
	return NodeHelpers.getNodeVersionAdditions(...args).map((addition) =>
		addition.kind === 'parameter' ? addition.path : `${addition.path}=${addition.value}`,
	);
}
