import { IEndpointOptions, INodeUi, XYPosition } from '@/Interface';

import mixins from 'vue-typed-mixins';

import { deviceSupportHelpers } from '@/components/mixins/deviceSupportHelpers';
import { nodeIndex } from '@/components/mixins/nodeIndex';
import { NODE_NAME_PREFIX, NO_OP_NODE_TYPE } from '@/constants';
import { getStyleTokenValue } from '../helpers';
import * as CanvasHelpers from '@/views/canvasHelpers';
import { Endpoint } from 'jsplumb';

import {
	INodeTypeDescription,
} from 'n8n-workflow';

const anchorPositions: {
	[key: string]: {
		[key: number]: string[] | number[][];
	}
} = {
	input: {
		1: [
			[0.01, 0.5, -1, 0],
		],
		2: [
			[0.01, 0.3, -1, 0],
			[0.01, 0.7, -1, 0],
		],
		3: [
			[0.01, 0.25, -1, 0],
			[0.01, 0.5, -1, 0],
			[0.01, 0.75, -1, 0],
		],
		4: [
			[0.01, 0.2, -1, 0],
			[0.01, 0.4, -1, 0],
			[0.01, 0.6, -1, 0],
			[0.01, 0.8, -1, 0],
		],
	},
	output: {
		1: [
			[.99, 0.5, 1, 0],
		],
		2: [
			[.99, 0.3, 1, 0],
			[.99, 0.7, 1, 0],
		],
		3: [
			[.99, 0.25, 1, 0],
			[.99, 0.5, 1, 0],
			[.99, 0.75, 1, 0],
		],
		4: [
			[.99, 0.2, 1, 0],
			[.99, 0.4, 1, 0],
			[.99, 0.6, 1, 0],
			[.99, 0.8, 1, 0],
		],
	},
};

export const nodeBase = mixins(
	deviceSupportHelpers,
	nodeIndex,
).extend({
	mounted () {
		// Initialize the node
		if (this.data !== null) {
			this.__addNode(this.data);
		}
	},
	computed: {
		data (): INodeUi {
			return this.$store.getters.getNodeByName(this.name);
		},
		nodeId (): string {
			return NODE_NAME_PREFIX + this.nodeIndex;
		},
		nodeIndex (): string {
			return this.$store.getters.getNodeIndex(this.data.name).toString();
		},
	},
	props: [
		'name',
		'nodeId',
		'instance',
		'isReadOnly',
		'isActive',
		'hideActions',
	],
	methods: {
		__addInputEndpoints (node: INodeUi, nodeTypeData: INodeTypeDescription) {
			// Add Inputs
			let index, anchorPosition;
			let newEndpointData: IEndpointOptions;
			const indexData: {
				[key: string]: number;
			} = {};

			nodeTypeData.inputs.forEach((inputName: string, i: number) => {
				const inputData = {
					uuid: '-input',
					maxConnections: -1,
					endpoint: 'Rectangle',
					endpointStyle: {
						width: 8,
						height: nodeTypeData && nodeTypeData.outputs.length > 2 ? 18 : 20,
						fill: getStyleTokenValue('--color-foreground-xdark'),
						stroke: getStyleTokenValue('--color-foreground-xdark'),
						lineWidth: 0,
					},
					endpointHoverStyle: {
						width: 8,
						height: nodeTypeData && nodeTypeData.outputs.length > 2 ? 18 : 20,
						fill: getStyleTokenValue('--color-primary'),
						stroke: getStyleTokenValue('--color-primary'),
						lineWidth: 0,
					},
					dragAllowedWhenFull: true,
				};

				// Increment the index for inputs with current name
				if (indexData.hasOwnProperty(inputName)) {
					indexData[inputName]++;
				} else {
					indexData[inputName] = 0;
				}
				index = indexData[inputName];

				// Get the position of the anchor depending on how many it has
				anchorPosition = anchorPositions.input[nodeTypeData.inputs.length][index];

				newEndpointData = {
					uuid: `${this.nodeIndex}` + inputData.uuid + index,
					anchor: anchorPosition,
					maxConnections: inputData.maxConnections,
					endpoint: inputData.endpoint,
					endpointStyle: inputData.endpointStyle,
					endpointHoverStyle: inputData.endpointHoverStyle,
					isSource: false,
					isTarget: !this.isReadOnly,
					parameters: {
						nodeIndex: this.nodeIndex,
						type: inputName,
						index,
					},
					dragAllowedWhenFull: inputData.dragAllowedWhenFull,
					dropOptions: {
						tolerance: 'touch',
						hoverClass: 'dropHover',
					},
				};

				if (nodeTypeData.inputNames) {
					// Apply input names if they got set
					newEndpointData.overlays = [
						['Label',
							{
								id: CanvasHelpers.OVERLAY_INPUT_NAME_LABEL,
								location: CanvasHelpers.OVERLAY_INPUT_NAME_LABEL_POSITION,
								label: nodeTypeData.inputNames[index],
								cssClass: 'node-input-endpoint-label',
								visible: true,
							},
						],
					];
				}

				const endpoint: Endpoint = this.instance.addEndpoint(this.nodeId, newEndpointData);
				endpoint.__meta = {
					nodeName: node.name,
					index: i,
				};

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
		},
		__addOutputEndpoints(node: INodeUi, nodeTypeData: INodeTypeDescription) {
			let index, anchorPosition;
			let newEndpointData: IEndpointOptions;
			const indexData: {
				[key: string]: number;
			} = {};

			nodeTypeData.outputs.forEach((inputName: string, i: number) => {
				const inputData = {
					uuid: '-output',
					maxConnections: -1,
					endpoint: 'Dot',
					endpointStyle: {
						radius: nodeTypeData && nodeTypeData.outputs.length > 2 ? 7 : 9,
						fill: getStyleTokenValue('--color-foreground-xdark'),
						outlineStroke: 'none',
					},
					endpointHoverStyle: {
						radius: nodeTypeData && nodeTypeData.outputs.length > 2 ? 7 : 9,
						fill: getStyleTokenValue('--color-primary'),
						outlineStroke: 'none',
					},
					dragAllowedWhenFull: true,
				};

				// Increment the index for outputs with current name
				if (indexData.hasOwnProperty(inputName)) {
					indexData[inputName]++;
				} else {
					indexData[inputName] = 0;
				}
				index = indexData[inputName];

				// Get the position of the anchor depending on how many it has
				anchorPosition = anchorPositions.output[nodeTypeData.outputs.length][index];

				newEndpointData = {
					uuid: `${this.nodeIndex}` + inputData.uuid + index,
					anchor: anchorPosition,
					maxConnections: inputData.maxConnections,
					endpoint: inputData.endpoint,
					endpointStyle: inputData.endpointStyle,
					endpointHoverStyle: inputData.endpointHoverStyle,
					isSource: true,
					isTarget: false,
					enabled: !this.isReadOnly,
					parameters: {
						nodeIndex: this.nodeIndex,
						type: inputName,
						index,
					},
					dragAllowedWhenFull: inputData.dragAllowedWhenFull,
					dragProxy: ['Rectangle', { width: 1, height: 1, strokeWidth: 0 }],
				};

				if (nodeTypeData.outputNames) {
					// Apply output names if they got set
					newEndpointData.overlays = [
						['Label',
							{
								id: CanvasHelpers.OVERLAY_OUTPUT_NAME_LABEL,
								location: [1.9, 0.5],
								label: nodeTypeData.outputNames[index],
								cssClass: 'node-output-endpoint-label',
								visible: true,
							},
						],
					];
				}

				const endpoint: Endpoint = this.instance.addEndpoint(this.nodeId, newEndpointData);
				endpoint.__meta = {
					nodeName: node.name,
					index: i,
				};
			});
		},
		__makeInstanceDraggable(node: INodeUi) {
			// TODO: This caused problems with displaying old information
			//       https://github.com/jsplumb/katavorio/wiki
			//       https://jsplumb.github.io/jsplumb/home.html
			// Make nodes draggable
			this.instance.draggable(this.nodeId, {
				grid: [20, 20],
				start: (params: { e: MouseEvent }) => {
					if (this.isReadOnly === true) {
						// Do not allow to move nodes in readOnly mode
						return false;
					}

					if (params.e && !this.$store.getters.isNodeSelected(this.data.name)) {
						// Only the node which gets dragged directly gets an event, for all others it is
						// undefined. So check if the currently dragged node is selected and if not clear
						// the drag-selection.
						this.instance.clearDragSelection();
						this.$store.commit('resetSelectedNodes');
					}

					this.$store.commit('addActiveAction', 'dragActive');
					return true;
				},
				stop: (params: { e: MouseEvent }) => {
					if (this.$store.getters.isActionActive('dragActive')) {
						const moveNodes = this.$store.getters.getSelectedNodes.slice();
						const selectedNodeNames = moveNodes.map((node: INodeUi) => node.name);
						if (!selectedNodeNames.includes(this.data.name)) {
							// If the current node is not in selected add it to the nodes which
							// got moved manually
							moveNodes.push(this.data);
						}

						// This does for some reason just get called once for the node that got clicked
						// even though "start" and "drag" gets called for all. So lets do for now
						// some dirty DOM query to get the new positions till I have more time to
						// create a proper solution
						let newNodePositon: XYPosition;
						moveNodes.forEach((node: INodeUi) => {
							const nodeElement = `node-${this.getNodeIndex(node.name)}`;
							const element = document.getElementById(nodeElement);
							if (element === null) {
								return;
							}

							newNodePositon = [
								parseInt(element.style.left!.slice(0, -2), 10),
								parseInt(element.style.top!.slice(0, -2), 10),
							];

							const updateInformation = {
								name: node.name,
								properties: {
									// @ts-ignore, draggable does not have definitions
									position: newNodePositon,
								},
							};

							this.$store.commit('updateNodeProperties', updateInformation);
						});

						this.$emit('moved', node);
					}
				},
				filter: '.node-description, .node-description .node-name, .node-description .node-subtitle',
			});
		},
		__addNode (node: INodeUi) {
			let nodeTypeData = this.$store.getters.nodeType(node.type);
			if (!nodeTypeData) {
				// If node type is not know use by default the base.noOp data to display it
				nodeTypeData = this.$store.getters.nodeType(NO_OP_NODE_TYPE);
			}

			this.__addInputEndpoints(node, nodeTypeData);
			this.__addOutputEndpoints(node, nodeTypeData);
			this.__makeInstanceDraggable(node);
		},
		touchEnd(e: MouseEvent) {
			if (this.isTouchDevice) {
				if (this.$store.getters.isActionActive('dragActive')) {
					this.$store.commit('removeActiveAction', 'dragActive');
				}
			}
		},
		mouseLeftClick (e: MouseEvent) {
			// @ts-ignore
			const path = e.path || (e.composedPath && e.composedPath());
			for (let index = 0; index < path.length; index++) {
				if (path[index].className && typeof path[index].className === 'string' && path[index].className.includes('no-select-on-click')) {
					return;
				}
			}

			if (!this.isTouchDevice) {
				if (this.$store.getters.isActionActive('dragActive')) {
					this.$store.commit('removeActiveAction', 'dragActive');
				} else {
					if (this.isCtrlKeyPressed(e) === false) {
						this.$emit('deselectAllNodes');
					}

					if (this.$store.getters.isNodeSelected(this.data.name)) {
						this.$emit('deselectNode', this.name);
					} else {
						this.$emit('nodeSelected', this.name);
					}
				}
			}
		},
	},
});
