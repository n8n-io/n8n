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
				@moved="onNodeMoved"
				@run="onNodeRun"
				:id="'node-' + getNodeIndex(nodeData.name)"
				:key="getNodeIndex(nodeData.name)"
				:name="nodeData.name"
				:isReadOnly="isReadOnly"
				:instance="instance"
				:isActive="!!activeNode && activeNode.name === nodeData.name"
				:hideActions="pullConnActive"
				></node>
			</div>
		</div>
		<DataDisplay @valueChanged="valueChanged"/>
		<div v-if="!createNodeActive && !isReadOnly" class="node-creator-button" title="Add Node" @click="() => openNodeCreator('add_node_button')">
			<n8n-icon-button size="xlarge" icon="plus" />
		</div>
		<node-creator
			:active="createNodeActive"
			@nodeTypeSelected="nodeTypeSelected"
			@closeNodeCreator="closeNodeCreator"
			></node-creator>
		<div :class="{ 'zoom-menu': true, expanded: !sidebarMenuCollapsed }">
			<button @click="zoomToFit" class="button-white" title="Zoom to Fit">
				<font-awesome-icon icon="expand"/>
			</button>
			<button @click="zoomIn()" class="button-white" title="Zoom In">
				<font-awesome-icon icon="search-plus"/>
			</button>
			<button @click="zoomOut()" class="button-white" title="Zoom Out">
				<font-awesome-icon icon="search-minus"/>
			</button>
			<button
				v-if="nodeViewScale !== 1"
				@click="resetZoom()"
				class="button-white"
				title="Reset Zoom"
				>
				<font-awesome-icon icon="undo" title="Reset Zoom"/>
			</button>
		</div>
		<div class="workflow-execute-wrapper" v-if="!isReadOnly">
			<n8n-button
				@click.stop="runWorkflow()"
				:loading="workflowRunning"
				:label="runButtonText"
				size="large"
				icon="play-circle"
				title="Executes the Workflow from the Start or Webhook Node."
				:type="workflowRunning ? 'light' : 'primary'"
			/>

			<n8n-icon-button
				v-if="workflowRunning === true && !executionWaitingForWebhook"
				icon="stop"
				size="large"
				class="stop-execution"
				type="light"
				:title="stopExecutionInProgress ? 'Stopping current execution':'Stop current execution'"
				:loading="stopExecutionInProgress"
				@click.stop="stopExecution()"
			/>

			<n8n-icon-button
				v-if="workflowRunning === true && executionWaitingForWebhook === true"
				class="stop-execution"
				icon="stop"
				size="large"
				title="Stop waiting for Webhook call"
				type="light"
				@click.stop="stopWaitingForWebhook()"
			/>

			<n8n-icon-button
				v-if="!isReadOnly && workflowExecution && !workflowRunning"
				title="Deletes the current Execution Data."
				icon="trash"
				size="large"
				@click.stop="clearExecutionData()"
			/>
		</div>
		<Modals />
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import {
	Connection, Endpoint,
} from 'jsplumb';
import { MessageBoxInputData } from 'element-ui/types/message-box';
import { jsPlumb, OnConnectionBindInfo } from 'jsplumb';
import { NODE_NAME_PREFIX, PLACEHOLDER_EMPTY_WORKFLOW_ID, START_NODE_TYPE, WEBHOOK_NODE_TYPE, WORKFLOW_OPEN_MODAL_KEY } from '@/constants';
import { copyPaste } from '@/components/mixins/copyPaste';
import { externalHooks } from '@/components/mixins/externalHooks';
import { genericHelpers } from '@/components/mixins/genericHelpers';
import { mouseSelect } from '@/components/mixins/mouseSelect';
import { moveNodeWorkflow } from '@/components/mixins/moveNodeWorkflow';
import { restApi } from '@/components/mixins/restApi';
import { showMessage } from '@/components/mixins/showMessage';
import { titleChange } from '@/components/mixins/titleChange';
import { newVersions } from '@/components/mixins/newVersions';

import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import { workflowRun } from '@/components/mixins/workflowRun';

import DataDisplay from '@/components/DataDisplay.vue';
import Modals from '@/components/Modals.vue';
import Node from '@/components/Node.vue';
import NodeCreator from '@/components/NodeCreator/NodeCreator.vue';
import NodeSettings from '@/components/NodeSettings.vue';
import RunData from '@/components/RunData.vue';

import * as CanvasHelpers from './canvasHelpers';

import mixins from 'vue-typed-mixins';
import { v4 as uuidv4} from 'uuid';
import {
	IConnection,
	IConnections,
	IDataObject,
	INode,
	INodeConnections,
	INodeIssues,
	INodeTypeDescription,
	INodeTypeNameVersion,
	NodeHelpers,
	Workflow,
	IRun,
	ITaskData,
	INodeCredentialsDetails,
} from 'n8n-workflow';
import {
	ICredentialsResponse,
	IExecutionResponse,
	IWorkflowDb,
	IWorkflowData,
	INodeUi,
	IUpdateInformation,
	IWorkflowDataUpdate,
	XYPosition,
	IPushDataExecutionFinished,
	ITag,
	IWorkflowTemplate,
	IExecutionsSummary,
} from '../Interface';
import { mapGetters } from 'vuex';
import '../plugins/N8nCustomConnectorType';

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
	newVersions,
)
	.extend({
		name: 'NodeView',
		components: {
			DataDisplay,
			Modals,
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
			...mapGetters('ui', [
				'sidebarMenuCollapsed',
			]),
			activeNode (): INodeUi | null {
				return this.$store.getters.activeNode;
			},
			executionWaitingForWebhook (): boolean {
				return this.$store.getters.executionWaitingForWebhook;
			},
			lastSelectedNode (): INodeUi | null {
				return this.$store.getters.lastSelectedNode;
			},
			nodes (): INodeUi[] {
				return this.$store.getters.allNodes;
			},
			runButtonText (): string {
				if (this.workflowRunning === false) {
					return 'Execute Workflow';
				}

				if (this.executionWaitingForWebhook === true) {
					return 'Waiting for Trigger Event';
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
				return CanvasHelpers.getBackgroundStyles(this.nodeViewScale, this.$store.getters.getNodeViewOffsetPosition);
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
				lastSelectedConnection: null as null | Connection,
				lastClickPosition: [450, 450] as XYPosition,
				nodeViewScale: 1,
				ctrlKeyPressed: false,
				stopExecutionInProgress: false,
				blankRedirect: false,
				credentialsUpdated: false,
				newNodeInsertPosition: null as XYPosition | null,
				pullConnActiveNodeName: null as string | null,
				pullConnActive: false,
				dropPrevented: false,
			};
		},
		beforeDestroy () {
			// Make sure the event listeners get removed again else we
			// could add up with them registred multiple times
			document.removeEventListener('keydown', this.keyDown);
			document.removeEventListener('keyup', this.keyUp);
		},
		methods: {
			clearExecutionData () {
				this.$store.commit('setWorkflowExecutionData', null);
				this.updateNodesExecutionIssues();
			},
			openNodeCreator (source: string) {
				this.createNodeActive = true;
				this.$externalHooks().run('nodeView.createNodeActiveChanged', { source, createNodeActive: this.createNodeActive });
				this.$telemetry.trackNodesPanel('nodeView.createNodeActiveChanged', { source, workflow_id: this.$store.getters.workflowId, createNodeActive: this.createNodeActive });
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
				this.$nextTick(() => {
					this.zoomToFit();
					this.$store.commit('setStateDirty', false);
				});

				this.$externalHooks().run('execution.open', { workflowId: data.workflowData.id, workflowName: data.workflowData.name, executionId });
				this.$telemetry.track('User opened read-only execution', { workflow_id: data.workflowData.id, execution_mode: data.mode, execution_finished: data.finished });

				if (data.finished !== true && data.data.resultData.error) {
					// Check if any node contains an error
					let nodeErrorFound = false;
					if (data.data.resultData.runData) {
						const runData = data.data.resultData.runData;
						errorCheck:
						for (const nodeName of Object.keys(runData)) {
							for (const taskData of runData[nodeName]) {
								if (taskData.error) {
									nodeErrorFound = true;
									break errorCheck;
								}
							}
						}
					}

					if (nodeErrorFound === false) {
						const resultError = data.data.resultData.error;
						const errorMessage = this.$getExecutionError(resultError);
						const shouldTrack = resultError && resultError.node && resultError.node.type.startsWith('n8n-nodes-base');
						this.$showMessage({
							title: 'Failed execution',
							message: errorMessage,
							type: 'error',
						}, shouldTrack);

						if (data.data.resultData.error.stack) {
							// Display some more information for now in console to make debugging easier
							// TODO: Improve this in the future by displaying in UI
							console.error(`Execution ${executionId} error:`); // eslint-disable-line no-console
							console.error(data.data.resultData.error.stack); // eslint-disable-line no-console
						}
					}
				}

				if ((data as IExecutionsSummary).waitTill) {
					this.$showMessage({
						title: `This execution hasn't finished yet`,
						message: `<a onclick="window.location.reload(false);">Refresh</a> to see the latest status.<br/> <a href="https://docs.n8n.io/nodes/n8n-nodes-base.wait/" target="_blank">More info</a>`,
						type: 'warning',
						duration: 0,
					});
				}
			},
			async openWorkflowTemplate (templateId: string) {
				this.setLoadingText('Loading template');
				this.resetWorkspace();

				let data: IWorkflowTemplate | undefined;
				try {
					this.$externalHooks().run('template.requested', { templateId });
					data = await this.$store.dispatch('workflows/getWorkflowTemplate', templateId);

					if (!data) {
						throw new Error(`Workflow template with id "${templateId}" could not be found!`);
					}

					data.workflow.nodes.forEach((node) => {
						if (!this.$store.getters.nodeType(node.type)) {
							const name = node.type.replace('n8n-nodes-base.', '');
							throw new Error(`The ${name} node is not supported`);
						}
					});
				} catch (error) {
					this.$showError(error, `Couldn't import workflow`);
					this.$router.push({ name: 'NodeViewNew' });
					return;
				}

				const nodes = data.workflow.nodes;
				const hasStartNode = !!nodes.find(node => node.type === START_NODE_TYPE);

				const leftmostTop = CanvasHelpers.getLeftmostTopNode(nodes);

				const diffX = CanvasHelpers.DEFAULT_START_POSITION_X - leftmostTop.position[0];
				const diffY = CanvasHelpers.DEFAULT_START_POSITION_Y - leftmostTop.position[1];

				data.workflow.nodes.map((node) => {
					node.position[0] += diffX + (hasStartNode? 0 : CanvasHelpers.NODE_SIZE * 2);
					node.position[1] += diffY;
				});

				if (!hasStartNode) {
					data.workflow.nodes.push({...CanvasHelpers.DEFAULT_START_NODE});
				}

				this.blankRedirect = true;
				this.$router.push({ name: 'NodeViewNew', query: { templateId } });

				await this.addNodes(data.workflow.nodes, data.workflow.connections);
				await this.$store.dispatch('workflows/setNewWorkflowName', data.name);
				this.$nextTick(() => {
					this.zoomToFit();
					this.$store.commit('setStateDirty', true);
				});

				this.$externalHooks().run('template.open', { templateId, templateName: data.name, workflow: data.workflow });
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

				const tags = (data.tags || []) as ITag[];
				this.$store.commit('tags/upsertTags', tags);

				const tagIds = tags.map((tag) => tag.id);
				this.$store.commit('setWorkflowTagIds', tagIds || []);

				await this.addNodes(data.nodes, data.connections);
				if (!this.credentialsUpdated) {
					this.$store.commit('setStateDirty', false);
				}

				this.zoomToFit();

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
				this.lastClickPosition = this.getMousePositionWithinNodeView(e);

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
						this.zoomOut();
					} else {
						this.zoomIn();
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
						path[index].className.includes('ignore-key-press')
					)) {
						return;
					}
				}

				// el-dialog or el-message-box element is open
				if (window.document.body.classList.contains('el-popup-parent--hidden')) {
					return;
				}

				if (e.key === 'Escape') {
					this.createNodeActive = false;
					if (this.activeNode) {
						this.$externalHooks().run('dataDisplay.nodeEditingFinished');
						this.$store.commit('setActiveNode', null);
					}

					return;
				}

				// node modal is open
				if (this.activeNode) {
					return;
				}

				if (e.key === 'd') {
					this.callDebounced('deactivateSelectedNode', 350);
				} else if (e.key === 'Delete') {
					e.stopPropagation();
					e.preventDefault();

					this.callDebounced('deleteSelectedNodes', 500);

				} else if (e.key === 'Tab') {
					this.createNodeActive = !this.createNodeActive && !this.isReadOnly;
					this.$externalHooks().run('nodeView.createNodeActiveChanged', { source: 'tab', createNodeActive: this.createNodeActive });
					this.$telemetry.trackNodesPanel('nodeView.createNodeActiveChanged', { source: 'tab', workflow_id: this.$store.getters.workflowId, createNodeActive: this.createNodeActive });

				} else if (e.key === this.controlKeyCode) {
					this.ctrlKeyPressed = true;
				} else if (e.key === 'F2' && !this.isReadOnly) {
					const lastSelectedNode = this.lastSelectedNode;
					if (lastSelectedNode !== null) {
						this.callDebounced('renameNodePrompt', 1500, lastSelectedNode.name);
					}
				} else if ((e.key === '=' || e.key === '+') && !this.isCtrlKeyPressed(e)) {
					this.zoomIn();
				} else if ((e.key === '_' || e.key === '-') && !this.isCtrlKeyPressed(e)) {
					this.zoomOut();
				} else if ((e.key === '0') && !this.isCtrlKeyPressed(e)) {
					this.resetZoom();
				} else if ((e.key === '1') && !this.isCtrlKeyPressed(e)) {
					this.zoomToFit();
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

					this.$store.dispatch('ui/openModal', WORKFLOW_OPEN_MODAL_KEY);
				} else if (e.key === 'n' && this.isCtrlKeyPressed(e) === true && e.altKey === true) {
					// Create a new workflow
					e.stopPropagation();
					e.preventDefault();

					if (this.$router.currentRoute.name === 'NodeViewNew') {
						this.$root.$emit('newWorkflow');
					} else {
						this.$router.push({ name: 'NodeViewNew' });
					}

					this.$showMessage({
						title: 'Workflow created',
						message: 'A new workflow was successfully created!',
						type: 'success',
					});
				} else if ((e.key === 's') && (this.isCtrlKeyPressed(e) === true)) {
					// Save workflow
					e.stopPropagation();
					e.preventDefault();

					if (this.isReadOnly) {
						return;
					}

					this.callDebounced('saveCurrentWorkflow', 1000, undefined, true);
				} else if (e.key === 'Enter') {
					// Activate the last selected node
					const lastSelectedNode = this.lastSelectedNode;

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
					const lastSelectedNode = this.lastSelectedNode;
					if (lastSelectedNode === null) {
						return;
					}

					const connections = this.$store.getters.outgoingConnectionsByNodeName(lastSelectedNode.name);

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
					const lastSelectedNode = this.lastSelectedNode;
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
					const lastSelectedNode = this.lastSelectedNode;
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
					const connectionsParent = this.$store.getters.outgoingConnectionsByNodeName(parentNode);

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
							siblingNode = this.$store.getters.getNodeByName(ouputConnection.node);

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
				const lastSelectedNode = this.lastSelectedNode;
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
				const lastSelectedNode = this.lastSelectedNode;
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

			pushDownstreamNodes (sourceNodeName: string, margin: number) {
				const sourceNode = this.$store.getters.nodesByName[sourceNodeName];
				const workflow = this.getWorkflow();
				const childNodes = workflow.getChildNodes(sourceNodeName);
				for (const nodeName of childNodes) {
					const node = this.$store.getters.nodesByName[nodeName] as INodeUi;
					if (node.position[0] < sourceNode.position[0]) {
						continue;
					}

					const updateInformation = {
						name: nodeName,
						properties: {
							position: [node.position[0] + margin, node.position[1]],
						},
					};

					this.$store.commit('updateNodeProperties', updateInformation);
					this.onNodeMoved(node);
				}
			},

			cutSelectedNodes () {
				this.copySelectedNodes();
				this.deleteSelectedNodes();
			},

			copySelectedNodes () {
				this.getSelectedNodesToSave().then((data) => {
					const nodeData = JSON.stringify(data, null, 2);
					this.copyToClipboard(nodeData);
					if (data.nodes.length > 0) {
						this.$telemetry.track('User copied nodes', {
							node_types: data.nodes.map((node) => node.type),
							workflow_id: this.$store.getters.workflowId,
						});
					}
				});
			},

			resetZoom () {
				const { scale, offset } = CanvasHelpers.scaleReset({scale: this.nodeViewScale, offset: this.$store.getters.getNodeViewOffsetPosition});

				this.setZoomLevel(scale);
				this.$store.commit('setNodeViewOffsetPosition', {newOffset: offset});
			},

			zoomIn() {
				const { scale, offset: [xOffset, yOffset] } = CanvasHelpers.scaleBigger({scale: this.nodeViewScale, offset: this.$store.getters.getNodeViewOffsetPosition});

				this.setZoomLevel(scale);
				this.$store.commit('setNodeViewOffsetPosition', {newOffset: [xOffset, yOffset]});
			},

			zoomOut() {
				const { scale, offset: [xOffset, yOffset] } = CanvasHelpers.scaleSmaller({scale: this.nodeViewScale, offset: this.$store.getters.getNodeViewOffsetPosition});

				this.setZoomLevel(scale);
				this.$store.commit('setNodeViewOffsetPosition', {newOffset: [xOffset, yOffset]});
			},

			setZoomLevel (zoomLevel: number) {
				this.nodeViewScale = zoomLevel; // important for background
				const element = this.instance.getContainer() as HTMLElement;

				// https://docs.jsplumbtoolkit.com/community/current/articles/zooming.html
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

			zoomToFit () {
				const nodes = this.$store.getters.allNodes as INodeUi[];

				if (nodes.length === 0) { // some unknown workflow executions
					return;
				}

				const {zoomLevel, offset} = CanvasHelpers.getZoomToFit(nodes);

				this.setZoomLevel(zoomLevel);
				this.$store.commit('setNodeViewOffsetPosition', {newOffset: offset});
			},

			async stopExecution () {
				const executionId = this.$store.getters.activeExecutionId;
				if (executionId === null) {
					return;
				}

				try {
					this.stopExecutionInProgress = true;
					await this.restApi().stopCurrentExecution(executionId);
					this.$showMessage({
						title: 'Execution stopped',
						message: `The execution with the id "${executionId}" was stopped!`,
						type: 'success',
					});
				} catch (error) {
					// Execution stop might fail when the execution has already finished. Let's treat this here.
					const execution = await this.restApi().getExecution(executionId);
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
				try {
					await this.restApi().removeTestWebhook(this.$store.getters.workflowId);
				} catch (error) {
					this.$showError(error, 'Problem deleting the test-webhook', 'There was a problem deleting webhook:');
					return;
				}

				this.$showMessage({
					title: 'Webhook deleted',
					message: `The webhook was deleted successfully`,
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

				this.$telemetry.track('User pasted nodes', {
					workflow_id: this.$store.getters.workflowId,
				});

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

				this.$telemetry.track('User imported workflow', { source: 'url', workflow_id: this.$store.getters.workflowId });

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
					this.updateNodePositions(workflowData, CanvasHelpers.getNewNodePosition(this.nodes, this.lastClickPosition));

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
				const node = this.$store.getters.getNodeByName(nodeName);
				if (node) {
					this.nodeDeselected(node);
				}
			},

			nodeSelectedByName (nodeName: string, setActive = false, deselectAllOthers?: boolean) {
				if (deselectAllOthers === true) {
					this.deselectAllNodes();
				}

				const node = this.$store.getters.getNodeByName(nodeName);
				if (node) {
					this.nodeSelected(node);
				}

				this.$store.commit('setLastSelectedNode', node.name);
				this.$store.commit('setLastSelectedNodeOutputIndex', null);
				this.lastSelectedConnection = null;
				this.newNodeInsertPosition = null;

				if (setActive === true) {
					this.$store.commit('setActiveNode', node.name);
				}
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
			async injectNode (nodeTypeName: string) {
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

				// when pulling new connection from node or injecting into a connection
				const lastSelectedNode = this.lastSelectedNode;
				if (lastSelectedNode) {
					const lastSelectedConnection = this.lastSelectedConnection;
					if (lastSelectedConnection) { // set when injecting into a connection
						const [diffX] = CanvasHelpers.getConnectorLengths(lastSelectedConnection);
						if (diffX <= CanvasHelpers.MAX_X_TO_PUSH_DOWNSTREAM_NODES) {
							this.pushDownstreamNodes(lastSelectedNode.name, CanvasHelpers.PUSH_NODES_OFFSET);
						}
					}

					// set when pulling connections
					if (this.newNodeInsertPosition) {
						newNodeData.position = CanvasHelpers.getNewNodePosition(this.nodes, [this.newNodeInsertPosition[0] + CanvasHelpers.GRID_SIZE, this.newNodeInsertPosition[1] - CanvasHelpers.NODE_SIZE / 2]);
						this.newNodeInsertPosition = null;
					}
					else {
						let yOffset = 0;

						if (lastSelectedConnection) {
							const sourceNodeType = this.$store.getters.nodeType(lastSelectedNode.type) as INodeTypeDescription | null;
							const offsets = [[-100, 100], [-140, 0, 140], [-240, -100, 100, 240]];
							if (sourceNodeType && sourceNodeType.outputs.length > 1) {
								const offset = offsets[sourceNodeType.outputs.length - 2];
								const sourceOutputIndex = lastSelectedConnection.__meta ? lastSelectedConnection.__meta.sourceOutputIndex : 0;
								yOffset = offset[sourceOutputIndex];
							}
						}

						// If a node is active then add the new node directly after the current one
						// newNodeData.position = [activeNode.position[0], activeNode.position[1] + 60];
						newNodeData.position = CanvasHelpers.getNewNodePosition(
							this.nodes,
							[lastSelectedNode.position[0] + CanvasHelpers.PUSH_NODES_OFFSET, lastSelectedNode.position[1] + yOffset],
							[100, 0],
						);
					}
				} else {
					// If no node is active find a free spot
					newNodeData.position = CanvasHelpers.getNewNodePosition(this.nodes, this.lastClickPosition);
				}

				// Check if node-name is unique else find one that is
				newNodeData.name = CanvasHelpers.getUniqueNodeName(this.$store.getters.allNodes, newNodeData.name);

				if (nodeTypeData.webhooks && nodeTypeData.webhooks.length) {
					newNodeData.webhookId = uuidv4();
				}

				await this.addNodes([newNodeData]);

				this.$store.commit('setStateDirty', true);

				this.$externalHooks().run('nodeView.addNodeButton', { nodeTypeName });
				this.$telemetry.trackNodesPanel('nodeView.addNodeButton', { node_type: nodeTypeName, workflow_id: this.$store.getters.workflowId });

				// Automatically deselect all nodes and select the current one and also active
				// current node
				this.deselectAllNodes();
				setTimeout(() => {
					this.nodeSelectedByName(newNodeData.name, true);
				});

				return newNodeData;
			},
			getConnection (sourceNodeName: string, sourceNodeOutputIndex: number, targetNodeName: string, targetNodeOuputIndex: number): IConnection | undefined {
				const nodeConnections = (this.$store.getters.outgoingConnectionsByNodeName(sourceNodeName) as INodeConnections).main;
				if (nodeConnections) {
					const connections: IConnection[] | null = nodeConnections[sourceNodeOutputIndex];

					if (connections) {
						return connections.find((connection: IConnection) => connection.node === targetNodeName && connection.index === targetNodeOuputIndex);
					}
				}

				return undefined;
			},
			connectTwoNodes (sourceNodeName: string, sourceNodeOutputIndex: number, targetNodeName: string, targetNodeOuputIndex: number) {
				if (this.getConnection(sourceNodeName, sourceNodeOutputIndex, targetNodeName, targetNodeOuputIndex)) {
					return;
				}

				const connectionData = [
					{
						node: sourceNodeName,
						type: 'main',
						index: sourceNodeOutputIndex,
					},
					{
						node: targetNodeName,
						type: 'main',
						index: targetNodeOuputIndex,
					},
				] as [IConnection, IConnection];

				this.__addConnection(connectionData, true);
			},
			async addNodeButton (nodeTypeName: string) {
				if (this.editAllowedCheck() === false) {
					return;
				}

				const lastSelectedConnection = this.lastSelectedConnection;
				const lastSelectedNode = this.lastSelectedNode;
				const lastSelectedNodeOutputIndex = this.$store.getters.lastSelectedNodeOutputIndex;

				const newNodeData = await this.injectNode(nodeTypeName);
				if (!newNodeData) {
					return;
				}

				const outputIndex = lastSelectedNodeOutputIndex || 0;

				// If a node is last selected then connect between the active and its child ones
				if (lastSelectedNode) {
					await Vue.nextTick();

					if (lastSelectedConnection && lastSelectedConnection.__meta) {
						this.__deleteJSPlumbConnection(lastSelectedConnection);

						const targetNodeName = lastSelectedConnection.__meta.targetNodeName;
						const targetOutputIndex = lastSelectedConnection.__meta.targetOutputIndex;
						this.connectTwoNodes(newNodeData.name, 0, targetNodeName, targetOutputIndex);
					}

					// Connect active node to the newly created one
					this.connectTwoNodes(lastSelectedNode.name, outputIndex, newNodeData.name, 0);
				}
			},
			initNodeView () {
				this.instance.importDefaults({
					Connector: CanvasHelpers.CONNECTOR_FLOWCHART_TYPE,
					Endpoint: ['Dot', { radius: 5 }],
					DragOptions: { cursor: 'pointer', zIndex: 5000 },
					PaintStyle: CanvasHelpers.CONNECTOR_PAINT_STYLE_DEFAULT,
					HoverPaintStyle: CanvasHelpers.CONNECTOR_PAINT_STYLE_PRIMARY,
					ConnectionOverlays: CanvasHelpers.CONNECTOR_ARROW_OVERLAYS,
					Container: '#node-view',
				});

				const insertNodeAfterSelected = (info: {sourceId: string, index: number, eventSource: string, connection?: Connection}) => {
					// Get the node and set it as active that new nodes
					// which get created get automatically connected
					// to it.
					const sourceNodeName = this.$store.getters.getNodeNameByIndex(info.sourceId.slice(NODE_NAME_PREFIX.length));
					this.$store.commit('setLastSelectedNode', sourceNodeName);
					this.$store.commit('setLastSelectedNodeOutputIndex', info.index);
					this.newNodeInsertPosition = null;

					if (info.connection) {
						this.lastSelectedConnection = info.connection;
					}

					this.openNodeCreator(info.eventSource);
				};

				this.instance.bind('connectionAborted', (connection) => {
					try {
						if (this.dropPrevented) {
							this.dropPrevented = false;
							return;
						}

						if (this.pullConnActiveNodeName) {
							const sourceNodeName = this.$store.getters.getNodeNameByIndex(connection.sourceId.slice(NODE_NAME_PREFIX.length));
							const outputIndex = connection.getParameters().index;

							this.connectTwoNodes(sourceNodeName, outputIndex, this.pullConnActiveNodeName, 0);
							this.pullConnActiveNodeName = null;
							return;
						}

						insertNodeAfterSelected({
							sourceId: connection.sourceId,
							index: connection.getParameters().index,
							eventSource: 'node_connection_drop',
						});
					} catch (e) {
						console.error(e);  // eslint-disable-line no-console
					}
				});

				this.instance.bind('beforeDrop', (info) => {
					try {
						const sourceInfo = info.connection.endpoints[0].getParameters();
						// @ts-ignore
						const targetInfo = info.dropEndpoint.getParameters();

						const sourceNodeName = this.$store.getters.getNodeNameByIndex(sourceInfo.nodeIndex);
						const targetNodeName = this.$store.getters.getNodeNameByIndex(targetInfo.nodeIndex);

						// check for duplicates
						if (this.getConnection(sourceNodeName, sourceInfo.index, targetNodeName, targetInfo.index)) {
							this.dropPrevented = true;
							this.pullConnActiveNodeName = null;
							return false;
						}

						return true;
					} catch (e) {
						console.error(e);  // eslint-disable-line no-console
						return true;
					}
				});

				// only one set of visible actions should be visible at the same time
				let activeConnection: null | Connection = null;

				this.instance.bind('connection', (info: OnConnectionBindInfo) => {
					try {
						const sourceInfo = info.sourceEndpoint.getParameters();
						const targetInfo = info.targetEndpoint.getParameters();

						const sourceNodeName = this.$store.getters.getNodeNameByIndex(sourceInfo.nodeIndex);
						const targetNodeName = this.$store.getters.getNodeNameByIndex(targetInfo.nodeIndex);

						info.connection.__meta = {
							sourceNodeName,
							sourceOutputIndex: sourceInfo.index,
							targetNodeName,
							targetOutputIndex: targetInfo.index,
						};

						CanvasHelpers.resetConnection(info.connection);

						if (this.isReadOnly === false) {
							let exitTimer: NodeJS.Timeout | undefined;
							let enterTimer: NodeJS.Timeout | undefined;
							info.connection.bind('mouseover', (connection: Connection) => {
								try {
									if (exitTimer !== undefined) {
										clearTimeout(exitTimer);
										exitTimer = undefined;
									}

									if (enterTimer) {
										return;
									}

									if (!info.connection || info.connection === activeConnection) {
										return;
									}

									CanvasHelpers.hideConnectionActions(activeConnection);


									enterTimer = setTimeout(() => {
										enterTimer = undefined;
										if (info.connection) {
											activeConnection = info.connection;
											CanvasHelpers.showConectionActions(info.connection);
										}
									}, 150);
								} catch (e) {
									console.error(e); // eslint-disable-line no-console
								}
							});

							info.connection.bind('mouseout', (connection: Connection) => {
								try {
									if (exitTimer) {
										return;
									}

									if (enterTimer) {
										clearTimeout(enterTimer);
										enterTimer = undefined;
									}

									if (!info.connection || activeConnection !== info.connection) {
										return;
									}

									exitTimer = setTimeout(() => {
										exitTimer = undefined;

										if (info.connection && activeConnection === info.connection) {
											CanvasHelpers.hideConnectionActions(activeConnection);
											activeConnection = null;
										}
									}, 500);
								} catch (e) {
									console.error(e); // eslint-disable-line no-console
								}
							});

							CanvasHelpers.addConnectionActionsOverlay(info.connection,
								() => {
									activeConnection = null;
									this.__deleteJSPlumbConnection(info.connection);
								},
								() => {
									setTimeout(() => {
										insertNodeAfterSelected({
											sourceId: info.sourceId,
											index: sourceInfo.index,
											connection: info.connection,
											eventSource: 'node_connection_action',
										});
									}, 150);
								});
						}

						CanvasHelpers.moveBackInputLabelPosition(info.targetEndpoint);

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
					} catch (e) {
						console.error(e); // eslint-disable-line no-console
					}
				});

				this.instance.bind('connectionMoved', (info) => {
					try {
						// When a connection gets moved from one node to another it for some reason
						// calls the "connection" event but not the "connectionDetached" one. So we listen
						// additionally to the "connectionMoved" event and then only delete the existing connection.

						CanvasHelpers.resetInputLabelPosition(info.originalTargetEndpoint);

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
					} catch (e) {
						console.error(e); // eslint-disable-line no-console
					}
				});

				this.instance.bind('connectionDetached', (info) => {
					try {
						CanvasHelpers.resetInputLabelPosition(info.targetEndpoint);
						info.connection.removeOverlays();
						this.__removeConnectionByConnectionInfo(info, false);

						if (this.pullConnActiveNodeName) { // establish new connection when dragging connection from one node to another
							const sourceNodeName = this.$store.getters.getNodeNameByIndex(info.connection.sourceId.slice(NODE_NAME_PREFIX.length));
							const outputIndex = info.connection.getParameters().index;

							this.connectTwoNodes(sourceNodeName, outputIndex, this.pullConnActiveNodeName, 0);
							this.pullConnActiveNodeName = null;
						}
					} catch (e) {
						console.error(e); // eslint-disable-line no-console
					}
				});

				// @ts-ignore
				this.instance.bind('connectionDrag', (connection: Connection) => {
					try {
						this.pullConnActiveNodeName = null;
						this.pullConnActive = true;
						this.newNodeInsertPosition = null;
						CanvasHelpers.resetConnection(connection);
						CanvasHelpers.addOverlays(connection, CanvasHelpers.CONNECTOR_DROP_NODE_OVERLAY);
						const nodes = [...document.querySelectorAll('.node-default')];

						const onMouseMove = (e: MouseEvent | TouchEvent) => {
							if (!connection) {
								return;
							}

							const element = document.querySelector('.jtk-endpoint.dropHover');
							if (element) {
								// @ts-ignore
								CanvasHelpers.showDropConnectionState(connection, element._jsPlumb);
								return;
							}

							const inputMargin = 24;
							const intersecting = nodes.find((element: Element) => {
								const {top, left, right, bottom} = element.getBoundingClientRect();
								const [x, y] = CanvasHelpers.getMousePosition(e);
								if (top <= y && bottom >= y && (left - inputMargin) <= x && right >= x) {
									const nodeName = (element as HTMLElement).dataset['name'] as string;
									const node = this.$store.getters.getNodeByName(nodeName) as INodeUi | null;
									if (node) {
										const nodeType = this.$store.getters.nodeType(node.type) as INodeTypeDescription | null;
										if (nodeType && nodeType.inputs && nodeType.inputs.length === 1) {
											this.pullConnActiveNodeName = node.name;
											const endpoint = this.instance.getEndpoint(this.getInputEndpointUUID(nodeName, 0));

											CanvasHelpers.showDropConnectionState(connection, endpoint);

											return true;
										}
									}
								}

								return false;
							});

							if (!intersecting) {
								CanvasHelpers.showPullConnectionState(connection);
								this.pullConnActiveNodeName = null;
							}
						};

						const onMouseUp = (e: MouseEvent | TouchEvent) => {
							this.pullConnActive = false;
							this.newNodeInsertPosition = this.getMousePositionWithinNodeView(e);
							CanvasHelpers.resetConnectionAfterPull(connection);
							window.removeEventListener('mousemove', onMouseMove);
							window.removeEventListener('mouseup', onMouseUp);
						};

						window.addEventListener('mousemove', onMouseMove);
						window.addEventListener('touchmove', onMouseMove);
						window.addEventListener('mouseup', onMouseUp);
						window.addEventListener('touchend', onMouseMove);
					} catch (e) {
						console.error(e); // eslint-disable-line no-console
					}
				});
			},
			async newWorkflow (): Promise<void> {
				await this.resetWorkspace();
				await this.$store.dispatch('workflows/setNewWorkflowName');
				this.$store.commit('setStateDirty', false);

				await this.addNodes([{...CanvasHelpers.DEFAULT_START_NODE}]);

				this.nodeSelectedByName(CanvasHelpers.DEFAULT_START_NODE.name, false);

				this.$store.commit('setStateDirty', false);

				this.setZoomLevel(1);
				setTimeout(() => {
					this.$store.commit('setNodeViewOffsetPosition', {newOffset: [0, 0]});
				}, 0);
			},
			async initView (): Promise<void> {
				if (this.$route.params.action === 'workflowSave') {
					// In case the workflow got saved we do not have to run init
					// as only the route changed but all the needed data is already loaded
					this.$store.commit('setStateDirty', false);
					return Promise.resolve();
				}

				if (this.blankRedirect) {
					this.blankRedirect = false;
				}
				else if (this.$route.name === 'WorkflowTemplate') {
					const templateId = this.$route.params.id;
					await this.openWorkflowTemplate(templateId);
				}
				else if (this.$route.name === 'ExecutionById') {
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
						if (!workflow) {
							throw new Error('Could not find workflow');
						}
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
			getOutputEndpointUUID(nodeName: string, index: number) {
				return CanvasHelpers.getOutputEndpointUUID(this.getNodeIndex(nodeName), index);
			},
			getInputEndpointUUID(nodeName: string, index: number) {
				return CanvasHelpers.getInputEndpointUUID(this.getNodeIndex(nodeName), index);
			},
			__addConnection (connection: [IConnection, IConnection], addVisualConnection = false) {
				if (addVisualConnection === true) {
					const uuid: [string, string] = [
						this.getOutputEndpointUUID(connection[0].node, connection[0].index),
						this.getInputEndpointUUID(connection[1].node, connection[1].index),
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
						this.__deleteJSPlumbConnection(connectionInstance);
					});
				}

				this.$store.commit('removeConnection', { connection });
			},
			__deleteJSPlumbConnection(connection: Connection) {
				// Make sure to remove the overlay else after the second move
				// it visibly stays behind free floating without a connection.
				connection.removeOverlays();

				this.pullConnActiveNodeName = null; // prevent new connections when connectionDetached is triggered
				this.instance.deleteConnection(connection); // on delete, triggers connectionDetached event which applies mutation to store
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

				if (removeVisualConnection) {
					this.__deleteJSPlumbConnection(info.connection);
				}

				this.$store.commit('removeConnection', { connection: connectionInfo });
			},
			async duplicateNode (nodeName: string) {
				if (this.editAllowedCheck() === false) {
					return;
				}

				const node = this.$store.getters.getNodeByName(nodeName);

				const nodeTypeData: INodeTypeDescription | null= this.$store.getters.nodeType(node.type);
				if (nodeTypeData && nodeTypeData.maxNodes !== undefined && this.getNodeTypeCount(node.type) >= nodeTypeData.maxNodes) {
					this.showMaxNodeTypeError(nodeTypeData);
					return;
				}

				// Deep copy the data so that data on lower levels of the node-properties do
				// not share objects
				const newNodeData = JSON.parse(JSON.stringify(this.getNodeDataToSave(node)));

				// Check if node-name is unique else find one that is
				newNodeData.name = CanvasHelpers.getUniqueNodeName(this.$store.getters.allNodes, newNodeData.name);

				newNodeData.position = CanvasHelpers.getNewNodePosition(
					this.nodes,
					[node.position[0], node.position[1] + 140],
					[0, 140],
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

				this.$telemetry.track('User duplicated node', { node_type: node.type, workflow_id: this.$store.getters.workflowId });
			},
			getJSPlumbConnection (sourceNodeName: string, sourceOutputIndex: number, targetNodeName: string, targetInputIndex: number): Connection | undefined {
				const sourceIndex = this.getNodeIndex(sourceNodeName);
				const sourceId = `${NODE_NAME_PREFIX}${sourceIndex}`;

				const targetIndex = this.getNodeIndex(targetNodeName);
				const targetId = `${NODE_NAME_PREFIX}${targetIndex}`;

				const sourceEndpoint = CanvasHelpers.getOutputEndpointUUID(sourceIndex, sourceOutputIndex);
				const targetEndpoint = CanvasHelpers.getInputEndpointUUID(targetIndex, targetInputIndex);

				// @ts-ignore
				const connections = this.instance.getConnections({
					source: sourceId,
					target: targetId,
				}) as Connection[];

				return connections.find((connection: Connection) => {
					const uuids = connection.getUuids();
					return uuids[0] === sourceEndpoint && uuids[1] === targetEndpoint;
				});
			},
			getIncomingOutgoingConnections(nodeName: string): {incoming: Connection[], outgoing: Connection[]} {
				const name = `${NODE_NAME_PREFIX}${this.$store.getters.getNodeIndex(nodeName)}`;
				// @ts-ignore
				const outgoing = this.instance.getConnections({
					source: name,
				}) as Connection[];

				// @ts-ignore
				const incoming = this.instance.getConnections({
					target: name,
				}) as Connection[];

				return {
					incoming,
					outgoing,
				};
			},
			onNodeMoved (node: INodeUi) {
				const {incoming, outgoing} = this.getIncomingOutgoingConnections(node.name);

				[...incoming, ...outgoing].forEach((connection: Connection) => {
					CanvasHelpers.showOrHideMidpointArrow(connection);
					CanvasHelpers.showOrHideItemsLabel(connection);
				});
			},
			onNodeRun ({name, data, waiting}: {name: string, data: ITaskData[] | null, waiting: boolean}) {
				const sourceNodeName = name;
				const sourceIndex = this.$store.getters.getNodeIndex(sourceNodeName);
				const sourceId = `${NODE_NAME_PREFIX}${sourceIndex}`;

				if (data === null || data.length === 0 || waiting) {
					// @ts-ignore
					const outgoing = this.instance.getConnections({
						source: sourceId,
					}) as Connection[];

					outgoing.forEach((connection: Connection) => {
						CanvasHelpers.resetConnection(connection);
					});

					return;
				}

				const nodeConnections = (this.$store.getters.outgoingConnectionsByNodeName(sourceNodeName) as INodeConnections).main;
				if (!nodeConnections) {
					return;
				}

				const outputMap = CanvasHelpers.getOutputSummary(data, nodeConnections);

				Object.keys(outputMap).forEach((sourceOutputIndex: string) => {
					Object.keys(outputMap[sourceOutputIndex]).forEach((targetNodeName: string) => {
						Object.keys(outputMap[sourceOutputIndex][targetNodeName]).forEach((targetInputIndex: string) => {
							const connection = this.getJSPlumbConnection(sourceNodeName, parseInt(sourceOutputIndex, 10), targetNodeName, parseInt(targetInputIndex, 10));

							if (!connection) {
								return;
							}

							const output = outputMap[sourceOutputIndex][targetNodeName][targetInputIndex];
							if (!output || !output.total) {
								CanvasHelpers.resetConnection(connection);
								return;
							}

							CanvasHelpers.addConnectionOutputSuccess(connection, output);
						});
					});
				});
			},
			removeNode (nodeName: string) {
				if (this.editAllowedCheck() === false) {
					return;
				}

				const node = this.$store.getters.getNodeByName(nodeName) as INodeUi | null;
				if (!node) {
					return;
				}

				// "requiredNodeTypes" are also defined in cli/commands/run.ts
				const requiredNodeTypes = [ START_NODE_TYPE ];

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

				// connect nodes before/after deleted node
				const nodeType: INodeTypeDescription | null = this.$store.getters.nodeType(node.type, node.typeVersion);
				if (nodeType && nodeType.outputs.length === 1
					&& nodeType.inputs.length === 1) {
					const {incoming, outgoing} = this.getIncomingOutgoingConnections(node.name);
					if (incoming.length === 1 && outgoing.length === 1) {
						const conn1 = incoming[0];
						const conn2 = outgoing[0];
						if (conn1.__meta && conn2.__meta) {
							const sourceNodeName = conn1.__meta.sourceNodeName;
							const sourceNodeOutputIndex = conn1.__meta.sourceOutputIndex;
							const targetNodeName = conn2.__meta.targetNodeName;
							const targetNodeOuputIndex = conn2.__meta.targetOutputIndex;

							setTimeout(() => {
								this.connectTwoNodes(sourceNodeName, sourceNodeOutputIndex, targetNodeName, targetNodeOuputIndex);
							}, 100);
						}
					}
				}

				setTimeout(() => {
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
					this.$store.commit('clearNodeExecutionData', node.name);

					// Now it can draw again
					this.instance.setSuspendDrawing(false, true);

					// Remove node from selected index if found in it
					this.$store.commit('removeNodeFromSelection', node);

					// Remove from node index
					if (nodeIndex !== -1) {
						this.$store.commit('setNodeIndex', { index: nodeIndex, name: null });
					}
				}, 0); // allow other events to finish like drag stop
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
				newName = CanvasHelpers.getUniqueNodeName(this.$store.getters.allNodes, newName);

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
			matchCredentials(node: INodeUi) {
				if (!node.credentials) {
					return;
				}
				Object.entries(node.credentials).forEach(([nodeCredentialType, nodeCredentials]: [string, INodeCredentialsDetails]) => {
					const credentialOptions = this.$store.getters['credentials/getCredentialsByType'](nodeCredentialType) as ICredentialsResponse[];

					// Check if workflows applies old credentials style
					if (typeof nodeCredentials === 'string') {
						nodeCredentials = {
							id: null,
							name: nodeCredentials,
						};
						this.credentialsUpdated = true;
					}

					if (nodeCredentials.id) {
						// Check whether the id is matching with a credential
						const credentialsId = nodeCredentials.id.toString(); // due to a fixed bug in the migration UpdateWorkflowCredentials (just sqlite) we have to cast to string and check later if it has been a number
						const credentialsForId = credentialOptions.find((optionData: ICredentialsResponse) =>
							optionData.id === credentialsId,
						);
						if (credentialsForId) {
							if (credentialsForId.name !== nodeCredentials.name || typeof nodeCredentials.id === 'number') {
								node.credentials![nodeCredentialType] = { id: credentialsForId.id, name: credentialsForId.name };
								this.credentialsUpdated = true;
							}
							return;
						}
					}

					// No match for id found or old credentials type used
					node.credentials![nodeCredentialType] = nodeCredentials;

					// check if only one option with the name would exist
					const credentialsForName = credentialOptions.filter((optionData: ICredentialsResponse) => optionData.name === nodeCredentials.name);

					// only one option exists for the name, take it
					if (credentialsForName.length === 1) {
						node.credentials![nodeCredentialType].id = credentialsForName[0].id;
						this.credentialsUpdated = true;
					}
				});
			},
			async addNodes (nodes: INodeUi[], connections?: IConnections) {
				if (!nodes || !nodes.length) {
					return;
				}

				// Before proceeding we must check if all nodes contain the `properties` attribute.
				// Nodes are loaded without this information so we must make sure that all nodes
				// being added have this information.
				await this.loadNodesProperties(nodes.map(node => ({name: node.type, version: node.typeVersion})));

				// Add the node to the node-list
				let nodeType: INodeTypeDescription | null;
				let foundNodeIssues: INodeIssues | null;
				nodes.forEach((node) => {
					nodeType = this.$store.getters.nodeType(node.type, node.typeVersion) as INodeTypeDescription | null;

					// Make sure that some properties always exist
					if (!node.hasOwnProperty('disabled')) {
						node.disabled = false;
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
						if (node.type === WEBHOOK_NODE_TYPE && node.parameters.path === '') {
							node.parameters.path = node.webhookId as string;
						}
					}

					// check and match credentials, apply new format if old is used
					this.matchCredentials(node);

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

				await this.loadNodesProperties(data.nodes.map(node => ({name: node.type, version: node.typeVersion})));

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
					newName = CanvasHelpers.getUniqueNodeName(this.$store.getters.allNodes, node.name, newNodeNames);

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
					connections = this.$store.getters.outgoingConnectionsByNodeName(node.name);
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
				this.$store.commit('setWorkflowTagIds', []);

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
				await this.$store.dispatch('settings/getSettings');
			},
			async loadNodeTypes (): Promise<void> {
				const nodeTypes = await this.restApi().getNodeTypes();
				this.$store.commit('setNodeTypes', nodeTypes);
			},
			async loadCredentialTypes (): Promise<void> {
				await this.$store.dispatch('credentials/fetchCredentialTypes');
			},
			async loadCredentials (): Promise<void> {
				await this.$store.dispatch('credentials/fetchAllCredentials');
			},
			async loadNodesProperties(nodeInfos: INodeTypeNameVersion[]): Promise<void> {
				const allNodes:INodeTypeDescription[] = this.$store.getters.allNodeTypes;

				const nodesToBeFetched:INodeTypeNameVersion[] = [];
				allNodes.forEach(node => {
					if(!!nodeInfos.find(n => n.name === node.name && n.version === node.version) && !node.hasOwnProperty('properties')) {
						nodesToBeFetched.push({
							name: node.name,
							version: node.version,
						});
					}
				});

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
				await this.importWorkflowData(data.data as IWorkflowDataUpdate);
			});

			this.$root.$on('newWorkflow', this.newWorkflow);

			this.$root.$on('importWorkflowUrl', async (data: IDataObject) => {
				const workflowData = await this.getWorkflowDataFromUrl(data.url as string);
				if (workflowData !== undefined) {
					await this.importWorkflowData(workflowData);
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

				setTimeout(() => {
					this.checkForNewVersions();
				}, 0);
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
	$--zoom-menu-margin: 5;

	position: fixed;
	left: $--sidebar-width + $--zoom-menu-margin;
	width: 200px;
	bottom: 45px;
	line-height: 25px;
	color: #444;
	padding-right: 5px;

	@media (max-width: $--breakpoint-2xs) {
		bottom: 90px;
	}

	&.expanded {
		left: $--sidebar-expanded-width + $--zoom-menu-margin;
	}

	button {
		border: var(--border-base);
	}
}

.node-creator-button {
	position: fixed;
	text-align: center;
	top: 80px;
	right: 20px;
}

.node-creator-button button {
	position: relative;
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

	> * {
		margin-inline-end: 0.625rem;
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

.connection-run-items-label {
	span {
		border-radius: 7px;
		background-color: hsla(var(--color-canvas-background-h),var( --color-canvas-background-s), var(--color-canvas-background-l), .85);
		line-height: 1.3em;
		padding: 0px 3px;
		white-space: nowrap;
		font-size: var(--font-size-s);
		font-weight: var(--font-weight-regular);
		color: var(--color-success);
	}

	> span.floating {
		position: absolute;
		top: -22px;
		transform: translateX(-50%);
	}
}

.connection-input-name-label {
	position: relative;

	span {
		position: absolute;
		top: -10px;
		left: -60px;
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
	background-color: hsla(var(--color-canvas-background-h),var( --color-canvas-background-s), var(--color-canvas-background-l), .85);
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

.connection-actions {
	&:hover {
		display: block !important;
	}

	> div {
		color: var(--color-foreground-xdark);
		border: 2px solid var(--color-foreground-xdark);
		background-color: var(--color-background-xlight);
		border-radius: var(--border-radius-base);
		height: var(--spacing-l);
		width: var(--spacing-l);
		cursor: pointer;

		display: inline-flex;
		align-items: center;
		justify-content: center;

		position: absolute;
		top: -12px;

		&.add {
			right: 4px;
		}

		&.delete {
			left: 4px;
		}

		svg {
			pointer-events: none;
			font-size: var(--font-size-2xs);
		}

		&:hover {
			border-color: var(--color-primary);
			color: var(--color-primary);
		}
	}
}

</style>
