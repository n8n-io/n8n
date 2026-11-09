import type { SerializedCredentialData } from '@n8n/api-types';
import isEqual from 'lodash/isEqual';
import { NodeHelpers, type ICredentialType, type INodeProperties } from 'n8n-workflow';

import type { CredentialTypes } from '@/credential-types';

import {
	isExpressionOnly,
	NEVER_EXPORTED_KEYS,
	omitNeverExportedKeys,
} from './credential-export-policy';

// A secret can never have one of these types, so a value of such a field may travel in a package.
const CONTROLLER_FIELD_TYPES = new Set<INodeProperties['type']>([
	'boolean',
	'options',
	'multiOptions',
]);

function isControllerField(property: INodeProperties): boolean {
	return CONTROLLER_FIELD_TYPES.has(property.type) && property.typeOptions?.password !== true;
}

/** Field names that a field's `displayOptions` read. Keys such as `@version` are not field names. */
function displayDependencies(property: INodeProperties): string[] {
	const { show, hide } = property.displayOptions ?? {};
	return [...Object.keys(show ?? {}), ...Object.keys(hide ?? {})].filter(
		(key) => !key.startsWith('@'),
	);
}

/**
 * Returns the names of the plain fields that decide whether the `seedFields` show.
 * Walks up the chain, because a controller can be hidden by another controller.
 * Returns only fields that cannot hold a secret.
 */
export function findDisplayControllers(
	properties: INodeProperties[],
	seedFields: Iterable<string>,
): Set<string> {
	const byName = new Map(properties.map((property) => [property.name, property]));
	const visited = new Set<string>();
	const controllers = new Set<string>();
	const queue = [...seedFields];

	while (queue.length > 0) {
		const name = queue.pop()!;
		if (visited.has(name)) continue;
		visited.add(name);

		const property = byName.get(name);
		if (!property) continue;

		for (const dependency of displayDependencies(property)) {
			const controller = byName.get(dependency);
			if (!controller) continue;
			if (isControllerField(controller)) controllers.add(dependency);
			queue.push(dependency);
		}
	}

	return controllers;
}

/**
 * The fields of a credential type, with the fields of its parent types (`extends`).
 * Merges like the credential runtime: a field of the type replaces a parent field of the same name.
 * Returns `undefined` when this instance does not know the type.
 */
export function resolveCredentialProperties(
	credentialTypes: CredentialTypes,
	typeName: string,
	path: readonly string[] = [],
): INodeProperties[] | undefined {
	if (!credentialTypes.recognizes(typeName)) return undefined;

	// A type that fails to load counts as unknown, so a broken community credential cannot abort an import.
	let type: ICredentialType | undefined;
	try {
		type = credentialTypes.getByName(typeName);
	} catch {
		return undefined;
	}
	if (type === undefined) return undefined;

	// A root type keeps all its own fields, also the ones marked `doNotInherit`. The runtime does the same.
	if (type.extends === undefined) return type.properties;

	const combined: INodeProperties[] = [];
	for (const parentName of type.extends ?? []) {
		if (path.includes(parentName)) continue;
		const parentProperties = resolveCredentialProperties(credentialTypes, parentName, [
			...path,
			typeName,
		]);
		if (parentProperties) NodeHelpers.mergeNodeProperties(combined, parentProperties);
	}
	NodeHelpers.mergeNodeProperties(combined, type.properties);
	return combined;
}

function optionValues(property: INodeProperties): unknown[] {
	return (property.options ?? []).flatMap((option) => ('value' in option ? [option.value] : []));
}

/**
 * Whether a plain value is one that the field can hold: a boolean for a toggle, and a listed
 * option value (or values) for an options field.
 */
export function isConfirmedControllerValue(
	properties: INodeProperties[],
	name: string,
	value: unknown,
): value is string | boolean | string[] {
	const property = properties.find((candidate) => candidate.name === name);
	if (!property) return false;

	switch (property.type) {
		case 'boolean':
			return typeof value === 'boolean';
		case 'options':
			return optionValues(property).includes(value);
		case 'multiOptions':
			return Array.isArray(value) && value.every((entry) => optionValues(property).includes(entry));
		default:
			return false;
	}
}

/**
 * Keeps the values that may travel in a package: expressions, and plain values of fields that
 * decide which expression fields show. Drops every other value. Without the credential type
 * (`properties` is `undefined`), only expressions stay.
 */
export function keepConfirmedCredentialData(
	data: SerializedCredentialData,
	properties: INodeProperties[] | undefined,
): { data: SerializedCredentialData | undefined; dropped: string[] } {
	const expressionKeys = Object.keys(data).filter(
		(key) => !NEVER_EXPORTED_KEYS.has(key) && isExpressionOnly(data[key]),
	);
	const controllers =
		properties === undefined
			? new Set<string>()
			: findDisplayControllers(properties, expressionKeys);

	const kept: SerializedCredentialData = {};
	const dropped: string[] = [];
	for (const [key, value] of Object.entries(data)) {
		if (expressionKeys.includes(key)) {
			// A never-exported key inside an expression value is removed, as the exporter does.
			const cleaned = omitNeverExportedKeys(value);
			kept[key] = cleaned;
			if (!isEqual(cleaned, value)) dropped.push(key);
		} else if (
			properties !== undefined &&
			controllers.has(key) &&
			isConfirmedControllerValue(properties, key, value)
		) {
			kept[key] = value;
		} else {
			dropped.push(key);
		}
	}

	return { data: Object.keys(kept).length > 0 ? kept : undefined, dropped };
}
