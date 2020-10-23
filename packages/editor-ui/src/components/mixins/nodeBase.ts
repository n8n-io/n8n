import { IConnectionsUi, IEndpointOptions, INodeUi, XYPositon } from '@/Interface';

import mixins from 'vue-typed-mixins';

import { deviceSupportHelpers } from '@/components/mixins/deviceSupportHelpers';
import { nodeIndex } from '@/components/mixins/nodeIndex';
import { NODE_NAME_PREFIX } from '@/constants';

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
			return this.$store.getters.nodeByName(this.name);
		},
		hasIssues (): boolean {
			if (this.data.issues !== undefined && Object.keys(this.data.issues).length) {
				return true;
			}
			return false;
		},
		nodeName (): string {
			return NODE_NAME_PREFIX + this.nodeIndex;
		},
		nodeIndex (): string {
			return this.$store.getters.getNodeIndex(this.data.name).toString();
		},
		nodePosition (): object {
			const returnStyles: {
				[key: string]: string;
			} = {
				left: this.data.position[0] + 'px',
				top: this.data.position[1] + 'px',
			};

			return returnStyles;
		},
		nodeStyle (): object {
			const returnStyles: {
				[key: string]: string;
			} = {
				'border-color': this.data.color as string,
			};

			return returnStyles;
		},
	},
	props: [
		'name',
		'nodeId',
		'instance',
		'isReadOnly',
	],
	methods: {
		__addNode (node: INodeUi) {
			// TODO: Later move the node-connection definitions to a special file

			let nodeTypeData = this.$store.getters.nodeType(node.type);

			const nodeConnectors: IConnectionsUi = {
				main: {
					input: {
						uuid: '-input',
						maxConnections: -1,
						endpoint: 'Rectangle',
						endpointStyle: {
							width: nodeTypeData && nodeTypeData.outputs.length > 2 ? 9 : 10,
							height: nodeTypeData && nodeTypeData.outputs.length > 2 ? 18 : 24,
							fill: '#777',
							stroke: '#777',
							lineWidth: 0,
						},
						dragAllowedWhenFull: true,
					},
					output: {
						uuid: '-output',
						maxConnections: -1,
						endpoint: 'Dot',
						endpointStyle: {
							radius: nodeTypeData && nodeTypeData.outputs.length > 2 ? 7 : 11,
							fill: '#555',
							outlineStroke: 'none',
						},
						dragAllowedWhenFull: true,
					},
				},
			};

			if (!nodeTypeData) {
				// If node type is not know use by default the base.noOp data to display it
				nodeTypeData = this.$store.getters.nodeType('n8n-nodes-base.noOp');
			}

			const anchorPositions: {
				[key: string]: {
					[key: number]: string[] | number[][];
				}
			} = {
				input: {
					1: [
						'Left',
					],
					2: [
						[0, 0.3, -1, 0],
						[0, 0.7, -1, 0],
					],
					3: [
						[0, 0.25, -1, 0],
						[0, 0.5, -1, 0],
						[0, 0.75, -1, 0],
					],
					4: [
						[0, 0.2, -1, 0],
						[0, 0.4, -1, 0],
						[0, 0.6, -1, 0],
						[0, 0.8, -1, 0],
					],
				},
				output: {
					1: [
						'Right',
					],
					2: [
						[1, 0.3, 1, 0],
						[1, 0.7, 1, 0],
					],
					3: [
						[1, 0.25, 1, 0],
						[1, 0.5, 1, 0],
						[1, 0.75, 1, 0],
					],
					4: [
						[1, 0.2, 1, 0],
						[1, 0.4, 1, 0],
						[1, 0.6, 1, 0],
						[1, 0.8, 1, 0],
					],
				},
			};

			// Add Inputs
			let index, inputData, anchorPosition;
			let newEndpointData: IEndpointOptions;
			let indexData: {
				[key: string]: number;
			} = {};

			nodeTypeData.inputs.forEach((inputName: string) => {
				// @ts-ignore
				inputData = nodeConnectors[inputName].input;

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
								id: 'input-name-label',
								location: [-2, 0.5],
								label: nodeTypeData.inputNames[index],
								cssClass: 'node-input-endpoint-label',
								visible: true,
							},
						],
					];
				}

				this.instance.addEndpoint(this.nodeName, newEndpointData);

				// TODO: Activate again if it makes sense. Currently makes problems when removing
				//       connection on which the input has a name. It does not get hidden because
				//       the endpoint to which it connects when letting it go over the node is
				//       different to the regular one (have different ids). So that seems to make
				//       problems when hiding the input-name.

				// if (index === 0 && inputName === 'main') {
				// 	// Make the first main-input the default one to connect to when connection gets dropped on node
				// 	this.instance.makeTarget(this.nodeName, newEndpointData);
				// }
			});

			// Add Outputs
			indexData = {};
			nodeTypeData.outputs.forEach((inputName: string) => {
				inputData = nodeConnectors[inputName].output;

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
					isSource: !this.isReadOnly,
					isTarget: false,
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
								id: 'output-name-label',
								location: [1.75, 0.5],
								label: nodeTypeData.outputNames[index],
								cssClass: 'node-output-endpoint-label',
								visible: true,
							},
						],
					];
				}

				this.instance.addEndpoint(this.nodeName, newEndpointData);
			});

			// TODO: This caused problems with displaying old information
			//       https://github.com/jsplumb/katavorio/wiki
			//       https://jsplumb.github.io/jsplumb/home.html
			// Make nodes draggable
			this.instance.draggable(this.nodeName, {
				grid: [10, 10],
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
						let newNodePositon: XYPositon;
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
					}
				},
				filter: '.node-description, .node-description .node-name, .node-description .node-subtitle',
			});

		},

		mouseLeftClick (e: MouseEvent) {
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
		},
	},
});
