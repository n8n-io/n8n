import type {
	IDisplayOptions,
	INodeParameters,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';

/**
 * Version pin of a custom action.
 *
 * The `operation` value carries the action id and the version: `<actionId>@<version>`.
 * A value that is not the default is never stripped on save, so the pin survives.
 * The `operation` default must never be a custom action value.
 *
 * Older versions are options with option-level `displayOptions`. The parameter panel shows
 * an older version only to a node that already uses it.
 */

export const OPERATION_PARAMETER = 'operation';

/** Hidden parameters that store the action name, for an error about a deleted action. */
export const PIN_ACTION_ID_PARAMETER = 'customActionId';
export const PIN_ACTION_NAME_PARAMETER = 'customActionName';

export interface ActionVersionRef {
	actionId: string;
	actionName: string;
	version: number;
}

const VERSION_SEPARATOR = '@';
const VERSION_PATTERN = /^[1-9]\d*$/;

const optionValue = (actionId: string, version: number) =>
	`${actionId}${VERSION_SEPARATOR}${version}`;

function parseOptionValue(value: unknown): { actionId: string; version: number } | undefined {
	if (typeof value !== 'string') return undefined;
	const separatorIndex = value.lastIndexOf(VERSION_SEPARATOR);
	if (separatorIndex <= 0) return undefined;
	const versionText = value.slice(separatorIndex + 1);
	if (!VERSION_PATTERN.test(versionText)) return undefined;
	return { actionId: value.slice(0, separatorIndex), version: Number(versionText) };
}

/** Options for the `operation` dropdown. New nodes can select only the newest version of each action. */
export function operationOptions(
	actions: Array<{ id: string; name: string; description?: string; versions: number[] }>,
): INodePropertyOptions[] {
	return actions.flatMap((action) => {
		if (action.versions.length === 0) return [];
		const versions = [...new Set(action.versions)].sort((a, b) => a - b);
		const newest = versions[versions.length - 1];
		const olderValues = versions.filter((v) => v !== newest).map((v) => optionValue(action.id, v));

		return versions.map((version): INodePropertyOptions => {
			const value = optionValue(action.id, version);
			const option: INodePropertyOptions = {
				name: action.name,
				value,
				action: action.name,
			};
			if (action.description !== undefined) option.description = action.description;

			if (version !== newest) {
				// Only a node that already uses this version sees it.
				option.displayOptions = { show: { [OPERATION_PARAMETER]: [value] } };
			} else if (olderValues.length > 0) {
				// A node on an older version sees one entry for the action, not two.
				option.displayOptions = { hide: { [OPERATION_PARAMETER]: olderValues } };
			}
			return option;
		});
	});
}

/** `displayOptions.show` for the properties of one version of one action. */
export function showFor(actionId: string, version: number): NonNullable<IDisplayOptions['show']> {
	return { [OPERATION_PARAMETER]: [optionValue(actionId, version)] };
}

/** Extra properties the mechanism needs, for example a hidden pin parameter. Can be empty. */
export function pinProperties(
	_actions: Array<{ id: string; name: string; versions: number[] }>,
): INodeProperties[] {
	// No `displayOptions`: the values must survive when the action no longer exists.
	// The default is empty, so a written value always differs from it and is saved.
	return [
		{ displayName: 'Custom Action ID', name: PIN_ACTION_ID_PARAMETER, type: 'hidden', default: '' },
		{
			displayName: 'Custom Action Name',
			name: PIN_ACTION_NAME_PARAMETER,
			type: 'hidden',
			default: '',
		},
	];
}

/** Reads the pin from saved node parameters. `undefined` when no custom action is selected. */
export function readPin(parameters: INodeParameters): ActionVersionRef | undefined {
	const parsed = parseOptionValue(parameters[OPERATION_PARAMETER]);
	if (!parsed) return undefined;

	// The name is valid only for the action it was written for. The id is the fallback.
	const storedId = parameters[PIN_ACTION_ID_PARAMETER];
	const storedName = parameters[PIN_ACTION_NAME_PARAMETER];
	const actionName =
		storedId === parsed.actionId && typeof storedName === 'string' && storedName !== ''
			? storedName
			: parsed.actionId;

	return { actionId: parsed.actionId, actionName, version: parsed.version };
}

/** Parameter values that pin a node to a version. The upgrade button and the nodes panel write these. */
export function pinValues(ref: ActionVersionRef): INodeParameters {
	return {
		[OPERATION_PARAMETER]: optionValue(ref.actionId, ref.version),
		[PIN_ACTION_ID_PARAMETER]: ref.actionId,
		[PIN_ACTION_NAME_PARAMETER]: ref.actionName,
	};
}
