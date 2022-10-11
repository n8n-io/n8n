<template>
	<div class="node-view-root" @dragover="onDragOver" @drop="onDrop">
		<div class="node-view-wrapper" :class="workflowClasses" @touchstart="mouseDown" @touchend="mouseUp"
			@touchmove="mouseMoveNodeWorkflow" @mousedown="mouseDown" v-touch:tap="touchTap" @mouseup="mouseUp"
			@wheel="wheelScroll">
			<div id="node-view-background" class="node-view-background" :style="backgroundStyle" />
			<div id="node-view" class="node-view" :style="workflowStyle">
				<div v-for="nodeData in nodes" :key="nodeData.id">
					<node v-if="nodeData.type !== STICKY_NODE_TYPE" @duplicateNode="duplicateNode"
						@deselectAllNodes="deselectAllNodes" @deselectNode="nodeDeselectedByName" @nodeSelected="nodeSelectedByName"
						@removeNode="removeNode" @runWorkflow="onRunNode" @moved="onNodeMoved" @run="onNodeRun" :key="nodeData.id"
						:name="nodeData.name" :isReadOnly="isReadOnly" :instance="instance"
						:isActive="!!activeNode && activeNode.name === nodeData.name" :hideActions="pullConnActive" />
					<Sticky v-else @deselectAllNodes="deselectAllNodes" @deselectNode="nodeDeselectedByName"
						@nodeSelected="nodeSelectedByName" @removeNode="removeNode" :key="nodeData.id" :name="nodeData.name"
						:isReadOnly="isReadOnly" :instance="instance" :isActive="!!activeNode && activeNode.name === nodeData.name"
						:nodeViewScale="nodeViewScale" :gridSize="GRID_SIZE" :hideActions="pullConnActive" />
				</div>
			</div>
		</div>
		<NodeDetailsView :readOnly="isReadOnly" :renaming="renamingActive" @valueChanged="valueChanged" />
		<div :class="['node-buttons-wrapper', showStickyButton ? 'no-events' : '']" v-if="!createNodeActive && !isReadOnly"
			@mouseenter="onCreateMenuHoverIn">
			<div class="node-creator-button">
				<n8n-icon-button size="xlarge" icon="plus" @click="() => openNodeCreator('add_node_button')"
					:title="$locale.baseText('nodeView.addNode')" />
				<div :class="['add-sticky-button', showStickyButton ? 'visible-button' : '']" @click="addStickyNote">
					<n8n-icon-button size="medium" type="secondary" :icon="['far', 'note-sticky']"
						:title="$locale.baseText('nodeView.addSticky')" />
				</div>
			</div>
		</div>
		<node-creator :active="createNodeActive" @nodeTypeSelected="nodeTypeSelected"
			@closeNodeCreator="closeNodeCreator" />
		<div
			:class="{ 'zoom-menu': true, 'regular-zoom-menu': !isDemo, 'demo-zoom-menu': isDemo, expanded: !sidebarMenuCollapsed }">
			<n8n-icon-button @click="zoomToFit" type="tertiary" size="large" :title="$locale.baseText('nodeView.zoomToFit')"
				icon="expand" />
			<n8n-icon-button @click="zoomIn" type="tertiary" size="large" :title="$locale.baseText('nodeView.zoomIn')"
				icon="search-plus" />
			<n8n-icon-button @click="zoomOut" type="tertiary" size="large" :title="$locale.baseText('nodeView.zoomOut')"
				icon="search-minus" />
			<n8n-icon-button v-if="nodeViewScale !== 1 && !isDemo" @click="resetZoom" type="tertiary" size="large"
				:title="$locale.baseText('nodeView.resetZoom')" icon="undo" />
		</div>
		<div class="workflow-execute-wrapper" v-if="!isReadOnly">
			<n8n-button @click.stop="onRunWorkflow" :loading="workflowRunning" :label="runButtonText"
				:title="$locale.baseText('nodeView.executesTheWorkflowFromTheStartOrWebhookNode')" size="large"
				icon="play-circle" type="primary" />

			<n8n-icon-button v-if="workflowRunning === true && !executionWaitingForWebhook" icon="stop" size="large"
				class="stop-execution" type="secondary" :title="stopExecutionInProgress
					? $locale.baseText('nodeView.stoppingCurrentExecution')
					: $locale.baseText('nodeView.stopCurrentExecution')
				" :loading="stopExecutionInProgress" @click.stop="stopExecution()" />

			<n8n-icon-button v-if="workflowRunning === true && executionWaitingForWebhook === true" class="stop-execution"
				icon="stop" size="large" :title="$locale.baseText('nodeView.stopWaitingForWebhookCall')" type="secondary"
				@click.stop="stopWaitingForWebhook()" />

			<n8n-icon-button v-if="!isReadOnly && workflowExecution && !workflowRunning"
				:title="$locale.baseText('nodeView.deletesTheCurrentExecutionData')" icon="trash" size="large"
				@click.stop="clearExecutionData()" />
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import {
	Connection, Endpoint, N8nPlusEndpoint,
} from 'jsplumb';
import type { MessageBoxInputData } from 'element-ui/types/message-box';
import { jsPlumb, OnConnectionBindInfo } from 'jsplumb';
import {
	DEFAULT_STICKY_HEIGHT,
	DEFAULT_STICKY_WIDTH,
	FIRST_ONBOARDING_PROMPT_TIMEOUT,
	MODAL_CANCEL,
	MODAL_CLOSE,
	MODAL_CONFIRMED,
	NODE_OUTPUT_DEFAULT_KEY,
	ONBOARDING_CALL_SIGNUP_MODAL_KEY,
	ONBOARDING_PROMPT_TIMEBOX,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	QUICKSTART_NOTE_NAME,
	START_NODE_TYPE,
	STICKY_NODE_TYPE,
	VIEWS,
	WEBHOOK_NODE_TYPE,
	WORKFLOW_OPEN_MODAL_KEY,
} from '@/constants';
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

import NodeDetailsView from '@/components/NodeDetailsView.vue';
import Node from '@/components/Node.vue';
import NodeCreator from '@/components/NodeCreator/NodeCreator.vue';
import NodeSettings from '@/components/NodeSettings.vue';
import Sticky from '@/components/Sticky.vue';

import * as CanvasHelpers from './canvasHelpers';

import mixins from 'vue-typed-mixins';
import { v4 as uuid } from 'uuid';
import {
	IConnection,
	IConnections,
	IDataObject,
	INode,
	INodeConnections,
	INodeCredentialsDetails,
	INodeIssues,
	INodeTypeDescription,
	INodeTypeNameVersion,
	IPinData,
	IRun,
	ITaskData,
	ITelemetryTrackProperties,
	IWorkflowBase,
	NodeHelpers,
	TelemetryHelpers,
	Workflow,
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
	IWorkflowToShare,
} from '../Interface';
import { mapGetters } from 'vuex';

import {
	addNodeTranslation,
} from '@/plugins/i18n';

import '../plugins/N8nCustomConnectorType';
import '../plugins/PlusEndpointType';
import { getAccountAge } from '@/modules/userHelpers';
import { IUser } from 'n8n-design-system';
import { dataPinningEventBus } from "@/event-bus/data-pinning-event-bus";
import { debounceHelper } from '@/components/mixins/debounce';

interface AddNodeOptions {
	position?: XYPosition;
	dragAndDrop?: boolean;
}


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
	debounceHelper,
)
	.extend({
		name: 'NodeView',
		components: {
			NodeDetailsView,
			Node,
			NodeCreator,
			NodeSettings,
			Sticky,
		},
		errorCaptured: (err, vm, info) => {
			console.error('errorCaptured'); // eslint-disable-line no-console
			console.error(err); // eslint-disable-line no-console
		},
		watch: {
			// Listen to route changes and load the workflow accordingly
			'$route': 'initView',
			activeNode() {
				// When a node gets set as active deactivate the create-menu
				this.createNodeActive = false;
			},
			nodes: {
				async handler(value, oldValue) {
					// Load a workflow
					let workflowId = null as string | null;
					if (this.$route && this.$route.params.name) {
						workflowId = this.$route.params.name;
					}
				},
				deep: true,
			},
			connections: {
				async handler(value, oldValue) {
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
			if (result) {
				const confirmModal = await this.confirmModal(
					this.$locale.baseText('generic.unsavedWork.confirmMessage.message'),
					this.$locale.baseText('generic.unsavedWork.confirmMessage.headline'),
					'warning',
					this.$locale.baseText('generic.unsavedWork.confirmMessage.confirmButtonText'),
					this.$locale.baseText('generic.unsavedWork.confirmMessage.cancelButtonText'),
					true,
				);

				if (confirmModal === MODAL_CONFIRMED) {
					const saved = await this.saveCurrentWorkflow({}, false);
					if (saved) this.$store.dispatch('settings/fetchPromptsData');
					this.$store.commit('setStateDirty', false);
					next();
				} else if (confirmModal === MODAL_CANCEL) {
					this.$store.commit('setStateDirty', false);
					next();
				} else if (confirmModal === MODAL_CLOSE) {
					next(false);
				}

			} else {
				next();
			}
		},
		computed: {
			...mapGetters('users', [
				'currentUser',
			]),
			...mapGetters('ui', [
				'sidebarMenuCollapsed',
			]),
			...mapGetters('settings', [
				'isOnboardingCallPromptFeatureEnabled',
			]),
			defaultLocale(): string {
				return this.$store.getters.defaultLocale;
			},
			isEnglishLocale(): boolean {
				return this.defaultLocale === 'en';
			},
			...mapGetters(['nativelyNumberSuffixedDefaults']),
			activeNode(): INodeUi | null {
				return this.$store.getters.activeNode;
			},
			executionWaitingForWebhook(): boolean {
				return this.$store.getters.executionWaitingForWebhook;
			},
			isDemo(): boolean {
				return this.$route.name === VIEWS.DEMO;
			},
			lastSelectedNode(): INodeUi | null {
				return this.$store.getters.lastSelectedNode;
			},
			nodes(): INodeUi[] {
				return this.$store.getters.allNodes;
			},
			runButtonText(): string {
				if (this.workflowRunning === false) {
					return this.$locale.baseText('nodeView.runButtonText.executeWorkflow');
				}

				if (this.executionWaitingForWebhook === true) {
					return this.$locale.baseText('nodeView.runButtonText.waitingForTriggerEvent');
				}

				return this.$locale.baseText('nodeView.runButtonText.executingWorkflow');
			},
			workflowStyle(): object {
				const offsetPosition = this.$store.getters.getNodeViewOffsetPosition;
				return {
					left: offsetPosition[0] + 'px',
					top: offsetPosition[1] + 'px',
				};
			},
			backgroundStyle(): object {
				return CanvasHelpers.getBackgroundStyles(this.nodeViewScale, this.$store.getters.getNodeViewOffsetPosition);
			},
			workflowClasses() {
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
			workflowExecution(): IExecutionResponse | null {
				return this.$store.getters.getWorkflowExecution;
			},
			workflowRunning(): boolean {
				return this.$store.getters.isActionActive('workflowRunning');
			},
		},
		data() {
			return {
				GRID_SIZE: CanvasHelpers.GRID_SIZE,
				STICKY_NODE_TYPE,
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
				renamingActive: false,
				showStickyButton: false,
			};
		},
		beforeDestroy() {
			this.resetWorkspace();
			// Make sure the event listeners get removed again else we
			// could add up with them registred multiple times
			document.removeEventListener('keydown', this.keyDown);
			document.removeEventListener('keyup', this.keyUp);
		},
		methods: {
			onRunNode(nodeName: string, source: string) {
				const node = this.$store.getters.getNodeByName(nodeName);
				const telemetryPayload = {
					node_type: node ? node.type : null,
					workflow_id: this.$store.getters.workflowId,
					source: 'canvas',
				};
				this.$telemetry.track('User clicked execute node button', telemetryPayload);
				this.$externalHooks().run('nodeView.onRunNode', telemetryPayload);
				this.runWorkflow(nodeName, source);
			},
			onRunWorkflow() {
				this.getWorkflowDataToSave().then((workflowData) => {
					const telemetryPayload = {
						workflow_id: this.$store.getters.workflowId,
						node_graph_string: JSON.stringify(TelemetryHelpers.generateNodesGraph(workflowData as IWorkflowBase, this.getNodeTypes()).nodeGraph),
					};
					this.$telemetry.track('User clicked execute workflow button', telemetryPayload);
					this.$externalHooks().run('nodeView.onRunWorkflow', telemetryPayload);
				});

				this.runWorkflow();
			},
			onCreateMenuHoverIn(mouseinEvent: MouseEvent) {
				const buttonsWrapper = mouseinEvent.target as Element;

				// Once the popup menu is hovered, it's pointer events are disabled so it's not interfering with element underneath it.
				this.showStickyButton = true;
				const moveCallback = (mousemoveEvent: MouseEvent) => {
					if (buttonsWrapper) {
						const wrapperBounds = buttonsWrapper.getBoundingClientRect();
						const wrapperH = wrapperBounds.height;
						const wrapperW = wrapperBounds.width;
						const wrapperLeftNear = wrapperBounds.left;
						const wrapperLeftFar = wrapperLeftNear + wrapperW;
						const wrapperTopNear = wrapperBounds.top;
						const wrapperTopFar = wrapperTopNear + wrapperH;
						const inside = ((mousemoveEvent.pageX > wrapperLeftNear && mousemoveEvent.pageX < wrapperLeftFar) && (mousemoveEvent.pageY > wrapperTopNear && mousemoveEvent.pageY < wrapperTopFar));
						if (!inside) {
							this.showStickyButton = false;
							document.removeEventListener('mousemove', moveCallback, false);
						}
					}
				};
				document.addEventListener('mousemove', moveCallback, false);
			},
			clearExecutionData() {
				this.$store.commit('setWorkflowExecutionData', null);
				this.updateNodesExecutionIssues();
			},
			translateName(type: string, originalName: string) {
				return this.$locale.headerText({
					key: `headers.${this.$locale.shortNodeType(type)}.displayName`,
					fallback: originalName,
				});
			},
			getUniqueNodeName({
				originalName,
				additionalUsedNames = [],
				type = '',
			}: {
				originalName: string,
				additionalUsedNames?: string[],
				type?: string,
			}) {
				const allNodeNamesOnCanvas = this.$store.getters.allNodes.map((n: INodeUi) => n.name);
				originalName = this.isEnglishLocale ? originalName : this.translateName(type, originalName);

				if (
					!allNodeNamesOnCanvas.includes(originalName) &&
					!additionalUsedNames.includes(originalName)
				) {
					return originalName; // already unique
				}

				let natives: string[] = this.nativelyNumberSuffixedDefaults;
				natives = this.isEnglishLocale ? natives : natives.map(name => {
					const type = name.toLowerCase().replace('_', '');
					return this.translateName(type, name);
				});

				const found = natives.find((n) => originalName.startsWith(n));

				let ignore, baseName, nameIndex, uniqueName;
				let index = 1;

				if (found) {
					// name natively ends with number
					nameIndex = originalName.split(found).pop();
					if (nameIndex) {
						index = parseInt(nameIndex, 10);
					}
					baseName = uniqueName = found;
				} else {
					const nameMatch = originalName.match(/(.*\D+)(\d*)/);

					if (nameMatch === null) {
						// name is only a number
						index = parseInt(originalName, 10);
						baseName = '';
						uniqueName = baseName + index;
					} else {
						// name is string or string/number combination
						[ignore, baseName, nameIndex] = nameMatch;
						if (nameIndex !== '') {
							index = parseInt(nameIndex, 10);
						}
						uniqueName = baseName;
					}
				}

				while (
					allNodeNamesOnCanvas.includes(uniqueName) ||
					additionalUsedNames.includes(uniqueName)
				) {
					uniqueName = baseName + (index++);
				}

				return uniqueName;
			},
			async onSaveKeyboardShortcut() {
				const saved = await this.saveCurrentWorkflow();
				if (saved) this.$store.dispatch('settings/fetchPromptsData');
			},
			openNodeCreator(source: string) {
				this.createNodeActive = true;
				this.$externalHooks().run('nodeView.createNodeActiveChanged', { source, createNodeActive: this.createNodeActive });
				this.$telemetry.trackNodesPanel('nodeView.createNodeActiveChanged', { source, workflow_id: this.$store.getters.workflowId, createNodeActive: this.createNodeActive });
			},
			async openExecution(executionId: string) {
				this.resetWorkspace();

				let data: IExecutionResponse | undefined;
				try {
					data = await this.restApi().getExecution(executionId);
				} catch (error) {
					this.$showError(
						error,
						this.$locale.baseText('nodeView.showError.openExecution.title'),
					);
					return;
				}

				if (data === undefined) {
					throw new Error(`Execution with id "${executionId}" could not be found!`);
				}

				this.$store.commit('setWorkflowName', { newName: data.workflowData.name, setStateDirty: false });
				this.$store.commit('setWorkflowId', PLACEHOLDER_EMPTY_WORKFLOW_ID);

				this.$store.commit('setWorkflowExecutionData', data);
				this.$store.commit('setWorkflowPinData', data.workflowData.pinData);

				await this.addNodes(JSON.parse(JSON.stringify(data.workflowData.nodes)), JSON.parse(JSON.stringify(data.workflowData.connections)));
				this.$nextTick(() => {
					this.zoomToFit();
					this.$store.commit('setStateDirty', false);
				});


				this.$externalHooks().run('execution.open', { workflowId: data.workflowData.id, workflowName: data.workflowData.name, executionId });
				this.$telemetry.track('User opened read-only execution', { workflow_id: data.workflowData.id, execution_mode: data.mode, execution_finished: data.finished });

				if (data.finished !== true && data && data.data && data.data.resultData && data.data.resultData.error) {
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
						const errorMessage = this.$getExecutionError(data.data);
						const shouldTrack = resultError && 'node' in resultError && resultError.node!.type.startsWith('n8n-nodes-base');
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
						title: this.$locale.baseText('nodeView.thisExecutionHasntFinishedYet'),
						message: `<a data-action="reload">${this.$locale.baseText('nodeView.refresh')}</a> ${this.$locale.baseText('nodeView.toSeeTheLatestStatus')}.<br/> <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/" target="_blank">${this.$locale.baseText('nodeView.moreInfo')}</a>`,
						type: 'warning',
						duration: 0,
					});
				}
			},
			async importWorkflowExact(data: { workflow: IWorkflowDataUpdate }) {
				if (!data.workflow.nodes || !data.workflow.connections) {
					throw new Error('Invalid workflow object');
				}
				this.resetWorkspace();
				data.workflow.nodes = CanvasHelpers.getFixedNodesList(data.workflow.nodes);

				await this.addNodes(data.workflow.nodes, data.workflow.connections);

				if (data.workflow.pinData) {
					this.$store.commit('setWorkflowPinData', data.workflow.pinData);
				}

				this.$nextTick(() => {
					this.zoomToFit();
				});
			},
			async openWorkflowTemplate(templateId: string) {
				this.setLoadingText(this.$locale.baseText('nodeView.loadingTemplate'));
				this.resetWorkspace();

				let data: IWorkflowTemplate | undefined;
				try {
					this.$externalHooks().run('template.requested', { templateId });
					data = await this.$store.dispatch('templates/getWorkflowTemplate', templateId);

					if (!data) {
						throw new Error(
							this.$locale.baseText(
								'nodeView.workflowTemplateWithIdCouldNotBeFound',
								{ interpolate: { templateId } },
							),
						);
					}
				} catch (error) {
					this.$showError(error, this.$locale.baseText('nodeView.couldntImportWorkflow'));
					this.$router.replace({ name: VIEWS.NEW_WORKFLOW });
					return;
				}

				data.workflow.nodes = CanvasHelpers.getFixedNodesList(data.workflow.nodes);

				this.blankRedirect = true;
				this.$router.replace({ name: VIEWS.NEW_WORKFLOW, query: { templateId } });

				await this.addNodes(data.workflow.nodes, data.workflow.connections);
				await this.$store.dispatch('workflows/getNewWorkflowData', data.name);
				this.$nextTick(() => {
					this.zoomToFit();
					this.$store.commit('setStateDirty', true);
				});

				this.$externalHooks().run('template.open', { templateId, templateName: data.name, workflow: data.workflow });
			},
			async openWorkflow(workflowId: string) {
				this.resetWorkspace();

				let data: IWorkflowDb | undefined;
				try {
					data = await this.restApi().getWorkflow(workflowId);
				} catch (error) {
					this.$showError(
						error,
						this.$locale.baseText('nodeView.showError.openWorkflow.title'),
					);
					return;
				}

				if (data === undefined) {
					throw new Error(
						this.$locale.baseText(
							'nodeView.workflowWithIdCouldNotBeFound',
							{ interpolate: { workflowId } },
						),
					);
				}

				this.$store.commit('setActive', data.active || false);
				this.$store.commit('setWorkflowId', workflowId);
				this.$store.commit('setWorkflowName', { newName: data.name, setStateDirty: false });
				this.$store.commit('setWorkflowSettings', data.settings || {});
				this.$store.commit('setWorkflowPinData', data.pinData || {});

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
			touchTap(e: MouseEvent | TouchEvent) {
				if (this.isTouchDevice) {
					this.mouseDown(e);
				}
			},
			mouseDown(e: MouseEvent | TouchEvent) {
				// Save the location of the mouse click
				this.lastClickPosition = this.getMousePositionWithinNodeView(e);

				this.mouseDownMouseSelect(e as MouseEvent);
				this.mouseDownMoveWorkflow(e as MouseEvent);

				// Hide the node-creator
				this.createNodeActive = false;
			},
			mouseUp(e: MouseEvent) {
				this.mouseUpMouseSelect(e);
				this.mouseUpMoveWorkflow(e);
			},
			wheelScroll(e: WheelEvent) {
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
			keyUp(e: KeyboardEvent) {
				if (e.key === this.controlKeyCode) {
					this.ctrlKeyPressed = false;
				}
			},
			async keyDown(e: KeyboardEvent) {
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
					this.callDebounced('deactivateSelectedNode', { debounceTime: 350 });

				} else if (e.key === 'Delete' || e.key === 'Backspace') {
					e.stopPropagation();
					e.preventDefault();

					this.callDebounced('deleteSelectedNodes', { debounceTime: 500 });

				} else if (e.key === 'Tab') {
					this.createNodeActive = !this.createNodeActive && !this.isReadOnly;
					this.$externalHooks().run('nodeView.createNodeActiveChanged', { source: 'tab', createNodeActive: this.createNodeActive });
					this.$telemetry.trackNodesPanel('nodeView.createNodeActiveChanged', { source: 'tab', workflow_id: this.$store.getters.workflowId, createNodeActive: this.createNodeActive });

				} else if (e.key === this.controlKeyCode) {
					this.ctrlKeyPressed = true;
				} else if (e.key === 'F2' && !this.isReadOnly) {
					const lastSelectedNode = this.lastSelectedNode;
					if (lastSelectedNode !== null && lastSelectedNode.type !== STICKY_NODE_TYPE) {
						this.callDebounced('renameNodePrompt', { debounceTime: 1500 }, lastSelectedNode.name);
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

					this.callDebounced('selectAllNodes', { debounceTime: 1000 });
				} else if ((e.key === 'c') && (this.isCtrlKeyPressed(e) === true)) {
					this.callDebounced('copySelectedNodes', { debounceTime: 1000 });
				} else if ((e.key === 'x') && (this.isCtrlKeyPressed(e) === true)) {
					// Cut nodes
					e.stopPropagation();
					e.preventDefault();

					this.callDebounced('cutSelectedNodes', { debounceTime: 1000 });
				} else if (e.key === 'o' && this.isCtrlKeyPressed(e) === true) {
					// Open workflow dialog
					e.stopPropagation();
					e.preventDefault();
					if (this.isDemo) {
						return;
					}

					this.$store.dispatch('ui/openModal', WORKFLOW_OPEN_MODAL_KEY);
				} else if (e.key === 'n' && this.isCtrlKeyPressed(e) === true && e.altKey === true) {
					// Create a new workflow
					e.stopPropagation();
					e.preventDefault();
					if (this.isDemo) {
						return;
					}

					if (this.$router.currentRoute.name === VIEWS.NEW_WORKFLOW) {
						this.$root.$emit('newWorkflow');
					} else {
						this.$router.push({ name: VIEWS.NEW_WORKFLOW });
					}

					this.$showMessage({
						title: this.$locale.baseText('nodeView.showMessage.keyDown.title'),
						type: 'success',
					});
				} else if ((e.key === 's') && (this.isCtrlKeyPressed(e) === true)) {
					// Save workflow
					e.stopPropagation();
					e.preventDefault();

					if (this.isReadOnly) {
						return;
					}

					this.callDebounced('onSaveKeyboardShortcut', { debounceTime: 1000 });
				} else if (e.key === 'Enter') {
					// Activate the last selected node
					const lastSelectedNode = this.lastSelectedNode;

					if (lastSelectedNode !== null) {
						if (lastSelectedNode.type === STICKY_NODE_TYPE && this.isReadOnly) {
							return;
						}
						this.$store.commit('setActiveNode', lastSelectedNode.name);
					}
				} else if (e.key === 'ArrowRight' && e.shiftKey === true) {
					// Select all downstream nodes
					e.stopPropagation();
					e.preventDefault();

					this.callDebounced('selectDownstreamNodes', { debounceTime: 1000 });
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

					this.callDebounced('nodeSelectedByName', { debounceTime: 100 }, connections.main[0][0].node, false, true);
				} else if (e.key === 'ArrowLeft' && e.shiftKey === true) {
					// Select all downstream nodes
					e.stopPropagation();
					e.preventDefault();

					this.callDebounced('selectUpstreamNodes', { debounceTime: 1000 });
				} else if (e.key === 'ArrowLeft') {
					// Set parent node active
					const lastSelectedNode = this.lastSelectedNode;
					if (lastSelectedNode === null) {
						return;
					}

					const workflow = this.getCurrentWorkflow();

					if (!workflow.connectionsByDestinationNode.hasOwnProperty(lastSelectedNode.name)) {
						return;
					}

					const connections = workflow.connectionsByDestinationNode[lastSelectedNode.name];

					if (connections.main === undefined || connections.main.length === 0) {
						return;
					}

					this.callDebounced('nodeSelectedByName', { debounceTime: 100 }, connections.main[0][0].node, false, true);
				} else if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
					// Set sibling node as active

					// Check first if it has a parent node
					const lastSelectedNode = this.lastSelectedNode;
					if (lastSelectedNode === null) {
						return;
					}

					const workflow = this.getCurrentWorkflow();

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
						this.callDebounced('nodeSelectedByName', { debounceTime: 100 }, nextSelectNode, false, true);
					}
				}
			},

			deactivateSelectedNode() {
				if (this.editAllowedCheck() === false) {
					return;
				}
				this.disableNodes(this.$store.getters.getSelectedNodes);
			},

			deleteSelectedNodes() {
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

			selectAllNodes() {
				this.nodes.forEach((node) => {
					this.nodeSelectedByName(node.name);
				});
			},

			selectUpstreamNodes() {
				const lastSelectedNode = this.lastSelectedNode;
				if (lastSelectedNode === null) {
					return;
				}

				this.deselectAllNodes();

				// Get all upstream nodes and select them
				const workflow = this.getCurrentWorkflow();
				for (const nodeName of workflow.getParentNodes(lastSelectedNode.name)) {
					this.nodeSelectedByName(nodeName);
				}

				// At the end select the previously selected node again
				this.nodeSelectedByName(lastSelectedNode.name);
			},
			selectDownstreamNodes() {
				const lastSelectedNode = this.lastSelectedNode;
				if (lastSelectedNode === null) {
					return;
				}

				this.deselectAllNodes();

				// Get all downstream nodes and select them
				const workflow = this.getCurrentWorkflow();
				for (const nodeName of workflow.getChildNodes(lastSelectedNode.name)) {
					this.nodeSelectedByName(nodeName);
				}

				// At the end select the previously selected node again
				this.nodeSelectedByName(lastSelectedNode.name);
			},

			pushDownstreamNodes(sourceNodeName: string, margin: number) {
				const sourceNode = this.$store.getters.nodesByName[sourceNodeName];
				const workflow = this.getCurrentWorkflow();
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

			cutSelectedNodes() {
				const deleteCopiedNodes = !this.isReadOnly;
				this.copySelectedNodes(deleteCopiedNodes);
				if (deleteCopiedNodes) {
					this.deleteSelectedNodes();
				}
			},

			copySelectedNodes(isCut: boolean) {
				this.getSelectedNodesToSave().then((data) => {
					const workflowToCopy: IWorkflowToShare = {
						meta: {
							instanceId: this.$store.getters.instanceId,
						},
						...data,
					};

					const nodeData = JSON.stringify(workflowToCopy, null, 2);
					this.copyToClipboard(nodeData);
					if (data.nodes.length > 0) {
						if (!isCut) {
							this.$showMessage({
								title: 'Copied!',
								message: '',
								type: 'success',
							});
						}
						this.$telemetry.track('User copied nodes', {
							node_types: data.nodes.map((node) => node.type),
							workflow_id: this.$store.getters.workflowId,
						});
					}
				});
			},

			resetZoom() {
				const { scale, offset } = CanvasHelpers.scaleReset({ scale: this.nodeViewScale, offset: this.$store.getters.getNodeViewOffsetPosition });

				this.setZoomLevel(scale);
				this.$store.commit('setNodeViewOffsetPosition', { newOffset: offset });
			},

			zoomIn() {
				const { scale, offset: [xOffset, yOffset] } = CanvasHelpers.scaleBigger({ scale: this.nodeViewScale, offset: this.$store.getters.getNodeViewOffsetPosition });

				this.setZoomLevel(scale);
				this.$store.commit('setNodeViewOffsetPosition', { newOffset: [xOffset, yOffset] });
			},

			zoomOut() {
				const { scale, offset: [xOffset, yOffset] } = CanvasHelpers.scaleSmaller({ scale: this.nodeViewScale, offset: this.$store.getters.getNodeViewOffsetPosition });

				this.setZoomLevel(scale);
				this.$store.commit('setNodeViewOffsetPosition', { newOffset: [xOffset, yOffset] });
			},

			setZoomLevel(zoomLevel: number) {
				this.nodeViewScale = zoomLevel; // important for background
				const element = this.instance.getContainer() as HTMLElement;
				if (!element) {
					return;
				}

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

			zoomToFit() {
				const nodes = this.$store.getters.allNodes as INodeUi[];

				if (nodes.length === 0) { // some unknown workflow executions
					return;
				}

				const { zoomLevel, offset } = CanvasHelpers.getZoomToFit(nodes, !this.isDemo);

				this.setZoomLevel(zoomLevel);
				this.$store.commit('setNodeViewOffsetPosition', { newOffset: offset });
			},

			async stopExecution() {
				const executionId = this.$store.getters.activeExecutionId;
				if (executionId === null) {
					return;
				}

				try {
					this.stopExecutionInProgress = true;
					await this.restApi().stopCurrentExecution(executionId);
					this.$showMessage({
						title: this.$locale.baseText('nodeView.showMessage.stopExecutionTry.title'),
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
							title: this.$locale.baseText('nodeView.showMessage.stopExecutionCatch.title'),
							message: this.$locale.baseText('nodeView.showMessage.stopExecutionCatch.message'),
							type: 'success',
						});
					} else {
						this.$showError(
							error,
							this.$locale.baseText('nodeView.showError.stopExecution.title'),
						);
					}
				}
				this.stopExecutionInProgress = false;

				this.getWorkflowDataToSave().then((workflowData) => {
					const trackProps = {
						workflow_id: this.$store.getters.workflowId,
						node_graph_string: JSON.stringify(TelemetryHelpers.generateNodesGraph(workflowData as IWorkflowBase, this.getNodeTypes()).nodeGraph),
					};

					this.$telemetry.track('User clicked stop workflow execution', trackProps);
				});
			},

			async stopWaitingForWebhook() {
				try {
					await this.restApi().removeTestWebhook(this.$store.getters.workflowId);
				} catch (error) {
					this.$showError(
						error,
						this.$locale.baseText('nodeView.showError.stopWaitingForWebhook.title'),
					);
					return;
				}
			},

			/**
			 * This method gets called when data got pasted into the window
			 */
			async receivedCopyPasteData(plainTextData: string): Promise<void> {
				let workflowData: IWorkflowDataUpdate | undefined;

				// Check if it is an URL which could contain workflow data
				if (plainTextData.match(/^http[s]?:\/\/.*\.json$/i)) {
					// Pasted data points to a possible workflow JSON file

					if (this.editAllowedCheck() === false) {
						return;
					}

					const importConfirm = await this.confirmMessage(
						this.$locale.baseText(
							'nodeView.confirmMessage.receivedCopyPasteData.message',
							{ interpolate: { plainTextData } },
						),
						this.$locale.baseText('nodeView.confirmMessage.receivedCopyPasteData.headline'),
						'warning',
						this.$locale.baseText('nodeView.confirmMessage.receivedCopyPasteData.confirmButtonText'),
						this.$locale.baseText('nodeView.confirmMessage.receivedCopyPasteData.cancelButtonText'),
					);

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

				return this.importWorkflowData(workflowData!, false, 'paste');
			},

			// Returns the workflow data from a given URL. If no data gets found or
			// data is invalid it returns undefined and displays an error message by itself.
			async getWorkflowDataFromUrl(url: string): Promise<IWorkflowDataUpdate | undefined> {
				let workflowData: IWorkflowDataUpdate;

				this.startLoading();
				try {
					workflowData = await this.restApi().getWorkflowFromUrl(url);
				} catch (error) {
					this.stopLoading();
					this.$showError(
						error,
						this.$locale.baseText('nodeView.showError.getWorkflowDataFromUrl.title'),
					);
					return;
				}
				this.stopLoading();

				return workflowData;
			},

			// Imports the given workflow data into the current workflow
			async importWorkflowData(workflowData: IWorkflowToShare, importTags = true, source: string): Promise<void> { // eslint-disable-line @typescript-eslint/default-param-last
				// If it is JSON check if it looks on the first look like data we can use
				if (
					!workflowData.hasOwnProperty('nodes') ||
					!workflowData.hasOwnProperty('connections')
				) {
					return;
				}

				try {
					const nodeIdMap: { [prev: string]: string } = {};
					if (workflowData.nodes) {
						// set all new ids when pasting/importing workflows
						workflowData.nodes.forEach((node: INode) => {
							if (node.id) {
								const newId = uuid();
								nodeIdMap[newId] = node.id;
								node.id = newId;
							}
							else {
								node.id = uuid();
							}
						});
					}

					const currInstanceId = this.$store.getters.instanceId;

					const nodeGraph = JSON.stringify(
						TelemetryHelpers.generateNodesGraph(workflowData as IWorkflowBase,
							this.getNodeTypes(),
							{
								nodeIdMap,
								sourceInstanceId: workflowData.meta && workflowData.meta.instanceId !== currInstanceId ? workflowData.meta.instanceId : '',
							}).nodeGraph,
					);
					if (source === 'paste') {
						this.$telemetry.track('User pasted nodes', {
							workflow_id: this.$store.getters.workflowId,
							node_graph_string: nodeGraph,
						});
					} else {
						this.$telemetry.track('User imported workflow', { source, workflow_id: this.$store.getters.workflowId, node_graph_string: nodeGraph });
					}

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

					if (workflowData.pinData) {
						this.$store.commit('setWorkflowPinData', workflowData.pinData);
					}

					const tagsEnabled = this.$store.getters['settings/areTagsEnabled'];
					if (importTags && tagsEnabled && Array.isArray(workflowData.tags)) {
						const allTags: ITag[] = await this.$store.dispatch('tags/fetchAll');
						const tagNames = new Set(allTags.map((tag) => tag.name));

						const workflowTags = workflowData.tags as ITag[];
						const notFound = workflowTags.filter((tag) => !tagNames.has(tag.name));

						const creatingTagPromises: Array<Promise<ITag>> = [];
						for (const tag of notFound) {
							const creationPromise = this.$store.dispatch('tags/create', tag.name)
								.then((tag: ITag) => {
									allTags.push(tag);
									return tag;
								});

							creatingTagPromises.push(creationPromise);
						}

						await Promise.all(creatingTagPromises);

						const tagIds = workflowTags.reduce((accu: string[], imported: ITag) => {
							const tag = allTags.find(tag => tag.name === imported.name);
							if (tag) {
								accu.push(tag.id);
							}

							return accu;
						}, []);

						this.$store.commit('addWorkflowTagIds', tagIds);
					}

				} catch (error) {
					this.$showError(
						error,
						this.$locale.baseText('nodeView.showError.importWorkflowData.title'),
					);
				}
			},

			closeNodeCreator() {
				this.createNodeActive = false;
			},

			addStickyNote() {
				if (document.activeElement) {
					(document.activeElement as HTMLElement).blur();
				}

				const offset: [number, number] = [...(this.$store.getters.getNodeViewOffsetPosition as [number, number])];

				const position = CanvasHelpers.getMidCanvasPosition(this.nodeViewScale, offset);
				position[0] -= DEFAULT_STICKY_WIDTH / 2;
				position[1] -= DEFAULT_STICKY_HEIGHT / 2;

				this.addNodeButton(STICKY_NODE_TYPE, {
					position,
				});
			},

			nodeTypeSelected(nodeTypeName: string) {
				this.addNodeButton(nodeTypeName);
				this.createNodeActive = false;
			},

			onDragOver(event: DragEvent) {
				event.preventDefault();
			},

			onDrop(event: DragEvent) {
				if (!event.dataTransfer) {
					return;
				}

				const nodeTypeName = event.dataTransfer.getData('nodeTypeName');
				if (nodeTypeName) {
					const mousePosition = this.getMousePositionWithinNodeView(event);
					const sidebarOffset = this.sidebarMenuCollapsed ? CanvasHelpers.SIDEBAR_WIDTH : CanvasHelpers.SIDEBAR_WIDTH_EXPANDED;

					this.addNodeButton(nodeTypeName, {
						position: [
							mousePosition[0] - CanvasHelpers.NODE_SIZE / 2,
							mousePosition[1] - CanvasHelpers.NODE_SIZE / 2,
						],
						dragAndDrop: true,
					});
					this.createNodeActive = false;
				}
			},

			nodeDeselectedByName(nodeName: string) {
				const node = this.$store.getters.getNodeByName(nodeName);
				if (node) {
					this.nodeDeselected(node);
				}
			},

			nodeSelectedByName(nodeName: string, setActive = false, deselectAllOthers?: boolean) {
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
			showMaxNodeTypeError(nodeTypeData: INodeTypeDescription) {
				const maxNodes = nodeTypeData.maxNodes;
				this.$showMessage({
					title: this.$locale.baseText('nodeView.showMessage.showMaxNodeTypeError.title'),
					message: this.$locale.baseText('nodeView.showMessage.showMaxNodeTypeError.message',
						{
							adjustToNumber: maxNodes,
							interpolate: { nodeTypeDataDisplayName: nodeTypeData.displayName },
						},
					),
					type: 'error',
					duration: 0,
				});
			},
			async injectNode(nodeTypeName: string, options: AddNodeOptions = {}) {
				const nodeTypeData: INodeTypeDescription | null = this.$store.getters['nodeTypes/getNodeType'](nodeTypeName);

				if (nodeTypeData === null) {
					this.$showMessage({
						title: this.$locale.baseText('nodeView.showMessage.addNodeButton.title'),
						message: this.$locale.baseText(
							'nodeView.showMessage.addNodeButton.message',
							{ interpolate: { nodeTypeName } },
						),
						type: 'error',
					});
					return;
				}

				if (nodeTypeData.maxNodes !== undefined && this.getNodeTypeCount(nodeTypeName) >= nodeTypeData.maxNodes) {
					this.showMaxNodeTypeError(nodeTypeData);
					return;
				}

				const newNodeData: INodeUi = {
					id: uuid(),
					name: nodeTypeData.defaults.name as string,
					type: nodeTypeData.name,
					typeVersion: Array.isArray(nodeTypeData.version)
						? nodeTypeData.version.slice(-1)[0]
						: nodeTypeData.version,
					position: [0, 0],
					parameters: {},
				};

				// when pulling new connection from node or injecting into a connection
				const lastSelectedNode = this.lastSelectedNode;

				if (options.position) {
					newNodeData.position = CanvasHelpers.getNewNodePosition(this.nodes, options.position);
				} else if (lastSelectedNode) {
					const lastSelectedConnection = this.lastSelectedConnection;
					if (lastSelectedConnection) { // set when injecting into a connection
						const [diffX] = CanvasHelpers.getConnectorLengths(lastSelectedConnection);
						if (diffX <= CanvasHelpers.MAX_X_TO_PUSH_DOWNSTREAM_NODES) {
							this.pushDownstreamNodes(lastSelectedNode.name, CanvasHelpers.PUSH_NODES_OFFSET);
						}
					}

					// set when pulling connections
					if (this.newNodeInsertPosition) {
						newNodeData.position = CanvasHelpers.getNewNodePosition(this.nodes, [
							this.newNodeInsertPosition[0] + CanvasHelpers.GRID_SIZE,
							this.newNodeInsertPosition[1] - CanvasHelpers.NODE_SIZE / 2,
						]);
						this.newNodeInsertPosition = null;
					} else {
						let yOffset = 0;

						if (lastSelectedConnection) {
							const sourceNodeType = this.$store.getters['nodeTypes/getNodeType'](lastSelectedNode.type, lastSelectedNode.typeVersion) as INodeTypeDescription | null;
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
				newNodeData.name = this.getUniqueNodeName({
					originalName: newNodeData.name,
					type: newNodeData.type,
				});

				if (nodeTypeData.webhooks && nodeTypeData.webhooks.length) {
					newNodeData.webhookId = uuid();
				}

				await this.addNodes([newNodeData]);

				this.$store.commit('setStateDirty', true);

				if (nodeTypeName === STICKY_NODE_TYPE) {
					this.$telemetry.trackNodesPanel('nodeView.addSticky', { workflow_id: this.$store.getters.workflowId });
				} else {
					this.$externalHooks().run('nodeView.addNodeButton', { nodeTypeName });
					const trackProperties: ITelemetryTrackProperties = {
						node_type: nodeTypeName,
						workflow_id: this.$store.getters.workflowId,
						drag_and_drop: options.dragAndDrop,
					};

					if (lastSelectedNode) {
						trackProperties.input_node_type = lastSelectedNode.type;
					}

					this.$telemetry.trackNodesPanel('nodeView.addNodeButton', trackProperties);
				}

				// Automatically deselect all nodes and select the current one and also active
				// current node
				this.deselectAllNodes();
				setTimeout(() => {
					this.nodeSelectedByName(newNodeData.name, nodeTypeName !== STICKY_NODE_TYPE);
				});

				return newNodeData;
			},
			getConnection(sourceNodeName: string, sourceNodeOutputIndex: number, targetNodeName: string, targetNodeOuputIndex: number): IConnection | undefined {
				const nodeConnections = (this.$store.getters.outgoingConnectionsByNodeName(sourceNodeName) as INodeConnections).main;
				if (nodeConnections) {
					const connections: IConnection[] | null = nodeConnections[sourceNodeOutputIndex];

					if (connections) {
						return connections.find((connection: IConnection) => connection.node === targetNodeName && connection.index === targetNodeOuputIndex);
					}
				}

				return undefined;
			},
			connectTwoNodes(sourceNodeName: string, sourceNodeOutputIndex: number, targetNodeName: string, targetNodeOuputIndex: number) {
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
			async addNodeButton(nodeTypeName: string, options: AddNodeOptions = {}) {
				if (this.editAllowedCheck() === false) {
					return;
				}

				const lastSelectedConnection = this.lastSelectedConnection;
				const lastSelectedNode = this.lastSelectedNode;
				const lastSelectedNodeOutputIndex = this.$store.getters.lastSelectedNodeOutputIndex;

				const newNodeData = await this.injectNode(nodeTypeName, options);
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
			initNodeView() {
				this.instance.importDefaults({
					Connector: CanvasHelpers.CONNECTOR_FLOWCHART_TYPE,
					Endpoint: ['Dot', { radius: 5 }],
					DragOptions: { cursor: 'pointer', zIndex: 5000 },
					PaintStyle: CanvasHelpers.CONNECTOR_PAINT_STYLE_DEFAULT,
					HoverPaintStyle: CanvasHelpers.CONNECTOR_PAINT_STYLE_PRIMARY,
					ConnectionOverlays: CanvasHelpers.CONNECTOR_ARROW_OVERLAYS,
					Container: '#node-view',
				});

				const insertNodeAfterSelected = (info: { sourceId: string, index: number, eventSource: string, connection?: Connection }) => {
					// Get the node and set it as active that new nodes
					// which get created get automatically connected
					// to it.
					const sourceNode = this.$store.getters.getNodeById(info.sourceId) as INodeUi | null;
					if (!sourceNode) {
						return;
					}

					this.$store.commit('setLastSelectedNode', sourceNode.name);
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
							const sourceNode = this.$store.getters.getNodeById(connection.sourceId);
							const sourceNodeName = sourceNode.name;
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

						const sourceNodeName = this.$store.getters.getNodeById(sourceInfo.nodeId).name;
						const targetNodeName = this.$store.getters.getNodeById(targetInfo.nodeId).name;

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

						const sourceNodeName = this.$store.getters.getNodeById(sourceInfo.nodeId).name;
						const targetNodeName = this.$store.getters.getNodeById(targetInfo.nodeId).name;

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
								node: this.$store.getters.getNodeById(sourceInfo.nodeId).name,
								type: sourceInfo.type,
								index: sourceInfo.index,
							},
							{
								node: this.$store.getters.getNodeById(targetInfo.nodeId).name,
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
							const sourceNode = this.$store.getters.getNodeById(info.connection.sourceId);
							const sourceNodeName = sourceNode.name;
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
								const { top, left, right, bottom } = element.getBoundingClientRect();
								const [x, y] = CanvasHelpers.getMousePosition(e);
								if (top <= y && bottom >= y && (left - inputMargin) <= x && right >= x) {
									const nodeName = (element as HTMLElement).dataset['name'] as string;
									const node = this.$store.getters.getNodeByName(nodeName) as INodeUi | null;
									if (node) {
										const nodeType = this.$store.getters['nodeTypes/getNodeType'](node.type, node.typeVersion) as INodeTypeDescription | null;
										if (nodeType && nodeType.inputs && nodeType.inputs.length === 1) {
											this.pullConnActiveNodeName = node.name;
											const endpointUUID = this.getInputEndpointUUID(nodeName, 0);
											if (endpointUUID) {
												const endpoint = this.instance.getEndpoint(endpointUUID);

												CanvasHelpers.showDropConnectionState(connection, endpoint);

												return true;
											}
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

				// @ts-ignore
				this.instance.bind(('plusEndpointClick'), (endpoint: Endpoint) => {
					if (endpoint && endpoint.__meta) {
						insertNodeAfterSelected({
							sourceId: endpoint.__meta.nodeId,
							index: endpoint.__meta.index,
							eventSource: 'plus_endpoint',
						});
					}
				});
			},
			async newWorkflow(): Promise<void> {
				await this.resetWorkspace();
				const newWorkflow = await this.$store.dispatch('workflows/getNewWorkflowData');

				this.$store.commit('setStateDirty', false);

				await this.addNodes([{
					id: uuid(),
					...CanvasHelpers.DEFAULT_START_NODE,
				}]);

				this.nodeSelectedByName(CanvasHelpers.DEFAULT_START_NODE.name, false);

				this.$store.commit('setStateDirty', false);

				this.setZoomLevel(1);

				const flagAvailable = window.posthog !== undefined && window.posthog.getFeatureFlag !== undefined;

				if (flagAvailable && window.posthog.getFeatureFlag('welcome-note') === 'test') {
					setTimeout(() => {
						this.$store.commit('setNodeViewOffsetPosition', { newOffset: [0, 0] });
						// For novice users (onboardingFlowEnabled == true)
						// Inject welcome sticky note and zoom to fit
						if (newWorkflow.onboardingFlowEnabled && !this.isReadOnly) {
							this.$nextTick(async () => {
								await this.addNodes([
									{
										id: uuid(),
										...CanvasHelpers.WELCOME_STICKY_NODE,
										parameters: {
											// Use parameters from the template but add translated content
											...CanvasHelpers.WELCOME_STICKY_NODE.parameters,
											content: this.$locale.baseText('onboardingWorkflow.stickyContent'),
										},
									},
								]);
								this.zoomToFit();
								this.$telemetry.track('welcome note inserted');
							});
						}
					}, 0);
				}
			},
			async initView(): Promise<void> {
				if (this.$route.params.action === 'workflowSave') {
					// In case the workflow got saved we do not have to run init
					// as only the route changed but all the needed data is already loaded
					this.$store.commit('setStateDirty', false);
					return Promise.resolve();
				}

				if (this.blankRedirect) {
					this.blankRedirect = false;
				}
				else if (this.$route.name === VIEWS.TEMPLATE_IMPORT) {
					const templateId = this.$route.params.id;
					await this.openWorkflowTemplate(templateId);
				}
				else if (this.$route.name === VIEWS.EXECUTION) {
					// Load an execution
					const executionId = this.$route.params.id;
					await this.openExecution(executionId);
				} else {

					const result = this.$store.getters.getStateIsDirty;
					if (result) {
						const confirmModal = await this.confirmModal(
							this.$locale.baseText('generic.unsavedWork.confirmMessage.message'),
							this.$locale.baseText('generic.unsavedWork.confirmMessage.headline'),
							'warning',
							this.$locale.baseText('generic.unsavedWork.confirmMessage.confirmButtonText'),
							this.$locale.baseText('generic.unsavedWork.confirmMessage.cancelButtonText'),
							true,
						);

						if (confirmModal === MODAL_CONFIRMED) {
							const saved = await this.saveCurrentWorkflow();
							if (saved) this.$store.dispatch('settings/fetchPromptsData');
						} else if (confirmModal === MODAL_CLOSE) {
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
							this.$router.push({
								name: VIEWS.NEW_WORKFLOW,
							});
							this.$showMessage({
								title: 'Error',
								message: this.$locale.baseText('openWorkflow.workflowNotFoundError'),
								type: 'error',
							});
						} else {
							this.$titleSet(workflow.name, 'IDLE');
							// Open existing workflow
							await this.openWorkflow(workflowId);
						}
					} else {
						// Create new workflow
						await this.newWorkflow();
					}
				}

				document.addEventListener('keydown', this.keyDown);
				document.addEventListener('keyup', this.keyUp);

				window.addEventListener("beforeunload", (e) => {
					if (this.isDemo) {
						return;
					}
					else if (this.$store.getters.getStateIsDirty === true) {
						const confirmationMessage = this.$locale.baseText('nodeView.itLooksLikeYouHaveBeenEditingSomething');
						(e || window.event).returnValue = confirmationMessage; //Gecko + IE
						return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
					} else {
						this.startLoading(
							this.$locale.baseText('nodeView.redirecting'),
						);

						return;
					}
				});
			},
			getOutputEndpointUUID(nodeName: string, index: number): string | null {
				const node = this.$store.getters.getNodeByName(nodeName);
				if (!node) {
					return null;
				}

				return CanvasHelpers.getOutputEndpointUUID(node.id, index);
			},
			getInputEndpointUUID(nodeName: string, index: number) {
				const node = this.$store.getters.getNodeByName(nodeName);
				if (!node) {
					return null;
				}

				return CanvasHelpers.getInputEndpointUUID(node.id, index);
			},
			__addConnection(connection: [IConnection, IConnection], addVisualConnection = false) {
				if (addVisualConnection === true) {
					const outputUuid = this.getOutputEndpointUUID(connection[0].node, connection[0].index);
					const inputUuid = this.getInputEndpointUUID(connection[1].node, connection[1].index);
					if (!outputUuid || !inputUuid) {
						return;
					}

					const uuid: [string, string] = [
						outputUuid,
						inputUuid,
					];

					// Create connections in DOM
					// @ts-ignore
					this.instance.connect({
						uuids: uuid,
						detachable: !this.isReadOnly,
					});
				} else {
					const connectionProperties = { connection, setStateDirty: false };
					// When nodes get connected it gets saved automatically to the storage
					// so if we do not connect we have to save the connection manually
					this.$store.commit('addConnection', connectionProperties);
				}

				setTimeout(() => {
					this.addPinDataConnections(this.$store.getters.pinData);
				});
			},
			__removeConnection(connection: [IConnection, IConnection], removeVisualConnection = false) {
				if (removeVisualConnection === true) {
					const sourceId = this.$store.getters.getNodeByName(connection[0].node);
					const targetId = this.$store.getters.getNodeByName(connection[1].node);
					// @ts-ignore
					const connections = this.instance.getConnections({
						source: sourceId,
						target: targetId,
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

				const sourceEndpoint = connection.endpoints && connection.endpoints[0];
				this.pullConnActiveNodeName = null; // prevent new connections when connectionDetached is triggered
				this.instance.deleteConnection(connection); // on delete, triggers connectionDetached event which applies mutation to store
				if (sourceEndpoint) {
					const endpoints = this.instance.getEndpoints(sourceEndpoint.elementId);
					endpoints.forEach((endpoint: Endpoint) => endpoint.repaint()); // repaint both circle and plus endpoint
				}
			},
			__removeConnectionByConnectionInfo(info: OnConnectionBindInfo, removeVisualConnection = false) {
				// @ts-ignore
				const sourceInfo = info.sourceEndpoint.getParameters();
				const sourceNode = this.$store.getters.getNodeById(sourceInfo.nodeId);
				// @ts-ignore
				const targetInfo = info.targetEndpoint.getParameters();
				const targetNode = this.$store.getters.getNodeById(targetInfo.nodeId);

				if (sourceNode && targetNode) {
					const connectionInfo = [
						{
							node: sourceNode.name,
							type: sourceInfo.type,
							index: sourceInfo.index,
						},
						{
							node: targetNode.name,
							type: targetInfo.type,
							index: targetInfo.index,
						},
					] as [IConnection, IConnection];

					if (removeVisualConnection) {
						this.__deleteJSPlumbConnection(info.connection);
					}

					this.$store.commit('removeConnection', { connection: connectionInfo });
				}
			},
			async duplicateNode(nodeName: string) {
				if (this.editAllowedCheck() === false) {
					return;
				}

				const node = this.$store.getters.getNodeByName(nodeName);

				const nodeTypeData: INodeTypeDescription | null = this.$store.getters['nodeTypes/getNodeType'](node.type, node.typeVersion);
				if (nodeTypeData && nodeTypeData.maxNodes !== undefined && this.getNodeTypeCount(node.type) >= nodeTypeData.maxNodes) {
					this.showMaxNodeTypeError(nodeTypeData);
					return;
				}

				// Deep copy the data so that data on lower levels of the node-properties do
				// not share objects
				const newNodeData = JSON.parse(JSON.stringify(this.getNodeDataToSave(node)));
				newNodeData.id = uuid();

				// Check if node-name is unique else find one that is
				newNodeData.name = this.getUniqueNodeName({
					originalName: newNodeData.name,
					type: newNodeData.type,
				});

				newNodeData.position = CanvasHelpers.getNewNodePosition(
					this.nodes,
					[node.position[0], node.position[1] + 140],
					[0, 140],
				);

				if (newNodeData.webhookId) {
					// Make sure that the node gets a new unique webhook-ID
					newNodeData.webhookId = uuid();
				}

				await this.addNodes([newNodeData]);

				const pinData = this.$store.getters['pinDataByNodeName'](nodeName);
				if (pinData) {
					this.$store.commit('pinData', {
						node: newNodeData,
						data: pinData,
					});
				}

				this.$store.commit('setStateDirty', true);

				// Automatically deselect all nodes and select the current one and also active
				// current node
				this.deselectAllNodes();
				setTimeout(() => {
					this.nodeSelectedByName(newNodeData.name, false);
				});

				this.$telemetry.track('User duplicated node', { node_type: node.type, workflow_id: this.$store.getters.workflowId });
			},
			getJSPlumbConnection(sourceNodeName: string, sourceOutputIndex: number, targetNodeName: string, targetInputIndex: number): Connection | undefined {
				const sourceNode = this.$store.getters.getNodeByName(sourceNodeName) as INodeUi;
				const targetNode = this.$store.getters.getNodeByName(targetNodeName) as INodeUi;
				if (!sourceNode || !targetNode) {
					return;
				}

				const sourceId = sourceNode.id;
				const targetId = targetNode.id;

				const sourceEndpoint = CanvasHelpers.getOutputEndpointUUID(sourceId, sourceOutputIndex);
				const targetEndpoint = CanvasHelpers.getInputEndpointUUID(targetId, targetInputIndex);

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
			getJSPlumbEndpoints(nodeName: string): Endpoint[] {
				const node = this.$store.getters.getNodeByName(nodeName);
				return this.instance.getEndpoints(node.id);
			},
			getPlusEndpoint(nodeName: string, outputIndex: number): Endpoint | undefined {
				const endpoints = this.getJSPlumbEndpoints(nodeName);
				// @ts-ignore
				return endpoints.find((endpoint: Endpoint) => endpoint.type === 'N8nPlus' && endpoint.__meta && endpoint.__meta.index === outputIndex);
			},
			getIncomingOutgoingConnections(nodeName: string): { incoming: Connection[], outgoing: Connection[] } {
				const node = this.$store.getters.getNodeByName(nodeName);
				// @ts-ignore
				const outgoing = this.instance.getConnections({
					source: node.id,
				}) as Connection[];

				// @ts-ignore
				const incoming = this.instance.getConnections({
					target: node.id,
				}) as Connection[];

				return {
					incoming,
					outgoing,
				};
			},
			onNodeMoved(node: INodeUi) {
				const { incoming, outgoing } = this.getIncomingOutgoingConnections(node.name);

				[...incoming, ...outgoing].forEach((connection: Connection) => {
					CanvasHelpers.showOrHideMidpointArrow(connection);
					CanvasHelpers.showOrHideItemsLabel(connection);
				});
			},
			onNodeRun({ name, data, waiting }: { name: string, data: ITaskData[] | null, waiting: boolean }) {
				const sourceNodeName = name;
				const sourceNode = this.$store.getters.getNodeByName(sourceNodeName);
				const sourceId = sourceNode.id;

				if (data === null || data.length === 0 || waiting) {
					// @ts-ignore
					const outgoing = this.instance.getConnections({
						source: sourceId,
					}) as Connection[];

					outgoing.forEach((connection: Connection) => {
						CanvasHelpers.resetConnection(connection);
					});
					const endpoints = this.getJSPlumbEndpoints(sourceNodeName);
					endpoints.forEach((endpoint: Endpoint) => {
						// @ts-ignore
						if (endpoint.type === 'N8nPlus') {
							(endpoint.endpoint as N8nPlusEndpoint).clearSuccessOutput();
						}
					});

					return;
				}

				const nodeConnections = (this.$store.getters.outgoingConnectionsByNodeName(sourceNodeName) as INodeConnections).main;
				const outputMap = CanvasHelpers.getOutputSummary(data, nodeConnections || []);

				Object.keys(outputMap).forEach((sourceOutputIndex: string) => {
					Object.keys(outputMap[sourceOutputIndex]).forEach((targetNodeName: string) => {
						Object.keys(outputMap[sourceOutputIndex][targetNodeName]).forEach((targetInputIndex: string) => {
							if (targetNodeName) {
								const connection = this.getJSPlumbConnection(sourceNodeName, parseInt(sourceOutputIndex, 10), targetNodeName, parseInt(targetInputIndex, 10));

								if (connection) {
									const output = outputMap[sourceOutputIndex][targetNodeName][targetInputIndex];

									if (!output || !output.total) {
										CanvasHelpers.resetConnection(connection);
									}
									else {
										CanvasHelpers.addConnectionOutputSuccess(connection, output);
									}
								}
							}

							const endpoint = this.getPlusEndpoint(sourceNodeName, parseInt(sourceOutputIndex, 10));
							if (endpoint && endpoint.endpoint) {
								const output = outputMap[sourceOutputIndex][NODE_OUTPUT_DEFAULT_KEY][0];
								if (output && output.total > 0) {
									(endpoint.endpoint as N8nPlusEndpoint).setSuccessOutput(CanvasHelpers.getRunItemsLabel(output));
								}
								else {
									(endpoint.endpoint as N8nPlusEndpoint).clearSuccessOutput();
								}
							}
						});
					});
				});
			},
			removeNode(nodeName: string) {
				if (this.editAllowedCheck() === false) {
					return;
				}

				const node = this.$store.getters.getNodeByName(nodeName) as INodeUi | null;
				if (!node) {
					return;
				}

				// "requiredNodeTypes" are also defined in cli/commands/run.ts
				const requiredNodeTypes = [START_NODE_TYPE];

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

				if (node.type === STICKY_NODE_TYPE) {
					this.$telemetry.track(
						'User deleted workflow note',
						{
							workflow_id: this.$store.getters.workflowId,
							is_welcome_note: node.name === QUICKSTART_NOTE_NAME,
						},
					);
				} else {
					this.$externalHooks().run('node.deleteNode', { node });
					this.$telemetry.track('User deleted node', { node_type: node.type, workflow_id: this.$store.getters.workflowId });
				}

				let waitForNewConnection = false;
				// connect nodes before/after deleted node
				const nodeType: INodeTypeDescription | null = this.$store.getters['nodeTypes/getNodeType'](node.type, node.typeVersion);
				if (nodeType && nodeType.outputs.length === 1
					&& nodeType.inputs.length === 1) {
					const { incoming, outgoing } = this.getIncomingOutgoingConnections(node.name);
					if (incoming.length === 1 && outgoing.length === 1) {
						const conn1 = incoming[0];
						const conn2 = outgoing[0];
						if (conn1.__meta && conn2.__meta) {
							waitForNewConnection = true;
							const sourceNodeName = conn1.__meta.sourceNodeName;
							const sourceNodeOutputIndex = conn1.__meta.sourceOutputIndex;
							const targetNodeName = conn2.__meta.targetNodeName;
							const targetNodeOuputIndex = conn2.__meta.targetOutputIndex;

							setTimeout(() => {
								this.connectTwoNodes(sourceNodeName, sourceNodeOutputIndex, targetNodeName, targetNodeOuputIndex);

								if (waitForNewConnection) {
									this.instance.setSuspendDrawing(false, true);
									waitForNewConnection = false;
								}
							}, 100); // just to make it clear to users that this is a new connection
						}
					}
				}

				setTimeout(() => {
					// Suspend drawing
					this.instance.setSuspendDrawing(true);

					// Remove all endpoints and the connections in jsplumb
					this.instance.removeAllEndpoints(node.id);

					// Remove the draggable
					// @ts-ignore
					this.instance.destroyDraggable(node.id);

					// Remove the connections in data
					this.$store.commit('removeAllNodeConnection', node);

					this.$store.commit('removeNode', node);
					this.$store.commit('clearNodeExecutionData', node.name);

					if (!waitForNewConnection) {
						// Now it can draw again
						this.instance.setSuspendDrawing(false, true);
					}

					// Remove node from selected index if found in it
					this.$store.commit('removeNodeFromSelection', node);

				}, 0); // allow other events to finish like drag stop
			},
			valueChanged(parameterData: IUpdateInformation) {
				if (parameterData.name === 'name' && parameterData.oldValue) {
					// The name changed so we have to take care that
					// the connections get changed.
					this.renameNode(parameterData.oldValue as string, parameterData.value as string);
				}
			},
			async renameNodePrompt(currentName: string) {
				try {
					const promptResponsePromise = this.$prompt(
						this.$locale.baseText('nodeView.prompt.newName') + ':',
						this.$locale.baseText('nodeView.prompt.renameNode') + `: ${currentName}`,
						{
							customClass: 'rename-prompt',
							confirmButtonText: this.$locale.baseText('nodeView.prompt.rename'),
							cancelButtonText: this.$locale.baseText('nodeView.prompt.cancel'),
							inputErrorMessage: this.$locale.baseText('nodeView.prompt.invalidName'),
							inputValue: currentName,
						},
					);

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
				} catch (e) { }
			},
			async renameNode(currentName: string, newName: string) {
				if (currentName === newName) {
					return;
				}

				const activeNodeName = this.activeNode && this.activeNode.name;
				const isActive = activeNodeName === currentName;
				if (isActive) {
					this.renamingActive = true;
				}

				// Check if node-name is unique else find one that is
				newName = this.getUniqueNodeName({
					originalName: newName,
				});

				// Rename the node and update the connections
				const workflow = this.getCurrentWorkflow(true);
				workflow.renameNode(currentName, newName);

				// Update also last selected node and execution data
				this.$store.commit('renameNodeSelectedAndExecution', { old: currentName, new: newName });

				// Reset all nodes and connections to load the new ones
				this.deleteEveryEndpoint();

				this.$store.commit('removeAllConnections');
				this.$store.commit('removeAllNodes', { setStateDirty: true });

				// Wait a tick that the old nodes had time to get removed
				await Vue.nextTick();

				// Add the new updated nodes
				await this.addNodes(Object.values(workflow.nodes), workflow.connectionsBySourceNode);

				// Make sure that the node is selected again
				this.deselectAllNodes();
				this.nodeSelectedByName(newName);

				if (isActive) {
					this.$store.commit('setActiveNode', newName);
					this.renamingActive = false;
				}
			},
			deleteEveryEndpoint() {
				// Check as it does not exist on first load
				if (this.instance) {
					try {
						const nodes = this.$store.getters.allNodes as INodeUi[];
						// @ts-ignore
						nodes.forEach((node: INodeUi) => this.instance.destroyDraggable(node.id));

						this.instance.deleteEveryEndpoint();
					} catch (e) { }
				}
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
			async addNodes(nodes: INodeUi[], connections?: IConnections) {
				if (!nodes || !nodes.length) {
					return;
				}

				// Before proceeding we must check if all nodes contain the `properties` attribute.
				// Nodes are loaded without this information so we must make sure that all nodes
				// being added have this information.
				await this.loadNodesProperties(nodes.map(node => ({ name: node.type, version: node.typeVersion })));

				// Add the node to the node-list
				let nodeType: INodeTypeDescription | null;
				let foundNodeIssues: INodeIssues | null;
				nodes.forEach((node) => {
					if (!node.id) {
						node.id = uuid();
					}

					nodeType = this.$store.getters['nodeTypes/getNodeType'](node.type, node.typeVersion) as INodeTypeDescription | null;

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
							nodeParameters = NodeHelpers.getNodeParameters(nodeType.properties, node.parameters, true, false, node);
						} catch (e) {
							console.error(this.$locale.baseText('nodeView.thereWasAProblemLoadingTheNodeParametersOfNode') + `: "${node.name}"`); // eslint-disable-line no-console
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
								const outwardConnections = connections[sourceNode][type][sourceIndex];
								if (!outwardConnections) {
									continue;
								}
								outwardConnections.forEach((
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
			async addNodesToWorkflow(data: IWorkflowDataUpdate): Promise<IWorkflowDataUpdate> {
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
					throw new Error(
						this.$locale.baseText('nodeView.noNodesGivenToAdd'),
					);
				}

				// Get how many of the nodes of the types which have
				// a max limit set already exist
				const nodeTypesCount = this.getNodeTypesMaxCount();

				let oldName: string;
				let newName: string;
				const createNodes: INode[] = [];

				await this.loadNodesProperties(data.nodes.map(node => ({ name: node.type, version: node.typeVersion })));

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
					newName = this.getUniqueNodeName({
						originalName: node.name,
						additionalUsedNames: newNodeNames,
						type: node.type,
					});

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
			getSelectedNodesToSave(): Promise<IWorkflowData> {
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
			resetWorkspace() {
				// Reset nodes
				this.deleteEveryEndpoint();

				if (this.executionWaitingForWebhook === true) {
					// Make sure that if there is a waiting test-webhook that
					// it gets removed
					this.restApi().removeTestWebhook(this.$store.getters.workflowId)
						.catch(() => {
							// Ignore all errors
						});
				}

				this.$store.commit('removeAllConnections', { setStateDirty: false });
				this.$store.commit('removeAllNodes', { setStateDirty: false, removePinData: true });

				// Reset workflow execution data
				this.$store.commit('setWorkflowExecutionData', null);
				this.$store.commit('resetAllNodesIssues');
				// vm.$forceUpdate();

				this.$store.commit('setActive', false);
				this.$store.commit('setWorkflowId', PLACEHOLDER_EMPTY_WORKFLOW_ID);
				this.$store.commit('setWorkflowName', { newName: '', setStateDirty: false });
				this.$store.commit('setWorkflowSettings', {});
				this.$store.commit('setWorkflowTagIds', []);

				this.$store.commit('setActiveExecutionId', null);
				this.$store.commit('setExecutingNode', null);
				this.$store.commit('removeActiveAction', 'workflowRunning');
				this.$store.commit('setExecutionWaitingForWebhook', false);

				this.$store.commit('resetSelectedNodes');

				this.$store.commit('setNodeViewOffsetPosition', { newOffset: [0, 0], setStateDirty: false });

				return Promise.resolve();
			},
			async loadActiveWorkflows(): Promise<void> {
				const activeWorkflows = await this.restApi().getActiveWorkflows();
				this.$store.commit('setActiveWorkflows', activeWorkflows);
			},
			async loadNodeTypes(): Promise<void> {
				this.$store.dispatch('nodeTypes/getNodeTypes');
			},
			async loadCredentialTypes(): Promise<void> {
				await this.$store.dispatch('credentials/fetchCredentialTypes', true);
			},
			async loadCredentials(): Promise<void> {
				await this.$store.dispatch('credentials/fetchAllCredentials');
			},
			async loadNodesProperties(nodeInfos: INodeTypeNameVersion[]): Promise<void> {
				const allNodes: INodeTypeDescription[] = this.$store.getters['nodeTypes/allNodeTypes'];

				const nodesToBeFetched: INodeTypeNameVersion[] = [];
				allNodes.forEach(node => {
					const nodeVersions = Array.isArray(node.version) ? node.version : [node.version];
					if (!!nodeInfos.find(n => n.name === node.name && nodeVersions.includes(n.version)) && !node.hasOwnProperty('properties')) {
						nodesToBeFetched.push({
							name: node.name,
							version: Array.isArray(node.version)
								? node.version.slice(-1)[0]
								: node.version,
						});
					}
				});

				if (nodesToBeFetched.length > 0) {
					// Only call API if node information is actually missing
					this.startLoading();
					await this.$store.dispatch('nodeTypes/getNodesInformation', nodesToBeFetched);
					this.stopLoading();
				}
			},
			async onPostMessageReceived(message: MessageEvent) {
				try {
					const json = JSON.parse(message.data);
					if (json && json.command === 'openWorkflow') {
						try {
							await this.importWorkflowExact(json);
						} catch (e) {
							if (window.top) {
								window.top.postMessage(JSON.stringify({ command: 'error', message: this.$locale.baseText('openWorkflow.workflowImportError') }), '*');
							}
							this.$showMessage({
								title: this.$locale.baseText('openWorkflow.workflowImportError'),
								message: (e as Error).message,
								type: 'error',
							});
						}
					}
				} catch (e) {
				}
			},
			async onImportWorkflowDataEvent(data: IDataObject) {
				await this.importWorkflowData(data.data as IWorkflowDataUpdate, undefined, 'file');
			},
			async onImportWorkflowUrlEvent(data: IDataObject) {
				const workflowData = await this.getWorkflowDataFromUrl(data.url as string);
				if (workflowData !== undefined) {
					await this.importWorkflowData(workflowData, undefined, 'url');
				}
			},
			addPinDataConnections(pinData: IPinData) {
				Object.keys(pinData).forEach((nodeName) => {
					const node = this.$store.getters.getNodeByName(nodeName);
					if (!node) {
						return;
					}

					// @ts-ignore
					const connections = this.instance.getConnections({
						source: node.id,
					}) as Connection[];

					connections.forEach((connection) => {
						CanvasHelpers.addConnectionOutputSuccess(connection, {
							total: pinData[nodeName].length,
							iterations: 0,
						});
					});
				});
			},
			removePinDataConnections(pinData: IPinData) {
				Object.keys(pinData).forEach((nodeName) => {
					const node = this.$store.getters.getNodeByName(nodeName);
					if (!node) {
						return;
					}

					// @ts-ignore
					const connections = this.instance.getConnections({
						source: node.id,
					}) as Connection[];

					connections.forEach(CanvasHelpers.resetConnection);
				});
			},
		},

		async mounted() {
			this.$titleReset();
			window.addEventListener('message', this.onPostMessageReceived);
			this.$root.$on('importWorkflowData', this.onImportWorkflowDataEvent);
			this.$root.$on('newWorkflow', this.newWorkflow);
			this.$root.$on('importWorkflowUrl', this.onImportWorkflowUrlEvent);

			this.startLoading();

			const loadPromises = [
				this.loadActiveWorkflows(),
				this.loadCredentials(),
				this.loadCredentialTypes(),
			];

			if (this.$store.getters['nodeTypes/allNodeTypes'].length === 0) {
				loadPromises.push(this.loadNodeTypes());
			}

			try {
				await Promise.all(loadPromises);
			} catch (error) {
				this.$showError(
					error,
					this.$locale.baseText('nodeView.showError.mounted1.title'),
					this.$locale.baseText('nodeView.showError.mounted1.message') + ':',
				);
				return;
			}

			this.instance.ready(async () => {
				try {
					this.initNodeView();
					await this.initView();
					if (window.top) {
						window.top.postMessage(JSON.stringify({ command: 'n8nReady', version: this.$store.getters.versionCli }), '*');
					}
				} catch (error) {
					this.$showError(
						error,
						this.$locale.baseText('nodeView.showError.mounted2.title'),
						this.$locale.baseText('nodeView.showError.mounted2.message') + ':',
					);
				}
				this.stopLoading();

				setTimeout(() => {
					this.$store.dispatch('users/showPersonalizationSurvey');
					this.checkForNewVersions();
					this.addPinDataConnections(this.$store.getters.pinData);
				}, 0);
			});

			this.$externalHooks().run('nodeView.mount');

			if (
				this.currentUser.personalizationAnswers !== null &&
				this.isOnboardingCallPromptFeatureEnabled &&
				getAccountAge(this.currentUser) <= ONBOARDING_PROMPT_TIMEBOX
			) {
				const onboardingResponse = await this.$store.dispatch('ui/getNextOnboardingPrompt');
				const promptTimeout = onboardingResponse.toast_sequence_number === 1 ? FIRST_ONBOARDING_PROMPT_TIMEOUT : 1000;

				if (onboardingResponse.title && onboardingResponse.description) {
					setTimeout(async () => {
						this.$showToast({
							type: 'info',
							title: onboardingResponse.title,
							message: onboardingResponse.description,
							duration: 0,
							customClass: 'clickable',
							closeOnClick: true,
							onClick: () => {
								this.$telemetry.track('user clicked onboarding toast', {
									seq_num: onboardingResponse.toast_sequence_number,
									title: onboardingResponse.title,
									description: onboardingResponse.description,
								});
								this.$store.commit('ui/openModal', ONBOARDING_CALL_SIGNUP_MODAL_KEY, { root: true });
							},
						});
					}, promptTimeout);
				}
			}
			dataPinningEventBus.$on('pin-data', this.addPinDataConnections);
			dataPinningEventBus.$on('unpin-data', this.removePinDataConnections);
		},

		destroyed() {
			this.resetWorkspace();
			this.$store.commit('setStateDirty', false);
			window.removeEventListener('message', this.onPostMessageReceived);
			this.$root.$off('newWorkflow', this.newWorkflow);
			this.$root.$off('importWorkflowData', this.onImportWorkflowDataEvent);
			this.$root.$off('importWorkflowUrl', this.onImportWorkflowUrlEvent);

			dataPinningEventBus.$off('pin-data', this.addPinDataConnections);
			dataPinningEventBus.$off('unpin-data', this.removePinDataConnections);
		},
	});
</script>

<style scoped lang="scss">
.zoom-menu {
	$--zoom-menu-margin: 15;

	position: fixed;
	left: $sidebar-width + $--zoom-menu-margin;
	width: 210px;
	bottom: 44px;
	line-height: 25px;
	color: #444;
	padding-right: 5px;

	&.expanded {
		left: $sidebar-expanded-width + $--zoom-menu-margin;
	}

	button {
		border: var(--border-base);
	}

	>* {
		+* {
			margin-left: var(--spacing-3xs);
		}

		&:hover {
			transform: scale(1.1);
		}
	}
}

.regular-zoom-menu {
	@media (max-width: $breakpoint-2xs) {
		bottom: 90px;
	}
}

.demo-zoom-menu {
	left: 10px;
	bottom: 10px;
}

.no-events {
	pointer-events: none;
}

.node-buttons-wrapper {
	position: fixed;
	width: 150px;
	height: 200px;
	top: 0;
	right: 0;
	display: flex;

	.add-sticky-button {
		margin-top: var(--spacing-2xs);
		opacity: 0;
		transition: .1s;
		transition-timing-function: linear;
	}

	.visible-button {
		opacity: 1;
		pointer-events: all;
	}
}

.node-creator-button {
	position: fixed;
	text-align: center;
	top: 80px;
	right: 20px;
	pointer-events: all !important;
}

.node-creator-button button {
	position: relative;
}

.node-view-root {
	overflow: hidden;
	background-color: var(--color-canvas-background);
	width: 100%;
	height: 100%;
}

.node-view-wrapper {
	position: fixed;
}

.node-view {
	position: relative;
	width: 100%;
	height: 100%;
	transform-origin: 0 0;
	z-index: -1;
}

.node-view-background {
	background-color: var(--color-canvas-background);
	position: absolute;
	width: 10000px;
	height: 10000px;
	z-index: -2;
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

	>* {
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
		background-color: hsla(var(--color-canvas-background-h), var(--color-canvas-background-s), var(--color-canvas-background-l), .85);
		line-height: 1.3em;
		padding: 0px 3px;
		white-space: nowrap;
		font-size: var(--font-size-s);
		font-weight: var(--font-weight-regular);
		color: var(--color-success);
	}

	.floating {
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
	color: var(--color-text-dark);
	font-weight: 600;
	font-size: 0.8em;
	text-align: center;
	background-color: #ffffff55;
}

.node-input-endpoint-label,
.node-output-endpoint-label {
	background-color: hsla(var(--color-canvas-background-h), var(--color-canvas-background-s), var(--color-canvas-background-l), .85);
	border-radius: 7px;
	font-size: 0.7em;
	padding: 2px;
	white-space: nowrap;
}

.node-input-endpoint-label {
	text-align: right;
}

.connection-actions {
	&:hover {
		display: block !important;
	}

	>div {
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
