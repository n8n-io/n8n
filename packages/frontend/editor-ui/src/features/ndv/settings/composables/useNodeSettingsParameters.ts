import get from 'lodash/get';
import set from 'lodash/set';
import type { Ref } from 'vue';
import {
	type INode,
	type INodeParameters,
	type INodeProperties,
	type NodeParameterValue,
	NodeHelpers,
	deepCopy,
} from 'n8n-workflow';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useWorkflowHelpers } from '@/app/composables/useWorkflowHelpers';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import type { INodeUi, IUpdateInformation } from '@/Interface';
import {
	mustHideDuringCustomApiCall,
	setValue,
	updateDynamicConnections,
	updateParameterByPath,
} from '@/features/ndv/shared/ndv.utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useFocusPanelStore } from '@/app/stores/focusPanel.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { CHAT_TRIGGER_NODE_TYPE, KEEP_AUTH_IN_NDV_FOR_NODES } from '@/app/constants';
import {
	getMainAuthField,
	getNodeAuthFields,
	isAuthRelatedParameter,
} from '@/app/utils/nodeTypesUtils';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';
import { useSettingsStore } from '@/app/stores/settings.store';

export function useNodeSettingsParameters() {
	const workflowsStore = useWorkflowsStore();
	const workflowState = injectWorkflowState();
	const nodeTypesStore = useNodeTypesStore();
	const settingsStore = useSettingsStore();
	const telemetry = useTelemetry();
	const nodeHelpers = useNodeHelpers();
	const workflowHelpers = useWorkflowHelpers();
	const canvasOperations = useCanvasOperations();
	const externalHooks = useExternalHooks();

	function updateNodeParameter(
		nodeValues: Ref<INodeParameters>,
		parameterData: IUpdateInformation & { name: `parameters.${string}` },
		newValue: NodeParameterValue,
		node: INode,
		isToolNode: boolean,
	) {
		const nodeTypeDescription = nodeTypesStore.getNodeType(node.type, node.typeVersion);
		if (!nodeTypeDescription) {
			return;
		}

		// Get only the parameters which are different to the defaults
		let nodeParameters = NodeHelpers.getNodeParameters(
			nodeTypeDescription.properties,
			node.parameters,
			false,
			false,
			node,
			nodeTypeDescription,
		);

		const oldNodeParameters = Object.assign({}, nodeParameters);

		// Copy the data because it is the data of vuex so make sure that
		// we do not edit it directly
		nodeParameters = deepCopy(nodeParameters);

		const parameterPath = updateParameterByPath(
			parameterData.name,
			newValue,
			nodeParameters,
			nodeTypeDescription,
			node.typeVersion,
		);

		// Get the parameters with the now new defaults according to the
		// from the user actually defined parameters
		nodeParameters = NodeHelpers.getNodeParameters(
			nodeTypeDescription.properties,
			nodeParameters as INodeParameters,
			true,
			false,
			node,
			nodeTypeDescription,
		);

		if (isToolNode) {
			const updatedDescription = NodeHelpers.getUpdatedToolDescription(
				nodeTypeDescription,
				nodeParameters,
				node.parameters,
			);

			if (updatedDescription && nodeParameters) {
				nodeParameters.toolDescription = updatedDescription;
			}
		}

		if (NodeHelpers.isDefaultNodeName(node.name, nodeTypeDescription, node.parameters ?? {})) {
			const newName = NodeHelpers.makeNodeName(nodeParameters ?? {}, nodeTypeDescription);
			// Account for unique-ified nodes with `<name><digit>`
			if (!node.name.startsWith(newName)) {
				// We need a timeout here to support events reacting to the valueChange based on node names
				setTimeout(async () => await canvasOperations.renameNode(node.name, newName));
			}
		}

		for (const [key, value] of Object.entries(nodeParameters as object)) {
			if (value !== null && value !== undefined) {
				setValue(nodeValues, `parameters.${key}`, value as string);
			}
		}

		// Update the data in vuex
		const updateInformation: IUpdateInformation = {
			name: node.name,
			value: nodeParameters,
		};

		const connections = workflowsStore.allConnections;

		const updatedConnections = updateDynamicConnections(node, connections, parameterData);

		if (updatedConnections) {
			workflowsStore.setConnections(updatedConnections);
		}

		workflowState.setNodeParameters(updateInformation);

		void externalHooks.run('nodeSettings.valueChanged', {
			parameterPath,
			newValue,
			parameters: nodeTypeDescription.properties,
			oldNodeParameters,
		});

		nodeHelpers.updateNodeParameterIssuesByName(node.name);
		nodeHelpers.updateNodeCredentialIssuesByName(node.name);
		telemetry.trackNodeParametersValuesChange(nodeTypeDescription.name, parameterData);
	}

	function handleFocus(node: INodeUi | undefined, path: string, parameter: INodeProperties) {
		if (!node) return;

		const ndvStore = useNDVStore();
		const focusPanelStore = useFocusPanelStore();

		focusPanelStore.openWithFocusedNodeParameter({
			nodeId: node.id,
			parameterPath: path,
			parameter,
		});

		if (ndvStore.activeNode) {
			ndvStore.unsetActiveNodeName();
			ndvStore.resetNDVPushRef();
		}
	}

	function shouldDisplayNodeParameter(
		nodeParameters: INodeParameters,
		node: INodeUi | null,
		parameter: INodeProperties,
		path: string | undefined = '',
		displayKey: 'displayOptions' | 'disabledOptions' = 'displayOptions',
	): boolean {
		// Fast path: hidden parameters are never displayed
		if (parameter.type === 'hidden') {
			return false;
		}

		// Fast path: if no display/disabled options defined, no need for further checks
		const hasDisplayOptions = parameter[displayKey] !== undefined;

		// Check custom API call - only compute if needed
		if (
			nodeHelpers.isCustomApiCallSelected(nodeParameters) &&
			mustHideDuringCustomApiCall(parameter, nodeParameters)
		) {
			return false;
		}

		// Cache node type lookup - used multiple times
		const nodeType = node ? nodeTypesStore.getNodeType(node.type, node.typeVersion) : null;
		const nodeTypeValue = node?.type ?? '';

		// Auth-related parameter handling - only compute if not in KEEP_AUTH_IN_NDV_FOR_NODES
		if (!KEEP_AUTH_IN_NDV_FOR_NODES.includes(nodeTypeValue)) {
			const mainNodeAuthField = getMainAuthField(nodeType);

			if (mainNodeAuthField) {
				// Check if parameter is the main auth field itself
				if (parameter.name === mainNodeAuthField.name) {
					return false;
				}

				// Only compute auth fields if we have a main auth field
				// TODO: For now, hide all fields that are used in authentication fields displayOptions
				// Ideally, we should check if any non-auth field depends on it before hiding it but
				// since there is no such case, omitting it to avoid additional computation
				if (isAuthRelatedParameter(getNodeAuthFields(nodeType), parameter)) {
					return false;
				}
			}
		}

		// Hide chat hub toggle on chat trigger when module isn't enabled.
		// Remove this check when feature is generally available.
		if (
			nodeType?.name === CHAT_TRIGGER_NODE_TYPE &&
			parameter.name === 'availableInChat' &&
			!settingsStore.isChatFeatureEnabled
		) {
			return false;
		}

		// Fast path: no display options means parameter should be displayed
		if (!hasDisplayOptions) {
			return true;
		}

		// Get raw values at path
		const rawValues = path ? (get(nodeParameters, path) as INodeParameters) : nodeParameters;

		if (!rawValues) {
			return false;
		}

		// Check if any expressions need resolution
		const keys = Object.keys(rawValues);
		const keyCount = keys.length;

		// Fast path: no keys means nothing to resolve
		if (keyCount === 0) {
			return nodeHelpers.displayParameter(nodeParameters, parameter, path, node, displayKey);
		}

		// Check if we have any expressions to resolve (scan first to avoid unnecessary work)
		let hasExpressions = false;
		for (let i = 0; i < keyCount; i++) {
			const value = rawValues[keys[i]];
			if (typeof value === 'string' && value.charAt(0) === '=') {
				hasExpressions = true;
				break;
			}
		}

		// Fast path: no expressions means we can use original parameters directly
		if (!hasExpressions) {
			return nodeHelpers.displayParameter(nodeParameters, parameter, path, node, displayKey);
		}

		// Resolve expressions - use index-based iteration for better performance
		const nodeParams: INodeParameters = {};
		const pendingKeys: string[] = [];
		let parameterGotResolved = false;

		// First pass: resolve non-dependent expressions and collect plain values
		for (let i = 0; i < keyCount; i++) {
			const key = keys[i];
			const value = rawValues[key];

			if (typeof value === 'string' && value.charCodeAt(0) === 61) {
				// 61 is '='
				// Check if expression depends on other parameters that haven't been resolved yet
				if (value.includes('$parameter')) {
					// Check if any remaining key is referenced in this expression
					let hasDependency = false;
					for (let j = i + 1; j < keyCount; j++) {
						if (value.includes(keys[j])) {
							hasDependency = true;
							break;
						}
					}
					// Also check already-deferred keys in pendingKeys
					if (!hasDependency) {
						for (let j = 0; j < pendingKeys.length; j++) {
							if (value.includes(pendingKeys[j])) {
								hasDependency = true;
								break;
							}
						}
					}
					if (hasDependency) {
						pendingKeys.push(key);
						continue;
					}
				}

				// Resolve expression
				try {
					nodeParams[key] = workflowHelpers.resolveExpression(
						value,
						nodeParams,
					) as NodeParameterValue;
				} catch {
					nodeParams[key] = '';
				}
				parameterGotResolved = true;
			} else {
				nodeParams[key] = rawValues[key];
			}
		}

		// Second pass: resolve pending expressions (those with dependencies)
		// Use index-based iteration to avoid shift() which is O(n)
		const maxIterations = pendingKeys.length * 2; // Safety limit
		let iterations = 0;
		let pendingIndex = 0;
		while (pendingIndex < pendingKeys.length && iterations < maxIterations) {
			iterations++;
			const key = pendingKeys[pendingIndex];
			const value = rawValues[key] as string;

			// Check if dependencies are now resolved (only check remaining items)
			let hasDependency = false;
			for (let j = pendingIndex + 1; j < pendingKeys.length; j++) {
				if (value.includes(pendingKeys[j])) {
					hasDependency = true;
					break;
				}
			}

			if (hasDependency) {
				// Move to next, will revisit this key in remaining unresolved keys
				pendingKeys.push(key);
				pendingIndex++;
				continue;
			}

			try {
				nodeParams[key] = workflowHelpers.resolveExpression(
					value,
					nodeParams,
				) as NodeParameterValue;
			} catch {
				nodeParams[key] = '';
			}
			parameterGotResolved = true;
			pendingIndex++;
		}

		// Handle any remaining unresolved keys (circular dependencies or safety limit)
		for (let i = pendingIndex; i < pendingKeys.length; i++) {
			const key = pendingKeys[i];
			try {
				nodeParams[key] = workflowHelpers.resolveExpression(
					rawValues[key] as string,
					nodeParams,
				) as NodeParameterValue;
			} catch {
				nodeParams[key] = '';
			}
			parameterGotResolved = true;
		}

		if (parameterGotResolved) {
			if (path) {
				const resolvedValues = deepCopy(nodeParameters);
				set(resolvedValues, path, nodeParams);
				return nodeHelpers.displayParameter(resolvedValues, parameter, path, node, displayKey);
			}
			return nodeHelpers.displayParameter(nodeParams, parameter, '', node, displayKey);
		}

		return nodeHelpers.displayParameter(nodeParameters, parameter, path, node, displayKey);
	}

	return {
		setValue,
		shouldDisplayNodeParameter,
		updateParameterByPath,
		updateNodeParameter,
		handleFocus,
	};
}
