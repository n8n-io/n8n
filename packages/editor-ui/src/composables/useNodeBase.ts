import { computed, getCurrentInstance, ref } from 'vue';

import type { INodeUi } from '@/Interface';
import {
	NO_OP_NODE_TYPE,
	NODE_CONNECTION_TYPE_ALLOW_MULTIPLE,
	NODE_INSERT_SPACER_BETWEEN_INPUT_GROUPS,
	NODE_MIN_INPUT_ITEMS_COUNT,
} from '@/constants';

import { NodeHelpers, NodeConnectionType } from 'n8n-workflow';
import type {
	INodeInputConfiguration,
	INodeTypeDescription,
	INodeOutputConfiguration,
	Workflow,
} from 'n8n-workflow';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import type { BrowserJsPlumbInstance } from '@jsplumb/browser-ui';
import type { Endpoint, EndpointOptions } from '@jsplumb/core';
import * as NodeViewUtils from '@/utils/nodeViewUtils';
import type { EndpointSpec } from '@jsplumb/common';
import { useDeviceSupport } from 'n8n-design-system';
import type { N8nEndpointLabelLength } from '@/plugins/jsplumb/N8nPlusEndpointType';
import { isValidNodeConnectionType } from '@/utils/typeGuards';
import { useI18n } from '@/composables/useI18n';

export function useNodeBase({
	name,
	instance,
	workflowObject,
	isReadOnly,
	emit,
}: {
	name: string;
	instance: BrowserJsPlumbInstance;
	workflowObject: Workflow;
	isReadOnly: boolean;
	emit: (event: string, ...args: unknown[]) => void;
}) {
	const uiStore = useUIStore();
	const deviceSupport = useDeviceSupport();
	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();

	const i18n = useI18n();

	// @TODO Remove this when Node.vue and Sticky.vue are migrated to composition API and pass refs instead
	const refs = computed(() => getCurrentInstance()?.refs ?? {});

	const data = computed<INodeUi | null>(() => {
		return workflowsStore.getNodeByName(name);
	});

	const nodeId = computed<string>(() => data.value?.id ?? '');

	const inputs = ref<Array<NodeConnectionType | INodeInputConfiguration>>([]);
	const outputs = ref<Array<NodeConnectionType | INodeOutputConfiguration>>([]);

	const createAddInputEndpointSpec = (
		connectionName: NodeConnectionType,
		color: string,
	): EndpointSpec => {
		const multiple = NODE_CONNECTION_TYPE_ALLOW_MULTIPLE.includes(connectionName);

		return {
			type: 'N8nAddInput',
			options: {
				width: 24,
				height: 72,
				color,
				multiple,
			},
		};
	};

	const createDiamondOutputEndpointSpec = (): EndpointSpec => ({
		type: 'Rectangle',
		options: {
			height: 10,
			width: 10,
			cssClass: 'diamond-output-endpoint',
		},
	});

	const getEndpointLabelLength = (length: number): N8nEndpointLabelLength => {
		if (length <= 2) return 'small';
		else if (length <= 6) return 'medium';
		return 'large';
	};

	function addEndpointTestingData(endpoint: Endpoint, type: string, inputIndex: number) {
		if (window?.Cypress && 'canvas' in endpoint.endpoint && instance) {
			const canvas = endpoint.endpoint.canvas;
			instance.setAttribute(canvas, 'data-endpoint-name', data.value?.name ?? '');
			instance.setAttribute(canvas, 'data-input-index', inputIndex.toString());
			instance.setAttribute(canvas, 'data-endpoint-type', type);
		}
	}

	function addInputEndpoints(node: INodeUi, nodeTypeData: INodeTypeDescription) {
		// Add Inputs
		const rootTypeIndexData: {
			[key: string]: number;
		} = {};
		const typeIndexData: {
			[key: string]: number;
		} = {};

		inputs.value = NodeHelpers.getNodeInputs(workflowObject, data.value!, nodeTypeData) || [];

		const sortedInputs = [...inputs.value];
		sortedInputs.sort((a, b) => {
			if (typeof a === 'string') {
				return 1;
			} else if (typeof b === 'string') {
				return -1;
			}

			if (a.required && !b.required) {
				return -1;
			} else if (!a.required && b.required) {
				return 1;
			}

			return 0;
		});

		sortedInputs.forEach((value, i) => {
			let inputConfiguration: INodeInputConfiguration;
			if (typeof value === 'string') {
				inputConfiguration = {
					type: value,
				};
			} else {
				inputConfiguration = value;
			}

			const inputName: NodeConnectionType = inputConfiguration.type;

			const rootCategoryInputName =
				inputName === NodeConnectionType.Main ? NodeConnectionType.Main : 'other';

			// Increment the index for inputs with current name
			if (rootTypeIndexData.hasOwnProperty(rootCategoryInputName)) {
				rootTypeIndexData[rootCategoryInputName]++;
			} else {
				rootTypeIndexData[rootCategoryInputName] = 0;
			}

			if (typeIndexData.hasOwnProperty(inputName)) {
				typeIndexData[inputName]++;
			} else {
				typeIndexData[inputName] = 0;
			}

			const rootTypeIndex = rootTypeIndexData[rootCategoryInputName];
			const typeIndex = typeIndexData[inputName];

			const inputsOfSameRootType = inputs.value.filter((inputData) => {
				const thisInputName: string = typeof inputData === 'string' ? inputData : inputData.type;
				return inputName === NodeConnectionType.Main
					? thisInputName === NodeConnectionType.Main
					: thisInputName !== NodeConnectionType.Main;
			});

			const nonMainInputs = inputsOfSameRootType.filter((inputData) => {
				return inputData !== NodeConnectionType.Main;
			});
			const requiredNonMainInputs = nonMainInputs.filter((inputData) => {
				return typeof inputData !== 'string' && inputData.required;
			});
			const optionalNonMainInputs = nonMainInputs.filter((inputData) => {
				return typeof inputData !== 'string' && !inputData.required;
			});
			const spacerIndexes = getSpacerIndexes(
				requiredNonMainInputs.length,
				optionalNonMainInputs.length,
			);

			// Get the position of the anchor depending on how many it has
			const anchorPosition = NodeViewUtils.getAnchorPosition(
				inputName,
				'input',
				inputsOfSameRootType.length,
				spacerIndexes,
			)[rootTypeIndex];

			if (!isValidNodeConnectionType(inputName)) {
				return;
			}

			const scope = NodeViewUtils.getEndpointScope(inputName);

			const newEndpointData: EndpointOptions = {
				uuid: NodeViewUtils.getInputEndpointUUID(nodeId.value, inputName, typeIndex),
				anchor: anchorPosition,
				// We potentially want to change that in the future to allow people to dynamically
				// activate and deactivate connected nodes
				maxConnections: inputConfiguration.maxConnections ?? -1,
				endpoint: 'Rectangle',
				paintStyle: NodeViewUtils.getInputEndpointStyle(
					nodeTypeData,
					'--color-foreground-xdark',
					inputName,
				),
				hoverPaintStyle: NodeViewUtils.getInputEndpointStyle(
					nodeTypeData,
					'--color-primary',
					inputName,
				),
				scope: NodeViewUtils.getScope(scope),
				source: inputName !== NodeConnectionType.Main,
				target: !isReadOnly && inputs.value.length > 1, // only enabled for nodes with multiple inputs.. otherwise attachment handled by connectionDrag event in NodeView,
				parameters: {
					connection: 'target',
					nodeId: nodeId.value,
					type: inputName,
					index: typeIndex,
				},
				enabled: !isReadOnly, // enabled in default case to allow dragging
				cssClass: 'rect-input-endpoint',
				dragAllowedWhenFull: true,
				hoverClass: 'rect-input-endpoint-hover',
				...getInputConnectionStyle(inputName, nodeTypeData),
			};

			const endpoint = instance?.addEndpoint(
				refs.value[data.value?.name ?? ''] as Element,
				newEndpointData,
			);
			addEndpointTestingData(endpoint, 'input', typeIndex);
			if (inputConfiguration.displayName ?? nodeTypeData.inputNames?.[i]) {
				// Apply input names if they got set
				endpoint.addOverlay(
					NodeViewUtils.getInputNameOverlay(
						inputConfiguration.displayName ?? nodeTypeData.inputNames?.[i] ?? '',
						inputName,
						inputConfiguration.required,
					),
				);
			}
			if (!Array.isArray(endpoint)) {
				endpoint.__meta = {
					nodeName: node.name,
					nodeId: nodeId.value,
					index: typeIndex,
					totalEndpoints: inputsOfSameRootType.length,
					nodeType: node.type,
				};
			}

			// TODO: Activate again if it makes sense. Currently makes problems when removing
			//       connection on which the input has a name. It does not get hidden because
			//       the endpoint to which it connects when letting it go over the node is
			//       different to the regular one (have different ids). So that seems to make
			//       problems when hiding the input-name.

			// if (index === 0 && inputName === NodeConnectionType.Main) {
			// 	// Make the first main-input the default one to connect to when connection gets dropped on node
			// 	instance.makeTarget(nodeId.value, newEndpointData);
			// }
		});
		if (sortedInputs.length === 0) {
			instance?.manage(refs.value[data.value?.name ?? ''] as Element);
		}
	}

	function getSpacerIndexes(
		leftGroupItemsCount: number,
		rightGroupItemsCount: number,
		insertSpacerBetweenGroups = NODE_INSERT_SPACER_BETWEEN_INPUT_GROUPS,
		minItemsCount = NODE_MIN_INPUT_ITEMS_COUNT,
	): number[] {
		const spacerIndexes = [];

		if (leftGroupItemsCount > 0 && rightGroupItemsCount > 0) {
			if (insertSpacerBetweenGroups) {
				spacerIndexes.push(leftGroupItemsCount);
			} else if (leftGroupItemsCount + rightGroupItemsCount < minItemsCount) {
				for (
					let spacerIndex = leftGroupItemsCount;
					spacerIndex < minItemsCount - rightGroupItemsCount;
					spacerIndex++
				) {
					spacerIndexes.push(spacerIndex);
				}
			}
		} else {
			if (
				leftGroupItemsCount > 0 &&
				leftGroupItemsCount < minItemsCount &&
				rightGroupItemsCount === 0
			) {
				for (
					let spacerIndex = 0;
					spacerIndex < minItemsCount - leftGroupItemsCount;
					spacerIndex++
				) {
					spacerIndexes.push(spacerIndex + leftGroupItemsCount);
				}
			} else if (
				leftGroupItemsCount === 0 &&
				rightGroupItemsCount > 0 &&
				rightGroupItemsCount < minItemsCount
			) {
				for (
					let spacerIndex = 0;
					spacerIndex < minItemsCount - rightGroupItemsCount;
					spacerIndex++
				) {
					spacerIndexes.push(spacerIndex);
				}
			}
		}

		return spacerIndexes;
	}

	function addOutputEndpoints(node: INodeUi, nodeTypeData: INodeTypeDescription) {
		const rootTypeIndexData: {
			[key: string]: number;
		} = {};
		const typeIndexData: {
			[key: string]: number;
		} = {};

		if (!data.value) {
			return;
		}

		outputs.value = NodeHelpers.getNodeOutputs(workflowObject, data.value, nodeTypeData) || [];

		// TODO: There are still a lot of references of "main" in NodesView and
		//       other locations. So assume there will be more problems
		let maxLabelLength = 0;
		const outputConfigurations: INodeOutputConfiguration[] = [];
		outputs.value.forEach((value, i) => {
			let outputConfiguration: INodeOutputConfiguration;
			if (typeof value === 'string') {
				outputConfiguration = {
					type: value,
				};
			} else {
				outputConfiguration = value;
			}
			if (nodeTypeData.outputNames?.[i]) {
				outputConfiguration.displayName = nodeTypeData.outputNames[i];
			}

			if (outputConfiguration.displayName) {
				maxLabelLength =
					outputConfiguration.displayName.length > maxLabelLength
						? outputConfiguration.displayName.length
						: maxLabelLength;
			}

			outputConfigurations.push(outputConfiguration);
		});

		const endpointLabelLength = getEndpointLabelLength(maxLabelLength);

		outputs.value.forEach((_value, i) => {
			const outputConfiguration = outputConfigurations[i];

			const outputName: NodeConnectionType = outputConfiguration.type;

			const rootCategoryOutputName =
				outputName === NodeConnectionType.Main ? NodeConnectionType.Main : 'other';

			// Increment the index for outputs with current name
			if (rootTypeIndexData.hasOwnProperty(rootCategoryOutputName)) {
				rootTypeIndexData[rootCategoryOutputName]++;
			} else {
				rootTypeIndexData[rootCategoryOutputName] = 0;
			}

			if (typeIndexData.hasOwnProperty(outputName)) {
				typeIndexData[outputName]++;
			} else {
				typeIndexData[outputName] = 0;
			}

			const rootTypeIndex = rootTypeIndexData[rootCategoryOutputName];
			const typeIndex = typeIndexData[outputName];

			const outputsOfSameRootType = outputs.value.filter((outputData) => {
				const thisOutputName: string =
					typeof outputData === 'string' ? outputData : outputData.type;
				return outputName === NodeConnectionType.Main
					? thisOutputName === NodeConnectionType.Main
					: thisOutputName !== NodeConnectionType.Main;
			});

			// Get the position of the anchor depending on how many it has
			const anchorPosition = NodeViewUtils.getAnchorPosition(
				outputName,
				'output',
				outputsOfSameRootType.length,
			)[rootTypeIndex];

			if (!isValidNodeConnectionType(outputName)) {
				return;
			}

			const scope = NodeViewUtils.getEndpointScope(outputName);

			const newEndpointData: EndpointOptions = {
				uuid: NodeViewUtils.getOutputEndpointUUID(nodeId.value, outputName, typeIndex),
				anchor: anchorPosition,
				maxConnections: -1,
				endpoint: {
					type: 'Dot',
					options: {
						radius: nodeTypeData && outputsOfSameRootType.length > 2 ? 7 : 9,
					},
				},
				hoverPaintStyle: NodeViewUtils.getOutputEndpointStyle(nodeTypeData, '--color-primary'),
				scope,
				source: true,
				target: outputName !== NodeConnectionType.Main,
				enabled: !isReadOnly,
				parameters: {
					connection: 'source',
					nodeId: nodeId.value,
					type: outputName,
					index: typeIndex,
				},
				hoverClass: 'dot-output-endpoint-hover',
				connectionsDirected: true,
				dragAllowedWhenFull: false,
				...getOutputConnectionStyle(outputName, outputConfiguration, nodeTypeData),
			};

			const endpoint = instance?.addEndpoint(
				refs.value[data.value?.name ?? ''] as Element,
				newEndpointData,
			);

			if (!endpoint) {
				return;
			}

			addEndpointTestingData(endpoint, 'output', typeIndex);
			if (outputConfiguration.displayName && isValidNodeConnectionType(outputName)) {
				// Apply output names if they got set
				const overlaySpec = NodeViewUtils.getOutputNameOverlay(
					outputConfiguration.displayName,
					outputName,
					outputConfiguration?.category,
				);
				endpoint.addOverlay(overlaySpec);
			}

			if (!Array.isArray(endpoint)) {
				endpoint.__meta = {
					nodeName: node.name,
					nodeId: nodeId.value,
					index: typeIndex,
					totalEndpoints: outputsOfSameRootType.length,
					endpointLabelLength,
				};
			}

			if (!isReadOnly && outputName === NodeConnectionType.Main) {
				const plusEndpointData: EndpointOptions = {
					uuid: NodeViewUtils.getOutputEndpointUUID(nodeId.value, outputName, typeIndex),
					anchor: anchorPosition,
					maxConnections: -1,
					endpoint: {
						type: 'N8nPlus',
						options: {
							dimensions: 24,
							connectedEndpoint: endpoint,
							showOutputLabel: outputs.value.length === 1,
							size: outputs.value.length >= 3 ? 'small' : 'medium',
							endpointLabelLength,
							hoverMessage: i18n.baseText('nodeBase.clickToAddNodeOrDragToConnect'),
						},
					},
					source: true,
					target: false,
					enabled: !isReadOnly,
					paintStyle: {
						outlineStroke: 'none',
					},
					hoverPaintStyle: {
						outlineStroke: 'none',
					},
					parameters: {
						connection: 'source',
						nodeId: nodeId.value,
						type: outputName,
						index: typeIndex,
						category: outputConfiguration?.category,
					},
					cssClass: 'plus-draggable-endpoint',
					dragAllowedWhenFull: false,
				};

				if (outputConfiguration?.category) {
					plusEndpointData.cssClass = `${plusEndpointData.cssClass} ${outputConfiguration?.category}`;
				}

				if (!instance || !data.value) {
					return;
				}

				const plusEndpoint = instance.addEndpoint(
					refs.value[data.value.name] as Element,
					plusEndpointData,
				);
				addEndpointTestingData(plusEndpoint, 'plus', typeIndex);

				if (!Array.isArray(plusEndpoint)) {
					plusEndpoint.__meta = {
						nodeName: node.name,
						nodeId: nodeId.value,
						index: typeIndex,
						nodeType: node.type,
						totalEndpoints: outputsOfSameRootType.length,
					};
				}
			}
		});
	}

	function addNode(node: INodeUi) {
		const nodeTypeData = (nodeTypesStore.getNodeType(node.type, node.typeVersion) ??
			nodeTypesStore.getNodeType(NO_OP_NODE_TYPE)) as INodeTypeDescription;

		addInputEndpoints(node, nodeTypeData);
		addOutputEndpoints(node, nodeTypeData);
	}

	function getEndpointColor(connectionType: NodeConnectionType) {
		return `--node-type-${connectionType}-color`;
	}

	function getInputConnectionStyle(
		connectionType: NodeConnectionType,
		nodeTypeData: INodeTypeDescription,
	): EndpointOptions {
		if (connectionType === NodeConnectionType.Main) {
			return {
				paintStyle: NodeViewUtils.getInputEndpointStyle(
					nodeTypeData,
					getEndpointColor(NodeConnectionType.Main),
					connectionType,
				),
			};
		}

		if (!isValidNodeConnectionType(connectionType)) {
			return {};
		}

		const createSupplementalConnectionType = (
			connectionName: NodeConnectionType,
		): EndpointOptions => ({
			endpoint: createAddInputEndpointSpec(
				connectionName as NodeConnectionType,
				getEndpointColor(connectionName),
			),
		});

		return createSupplementalConnectionType(connectionType);
	}

	function getOutputConnectionStyle(
		connectionType: NodeConnectionType,
		outputConfiguration: INodeOutputConfiguration,
		nodeTypeData: INodeTypeDescription,
	): EndpointOptions {
		const createSupplementalConnectionType = (
			connectionName: NodeConnectionType,
		): EndpointOptions => ({
			endpoint: createDiamondOutputEndpointSpec(),
			paintStyle: NodeViewUtils.getOutputEndpointStyle(
				nodeTypeData,
				getEndpointColor(connectionName),
			),
			hoverPaintStyle: NodeViewUtils.getOutputEndpointStyle(
				nodeTypeData,
				getEndpointColor(connectionName),
			),
		});

		const type = 'output';

		if (connectionType === NodeConnectionType.Main) {
			if (outputConfiguration.category === 'error') {
				return {
					paintStyle: {
						...NodeViewUtils.getOutputEndpointStyle(
							nodeTypeData,
							getEndpointColor(NodeConnectionType.Main),
						),
						fill: 'var(--color-danger)',
					},
					cssClass: `dot-${type}-endpoint`,
				};
			}
			return {
				paintStyle: NodeViewUtils.getOutputEndpointStyle(
					nodeTypeData,
					getEndpointColor(NodeConnectionType.Main),
				),
				cssClass: `dot-${type}-endpoint`,
			};
		}

		if (!isValidNodeConnectionType(connectionType)) {
			return {};
		}

		return createSupplementalConnectionType(connectionType);
	}

	function touchEnd(_e: MouseEvent) {
		if (deviceSupport.isTouchDevice && uiStore.isActionActive['dragActive']) {
			uiStore.removeActiveAction('dragActive');
		}
	}

	function mouseLeftClick(e: MouseEvent) {
		// @ts-expect-error path is not defined in MouseEvent on all browsers
		const path = e.path || e.composedPath?.();
		for (let index = 0; index < path.length; index++) {
			if (
				path[index].className &&
				typeof path[index].className === 'string' &&
				path[index].className.includes('no-select-on-click')
			) {
				return;
			}
		}

		if (!deviceSupport.isTouchDevice) {
			if (uiStore.isActionActive['dragActive']) {
				uiStore.removeActiveAction('dragActive');
			} else {
				if (!deviceSupport.isCtrlKeyPressed(e)) {
					emit('deselectAllNodes');
				}

				if (uiStore.isNodeSelected[data.value?.name ?? '']) {
					emit('deselectNode', name);
				} else {
					emit('nodeSelected', name);
				}
			}
		}
	}

	return {
		getSpacerIndexes,
		addInputEndpoints,
		addOutputEndpoints,
		addNode,
		mouseLeftClick,
		touchEnd,
		inputs,
		outputs,
	};
}
