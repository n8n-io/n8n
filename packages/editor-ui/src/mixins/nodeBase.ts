import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { mapStores } from 'pinia';

import type { INodeUi } from '@/Interface';
import { deviceSupportHelpers } from '@/mixins/deviceSupportHelpers';
import { NO_OP_NODE_TYPE } from '@/constants';

import type { ConnectionTypes, INodeTypeDescription } from 'n8n-workflow';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import type { BrowserJsPlumbInstance } from '@jsplumb/browser-ui';
import type { Endpoint, EndpointOptions } from '@jsplumb/core';
import * as NodeViewUtils from '@/utils/nodeViewUtils';
import { useHistoryStore } from '@/stores/history.store';
import { useCanvasStore } from '@/stores/canvas.store';
import type { EndpointSpec } from '@jsplumb/common';
import { EndpointType } from '@/Interface';
import { CONNECTOR_COLOR } from '@/utils/nodeViewUtils';

const createAddInputEndpointSpec = (color?: string): EndpointSpec => ({
	type: 'N8nAddInput',
	options: {
		size: 24,
		color,
	},
});

export const nodeBase = defineComponent({
	mixins: [deviceSupportHelpers],
	mounted() {
		// Initialize the node
		if (this.data !== null) {
			try {
				this.__addNode(this.data);
			} catch (error) {
				// This breaks when new nodes are loaded into store but workflow tab is not currently active
				// Shouldn't affect anything
			}
		}
	},
	computed: {
		...mapStores(useNodeTypesStore, useUIStore, useCanvasStore, useWorkflowsStore, useHistoryStore),
		data(): INodeUi | null {
			return this.workflowsStore.getNodeByName(this.name);
		},
		nodeId(): string {
			return this.data?.id || '';
		},
	},
	props: {
		name: {
			type: String,
		},
		instance: {
			type: Object as PropType<BrowserJsPlumbInstance>,
		},
		isReadOnly: {
			type: Boolean,
		},
		isActive: {
			type: Boolean,
		},
		hideActions: {
			type: Boolean,
		},
		disableSelecting: {
			type: Boolean,
		},
		showCustomTooltip: {
			type: Boolean,
		},
	},
	methods: {
		__addEndpointTestingData(endpoint: Endpoint, type: string, inputIndex: number) {
			if (window?.Cypress && 'canvas' in endpoint.endpoint) {
				const canvas = endpoint.endpoint.canvas;
				this.instance.setAttribute(canvas, 'data-endpoint-name', this.data.name);
				this.instance.setAttribute(canvas, 'data-input-index', inputIndex.toString());
				this.instance.setAttribute(canvas, 'data-endpoint-type', type);
			}
		},
		__addInputEndpoints(node: INodeUi, nodeTypeData: INodeTypeDescription) {
			// Add Inputs
			const indexData: {
				[key: string]: number;
			} = {};

			nodeTypeData.inputs.forEach((inputName, i) => {
				const locactionIntputName = inputName === 'main' ? 'main' : 'other';

				// Increment the index for inputs with current name
				if (indexData.hasOwnProperty(locactionIntputName)) {
					indexData[locactionIntputName]++;
				} else {
					indexData[locactionIntputName] = 0;
				}
				const typeIndex = indexData[locactionIntputName];

				const inputsOfSameType = nodeTypeData.inputs.filter((input) =>
					inputName === 'main' ? input === 'main' : input !== 'main',
				);

				// Get the position of the anchor depending on how many it has
				const anchorPosition = NodeViewUtils.getAnchorPosition(
					inputName,
					'input',
					inputsOfSameType.length,
				)[typeIndex];

				const scope = NodeViewUtils.getEndpointScope(inputName);

				const newEndpointData: EndpointOptions = {
					uuid: NodeViewUtils.getInputEndpointUUID(this.nodeId, i),
					anchor: anchorPosition,
					maxConnections: -1,
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
					scope,
					source: inputName !== 'main',
					target: !this.isReadOnly && nodeTypeData.inputs.length > 1, // only enabled for nodes with multiple inputs.. otherwise attachment handled by connectionDrag event in NodeView,
					parameters: {
						connection: 'target',
						nodeId: this.nodeId,
						type: inputName,
						index: i,
					},
					enabled: !this.isReadOnly, // enabled in default case to allow dragging
					cssClass: 'rect-input-endpoint',
					dragAllowedWhenFull: true,
					hoverClass: 'rect-input-endpoint-hover',
					...this.__getInputConnectionStyle(inputName, nodeTypeData),
				};

				const endpoint = this.instance?.addEndpoint(
					this.$refs[this.data.name] as Element,
					newEndpointData,
				);
				this.__addEndpointTestingData(endpoint, 'input', i);
				if (nodeTypeData.inputNames?.[i]) {
					// Apply input names if they got set
					endpoint.addOverlay(
						NodeViewUtils.getInputNameOverlay(nodeTypeData.inputNames[i], inputName),
					);
				}
				if (!Array.isArray(endpoint)) {
					endpoint.__meta = {
						nodeName: node.name,
						nodeId: this.nodeId,
						index: i,
						totalEndpoints: nodeTypeData.inputs.length,
					};
				}

				// TODO: Activate again if it makes sense. Currently makes problems when removing
				//       connection on which the input has a name. It does not get hidden because
				//       the endpoint to which it connects when letting it go over the node is
				//       different to the regular one (have different ids). So that seems to make
				//       problems when hiding the input-name.

				// if (index === 0 && inputName === 'main') {
				// 	// Make the first main-input the default one to connect to when connection gets dropped on node
				// 	this.instance.makeTarget(this.nodeId, newEndpointData);
				// }
			});
			if (nodeTypeData.inputs.length === 0) {
				this.instance.manage(this.$refs[this.data.name] as Element);
			}
		},
		__addOutputEndpoints(node: INodeUi, nodeTypeData: INodeTypeDescription) {
			const indexData: {
				[key: string]: number;
			} = {};

			// TODO: There are still a lot of references of "main" in NodesView and
			//       other locations. So assume there will be more problems

			nodeTypeData.outputs.forEach((outputName, i) => {
				const locactionOutputName = outputName === 'main' ? 'main' : 'other';

				// Increment the index for outputs with current name
				if (indexData.hasOwnProperty(locactionOutputName)) {
					indexData[locactionOutputName]++;
				} else {
					indexData[locactionOutputName] = 0;
				}
				const typeIndex = indexData[locactionOutputName];

				const outputsOfSameType = nodeTypeData.outputs.filter((output) =>
					outputName === 'main' ? output === 'main' : output !== 'main',
				);

				// Get the position of the anchor depending on how many it has
				const anchorPosition = NodeViewUtils.getAnchorPosition(
					outputName,
					'output',
					outputsOfSameType.length,
				)[typeIndex];

				const scope = NodeViewUtils.getEndpointScope(outputName as EndpointType);

				const newEndpointData: EndpointOptions = {
					uuid: NodeViewUtils.getOutputEndpointUUID(this.nodeId, i),
					anchor: anchorPosition,
					maxConnections: -1,
					endpoint: {
						type: 'Dot',
						options: {
							radius: nodeTypeData && outputsOfSameType.length > 2 ? 7 : 9,
						},
					},
					hoverPaintStyle: NodeViewUtils.getOutputEndpointStyle(nodeTypeData, '--color-primary'),
					scope,
					source: true,
					target: outputName !== 'main',
					enabled: !this.isReadOnly,
					parameters: {
						connection: 'source',
						nodeId: this.nodeId,
						type: outputName,
						index: i,
					},
					hoverClass: 'dot-output-endpoint-hover',
					connectionsDirected: true,
					dragAllowedWhenFull: false,
					...this.__getOutputConnectionStyle(outputName, nodeTypeData),
				};

				const endpoint = this.instance.addEndpoint(
					this.$refs[this.data.name] as Element,
					newEndpointData,
				);
				this.__addEndpointTestingData(endpoint, 'output', i);
				if (nodeTypeData.outputNames?.[i]) {
					// Apply output names if they got set
					const overlaySpec = NodeViewUtils.getOutputNameOverlay(
						nodeTypeData.outputNames[i],
						outputName,
					);
					endpoint.addOverlay(overlaySpec);
				}

				if (!Array.isArray(endpoint)) {
					endpoint.__meta = {
						nodeName: node.name,
						nodeId: this.nodeId,
						index: i,
						totalEndpoints: nodeTypeData.outputs.length,
					};
				}

				if (!this.isReadOnly && outputName === 'main') {
					const plusEndpointData: EndpointOptions = {
						uuid: NodeViewUtils.getOutputEndpointUUID(this.nodeId, i),
						anchor: anchorPosition,
						maxConnections: -1,
						endpoint: {
							type: 'N8nPlus',
							options: {
								dimensions: 24,
								connectedEndpoint: endpoint,
								showOutputLabel: nodeTypeData.outputs.length === 1,
								size: nodeTypeData.outputs.length >= 3 ? 'small' : 'medium',
								hoverMessage: this.$locale.baseText('nodeBase.clickToAddNodeOrDragToConnect'),
							},
						},
						source: true,
						target: false,
						enabled: !this.isReadOnly,
						paintStyle: {
							outlineStroke: 'none',
						},
						hoverPaintStyle: {
							outlineStroke: 'none',
						},
						parameters: {
							connection: 'source',
							nodeId: this.nodeId,
							type: outputName,
							index: i,
						},
						cssClass: 'plus-draggable-endpoint',
						dragAllowedWhenFull: false,
					};
					const plusEndpoint = this.instance.addEndpoint(
						this.$refs[this.data.name] as Element,
						plusEndpointData,
					);
					this.__addEndpointTestingData(plusEndpoint, 'plus', i);

					if (!Array.isArray(plusEndpoint)) {
						plusEndpoint.__meta = {
							nodeName: node.name,
							nodeId: this.nodeId,
							index: i,
							totalEndpoints: nodeTypeData.outputs.length,
						};
					}
				}
			});
		},
		__addNode(node: INodeUi) {
			const nodeTypeData = (this.nodeTypesStore.getNodeType(node.type, node.typeVersion) ??
				this.nodeTypesStore.getNodeType(NO_OP_NODE_TYPE)) as INodeTypeDescription;

			this.__addInputEndpoints(node, nodeTypeData);
			this.__addOutputEndpoints(node, nodeTypeData);
		},
		__getInputConnectionStyle(
			connectionType: ConnectionTypes,
			nodeTypeData: INodeTypeDescription,
		): EndpointOptions {
			const type = 'input';

			const connectionTypes: {
				[key: string]: EndpointOptions;
			} = {
				languageModel: {
					endpoint: createAddInputEndpointSpec('--color-primary'),
				},
				main: {
					paintStyle: NodeViewUtils.getInputEndpointStyle(
						nodeTypeData,
						'--color-foreground-xdark',
						connectionType,
					),
					cssClass: `dot-${type}-endpoint`,
				},
				memory: {
					endpoint: createAddInputEndpointSpec('--color-primary-tint-1'),
				},
				tool: {
					endpoint: createAddInputEndpointSpec('--color-danger'),
				},
				vectorRetriever: {
					endpoint: createAddInputEndpointSpec('--color-avatar-accent-2'),
				},
				vectorStore: {
					endpoint: createAddInputEndpointSpec('--color-json-null'),
				},
				embedding: {
					endpoint: createAddInputEndpointSpec('--color-json-default'),
				},
				document: {
					endpoint: createAddInputEndpointSpec('--color-success-light'),
				},
				textSplitter: {
					endpoint: createAddInputEndpointSpec('--color-secondary-tint-2'),
				},
				chain: {
					endpoint: createAddInputEndpointSpec('--color-json-string'),
				},
			};

			if (!connectionTypes.hasOwnProperty(connectionType)) {
				return {};
			}

			return connectionTypes[connectionType];
		},
		__getOutputConnectionStyle(
			connectionType: ConnectionTypes,
			nodeTypeData: INodeTypeDescription,
		): EndpointOptions {
			const type = 'output';
			const connectionTypes: {
				[key: string]: EndpointOptions;
			} = {
				languageModel: {
					paintStyle: NodeViewUtils.getOutputEndpointStyle(
						nodeTypeData,
						CONNECTOR_COLOR['languageModel'],
						connectionType,
					),
					hoverPaintStyle: NodeViewUtils.getOutputEndpointStyle(
						nodeTypeData,
						CONNECTOR_COLOR['languageModel'],
						connectionType,
					),
				},
				main: {
					paintStyle: NodeViewUtils.getOutputEndpointStyle(
						nodeTypeData,
						CONNECTOR_COLOR['main'],
						connectionType,
					),
					cssClass: `dot-${type}-endpoint`,
				},
				memory: {
					paintStyle: NodeViewUtils.getOutputEndpointStyle(
						nodeTypeData,
						CONNECTOR_COLOR['memory'],
						connectionType,
					),
					hoverPaintStyle: NodeViewUtils.getOutputEndpointStyle(
						nodeTypeData,
						CONNECTOR_COLOR['memory'],
						connectionType,
					),
				},
				tool: {
					paintStyle: NodeViewUtils.getOutputEndpointStyle(
						nodeTypeData,
						CONNECTOR_COLOR['tool'],
						connectionType,
					),
					hoverPaintStyle: NodeViewUtils.getOutputEndpointStyle(
						nodeTypeData,
						CONNECTOR_COLOR['tool'],
						connectionType,
					),
				},
				vectorRetriever: {
					paintStyle: NodeViewUtils.getOutputEndpointStyle(
						nodeTypeData,
						CONNECTOR_COLOR['vectorRetriever'],
						connectionType,
					),
					hoverPaintStyle: NodeViewUtils.getOutputEndpointStyle(
						nodeTypeData,
						CONNECTOR_COLOR['vectorRetriever'],
						connectionType,
					),
					cssClass: `dot-${type}-endpoint`,
				},
				vectorStore: {
					paintStyle: NodeViewUtils.getOutputEndpointStyle(
						nodeTypeData,
						'--color-json-null',
						connectionType,
					),
					cssClass: `dot-${type}-endpoint`,
				},
				embedding: {
					paintStyle: NodeViewUtils.getOutputEndpointStyle(
						nodeTypeData,
						CONNECTOR_COLOR['embedding'],
						connectionType,
					),
					hoverPaintStyle: NodeViewUtils.getOutputEndpointStyle(
						nodeTypeData,
						CONNECTOR_COLOR['embedding'],
						connectionType,
					),
					cssClass: `dot-${type}-endpoint`,
				},
				document: {
					paintStyle: NodeViewUtils.getOutputEndpointStyle(
						nodeTypeData,
						CONNECTOR_COLOR['document'],
						connectionType,
					),
					hoverPaintStyle: NodeViewUtils.getOutputEndpointStyle(
						nodeTypeData,
						CONNECTOR_COLOR['document'],
						connectionType,
					),
					cssClass: `dot-${type}-endpoint`,
				},
				textSplitter: {
					paintStyle: NodeViewUtils.getOutputEndpointStyle(
						nodeTypeData,
						CONNECTOR_COLOR['textSplitter'],
						connectionType,
					),
					hoverPaintStyle: NodeViewUtils.getOutputEndpointStyle(
						nodeTypeData,
						CONNECTOR_COLOR['textSplitter'],
						connectionType,
					),
					cssClass: `dot-${type}-endpoint`,
				},
				chain: {
					paintStyle: NodeViewUtils.getOutputEndpointStyle(
						nodeTypeData,
						'--color-json-string',
						connectionType,
					),
					cssClass: `dot-${type}-endpoint`,
				},
			};

			if (!connectionTypes.hasOwnProperty(connectionType)) {
				return {};
			}

			return connectionTypes[connectionType];
		},
		touchEnd(e: MouseEvent) {
			if (this.isTouchDevice) {
				if (this.uiStore.isActionActive('dragActive')) {
					this.uiStore.removeActiveAction('dragActive');
				}
			}
		},
		mouseLeftClick(e: MouseEvent) {
			// @ts-ignore
			const path = e.path || (e.composedPath && e.composedPath());
			for (let index = 0; index < path.length; index++) {
				if (
					path[index].className &&
					typeof path[index].className === 'string' &&
					path[index].className.includes('no-select-on-click')
				) {
					return;
				}
			}

			if (!this.isTouchDevice) {
				if (this.uiStore.isActionActive('dragActive')) {
					this.uiStore.removeActiveAction('dragActive');
				} else {
					if (!this.isCtrlKeyPressed(e)) {
						this.$emit('deselectAllNodes');
					}

					if (this.uiStore.isNodeSelected(this.data.name)) {
						this.$emit('deselectNode', this.name);
					} else {
						this.$emit('nodeSelected', this.name);
					}
				}
			}
		},
	},
});
