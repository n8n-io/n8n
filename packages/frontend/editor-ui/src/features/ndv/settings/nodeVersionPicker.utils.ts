import {
	NodeHelpers,
	isINodeProperties,
	isINodePropertyCollection,
	isINodePropertyOptions,
	type INodeProperties,
	type INodePropertyCollection,
	type INodePropertyOptions,
	type INodeTypeDescription,
	type NodeParameterValueType,
} from 'n8n-workflow';
import pickBy from 'lodash/pickBy';
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

const isVersionRule = (_: unknown, key: string) => key.startsWith('@');

/** Returns the parameters that a version can show. Only the `@` rules count, not the node values. */
function availableIn(
	properties: INodeProperties[],
	version: number,
	type: INodeTypeDescription,
): INodeProperties[] {
	return properties.filter(
		(property) =>
			property.type !== 'hidden' &&
			NodeHelpers.displayParameter(
				{},
				{
					...property,
					displayOptions: {
						show: pickBy(property.displayOptions?.show, isVersionRule),
						hide: pickBy(property.displayOptions?.hide, isVersionRule),
					},
				},
				{ typeVersion: version },
				type,
			),
	);
}

const collectionOptions = (property: INodeProperties): INodeProperties[] =>
	property.type === 'collection' ? (property.options ?? []).filter(isINodeProperties) : [];

/**
 * Returns the paths of the parameters that the new version can show and the old version cannot.
 * A path is a top-level name, or `collection.option` for a direct option of a top-level collection.
 */
export function getNewParameterPaths(
	oldType: INodeTypeDescription,
	oldVersion: number,
	newType: INodeTypeDescription,
	newVersion: number,
): string[] {
	// ponytail: names are compared as a union over same-named parameters, so an option that is
	// new for one resource and old for another gets no tag. Match the variants by their
	// displayOptions if that becomes a problem.
	const oldProperties = availableIn(oldType.properties, oldVersion, oldType);
	const oldNames = new Set(oldProperties.map((property) => property.name));
	const paths = new Set<string>();

	for (const property of availableIn(newType.properties, newVersion, newType)) {
		if (!oldNames.has(property.name)) paths.add(property.name);

		const oldOptionNames = new Set(
			oldProperties
				.filter((old) => old.name === property.name)
				.flatMap((old) => availableIn(collectionOptions(old), oldVersion, oldType))
				.map((option) => option.name),
		);
		for (const option of availableIn(collectionOptions(property), newVersion, newType)) {
			if (!oldOptionNames.has(option.name)) paths.add(`${property.name}.${option.name}`);
		}
	}

	return [...paths];
}
