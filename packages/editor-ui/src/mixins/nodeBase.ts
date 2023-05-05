import type { PropType } from 'vue';
import mixins from 'vue-typed-mixins';
import type { INodeUi } from '@/Interface';
import { deviceSupportHelpers } from '@/mixins/deviceSupportHelpers';
import { NO_OP_NODE_TYPE } from '@/constants';

import type { INodeTypeDescription } from 'n8n-workflow';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useWorkflowsStore } from '@/stores/workflows';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import type { BrowserJsPlumbInstance } from '@jsplumb/browser-ui';
import type { Endpoint, EndpointOptions } from '@jsplumb/core';
import * as NodeViewUtils from '@/utils/nodeViewUtils';
import { useHistoryStore } from '@/stores/history';
import { useCanvasStore } from '@/stores/canvas';

export const nodeBase = mixins(deviceSupportHelpers).extend({
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
			let index;
			const indexData: {
				[key: string]: number;
			} = {};

			nodeTypeData.inputs.forEach((inputName: string, i: number) => {
				// Increment the index for inputs with current name
				if (indexData.hasOwnProperty(inputName)) {
					indexData[inputName]++;
				} else {
					indexData[inputName] = 0;
				}
				index = indexData[inputName];

				// Get the position of the anchor depending on how many it has
				const anchorPosition =
					NodeViewUtils.ANCHOR_POSITIONS.input[nodeTypeData.inputs.length][index];

				const newEndpointData: EndpointOptions = {
					uuid: NodeViewUtils.getInputEndpointUUID(this.nodeId, index),
					anchor: anchorPosition,
					maxConnections: -1,
					endpoint: 'Rectangle',
					paintStyle: NodeViewUtils.getInputEndpointStyle(nodeTypeData, '--color-foreground-xdark'),
					hoverPaintStyle: NodeViewUtils.getInputEndpointStyle(nodeTypeData, '--color-primary'),
					source: false,
					target: !this.isReadOnly && nodeTypeData.inputs.length > 1, // only enabled for nodes with multiple inputs.. otherwise attachment handled by connectionDrag event in NodeView,
					parameters: {
						nodeId: this.nodeId,
						type: inputName,
						index,
					},
					enabled: !this.isReadOnly, // enabled in default case to allow dragging
					cssClass: 'rect-input-endpoint',
					dragAllowedWhenFull: true,
					hoverClass: 'dropHover',
				};

				const endpoint = this.instance?.addEndpoint(
					this.$refs[this.data.name] as Element,
					newEndpointData,
				);
				this.__addEndpointTestingData(endpoint, 'input', index);
				if (nodeTypeData.inputNames) {
					// Apply input names if they got set
					endpoint.addOverlay(NodeViewUtils.getInputNameOverlay(nodeTypeData.inputNames[index]));
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
			let index;
			const indexData: {
				[key: string]: number;
			} = {};

			nodeTypeData.outputs.forEach((inputName: string, i: number) => {
				// Increment the index for outputs with current name
				if (indexData.hasOwnProperty(inputName)) {
					indexData[inputName]++;
				} else {
					indexData[inputName] = 0;
				}
				index = indexData[inputName];

				// Get the position of the anchor depending on how many it has
				const anchorPosition =
					NodeViewUtils.ANCHOR_POSITIONS.output[nodeTypeData.outputs.length][index];

				const newEndpointData: EndpointOptions = {
					uuid: NodeViewUtils.getOutputEndpointUUID(this.nodeId, index),
					anchor: anchorPosition,
					maxConnections: -1,
					endpoint: {
						type: 'Dot',
						options: {
							radius: nodeTypeData && nodeTypeData.outputs.length > 2 ? 7 : 9,
						},
					},
					paintStyle: NodeViewUtils.getOutputEndpointStyle(
						nodeTypeData,
						'--color-foreground-xdark',
					),
					hoverPaintStyle: NodeViewUtils.getOutputEndpointStyle(nodeTypeData, '--color-primary'),
					source: true,
					target: false,
					enabled: !this.isReadOnly,
					parameters: {
						nodeId: this.nodeId,
						type: inputName,
						index,
					},
					hoverClass: 'dot-output-endpoint-hover',
					connectionsDirected: true,
					cssClass: 'dot-output-endpoint',
					dragAllowedWhenFull: false,
				};

				const endpoint = this.instance.addEndpoint(
					this.$refs[this.data.name] as Element,
					newEndpointData,
				);
				this.__addEndpointTestingData(endpoint, 'output', index);
				if (nodeTypeData.outputNames) {
					// Apply output names if they got set
					const overlaySpec = NodeViewUtils.getOutputNameOverlay(nodeTypeData.outputNames[index]);
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

				if (!this.isReadOnly) {
					const plusEndpointData: EndpointOptions = {
						uuid: NodeViewUtils.getOutputEndpointUUID(this.nodeId, index),
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
							nodeId: this.nodeId,
							type: inputName,
							index,
						},
						cssClass: 'plus-draggable-endpoint',
						dragAllowedWhenFull: false,
					};
					const plusEndpoint = this.instance.addEndpoint(
						this.$refs[this.data.name] as Element,
						plusEndpointData,
					);
					this.__addEndpointTestingData(plusEndpoint, 'plus', index);

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
