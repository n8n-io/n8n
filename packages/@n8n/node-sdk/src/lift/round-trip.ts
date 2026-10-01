/** Compile and decompile through a lifted identity map. */
import {
	NodeHelpers,
	isResourceLocatorValue,
	type INodeParameters,
	type INodeTypeDescription,
	type NodeParameterValueType,
} from 'n8n-workflow';

import type { CompileMap } from './lift';

function withLocatorFlag(value: NodeParameterValueType): NodeParameterValueType {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return value;
	const locator = { ...value, __rl: true };
	return isResourceLocatorValue(locator) ? locator : value;
}

function withoutLocatorFlag(value: NodeParameterValueType): NodeParameterValueType {
	if (!isResourceLocatorValue(value)) return value;
	const { __rl: _flag, ...rest } = value;
	return rest;
}

/** Contract input to legacy parameters. Fields outside the map are dropped. */
export function compileLifted(map: CompileMap, input: INodeParameters): INodeParameters {
	const { resource, operation } = map.target;
	return {
		...(resource !== undefined ? { resource } : {}),
		...(operation !== undefined ? { operation } : {}),
		...Object.fromEntries(
			Object.entries(input).flatMap(([field, value]): Array<[string, NodeParameterValueType]> => {
				const target = map.fields[field];
				if (!target) return [];
				return [[target.path, target.kind === 'resourceLocator' ? withLocatorFlag(value) : value]];
			}),
		),
	};
}

/** Legacy parameters with defaults filled in and hidden parameters removed, as n8n runs them. */
export const normaliseParameters = (
	description: INodeTypeDescription,
	typeVersion: number,
	parameters: INodeParameters,
): INodeParameters =>
	NodeHelpers.getNodeParameters(
		description.properties,
		parameters,
		true,
		false,
		{ typeVersion },
		description,
	) ?? {};

/**
 * Legacy parameters to contract input. Values that equal their default are left out, except
 * the variant tag.
 */
export function decompileLifted(
	map: CompileMap,
	description: INodeTypeDescription,
	parameters: INodeParameters,
): INodeParameters {
	const node = { typeVersion: map.target.typeVersion };
	const full = normaliseParameters(description, node.typeVersion, parameters);
	const changed =
		NodeHelpers.getNodeParameters(
			description.properties,
			parameters,
			false,
			false,
			node,
			description,
		) ?? {};
	return Object.fromEntries(
		Object.entries(map.fields).flatMap(
			([field, { path, kind }]): Array<[string, NodeParameterValueType]> => {
				const value = field === map.selector ? full[path] : changed[path];
				if (value === undefined) return [];
				return [[field, kind === 'resourceLocator' ? withoutLocatorFlag(value) : value]];
			},
		),
	);
}
