import {
	CUSTOM_ACTION_RESOURCE_VALUE,
	type CustomActionResponse,
	type CustomActionVersionSummary,
} from '@n8n/api-types';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { INodeParameters } from 'n8n-workflow';

import {
	CUSTOM_NODE_LIST_SCOPE,
	CUSTOM_NODES_MODULE_ID,
	PIN_ACTION_NAME_PARAMETER,
} from '../custom-nodes.constants';
import { useCustomNodesStore } from '../custom-nodes.store';

export type CustomActionPinValues = Record<string, string>;

interface VersionMatch {
	action: CustomActionResponse;
	version: CustomActionVersionSummary;
}

/**
 * Finds the custom action that node parameters select, by the `operation` value.
 * The editor writes the `pinValues` from the API as they are and never builds or parses them.
 * Each function returns `undefined` when the module is off or the selection is not known.
 */
export function useCustomActionSelection() {
	const settingsStore = useSettingsStore();
	const rbacStore = useRBACStore();
	const store = useCustomNodesStore();

	/** True when the data can exist. Starts one load in the background when it is needed. */
	function prepare(): boolean {
		if (!settingsStore.isModuleActive(CUSTOM_NODES_MODULE_ID)) return false;
		if (!rbacStore.hasScope(CUSTOM_NODE_LIST_SCOPE)) return false;
		store.ensureLoaded();
		return true;
	}

	function actionsOf(nodeTypeName: string | undefined): CustomActionResponse[] {
		const nodeActions = store.nodes
			.filter((node) => nodeTypeName === undefined || node.nodeType === nodeTypeName)
			.flatMap((node) => node.actions ?? []);
		const parentActions = store.parentActions.filter(
			(action) => nodeTypeName === undefined || action.parentNodeType === nodeTypeName,
		);
		return [...nodeActions, ...parentActions];
	}

	function findVersion(
		nodeTypeName: string | undefined,
		parameters: INodeParameters,
	): VersionMatch | undefined {
		const operation = parameters.operation;
		if (typeof operation !== 'string' || operation === '') return undefined;

		for (const action of actionsOf(nodeTypeName)) {
			const version = (action.versions ?? []).find(
				(candidate) => candidate.pinValues?.operation === operation,
			);
			if (version) return { action, version };
		}
		return undefined;
	}

	/** The pin values of the version that `parameters.operation` selects. */
	function pinValuesFor(
		nodeTypeName: string,
		parameters: INodeParameters,
	): CustomActionPinValues | undefined {
		if (!prepare()) return undefined;
		const match = findVersion(nodeTypeName, parameters);
		return match ? { ...match.version.pinValues } : undefined;
	}

	/** The pin values of the newest version, when the node uses an older version of the action. */
	function newestPinValuesFor(
		nodeTypeName: string,
		parameters: INodeParameters,
	): CustomActionPinValues | undefined {
		if (!prepare()) return undefined;
		const match = findVersion(nodeTypeName, parameters);
		if (!match || match.version.version >= match.action.newestVersion) return undefined;

		const newest = match.action.versions.find(
			(candidate) => candidate.version === match.action.newestVersion,
		);
		return newest ? { ...newest.pinValues } : undefined;
	}

	/**
	 * The name of the selected custom action. A deleted action is not known, so the name that the
	 * node stored when the user selected it is the fallback.
	 */
	function actionNameFor(parameters: INodeParameters): string | undefined {
		if (!prepare()) return undefined;
		const match = findVersion(undefined, parameters);
		if (match) return match.action.name;

		const storedName = parameters[PIN_ACTION_NAME_PARAMETER];
		if (parameters.resource === CUSTOM_ACTION_RESOURCE_VALUE && typeof storedName === 'string') {
			return storedName === '' ? undefined : storedName;
		}
		return undefined;
	}

	/** Starts the load early, for example when the nodes panel opens, so the first lookup finds the data. */
	function preload() {
		prepare();
	}

	/**
	 * Resolves when the custom actions are loaded, or at once when they cannot exist. A lookup that
	 * missed because the load still ran can try once more after it.
	 */
	async function whenLoaded() {
		if (!prepare()) return;
		await store.whenLoaded();
	}

	return { pinValuesFor, newestPinValuesFor, actionNameFor, preload, whenLoaded };
}
