import type { IUpdateInformation } from '@/Interface';
import get from 'lodash/get';
import set from 'lodash/set';
import {
	type INode,
	type INodeParameters,
	type NodeParameterValue,
	NodeHelpers,
	deepCopy,
} from 'n8n-workflow';
import { useTelemetry } from './useTelemetry';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeHelpers } from './useNodeHelpers';
import { useCanvasOperations } from './useCanvasOperations';
import { useExternalHooks } from './useExternalHooks';
import { ref } from 'vue';
import { updateDynamicConnections, updateParameterByPath } from '@/utils/nodeSettingsUtils';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

export function useNodeSettingsParameters() {
	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const telemetry = useTelemetry();
	const nodeHelpers = useNodeHelpers();
	const canvasOperations = useCanvasOperations();
	const externalHooks = useExternalHooks();

	const nodeValues = ref<INodeParameters>({
		color: '#ff0000',
		alwaysOutputData: false,
		executeOnce: false,
		notesInFlow: false,
		onError: 'stopWorkflow',
		retryOnFail: false,
		maxTries: 3,
		waitBetweenTries: 1000,
		notes: '',
		parameters: {},
	});

	function setValue(name: string, value: NodeParameterValue) {
		const nameParts = name.split('.');
		let lastNamePart: string | undefined = nameParts.pop();

		let isArray = false;
		if (lastNamePart !== undefined && lastNamePart.includes('[')) {
			// It includes an index so we have to extract it
			const lastNameParts = lastNamePart.match(/(.*)\[(\d+)\]$/);
			if (lastNameParts) {
				nameParts.push(lastNameParts[1]);
				lastNamePart = lastNameParts[2];
				isArray = true;
			}
		}

		// Set the value so that everything updates correctly in the UI
		if (nameParts.length === 0) {
			// Data is on top level
			if (value === null) {
				// Property should be deleted
				if (lastNamePart) {
					const { [lastNamePart]: removedNodeValue, ...remainingNodeValues } = nodeValues.value;
					nodeValues.value = remainingNodeValues;
				}
			} else {
				// Value should be set
				nodeValues.value = {
					...nodeValues.value,
					[lastNamePart as string]: value,
				};
			}
		} else {
			// Data is on lower level
			if (value === null) {
				// Property should be deleted
				let tempValue = get(nodeValues.value, nameParts.join('.')) as
					| INodeParameters
					| INodeParameters[];

				if (lastNamePart && !Array.isArray(tempValue)) {
					const { [lastNamePart]: removedNodeValue, ...remainingNodeValues } = tempValue;
					tempValue = remainingNodeValues;
				}

				if (isArray && Array.isArray(tempValue) && tempValue.length === 0) {
					// If a value from an array got delete and no values are left
					// delete also the parent
					lastNamePart = nameParts.pop();
					tempValue = get(nodeValues.value, nameParts.join('.')) as INodeParameters;
					if (lastNamePart) {
						const { [lastNamePart]: removedArrayNodeValue, ...remainingArrayNodeValues } =
							tempValue;
						tempValue = remainingArrayNodeValues;
					}
				}
			} else {
				// Value should be set
				if (typeof value === 'object') {
					set(
						get(nodeValues.value, nameParts.join('.')) as Record<string, unknown>,
						lastNamePart as string,
						deepCopy(value),
					);
				} else {
					set(
						get(nodeValues.value, nameParts.join('.')) as Record<string, unknown>,
						lastNamePart as string,
						value,
					);
				}
			}
		}

		nodeValues.value = { ...nodeValues.value };
	}

	function nameIsParameter(
		parameterData: IUpdateInformation,
	): parameterData is IUpdateInformation & { name: `parameters.${string}` } {
		return parameterData.name.startsWith('parameters.');
	}

	function updateNodeParameter(
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
				setValue(`parameters.${key}`, value as string);
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
			workflowsStore.setConnections(updatedConnections, true);
		}

		workflowsStore.setNodeParameters(updateInformation);

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

	return {
		nodeValues,
		setValue,
		updateParameterByPath,
		updateNodeParameter,
		nameIsParameter,
	};
}
