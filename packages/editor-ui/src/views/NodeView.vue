<template>
	<div class="node-view-root">
		<div
			class="node-view-wrapper"
			:class="workflowClasses"
			@touchstart="mouseDown"
			@touchend="mouseUp"
			@touchmove="mouseMoveNodeWorkflow"
			@mousedown="mouseDown"
			v-touch:tap="touchTap"
			@mouseup="mouseUp"
			@wheel="wheelScroll"
			>
			<div id="node-view-background" class="node-view-background" :style="backgroundStyle"></div>
			<div id="node-view" class="node-view" :style="workflowStyle">
				<node
				v-for="nodeData in nodes"
				@duplicateNode="duplicateNode"
				@deselectAllNodes="deselectAllNodes"
				@deselectNode="nodeDeselectedByName"
				@nodeSelected="nodeSelectedByName"
				@removeNode="removeNode"
				@runWorkflow="runWorkflow"
				:id="'node-' + getNodeIndex(nodeData.name)"
				:key="getNodeIndex(nodeData.name)"
				:name="nodeData.name"
				:isReadOnly="isReadOnly"
				:instance="instance"
				></node>
			</div>
		</div>
		<DataDisplay @valueChanged="valueChanged"/>
		<div v-if="!createNodeActive && !isReadOnly" class="node-creator-button" title="Add Node" @click="openNodeCreator">
			<el-button icon="el-icon-plus" circle></el-button>
		</div>
		<node-creator
			:active="createNodeActive"
			@nodeTypeSelected="nodeTypeSelected"
			@closeNodeCreator="closeNodeCreator"
			></node-creator>
		<div class="zoom-menu">
			<button @click="setZoom('in')" class="button-white" title="Zoom In">
				<font-awesome-icon icon="search-plus"/>
			</button>
			<button @click="setZoom('out')" class="button-white" title="Zoom Out">
				<font-awesome-icon icon="search-minus"/>
			</button>
			<button
				v-if="nodeViewScale !== 1"
				@click="setZoom('reset')"
				class="button-white"
				title="Reset Zoom"
				>
				<font-awesome-icon icon="undo" title="Reset Zoom"/>
			</button>
		</div>
		<div class="workflow-execute-wrapper" v-if="!isReadOnly">
			<el-button
				type="text"
				@click.stop="runWorkflow()"
				class="workflow-run-button"
				:class="{'running': workflowRunning}"
				:disabled="workflowRunning"
				title="Executes the Workflow from the Start or Webhook Node."
			>
				<div class="run-icon">
					<font-awesome-icon icon="spinner" spin v-if="workflowRunning"/>
					<font-awesome-icon icon="play-circle" v-else/>
				</div>

				{{runButtonText}}
			</el-button>

			<el-button
				v-if="workflowRunning === true && !executionWaitingForWebhook"
				circle
				type="text"
				@click.stop="stopExecution()"
				class="stop-execution"
				:title="stopExecutionInProgress ? 'Stopping current execution':'Stop current execution'"
			>
				<font-awesome-icon icon="stop" :class="{'fa-spin': stopExecutionInProgress}"/>
			</el-button>
			<el-button
				v-if="workflowRunning === true && executionWaitingForWebhook === true"
				circle
				type="text"
				@click.stop="stopWaitingForWebhook()"
				class="stop-execution"
				title="Stop waiting for Webhook call"
			>
				<font-awesome-icon icon="stop" :class="{'fa-spin': stopExecutionInProgress}"/>
			</el-button>
			<el-button
				v-if="!isReadOnly && workflowExecution && !workflowRunning"
				circle
				type="text"
				@click.stop="clearExecutionData()"
				class="clear-execution"
				title="Deletes the current Execution Data."
			>
				<font-awesome-icon icon="trash" class="clear-execution-icon" />
			</el-button>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import {
	OverlaySpec,
} from 'jsplumb';
import { MessageBoxInputData } from 'element-ui/types/message-box';
import { jsPlumb, Endpoint, OnConnectionBindInfo } from 'jsplumb';
import { NODE_NAME_PREFIX, PLACEHOLDER_EMPTY_WORKFLOW_ID } from '@/constants';
import { copyPaste } from '@/components/mixins/copyPaste';
import { externalHooks } from '@/components/mixins/externalHooks';
import { genericHelpers } from '@/components/mixins/genericHelpers';
import { mouseSelect } from '@/components/mixins/mouseSelect';
import { moveNodeWorkflow } from '@/components/mixins/moveNodeWorkflow';
import { restApi } from '@/components/mixins/restApi';
import { showMessage } from '@/components/mixins/showMessage';
import { titleChange } from '@/components/mixins/titleChange';

import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import { workflowRun } from '@/components/mixins/workflowRun';

import DataDisplay from '@/components/DataDisplay.vue';
import Node from '@/components/Node.vue';
import NodeCreator from '@/components/NodeCreator.vue';
import NodeSettings from '@/components/NodeSettings.vue';
import RunData from '@/components/RunData.vue';

import mixins from 'vue-typed-mixins';
import { v4 as uuidv4} from 'uuid';
import { debounce } from 'lodash';
import axios from 'axios';
import {
	IConnection,
	IConnections,
	IDataObject,
	INode,
	INodeConnections,
	INodeIssues,
	INodeTypeDescription,
	IRunData,
	NodeInputConnections,
	NodeHelpers,
	Workflow,
	IRun,
} from 'n8n-workflow';
import {
	IConnectionsUi,
	IExecutionResponse,
	IExecutionsStopData,
	IN8nUISettings,
	IStartRunData,
	IWorkflowDb,
	IWorkflowData,
	INodeUi,
	IRunDataUi,
	IUpdateInformation,
	IWorkflowDataUpdate,
	XYPositon,
	IPushDataExecutionFinished,
} from '../Interface';

export default mixins(
	copyPaste,
	externalHooks,
	genericHelpers,
	mouseSelect,
	moveNodeWorkflow,
	restApi,
	showMessage,
	titleChange,
	workflowHelpers,
	workflowRun,
)
	.extend({
		name: 'NodeView',
		components: {
			DataDisplay,
			Node,
			NodeCreator,
			NodeSettings,
			RunData,
		},
		errorCaptured: (err, vm, info) => {
			console.error('errorCaptured'); // eslint-disable-line no-console
			console.error(err); // eslint-disable-line no-console
		},
		watch: {
			// Listen to route changes and load the workflow accordingly
			'$route': 'initView',
			activeNode () {
				// When a node gets set as active deactivate the create-menu
				this.createNodeActive = false;
			},
			nodes: {
				async handler (value, oldValue) {
					// Load a workflow
					let workflowId = null as string | null;
					if (this.$route && this.$route.params.name) {
						workflowId = this.$route.params.name;
					}
				},
				deep: true,
			},
			connections: {
				async handler (value, oldValue) {
					// Load a workflow
					let workflowId = null as string | null;
					if (this.$route && this.$route.params.name) {
						workflowId = this.$route.params.name;
					}
				},
				deep: true,
			},
		},
		async beforeRouteLeave(to, from, next) {
			const result = this.$store.getters.getStateIsDirty;
			if(result) {
				const importConfirm = await this.confirmMessage(`When you switch workflows your current workflow changes will be lost.`, 'Save your Changes?', 'warning', 'Yes, switch workflows and forget changes');
				if (importConfirm === false) {
					next(false);
				} else {
					// Prevent other popups from displaying
					this.$store.commit('setStateDirty', false);
					next();
				}
			} else {
				next();
			}
		},
		computed: {
			activeNode (): INodeUi | null {
				return this.$store.getters.activeNode;
			},
			executionWaitingForWebhook (): boolean {
				return this.$store.getters.executionWaitingForWebhook;
			},
			lastSelectedNode (): INodeUi {
				return this.$store.getters.lastSelectedNode;
			},
			connections (): IConnectionsUi {
				return this.$store.getters.allConnections;
			},
			nodes (): INodeUi[] {
				return this.$store.getters.allNodes;
			},
			runButtonText (): string {
				if (this.workflowRunning === false) {
					return 'Execute Workflow';
				}

				if (this.executionWaitingForWebhook === true) {
					return 'Waiting for Webhook-Call';
				}

				return 'Executing Workflow';
			},
			workflowStyle (): object {
				const offsetPosition = this.$store.getters.getNodeViewOffsetPosition;
				return {
					left: offsetPosition[0] + 'px',
					top: offsetPosition[1] + 'px',
				};
			},
			backgroundStyle (): object {
				const offsetPosition = this.$store.getters.getNodeViewOffsetPosition;
				return {
					'transform': `scale(${this.nodeViewScale})`,
					'background-position': `right ${-offsetPosition[0]}px bottom ${-offsetPosition[1]}px`,
				};
			},
			workflowClasses () {
				const returnClasses = [];
				if (this.ctrlKeyPressed === true) {
					if (this.$store.getters.isNodeViewMoveInProgress === true) {
						returnClasses.push('move-in-process');
					} else {
						returnClasses.push('move-active');
					}
				}
				if (this.selectActive || this.ctrlKeyPressed === true) {
					// Makes sure that nothing gets selected while select or move is active
					returnClasses.push('do-not-select');
				}
				return returnClasses;
			},
			workflowExecution (): IExecutionResponse | null {
				return this.$store.getters.getWorkflowExecution;
			},
			workflowRunning (): boolean {
				return this.$store.getters.isActionActive('workflowRunning');
			},
		},
		data () {
			return {
				createNodeActive: false,
				instance: jsPlumb.getInstance(),
				lastClickPosition: [450, 450] as XYPositon,
				nodeViewScale: 1,
				ctrlKeyPressed: false,
				debouncedFunctions: [] as any[], // tslint:disable-line:no-any
				stopExecutionInProgress: false,
			};
		},
		beforeDestroy () {
			// Make sure the event listeners get removed again else we
			// could add up with them registred multiple times
			document.removeEventListener('keydown', this.keyDown);
			document.removeEventListener('keyup', this.keyUp);
		},
		methods: {
			async callDebounced (...inputParameters: any[]): Promise<void> { // tslint:disable-line:no-any
				const functionName = inputParameters.shift() as string;
				const debounceTime = inputParameters.shift() as number;

				// @ts-ignore
				if (this.debouncedFunctions[functionName] === undefined) {
					// @ts-ignore
					this.debouncedFunctions[functionName] = debounce(this[functionName], debounceTime, { leading: true });
				}
				// @ts-ignore
				await this.debouncedFunctions[functionName].apply(this, inputParameters);
			},
			clearExecutionData () {
				this.$store.commit('setWorkflowExecutionData', null);
				this.updateNodesExecutionIssues();
			},
			openNodeCreator () {
				this.createNodeActive = true;
				this.$externalHooks().run('nodeView.createNodeActiveChanged', { source: 'add_node_button' });
			},
			async openExecution (executionId: string) {
				this.resetWorkspace();

				let data: IExecutionResponse | undefined;
				try {
					data = await this.restApi().getExecution(executionId);
				} catch (error) {
					this.$showError(error, 'Problem loading execution', 'There was a problem opening the execution:');
					return;
				}

				if (data === undefined) {
					throw new Error(`Execution with id "${executionId}" could not be found!`);
				}

				this.$store.commit('setWorkflowName', {newName: data.workflowData.name, setStateDirty: false});
				this.$store.commit('setWorkflowId', PLACEHOLDER_EMPTY_WORKFLOW_ID);

				this.$store.commit('setWorkflowExecutionData', data);

				await this.addNodes(JSON.parse(JSON.stringify(data.workflowData.nodes)), JSON.parse(JSON.stringify(data.workflowData.connections)));

				this.$externalHooks().run('execution.open', { workflowId: data.workflowData.id, workflowName: data.workflowData.name, executionId });
			},
			async openWorkflow (workflowId: string) {
				this.resetWorkspace();

				let data: IWorkflowDb | undefined;
				try {
					data = await this.restApi().getWorkflow(workflowId);
				} catch (error) {
					this.$showError(error, 'Problem opening workflow', 'There was a problem opening the workflow:');
					return;
				}

				if (data === undefined) {
					throw new Error(`Workflow with id "${workflowId}" could not be found!`);
				}

				this.$store.commit('setActive', data.active || false);
				this.$store.commit('setWorkflowId', workflowId);
				this.$store.commit('setWorkflowName', {newName: data.name, setStateDirty: false});
				this.$store.commit('setWorkflowSettings', data.settings || {});

				await this.addNodes(data.nodes, data.connections);

				this.$store.commit('setStateDirty', false);

				this.$externalHooks().run('workflow.open', { workflowId, workflowName: data.name });

				return data;
			},
			touchTap (e: MouseEvent | TouchEvent) {
				if (this.isTouchDevice) {
					this.mouseDown(e);
				}
			},
			mouseDown (e: MouseEvent | TouchEvent) {
				// Save the location of the mouse click
				const position = this.getMousePosition(e);
				const offsetPosition = this.$store.getters.getNodeViewOffsetPosition;
				this.lastClickPosition[0] = position.x - offsetPosition[0];
				this.lastClickPosition[1] = position.y - offsetPosition[1];

				this.mouseDownMouseSelect(e as MouseEvent);
				this.mouseDownMoveWorkflow(e as MouseEvent);

				// Hide the node-creator
				this.createNodeActive = false;
			},
			mouseUp (e: MouseEvent) {
				this.mouseUpMouseSelect(e);
				this.mouseUpMoveWorkflow(e);
			},
			wheelScroll (e: WheelEvent) {
				//* Control + scroll zoom
				if (e.ctrlKey) {
					if (e.deltaY > 0) {
						this.setZoom('out');
					} else {
						this.setZoom('in');
					}

					e.preventDefault();
					return;
				}
				this.wheelMoveWorkflow(e);
			},
			keyUp (e: KeyboardEvent) {
				if (e.key === this.controlKeyCode) {
					this.ctrlKeyPressed = false;
				}
			},
			async keyDown (e: KeyboardEvent) {
				// @ts-ignore
				const path = e.path || (e.composedPath && e.composedPath());

				// Check if the keys got emitted from a message box or from something
				// else which should ignore the default keybindings
				for (let index = 0; index < path.length; index++) {
					if (path[index].className && typeof path[index].className === 'string' && (
						path[index].className.includes('el-message-box') || path[index].className.includes('ignore-key-press')
					)) {
						return;
					}
				}

				if (e.key === 'd') {
					this.callDebounced('deactivateSelectedNode', 350);
				} else if (e.key === 'Delete') {
					e.stopPropagation();
					e.preventDefault();

					this.callDebounced('deleteSelectedNodes', 500);
				} else if (e.key === 'Escape') {
					this.createNodeActive = false;
					this.$store.commit('setActiveNode', null);
				} else if (e.key === 'Tab') {
					this.createNodeActive = !this.createNodeActive && !this.isReadOnly;
				} else if (e.key === this.controlKeyCode) {
					this.ctrlKeyPressed = true;
				} else if (e.key === 'F2') {
					const lastSelectedNode = this.lastSelectedNode;
					if (lastSelectedNode !== null) {
						this.callDebounced('renameNodePrompt', 1500, lastSelectedNode.name);
					}
				} else if (e.key === '+') {
					this.callDebounced('setZoom', 300, 'in');
				} else if (e.key === '-') {
					this.callDebounced('setZoom', 300, 'out');
				} else if ((e.key === '0') && (this.isCtrlKeyPressed(e) === true)) {
					this.callDebounced('setZoom', 300, 'reset');
				} else if ((e.key === 'a') && (this.isCtrlKeyPressed(e) === true)) {
					// Select all nodes
					e.stopPropagation();
					e.preventDefault();

					this.callDebounced('selectAllNodes', 1000);
				} else if ((e.key === 'c') && (this.isCtrlKeyPressed(e) === true)) {
					this.callDebounced('copySelectedNodes', 1000);
				} else if ((e.key === 'x') && (this.isCtrlKeyPressed(e) === true)) {
					// Cut nodes
					e.stopPropagation();
					e.preventDefault();

					this.callDebounced('cutSelectedNodes', 1000);
				} else if (e.key === 'o' && this.isCtrlKeyPressed(e) === true) {
					// Open workflow dialog
					e.stopPropagation();
					e.preventDefault();

					this.$root.$emit('openWorkflowDialog');
				} else if (e.key === 'n' && this.isCtrlKeyPressed(e) === true && e.altKey === true) {
					// Create a new workflow
					e.stopPropagation();
					e.preventDefault();

					this.$router.push({ name: 'NodeViewNew' });

					this.$showMessage({
						title: 'Created',
						message: 'A new workflow got created!',
						type: 'success',
					});
				} else if ((e.key === 's') && (this.isCtrlKeyPressed(e) === true)) {
					// Save workflow
					e.stopPropagation();
					e.preventDefault();

					this.$store.commit('setStateDirty', false);

					this.callDebounced('saveCurrentWorkflow', 1000);
				} else if (e.key === 'Enter') {
					// Activate the last selected node
					const lastSelectedNode = this.$store.getters.lastSelectedNode;

					if (lastSelectedNode !== null) {
						this.$store.commit('setActiveNode', lastSelectedNode.name);
					}
				} else if (e.key === 'ArrowRight' && e.shiftKey === true) {
					// Select all downstream nodes
					e.stopPropagation();
					e.preventDefault();

					this.callDebounced('selectDownstreamNodes', 1000);
				} else if (e.key === 'ArrowRight') {
					// Set child node active
					const lastSelectedNode = this.$store.getters.lastSelectedNode;
					if (lastSelectedNode === null) {
						return;
					}

					const connections = this.$store.getters.connectionsByNodeName(lastSelectedNode.name);

					if (connections.main === undefined || connections.main.length === 0) {
						return;
					}

					this.callDebounced('nodeSelectedByName', 100, connections.main[0][0].node, false, true);
				} else if (e.key === 'ArrowLeft' && e.shiftKey === true) {
					// Select all downstream nodes
					e.stopPropagation();
					e.preventDefault();

					this.callDebounced('selectUpstreamNodes', 1000);
				} else if (e.key === 'ArrowLeft') {
					// Set parent node active
					const lastSelectedNode = this.$store.getters.lastSelectedNode;
					if (lastSelectedNode === null) {
						return;
					}

					const workflow = this.getWorkflow();

					if (!workflow.connectionsByDestinationNode.hasOwnProperty(lastSelectedNode.name)) {
						return;
					}

					const connections = workflow.connectionsByDestinationNode[lastSelectedNode.name];

					if (connections.main === undefined || connections.main.length === 0) {
						return;
					}

					this.callDebounced('nodeSelectedByName', 100, connections.main[0][0].node, false, true);
				} else if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
					// Set sibling node as active

					// Check first if it has a parent node
					const lastSelectedNode = this.$store.getters.lastSelectedNode;
					if (lastSelectedNode === null) {
						return;
					}

					const workflow = this.getWorkflow();

					if (!workflow.connectionsByDestinationNode.hasOwnProperty(lastSelectedNode.name)) {
						return;
					}

					const connections = workflow.connectionsByDestinationNode[lastSelectedNode.name];

					if (connections.main === undefined || connections.main.length === 0) {
						return;
					}

					const parentNode = connections.main[0][0].node;
					const connectionsParent = this.$store.getters.connectionsByNodeName(parentNode);

					if (connectionsParent.main === undefined || connectionsParent.main.length === 0) {
						return;
					}

					// Get all the sibling nodes and their x positions to know which one to set active
					let siblingNode: INodeUi;
					let lastCheckedNodePosition = e.key === 'ArrowUp' ? -99999999 : 99999999;
					let nextSelectNode: string | null = null;
					for (const ouputConnections of connectionsParent.main) {
						for (const ouputConnection of ouputConnections) {
							if (ouputConnection.node === lastSelectedNode.name) {
								// Ignore current node
								continue;
							}
							siblingNode = this.$store.getters.nodeByName(ouputConnection.node);

							if (e.key === 'ArrowUp') {
								// Get the next node on the left
								if (siblingNode.position[1] <= lastSelectedNode.position[1] && siblingNode.position[1] > lastCheckedNodePosition) {
									nextSelectNode = siblingNode.name;
									lastCheckedNodePosition = siblingNode.position[1];
								}
							} else {
								// Get the next node on the right
								if (siblingNode.position[1] >= lastSelectedNode.position[1] && siblingNode.position[1] < lastCheckedNodePosition) {
									nextSelectNode = siblingNode.name;
									lastCheckedNodePosition = siblingNode.position[1];
								}
							}
						}
					}

					if (nextSelectNode !== null) {
						this.callDebounced('nodeSelectedByName', 100, nextSelectNode, false, true);
					}
				}
			},

			deactivateSelectedNode () {
				if (this.editAllowedCheck() === false) {
					return;
				}
				this.disableNodes(this.$store.getters.getSelectedNodes);
			},

			deleteSelectedNodes () {
				// Copy "selectedNodes" as the nodes get deleted out of selection
				// when they get deleted and if we would use original it would mess
				// with the index and would so not delete all nodes
				const nodesToDelete: string[] = this.$store.getters.getSelectedNodes.map((node: INodeUi) => {
					return node.name;
				});
				nodesToDelete.forEach((nodeName: string) => {
					this.removeNode(nodeName);
				});
			},

			selectAllNodes () {
				this.nodes.forEach((node) => {
					this.nodeSelectedByName(node.name);
				});
			},

			selectUpstreamNodes () {
				const lastSelectedNode = this.$store.getters.lastSelectedNode as INodeUi | null;
				if (lastSelectedNode === null) {
					return;
				}

				this.deselectAllNodes();

				// Get all upstream nodes and select them
				const workflow = this.getWorkflow();
				for (const nodeName of workflow.getParentNodes(lastSelectedNode.name)) {
					this.nodeSelectedByName(nodeName);
				}

				// At the end select the previously selected node again
				this.nodeSelectedByName(lastSelectedNode.name);
			},
			selectDownstreamNodes () {
				const lastSelectedNode = this.$store.getters.lastSelectedNode as INodeUi | null;
				if (lastSelectedNode === null) {
					return;
				}

				this.deselectAllNodes();

				// Get all downstream nodes and select them
				const workflow = this.getWorkflow();
				for (const nodeName of workflow.getChildNodes(lastSelectedNode.name)) {
					this.nodeSelectedByName(nodeName);
				}

				// At the end select the previously selected node again
				this.nodeSelectedByName(lastSelectedNode.name);
			},

			cutSelectedNodes () {
				this.copySelectedNodes();
				this.deleteSelectedNodes();
			},

			copySelectedNodes () {
				this.getSelectedNodesToSave().then((data) => {
					const nodeData = JSON.stringify(data, null, 2);
					this.copyToClipboard(nodeData);
				});
			},

			setZoom (zoom: string) {
				if (zoom === 'in') {
					this.nodeViewScale *= 1.25;
				} else if (zoom === 'out') {
					this.nodeViewScale /= 1.25;
				} else {
					this.nodeViewScale = 1;
				}

				const zoomLevel = this.nodeViewScale;

				const element = this.instance.getContainer() as HTMLElement;
				const prependProperties = ['webkit', 'moz', 'ms', 'o'];
				const scaleString = 'scale(' + zoomLevel + ')';

				for (let i = 0; i < prependProperties.length; i++) {
					// @ts-ignore
					element.style[prependProperties[i] + 'Transform'] = scaleString;
				}
				element.style['transform'] = scaleString;

				// @ts-ignore
				this.instance.setZoom(zoomLevel);
			},

			async stopExecution () {
				const executionId = this.$store.getters.activeExecutionId;
				if (executionId === null) {
					return;
				}

				try {
					this.stopExecutionInProgress = true;
					const stopData: IExecutionsStopData = await this.restApi().stopCurrentExecution(executionId);
					this.$showMessage({
						title: 'Execution stopped',
						message: `The execution with the id "${executionId}" got stopped!`,
						type: 'success',
					});
				} catch (error) {
					// Execution stop might fail when the execution has already finished. Let's treat this here.
					const execution = await this.restApi().getExecution(executionId) as IExecutionResponse;
					if (execution.finished) {
						const executedData = {
							data: execution.data,
							finished: execution.finished,
							mode: execution.mode,
							startedAt: execution.startedAt,
							stoppedAt: execution.stoppedAt,
						} as IRun;
						const pushData = {
							data: executedData,
							executionId,
							retryOf: execution.retryOf,
						} as IPushDataExecutionFinished;
						this.$store.commit('finishActiveExecution', pushData);
						this.$titleSet(execution.workflowData.name, 'IDLE');
						this.$store.commit('setExecutingNode', null);
						this.$store.commit('setWorkflowExecutionData', executedData);
						this.$store.commit('removeActiveAction', 'workflowRunning');
						this.$showMessage({
							title: 'Workflow finished executing',
							message: 'Unable to stop operation in time. Workflow finished executing already.',
							type: 'success',
						});
					} else {
						this.$showError(error, 'Problem stopping execution', 'There was a problem stopping the execuction:');
					}
				}
				this.stopExecutionInProgress = false;
			},

			async stopWaitingForWebhook () {
				let result;
				try {
					result = await this.restApi().removeTestWebhook(this.$store.getters.workflowId);
				} catch (error) {
					this.$showError(error, 'Problem deleting the test-webhook', 'There was a problem deleting webhook:');
					return;
				}

				this.$showMessage({
					title: 'Webhook got deleted',
					message: `The webhook got deleted!`,
					type: 'success',
				});
			},

			/**
			 * This method gets called when data got pasted into the window
			 */
			async receivedCopyPasteData (plainTextData: string): Promise<void> {
				let workflowData: IWorkflowDataUpdate | undefined;

				// Check if it is an URL which could contain workflow data
				if (plainTextData.match(/^http[s]?:\/\/.*\.json$/i)) {
					// Pasted data points to a possible workflow JSON file

					if (this.editAllowedCheck() === false) {
						return;
					}

					const importConfirm = await this.confirmMessage(`Import workflow from this URL:<br /><i>${plainTextData}<i>`, 'Import Workflow from URL?', 'warning', 'Yes, import!');

					if (importConfirm === false) {
						return;
					}

					workflowData = await this.getWorkflowDataFromUrl(plainTextData);
					if (workflowData === undefined) {
						return;
					}
				} else {
					// Pasted data is is possible workflow data
					try {
						// Check first if it is valid JSON
						workflowData = JSON.parse(plainTextData);

						if (this.editAllowedCheck() === false) {
							return;
						}
					} catch (e) {
						// Is no valid JSON so ignore
						return;
					}
				}

				return this.importWorkflowData(workflowData!);
			},

			// Returns the workflow data from a given URL. If no data gets found or
			// data is invalid it returns undefined and displays an error message by itself.
			async getWorkflowDataFromUrl (url: string): Promise<IWorkflowDataUpdate | undefined> {
				let workflowData: IWorkflowDataUpdate;

				this.startLoading();
				try {
					workflowData = await this.restApi().getWorkflowFromUrl(url);
				} catch (error) {
					this.stopLoading();
					this.$showError(error, 'Problem loading workflow', 'There was a problem loading the workflow data from URL:');
					return;
				}
				this.stopLoading();

				return workflowData;
			},

			// Imports the given workflow data into the current workflow
			async importWorkflowData (workflowData: IWorkflowDataUpdate): Promise<void> {
				// If it is JSON check if it looks on the first look like data we can use
				if (
					!workflowData.hasOwnProperty('nodes') ||
					!workflowData.hasOwnProperty('connections')
				) {
					return;
				}

				try {
					// By default we automatically deselect all the currently
					// selected nodes and select the new ones
					this.deselectAllNodes();

					// Fix the node position as it could be totally offscreen
					// and the pasted nodes would so not be directly visible to
					// the user
					this.updateNodePositions(workflowData, this.getNewNodePosition());

					const data = await this.addNodesToWorkflow(workflowData);

					setTimeout(() => {
						data.nodes!.forEach((node: INodeUi) => {
							this.nodeSelectedByName(node.name);
						});
					});
				} catch (error) {
					this.$showError(error, 'Problem importing workflow', 'There was a problem importing workflow data:');
				}
			},

			closeNodeCreator () {
				this.createNodeActive = false;
			},

			nodeTypeSelected (nodeTypeName: string) {
				this.addNodeButton(nodeTypeName);
				this.createNodeActive = false;
			},

			nodeDeselectedByName (nodeName: string) {
				const node = this.$store.getters.nodeByName(nodeName);
				if (node) {
					this.nodeDeselected(node);
				}
			},

			nodeSelectedByName (nodeName: string, setActive = false, deselectAllOthers?: boolean) {
				if (deselectAllOthers === true) {
					this.deselectAllNodes();
				}

				const node = this.$store.getters.nodeByName(nodeName);
				if (node) {
					this.nodeSelected(node);
				}

				this.$store.commit('setLastSelectedNode', node.name);
				this.$store.commit('setLastSelectedNodeOutputIndex', null);

				if (setActive === true) {
					this.$store.commit('setActiveNode', node.name);
				}
			},

			canUsePosition (position1: XYPositon, position2: XYPositon) {
				if (Math.abs(position1[0] - position2[0]) <= 100) {
					if (Math.abs(position1[1] - position2[1]) <= 50) {
						return false;
					}
				}

				return true;
			},
			getNewNodePosition (newPosition?: XYPositon, movePosition?: XYPositon): XYPositon {
				// TODO: Lates has to consider also the view position (that it creates the node where it is visible)
				// Use the last click position as position for new node
				if (newPosition === undefined) {
					newPosition = this.lastClickPosition;
				}

				// @ts-ignore
				newPosition = newPosition.slice();

				if (!movePosition) {
					movePosition = [50, 50];
				}

				let conflictFound = false;
				let i, node;
				do {
					conflictFound = false;
					for (i = 0; i < this.nodes.length; i++) {
						node = this.nodes[i];
						if (!this.canUsePosition(node.position, newPosition!)) {
							conflictFound = true;
							break;
						}
					}

					if (conflictFound === true) {
						newPosition![0] += movePosition[0];
						newPosition![1] += movePosition[1];
					}
				} while (conflictFound === true);

				return newPosition!;
			},
			getUniqueNodeName (originalName: string, additinalUsedNames?: string[]) {
				// Check if node-name is unique else find one that is
				additinalUsedNames = additinalUsedNames || [];

				// Get all the names of the current nodes
				const nodeNames = this.$store.getters.allNodes.map((node: INodeUi) => {
					return node.name;
				});

				// Check first if the current name is already unique
				if (!nodeNames.includes(originalName) && !additinalUsedNames.includes(originalName)) {
					return originalName;
				}

				const nameMatch = originalName.match(/(.*\D+)(\d*)/);
				let ignore, baseName, nameIndex, uniqueName;
				let index = 1;

				if (nameMatch === null) {
					// Name is only a number
					index = parseInt(originalName, 10);
					baseName = '';
					uniqueName = baseName + index;
				} else {
					// Name is string or string/number combination
					[ignore, baseName, nameIndex] = nameMatch;
					if (nameIndex !== '') {
						index = parseInt(nameIndex, 10);
					}
					uniqueName = baseName;
				}

				while (
					nodeNames.includes(uniqueName) ||
					additinalUsedNames.includes(uniqueName)
				) {
					uniqueName = baseName + (index++);
				}

				return uniqueName;
			},
			showMaxNodeTypeError (nodeTypeData: INodeTypeDescription) {
				const maxNodes = nodeTypeData.maxNodes;
				this.$showMessage({
					title: 'Could not create node!',
					message: `Node can not be created because in a workflow max. ${maxNodes} ${maxNodes === 1 ? 'node' : 'nodes'} of type "${nodeTypeData.displayName}" ${maxNodes === 1 ? 'is' : 'are'} allowed!`,
					type: 'error',
					duration: 0,
				});
			},
			async addNodeButton (nodeTypeName: string) {
				if (this.editAllowedCheck() === false) {
					return;
				}

				const nodeTypeData: INodeTypeDescription | null = this.$store.getters.nodeType(nodeTypeName);

				if (nodeTypeData === null) {
					this.$showMessage({
						title: 'Could not create node!',
						message: `Node of type "${nodeTypeName}" could not be created as it is not known.`,
						type: 'error',
					});
					return;
				}

				if (nodeTypeData.maxNodes !== undefined && this.getNodeTypeCount(nodeTypeName) >= nodeTypeData.maxNodes) {
					this.showMaxNodeTypeError(nodeTypeData);
					return;
				}

				const newNodeData: INodeUi = {
					name: nodeTypeData.defaults.name as string,
					type: nodeTypeData.name,
					typeVersion: nodeTypeData.version,
					position: [0, 0],
					parameters: {},
				};

				// Check if there is a last selected node
				const lastSelectedNode = this.$store.getters.lastSelectedNode;
				const lastSelectedNodeOutputIndex = this.$store.getters.lastSelectedNodeOutputIndex;
				if (lastSelectedNode) {
					// If a node is active then add the new node directly after the current one
					// newNodeData.position = [activeNode.position[0], activeNode.position[1] + 60];
					newNodeData.position = this.getNewNodePosition(
						[lastSelectedNode.position[0] + 200, lastSelectedNode.position[1]],
						[100, 0],
					);
				} else {
					// If no node is active find a free spot
					newNodeData.position = this.getNewNodePosition();
				}

				// Check if node-name is unique else find one that is
				newNodeData.name = this.getUniqueNodeName(newNodeData.name);

				if (nodeTypeData.webhooks && nodeTypeData.webhooks.length) {
					newNodeData.webhookId = uuidv4();
				}

				await this.addNodes([newNodeData]);

				this.$store.commit('setStateDirty', true);

				this.$externalHooks().run('nodeView.addNodeButton', { nodeTypeName });

				// Automatically deselect all nodes and select the current one and also active
				// current node
				this.deselectAllNodes();
				setTimeout(() => {
					this.nodeSelectedByName(newNodeData.name, true);
				});

				const outputIndex = lastSelectedNodeOutputIndex || 0;

				if (lastSelectedNode) {
					// If a node is last selected then connect between the active and its child ones
					await Vue.nextTick();

					// Add connections of active node to newly created one
					let connections = this.$store.getters.connectionsByNodeName(
						lastSelectedNode.name,
					);
					connections = JSON.parse(JSON.stringify(connections));

					for (const type of Object.keys(connections)) {
						if (outputIndex <= connections[type].length) {
							connections[type][outputIndex].forEach((connectionInfo: IConnection) => {
								// Remove currenct connection

								const connectionDataDisonnect = [
									{
										node: lastSelectedNode.name,
										type,
										index: outputIndex,
									},
									connectionInfo,
								] as [IConnection, IConnection];

								this.__removeConnection(connectionDataDisonnect, true);

								const connectionDataConnect = [
									{
										node: newNodeData.name,
										type,
										index: 0,
									},
									connectionInfo,
								] as [IConnection, IConnection];

								this.__addConnection(connectionDataConnect, true);
							});
						}
					}

					// TODO: Check if new node has input
					// TODO: disconnect
					// Connect active node to the newly created one
					const connectionData = [
						{
							node: lastSelectedNode.name,
							type: 'main',
							index: outputIndex,
						},
						{
							node: newNodeData.name,
							type: 'main',
							index: 0,
						},
					] as [IConnection, IConnection];

					this.__addConnection(connectionData, true);
				}
			},
			initNodeView () {
				const connectionOverlays: OverlaySpec[] = [];
				if (this.isReadOnly === false) {
					connectionOverlays.push.apply(connectionOverlays, [
						[
							'Arrow',
							{
								location: 1,
								foldback: 0.7,
								width: 12,
							},
						],
						[
							'Label',
							{
								id: 'drop-add-node',
								label: 'Drop connection<br />to create node',
								cssClass: 'drop-add-node-label',
								location: 0.5,
							},
						],
					]);
				}

				this.instance.importDefaults({
					// notice the 'curviness' argument to this Bezier curve.
					// the curves on this page are far smoother
					// than the curves on the first demo, which use the default curviness value.
					// Connector: ["Bezier", { curviness: 80 }],
					Connector: ['Bezier', { curviness: 40 }],
					// @ts-ignore
					Endpoint: ['Dot', { radius: 5 }],
					DragOptions: { cursor: 'pointer', zIndex: 5000 },
					PaintStyle: { strokeWidth: 2, stroke: '#334455' },
					EndpointStyle: { radius: 9, fill: '#acd', stroke: 'red' },
					// EndpointStyle: {},
					HoverPaintStyle: { stroke: '#ff6d5a', lineWidth: 4 },
					EndpointHoverStyle: { fill: '#ff6d5a', stroke: '#acd' },
					ConnectionOverlays: connectionOverlays,
					Container: '#node-view',
				});

				this.instance.bind('connectionAborted', (info) => {
					// Get the node and set it as active that new nodes
					// which get created get automatically connected
					// to it.
					const sourceNodeName = this.$store.getters.getNodeNameByIndex(info.sourceId.slice(NODE_NAME_PREFIX.length));
					this.$store.commit('setLastSelectedNode', sourceNodeName);

					const sourceInfo = info.getParameters();
					this.$store.commit('setLastSelectedNodeOutputIndex', sourceInfo.index);

					// Display the node-creator
					this.createNodeActive = true;
					this.$externalHooks().run('nodeView.createNodeActiveChanged', { source: 'node_connection_drop' });
				});

				this.instance.bind('connection', (info: OnConnectionBindInfo) => {
					// @ts-ignore
					const sourceInfo = info.sourceEndpoint.getParameters();
					// @ts-ignore
					const targetInfo = info.targetEndpoint.getParameters();

					const sourceNodeName = this.$store.getters.getNodeNameByIndex(sourceInfo.nodeIndex);
					const targetNodeName = this.$store.getters.getNodeNameByIndex(targetInfo.nodeIndex);

					const sourceNode = this.$store.getters.nodeByName(sourceNodeName);
					const targetNode = this.$store.getters.nodeByName(targetNodeName);

					// TODO: That should happen after each move (only the setConnector part)
					if (info.sourceEndpoint.anchor.lastReturnValue[0] >= info.targetEndpoint.anchor.lastReturnValue[0]) {
						// When the source is before the target it will make sure that
						// the connection is clearer visible

						// Use the Flowchart connector if the source is underneath the target
						// so that the connection is properly visible
						info.connection.setConnector(['Flowchart', { cornerRadius: 15 }]);
						// TODO: Location should be dependent on distance. The closer together
						//       the further away from the center
						info.connection.addOverlay([
							'Arrow',
							{
								location: 0.55,
								foldback: 0.7,
								width: 12,
							},
						]);

						// Change also the color to give an additional visual hint
						info.connection.setPaintStyle({ strokeWidth: 2, stroke: '#334455' });
					} else if (Math.abs(info.sourceEndpoint.anchor.lastReturnValue[1] - info.targetEndpoint.anchor.lastReturnValue[1]) < 30) {
						info.connection.setConnector(['Straight']);
					}

					// @ts-ignore
					info.connection.removeOverlay('drop-add-node');

					if (this.isReadOnly === false) {
						// Display the connection-delete button only on hover
						let timer: NodeJS.Timeout | undefined;
						info.connection.bind('mouseover', (connection: IConnection) => {
							if (timer !== undefined) {
								clearTimeout(timer);
							}
							const overlay = info.connection.getOverlay('remove-connection');
							overlay.setVisible(true);
						});
						info.connection.bind('mouseout', (connection: IConnection) => {
							timer = setTimeout(() => {
								const overlay = info.connection.getOverlay('remove-connection');
								overlay.setVisible(false);
								timer = undefined;
							}, 500);
						});

						// @ts-ignore
						info.connection.addOverlay([
							'Label',
							{
								id: 'remove-connection',
								label: '<span class="delete-connection clickable" title="Delete Connection">x</span>',
								cssClass: 'remove-connection-label',
								visible: false,
								events: {
									mousedown: () => {
										this.__removeConnectionByConnectionInfo(info, true);
									},
								},
							},
						]);
					}

					// Display input names if they exist on connection
					const targetNodeTypeData: INodeTypeDescription = this.$store.getters.nodeType(targetNode.type);
					if (targetNodeTypeData.inputNames !== undefined) {
						for (const input of targetNodeTypeData.inputNames) {
							const inputName = targetNodeTypeData.inputNames[targetInfo.index];

							if (info.connection.getOverlay('input-name-label')) {
								// Make sure that it does not get added multiple times
								// continue;
								info.connection.removeOverlay('input-name-label');
							}

							// @ts-ignore
							info.connection.addOverlay([
								'Label',
								{
									id: 'input-name-label',
									label: inputName,
									cssClass: 'connection-input-name-label',
									location: 0.8,
								},
							]);
						}
					}

					// Display output names if they exist on connection
					const sourceNodeTypeData: INodeTypeDescription = this.$store.getters.nodeType(sourceNode.type);
					if (sourceNodeTypeData.outputNames !== undefined) {
						for (const output of sourceNodeTypeData.outputNames) {
							const outputName = sourceNodeTypeData.outputNames[sourceInfo.index];

							if (info.connection.getOverlay('output-name-label')) {
								// Make sure that it does not get added multiple times
								info.connection.removeOverlay('output-name-label');
							}

							// @ts-ignore
							info.connection.addOverlay([
								'Label',
								{
									id: 'output-name-label',
									label: outputName,
									cssClass: 'connection-output-name-label',
									location: 0.2,
								},
							]);
						}
					}

					// When connection gets made the output and input name get displayed
					// as overlay on the connection. So the ones on the endpoint can be hidden.
					// @ts-ignore
					const outputNameOverlay = info.connection.endpoints[0].getOverlay('output-name-label');
					if (![null, undefined].includes(outputNameOverlay)) {
						outputNameOverlay.setVisible(false);
					}

					const inputNameOverlay = info.targetEndpoint.getOverlay('input-name-label');
					if (![null, undefined].includes(inputNameOverlay)) {
						inputNameOverlay.setVisible(false);
					}
					this.$store.commit('addConnection', {
						connection: [
							{
								node: sourceNodeName,
								type: sourceInfo.type,
								index: sourceInfo.index,
							},
							{
								node: targetNodeName,
								type: targetInfo.type,
								index: targetInfo.index,
							},
						],
						setStateDirty: true,
					});
				});

				const updateConnectionDetach = (sourceEndpoint: Endpoint, targetEndpoint: Endpoint, maxConnections: number) => {
					// If the source endpoint is not connected to anything else anymore
					// display the output-name overlays on the endpoint if any exist
					if (sourceEndpoint !== undefined && sourceEndpoint.connections!.length === maxConnections) {
						const outputNameOverlay = sourceEndpoint.getOverlay('output-name-label');
						if (![null, undefined].includes(outputNameOverlay)) {
							outputNameOverlay.setVisible(true);
						}
					}
					if (targetEndpoint !== undefined && targetEndpoint.connections!.length === maxConnections) {
						const inputNameOverlay = targetEndpoint.getOverlay('input-name-label');
						if (![null, undefined].includes(inputNameOverlay)) {
							inputNameOverlay.setVisible(true);
						}
					}
				};

				this.instance.bind('connectionMoved', (info) => {
					// When a connection gets moved from one node to another it for some reason
					// calls the "connection" event but not the "connectionDetached" one. So we listen
					// additionally to the "connectionMoved" event and then only delete the existing connection.

					updateConnectionDetach(info.originalSourceEndpoint, info.originalTargetEndpoint, 0);

					// @ts-ignore
					const sourceInfo = info.originalSourceEndpoint.getParameters();
					// @ts-ignore
					const targetInfo = info.originalTargetEndpoint.getParameters();

					const connectionInfo = [
						{
							node: this.$store.getters.getNodeNameByIndex(sourceInfo.nodeIndex),
							type: sourceInfo.type,
							index: sourceInfo.index,
						},
						{
							node: this.$store.getters.getNodeNameByIndex(targetInfo.nodeIndex),
							type: targetInfo.type,
							index: targetInfo.index,
						},
					] as [IConnection, IConnection];

					this.__removeConnection(connectionInfo, false);

					// Make sure to remove the overlay else after the second move
					// it visibly stays behind free floating without a connection.
					info.connection.removeOverlays();
				});

				this.instance.bind('connectionDetached', (info) => {
					updateConnectionDetach(info.sourceEndpoint, info.targetEndpoint, 1);
					info.connection.removeOverlays();
					this.__removeConnectionByConnectionInfo(info, false);
				});
			},
			async newWorkflow (): Promise<void> {
				await this.resetWorkspace();

				// Create start node
				const defaultNodes = [
					{
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [
							250,
							300,
						] as XYPositon,
						parameters: {},
					},
				];

				await this.addNodes(defaultNodes);
				this.$store.commit('setStateDirty', false);

			},
			async initView (): Promise<void> {
				if (this.$route.params.action === 'workflowSave') {
					// In case the workflow got saved we do not have to run init
					// as only the route changed but all the needed data is already loaded
					this.$store.commit('setStateDirty', false);
					return Promise.resolve();
				}

				if (this.$route.name === 'ExecutionById') {
					// Load an execution
					const executionId = this.$route.params.id;
					await this.openExecution(executionId);
				} else {

					const result = this.$store.getters.getStateIsDirty;
					if(result) {
						const importConfirm = await this.confirmMessage(`When you switch workflows your current workflow changes will be lost.`, 'Save your Changes?', 'warning', 'Yes, switch workflows and forget changes');
						if (importConfirm === false) {
							return Promise.resolve();
						}
					}

					// Load a workflow
					let workflowId = null as string | null;
					if (this.$route.params.name) {
						workflowId = this.$route.params.name;
					}
					if (workflowId !== null) {
						const workflow = await this.restApi().getWorkflow(workflowId);
						this.$titleSet(workflow.name, 'IDLE');
						// Open existing workflow
						await this.openWorkflow(workflowId);
					} else {
						// Create new workflow
						await this.newWorkflow();
					}
				}

				document.addEventListener('keydown', this.keyDown);
				document.addEventListener('keyup', this.keyUp);

				window.addEventListener("beforeunload",  (e) => {
					if(this.$store.getters.getStateIsDirty === true) {
						const confirmationMessage = 'It looks like you have been editing something. '
								+ 'If you leave before saving, your changes will be lost.';
						(e || window.event).returnValue = confirmationMessage; //Gecko + IE
						return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
					} else {
						this.startLoading('Redirecting');

						return;
					}
				});
			},
			__addConnection (connection: [IConnection, IConnection], addVisualConnection = false) {
				if (addVisualConnection === true) {
					const uuid: [string, string] = [
						`${this.getNodeIndex(connection[0].node)}-output${connection[0].index}`,
						`${this.getNodeIndex(connection[1].node)}-input${connection[1].index}`,
					];

					// Create connections in DOM
					// @ts-ignore
					this.instance.connect({
						uuids: uuid,
						detachable: !this.isReadOnly,
					});
				} else {
					const connectionProperties = {connection, setStateDirty: false};
					// When nodes get connected it gets saved automatically to the storage
					// so if we do not connect we have to save the connection manually
					this.$store.commit('addConnection', connectionProperties);
				}
			},
			__removeConnection (connection: [IConnection, IConnection], removeVisualConnection = false) {
				if (removeVisualConnection === true) {
					// @ts-ignore
					const connections = this.instance.getConnections({
						source: NODE_NAME_PREFIX + this.getNodeIndex(connection[0].node),
						target: NODE_NAME_PREFIX + this.getNodeIndex(connection[1].node),
					});

					// @ts-ignore
					connections.forEach((connectionInstance) => {
						this.instance.deleteConnection(connectionInstance);
					});
				}

				this.$store.commit('removeConnection', { connection });
			},
			__removeConnectionByConnectionInfo (info: OnConnectionBindInfo, removeVisualConnection = false) {
				// @ts-ignore
				const sourceInfo = info.sourceEndpoint.getParameters();
				// @ts-ignore
				const targetInfo = info.targetEndpoint.getParameters();

				const connectionInfo = [
					{
						node: this.$store.getters.getNodeNameByIndex(sourceInfo.nodeIndex),
						type: sourceInfo.type,
						index: sourceInfo.index,
					},
					{
						node: this.$store.getters.getNodeNameByIndex(targetInfo.nodeIndex),
						type: targetInfo.type,
						index: targetInfo.index,
					},
				] as [IConnection, IConnection];

				this.__removeConnection(connectionInfo, removeVisualConnection);
			},
			async duplicateNode (nodeName: string) {
				if (this.editAllowedCheck() === false) {
					return;
				}

				const node = this.$store.getters.nodeByName(nodeName);

				const nodeTypeData: INodeTypeDescription = this.$store.getters.nodeType(node.type);
				if (nodeTypeData.maxNodes !== undefined && this.getNodeTypeCount(node.type) >= nodeTypeData.maxNodes) {
					this.showMaxNodeTypeError(nodeTypeData);
					return;
				}

				// Deep copy the data so that data on lower levels of the node-properties do
				// not share objects
				const newNodeData = JSON.parse(JSON.stringify(this.getNodeDataToSave(node)));

				// Check if node-name is unique else find one that is
				newNodeData.name = this.getUniqueNodeName(newNodeData.name);

				newNodeData.position = this.getNewNodePosition(
					[node.position[0], node.position[1] + 150],
					[0, 150],
				);

				if (newNodeData.webhookId) {
					// Make sure that the node gets a new unique webhook-ID
					newNodeData.webhookId = uuidv4();
				}

				await this.addNodes([newNodeData]);

				this.$store.commit('setStateDirty', true);

				// Automatically deselect all nodes and select the current one and also active
				// current node
				this.deselectAllNodes();
				setTimeout(() => {
					this.nodeSelectedByName(newNodeData.name, true);
				});
			},
			removeNode (nodeName: string) {
				if (this.editAllowedCheck() === false) {
					return;
				}

				const node = this.$store.getters.nodeByName(nodeName);

				// "requiredNodeTypes" are also defined in cli/commands/run.ts
				const requiredNodeTypes = [ 'n8n-nodes-base.start' ];

				if (requiredNodeTypes.includes(node.type)) {
					// The node is of the required type so check first
					// if any node of that type would be left when the
					// current one would get deleted.
					let deleteAllowed = false;
					for (const checkNode of this.nodes) {
						if (checkNode.name === node.name) {
							continue;
						}
						if (requiredNodeTypes.includes(checkNode.type)) {
							deleteAllowed = true;
							break;
						}
					}

					if (deleteAllowed === false) {
						return;
					}
				}

				const nodeIndex = this.$store.getters.getNodeIndex(nodeName);
				const nodeIdName = `node-${nodeIndex}`;

				// Suspend drawing
				this.instance.setSuspendDrawing(true);

				// Remove all endpoints and the connections in jsplumb
				this.instance.removeAllEndpoints(nodeIdName);

				// Remove the draggable
				// @ts-ignore
				this.instance.destroyDraggable(nodeIdName);

				// Remove the connections in data
				this.$store.commit('removeAllNodeConnection', node);

				this.$store.commit('removeNode', node);

				// Now it can draw again
				this.instance.setSuspendDrawing(false, true);

				// Remove node from selected index if found in it
				this.$store.commit('removeNodeFromSelection', node);

				// Remove from node index
				if (nodeIndex !== -1) {
					this.$store.commit('setNodeIndex', { index: nodeIndex, name: null });
				}
			},
			valueChanged (parameterData: IUpdateInformation) {
				if (parameterData.name === 'name' && parameterData.oldValue) {
					// The name changed so we have to take care that
					// the connections get changed.
					this.renameNode(parameterData.oldValue as string, parameterData.value as string);
				}
			},
			async renameNodePrompt (currentName: string) {
				try {
					const promptResponsePromise = this.$prompt('New Name:', `Rename Node: "${currentName}"`, {
						customClass: 'rename-prompt',
						confirmButtonText: 'Rename',
						cancelButtonText: 'Cancel',
						inputErrorMessage: 'Invalid Name',
						inputValue: currentName,
					});

					// Wait till it had time to display
					await Vue.nextTick();

					// Get the input and select the text in it
					const nameInput = document.querySelector('.rename-prompt .el-input__inner') as HTMLInputElement | undefined;
					if (nameInput) {
						nameInput.focus();
						nameInput.select();
					}

					const promptResponse = await promptResponsePromise as MessageBoxInputData;

					this.renameNode(currentName, promptResponse.value);
				} catch (e) {}
			},
			async renameNode (currentName: string, newName: string) {
				if (currentName === newName) {
					return;
				}
				// Check if node-name is unique else find one that is
				newName = this.getUniqueNodeName(newName);

				// Rename the node and update the connections
				const workflow = this.getWorkflow(undefined, undefined, true);
				workflow.renameNode(currentName, newName);

				// Update also last selected node and exeuction data
				this.$store.commit('renameNodeSelectedAndExecution', { old: currentName, new: newName });

				// Reset all nodes and connections to load the new ones
				if (this.instance) {
					// On first load it does not exist
					this.instance.deleteEveryEndpoint();
				}
				this.$store.commit('removeAllConnections');
				this.$store.commit('removeAllNodes', {setStateDirty: true});

				// Wait a tick that the old nodes had time to get removed
				await Vue.nextTick();

				// Add the new updated nodes
				await this.addNodes(Object.values(workflow.nodes), workflow.connectionsBySourceNode);

				// Make sure that the node is selected again
				this.deselectAllNodes();
				this.nodeSelectedByName(newName);
			},
			async addNodes (nodes: INodeUi[], connections?: IConnections) {
				if (!nodes || !nodes.length) {
					return;
				}

				// Before proceeding we must check if all nodes contain the `properties` attribute.
				// Nodes are loaded without this information so we must make sure that all nodes
				// being added have this information.
				await this.loadNodesProperties(nodes.map(node => node.type));

				// Add the node to the node-list
				let nodeType: INodeTypeDescription | null;
				let foundNodeIssues: INodeIssues | null;
				nodes.forEach((node) => {
					nodeType = this.$store.getters.nodeType(node.type);

					// Make sure that some properties always exist
					if (!node.hasOwnProperty('disabled')) {
						node.disabled = false;
					}

					if (!node.hasOwnProperty('color')) {
						// If no color is defined set the default color of the node type
						if (nodeType && nodeType.defaults.color) {
							node.color = nodeType.defaults.color as string;
						}
					}
					if (!node.hasOwnProperty('parameters')) {
						node.parameters = {};
					}

					// Load the defaul parameter values because only values which differ
					// from the defaults get saved
					if (nodeType !== null) {
						let nodeParameters = null;
						try {
							nodeParameters = NodeHelpers.getNodeParameters(nodeType.properties, node.parameters, true, false);
						} catch (e) {
							console.error(`There was a problem loading the node-parameters of node: "${node.name}"`); // eslint-disable-line no-console
							console.error(e); // eslint-disable-line no-console
						}
						node.parameters = nodeParameters !== null ? nodeParameters : {};

						// if it's a webhook and the path is empty set the UUID as the default path
						if (node.type === 'n8n-nodes-base.webhook' && node.parameters.path === '') {
							node.parameters.path = node.webhookId as string;
						}
					}

					foundNodeIssues = this.getNodeIssues(nodeType, node);

					if (foundNodeIssues !== null) {
						node.issues = foundNodeIssues;
					}

					this.$store.commit('addNode', node);
				});

				// Wait for the node to be rendered
				await Vue.nextTick();

				// Suspend drawing
				this.instance.setSuspendDrawing(true);

				// Load the connections
				if (connections !== undefined) {
					let connectionData;
					for (const sourceNode of Object.keys(connections)) {
						for (const type of Object.keys(connections[sourceNode])) {
							for (let sourceIndex = 0; sourceIndex < connections[sourceNode][type].length; sourceIndex++) {
								connections[sourceNode][type][sourceIndex].forEach((
									targetData,
								) => {
									connectionData = [
										{
											node: sourceNode,
											type,
											index: sourceIndex,
										},
										{
											node: targetData.node,
											type: targetData.type,
											index: targetData.index,
										},
									] as [IConnection, IConnection];

									this.__addConnection(connectionData, true);
								});
							}
						}
					}
				}

				// Now it can draw again
				this.instance.setSuspendDrawing(false, true);
			},
			async addNodesToWorkflow (data: IWorkflowDataUpdate): Promise<IWorkflowDataUpdate> {
				// Because nodes with the same name maybe already exist, it could
				// be needed that they have to be renamed. Also could it be possible
				// that nodes are not allowd to be created because they have a create
				// limit set. So we would then link the new nodes with the already existing ones.
				// In this object all that nodes get saved in the format:
				//   old-name -> new-name
				const nodeNameTable: {
					[key: string]: string;
				} = {};
				const newNodeNames: string[] = [];

				if (!data.nodes) {
					// No nodes to add
					throw new Error('No nodes given to add!');
				}

				// Get how many of the nodes of the types which have
				// a max limit set already exist
				const nodeTypesCount = this.getNodeTypesMaxCount();

				let oldName: string;
				let newName: string;
				const createNodes: INode[] = [];

				await this.loadNodesProperties(data.nodes.map(node => node.type));

				data.nodes.forEach(node => {
					if (nodeTypesCount[node.type] !== undefined) {
						if (nodeTypesCount[node.type].exist >= nodeTypesCount[node.type].max) {
							// Node is not allowed to be created so
							// do not add it to the create list but
							// add the name of the existing node
							// that this one gets linked up instead.
							nodeNameTable[node.name] = nodeTypesCount[node.type].nodeNames[0];
							return;
						} else {
							// Node can be created but increment the
							// counter in case multiple ones are
							// supposed to be created
							nodeTypesCount[node.type].exist += 1;
						}
					}

					oldName = node.name;
					newName = this.getUniqueNodeName(node.name, newNodeNames);

					newNodeNames.push(newName);
					nodeNameTable[oldName] = newName;

					createNodes.push(node);
				});

				// Get only the connections of the nodes that get created
				const newConnections: IConnections = {};
				const currentConnections = data.connections!;
				const createNodeNames = createNodes.map((node) => node.name);
				let sourceNode, type, sourceIndex, connectionIndex, connectionData;
				for (sourceNode of Object.keys(currentConnections)) {
					if (!createNodeNames.includes(sourceNode)) {
						// Node does not get created so skip output connections
						continue;
					}

					const connection: INodeConnections = {};

					for (type of Object.keys(currentConnections[sourceNode])) {
						connection[type] = [];
						for (sourceIndex = 0; sourceIndex < currentConnections[sourceNode][type].length; sourceIndex++) {
							const nodeSourceConnections = [];
							if (currentConnections[sourceNode][type][sourceIndex]) {
								for (connectionIndex = 0; connectionIndex < currentConnections[sourceNode][type][sourceIndex].length; connectionIndex++) {
									const nodeConnection: NodeInputConnections = [];
									connectionData = currentConnections[sourceNode][type][sourceIndex][connectionIndex];
									if (!createNodeNames.includes(connectionData.node)) {
										// Node does not get created so skip input connection
										continue;
									}

									nodeSourceConnections.push(connectionData);
									// Add connection
								}
							}
							connection[type].push(nodeSourceConnections);
						}
					}

					newConnections[sourceNode] = connection;
				}

				// Create a workflow with the new nodes and connections that we can use
				// the rename method
				const tempWorkflow: Workflow = this.getWorkflow(createNodes, newConnections);

				// Rename all the nodes of which the name changed
				for (oldName in nodeNameTable) {
					if (oldName === nodeNameTable[oldName]) {
						// Name did not change so skip
						continue;
					}
					tempWorkflow.renameNode(oldName, nodeNameTable[oldName]);
				}

				// Add the nodes with the changed node names, expressions and connections
				await this.addNodes(Object.values(tempWorkflow.nodes), tempWorkflow.connectionsBySourceNode);

				this.$store.commit('setStateDirty', true);

				return {
					nodes: Object.values(tempWorkflow.nodes),
					connections: tempWorkflow.connectionsBySourceNode,
				};
			},
			getSelectedNodesToSave (): Promise<IWorkflowData> {
				const data: IWorkflowData = {
					nodes: [],
					connections: {},
				};

				// Get data of all the selected noes
				let nodeData;
				const exportNodeNames: string[] = [];

				for (const node of this.$store.getters.getSelectedNodes) {
					try {
						nodeData = this.getNodeDataToSave(node);
						exportNodeNames.push(node.name);
					} catch (e) {
						return Promise.reject(e);
					}

					data.nodes.push(nodeData);
				}

				// Get only connections of exported nodes and ignore all other ones
				let connectionToKeep,
					connections: INodeConnections,
					type: string,
					connectionIndex: number,
					sourceIndex: number,
					connectionData: IConnection,
					typeConnections: INodeConnections;

				data.nodes.forEach((node) => {
					connections = this.$store.getters.connectionsByNodeName(node.name);
					if (Object.keys(connections).length === 0) {
						return;
					}

					// Keep only the connection to node which get also exported
					// @ts-ignore
					typeConnections = {};
					for (type of Object.keys(connections)) {
						for (sourceIndex = 0; sourceIndex < connections[type].length; sourceIndex++) {
							connectionToKeep = [];
							for (connectionIndex = 0; connectionIndex < connections[type][sourceIndex].length; connectionIndex++) {
								connectionData = connections[type][sourceIndex][connectionIndex];
								if (exportNodeNames.indexOf(connectionData.node) !== -1) {
									connectionToKeep.push(connectionData);
								}
							}

							if (connectionToKeep.length) {
								if (!typeConnections.hasOwnProperty(type)) {
									typeConnections[type] = [];
								}
								typeConnections[type][sourceIndex] = connectionToKeep;
							}
						}
					}

					if (Object.keys(typeConnections).length) {
						data.connections[node.name] = typeConnections;
					}
				});

				return Promise.resolve(data);
			},
			resetWorkspace () {
				// Reset nodes
				if (this.instance) {
					// On first load it does not exist
					this.instance.deleteEveryEndpoint();
				}

				if (this.executionWaitingForWebhook === true) {
					// Make sure that if there is a waiting test-webhook that
					// it gets removed
					this.restApi().removeTestWebhook(this.$store.getters.workflowId)
						.catch(() => {
							// Ignore all errors
						});
				}

				this.$store.commit('removeAllConnections', {setStateDirty: false});
				this.$store.commit('removeAllNodes', {setStateDirty: false});

				// Reset workflow execution data
				this.$store.commit('setWorkflowExecutionData', null);
				this.$store.commit('resetAllNodesIssues');
				// vm.$forceUpdate();

				this.$store.commit('setActive', false);
				this.$store.commit('setWorkflowId', PLACEHOLDER_EMPTY_WORKFLOW_ID);
				this.$store.commit('setWorkflowName', {newName: '', setStateDirty: false});
				this.$store.commit('setWorkflowSettings', {});

				this.$store.commit('setActiveExecutionId', null);
				this.$store.commit('setExecutingNode', null);
				this.$store.commit('removeActiveAction', 'workflowRunning');
				this.$store.commit('setExecutionWaitingForWebhook', false);

				this.$store.commit('resetNodeIndex');
				this.$store.commit('resetSelectedNodes');

				this.$store.commit('setNodeViewOffsetPosition', {newOffset: [0, 0], setStateDirty: false});

				return Promise.resolve();
			},
			async loadActiveWorkflows (): Promise<void> {
				const activeWorkflows = await this.restApi().getActiveWorkflows();
				this.$store.commit('setActiveWorkflows', activeWorkflows);
			},
			async loadSettings (): Promise<void> {
				const settings = await this.restApi().getSettings() as IN8nUISettings;

				this.$store.commit('setUrlBaseWebhook', settings.urlBaseWebhook);
				this.$store.commit('setEndpointWebhook', settings.endpointWebhook);
				this.$store.commit('setEndpointWebhookTest', settings.endpointWebhookTest);
				this.$store.commit('setSaveDataErrorExecution', settings.saveDataErrorExecution);
				this.$store.commit('setSaveDataSuccessExecution', settings.saveDataSuccessExecution);
				this.$store.commit('setSaveManualExecutions', settings.saveManualExecutions);
				this.$store.commit('setTimezone', settings.timezone);
				this.$store.commit('setExecutionTimeout', settings.executionTimeout);
				this.$store.commit('setMaxExecutionTimeout', settings.maxExecutionTimeout);
				this.$store.commit('setVersionCli', settings.versionCli);
				this.$store.commit('setOauthCallbackUrls', settings.oauthCallbackUrls);
				this.$store.commit('setN8nMetadata', settings.n8nMetadata || {});
			},
			async loadNodeTypes (): Promise<void> {
				const nodeTypes = await this.restApi().getNodeTypes();
				this.$store.commit('setNodeTypes', nodeTypes);
			},
			async loadCredentialTypes (): Promise<void> {
				const credentialTypes = await this.restApi().getCredentialTypes();
				this.$store.commit('setCredentialTypes', credentialTypes);
			},
			async loadCredentials (): Promise<void> {
				const credentials = await this.restApi().getAllCredentials();
				this.$store.commit('setCredentials', credentials);
			},
			async loadNodesProperties(nodeNames: string[]): Promise<void> {
				const allNodes = this.$store.getters.allNodeTypes;
				const nodesToBeFetched = allNodes.filter((node: INodeTypeDescription) => nodeNames.includes(node.name) && !node.hasOwnProperty('properties')).map((node: INodeTypeDescription) => node.name) as string[];
				if (nodesToBeFetched.length > 0) {
					// Only call API if node information is actually missing
					this.startLoading();
					const nodeInfo = await this.restApi().getNodesInformation(nodesToBeFetched);
					this.$store.commit('updateNodeTypes', nodeInfo);
					this.stopLoading();
				}
			},
		},

		async mounted () {
			this.$root.$on('importWorkflowData', async (data: IDataObject) => {
				const resData = await this.importWorkflowData(data.data as IWorkflowDataUpdate);
			});

			this.$root.$on('importWorkflowUrl', async (data: IDataObject) => {
				const workflowData = await this.getWorkflowDataFromUrl(data.url as string);
				if (workflowData !== undefined) {
					const resData = await this.importWorkflowData(workflowData);
				}
			});

			this.startLoading();

			const loadPromises = [
				this.loadActiveWorkflows(),
				this.loadCredentials(),
				this.loadCredentialTypes(),
				this.loadNodeTypes(),
				this.loadSettings(),
			];

			try {
				await Promise.all(loadPromises);
			} catch (error) {
				this.$showError(error, 'Init Problem', 'There was a problem loading init data:');
				return;
			}

			this.instance.ready(async () => {
				try {
					this.initNodeView();
					await this.initView();
				} catch (error) {
					this.$showError(error, 'Init Problem', 'There was a problem initializing the workflow:');
				}
				this.stopLoading();
			});

			this.$externalHooks().run('nodeView.mount');
		},

		destroyed () {
			this.resetWorkspace();
		},
	});
</script>

<style scoped lang="scss">

.zoom-menu {
	position: fixed;
	left: 70px;
	width: 200px;
	bottom: 45px;
	line-height: 25px;
	z-index: 18;
	color: #444;
	padding-right: 5px;
}

.node-creator-button {
	position: fixed;
	text-align: center;
	top: 80px;
	right: 20px;
	z-index: 10;
}

.node-creator-button button {
	position: relative;
	background: $--color-primary;
	font-size: 1.4em;
	color: #fff;
}

.node-creator-button:hover button {
	transform: scale(1.05);
}

.node-view-root {
	position: absolute;
	width: 100%;
	height: 100%;
	left: 0;
	top: 0;
	overflow: hidden;
}

.node-view-wrapper {
	position: fixed;
	width: 100%;
	height: 100%;
}

.node-view {
	position: relative;
	width: 100%;
	height: 100%;
	transform-origin: 0 0;
}

.node-view-background {
	position: absolute;
	width: 10000px;
	height: 10000px;
	top: -5000px;
	left: -5000px;
	background-size: 50px 50px;
	background-image: linear-gradient(to right, #eeeefe 1px, transparent 1px), linear-gradient(to bottom, #eeeefe 1px, transparent 1px);
}

.move-active {
	cursor: grab;
	cursor: -moz-grab;
	cursor: -webkit-grab;
	touch-action: none;
}

.move-in-process {
	cursor: grabbing;
	cursor: -moz-grabbing;
	cursor: -webkit-grabbing;
	touch-action: none;
}

.workflow-execute-wrapper {
	position: fixed;
	line-height: 65px;
	left: calc(50% - 150px);
	bottom: 30px;
	width: 300px;
	text-align: center;

	.run-icon {
		display: inline-block;
		transform: scale(1.4);
		margin-right: 0.5em;
	}

	.workflow-run-button {
		padding: 12px;
	}

	.stop-execution,
	.workflow-run-button.running {
		color: $--color-primary;
		background-color: $--color-primary-light;
	}
}

/* Makes sure that when selected with mouse it does not select text */
.do-not-select *,
.jtk-drag-select * {
	-webkit-touch-callout: none;
	-webkit-user-select: none;
	-khtml-user-select: none;
	-moz-user-select: none;
	-ms-user-select: none;
	user-select: none;
}

</style>

<style lang="scss">

.connection-input-name-label,
.connection-output-name-label {
	border-radius: 7px;
	background-color: rgba( $--custom-node-view-background, 0.8 );
	font-size: 0.7em;
	line-height: 1.3em;
	padding: 2px 3px;
	white-space: nowrap;
}

.delete-connection {
	font-weight: 500;
}

.remove-connection-label {
	font-size: 12px;
	color: #fff;
	line-height: 13px;
	border-radius: 15px;
	height: 15px;
	background-color: #334455;
	position: relative;
	height: 15px;
	width: 15px;
	text-align: center;

	&:hover {
		background-color: $--color-primary;
		font-size: 20px;
		line-height: 17px;
		height: 20px;
		width: 20px;
	}
}

.drop-add-node-label {
	color: #555;
	font-weight: 600;
	font-size: 0.8em;
	text-align: center;
	background-color: #ffffff55;
}

.node-input-endpoint-label,
.node-output-endpoint-label {
	background-color: $--custom-node-view-background;
	border-radius: 7px;
	font-size: 0.7em;
	padding: 2px;
	white-space: nowrap;
}

.node-input-endpoint-label {
	text-align: right;
}

.button-white {
	border: none;
	padding: 0.3em;
	margin: 0 0.1em;
	border-radius: 3px;
	font-size: 1.2em;
	background: #fff;
	width: 40px;
	height: 40px;
	color: #666;
	cursor: pointer;

	&:hover {
		transform: scale(1.1);
	}
}

</style>
