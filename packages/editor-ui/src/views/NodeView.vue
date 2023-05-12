<template>
	<div :class="$style['content']">
		<div
			class="node-view-root do-not-select"
			id="node-view-root"
			data-test-id="node-view-root"
			@dragover="onDragOver"
			@drop="onDrop"
		>
			<div
				class="node-view-wrapper"
				:class="workflowClasses"
				@touchstart="mouseDown"
				@touchend="mouseUp"
				@touchmove="mouseMoveNodeWorkflow"
				@mousedown="mouseDown"
				v-touch:tap="touchTap"
				@mouseup="mouseUp"
				@wheel="canvasStore.wheelScroll"
			>
				<div
					id="node-view-background"
					class="node-view-background"
					:style="backgroundStyle"
					data-test-id="node-view-background"
				/>
				<div
					id="node-view"
					class="node-view"
					:style="workflowStyle"
					ref="nodeView"
					data-test-id="node-view"
				>
					<canvas-add-button
						:style="canvasAddButtonStyle"
						@click="showTriggerCreator(NODE_CREATOR_OPEN_SOURCES.TRIGGER_PLACEHOLDER_BUTTON)"
						v-show="showCanvasAddButton"
						:showTooltip="!containsTrigger && showTriggerMissingTooltip"
						:position="canvasStore.canvasAddButtonPosition"
						ref="canvasAddButton"
						@hook:mounted="canvasStore.setRecenteredCanvasAddButtonPosition"
						data-test-id="canvas-add-button"
					/>
					<template v-for="nodeData in nodes">
						<node
							v-if="nodeData.type !== STICKY_NODE_TYPE"
							@duplicateNode="duplicateNode"
							@deselectAllNodes="deselectAllNodes"
							@deselectNode="nodeDeselectedByName"
							@nodeSelected="nodeSelectedByName"
							@removeNode="(name) => removeNode(name, true)"
							@runWorkflow="onRunNode"
							@moved="onNodeMoved"
							@run="onNodeRun"
							:key="`${nodeData.id}_node`"
							:name="nodeData.name"
							:isReadOnly="isReadOnly"
							:instance="instance"
							:isActive="!!activeNode && activeNode.name === nodeData.name"
							:hideActions="pullConnActive"
							:isProductionExecutionPreview="isProductionExecutionPreview"
						>
							<template #custom-tooltip>
								<span
									v-text="
										$locale.baseText('nodeView.placeholderNode.addTriggerNodeBeforeExecuting')
									"
								/>
							</template>
						</node>
						<sticky
							v-else
							@deselectAllNodes="deselectAllNodes"
							@deselectNode="nodeDeselectedByName"
							@nodeSelected="nodeSelectedByName"
							@removeNode="(name) => removeNode(name, true)"
							:key="`${nodeData.id}_sticky`"
							:name="nodeData.name"
							:isReadOnly="isReadOnly"
							:instance="instance"
							:isActive="!!activeNode && activeNode.name === nodeData.name"
							:nodeViewScale="nodeViewScale"
							:gridSize="GRID_SIZE"
							:hideActions="pullConnActive"
						/>
					</template>
				</div>
			</div>
			<node-details-view
				:readOnly="isReadOnly"
				:renaming="renamingActive"
				:isProductionExecutionPreview="isProductionExecutionPreview"
				@valueChanged="valueChanged"
				@stopExecution="stopExecution"
				@saveKeyboardShortcut="onSaveKeyboardShortcut"
			/>
			<node-creation
				v-if="!isReadOnly"
				:create-node-active="createNodeActive"
				:node-view-scale="nodeViewScale"
				@toggleNodeCreator="onToggleNodeCreator"
				@addNode="onAddNode"
			/>
			<canvas-controls />
			<div class="workflow-execute-wrapper" v-if="!isReadOnly">
				<span
					@mouseenter="showTriggerMissingToltip(true)"
					@mouseleave="showTriggerMissingToltip(false)"
					@click="onRunContainerClick"
				>
					<n8n-button
						@click.stop="onRunWorkflow"
						:loading="workflowRunning"
						:label="runButtonText"
						:title="$locale.baseText('nodeView.executesTheWorkflowFromATriggerNode')"
						size="large"
						icon="play-circle"
						type="primary"
						:disabled="isExecutionDisabled"
						data-test-id="execute-workflow-button"
					/>
				</span>

				<n8n-icon-button
					v-if="workflowRunning === true && !executionWaitingForWebhook"
					icon="stop"
					size="large"
					class="stop-execution"
					type="secondary"
					:title="
						stopExecutionInProgress
							? $locale.baseText('nodeView.stoppingCurrentExecution')
							: $locale.baseText('nodeView.stopCurrentExecution')
					"
					:loading="stopExecutionInProgress"
					@click.stop="stopExecution"
					data-test-id="stop-execution-button"
				/>

				<n8n-icon-button
					v-if="workflowRunning === true && executionWaitingForWebhook === true"
					class="stop-execution"
					icon="stop"
					size="large"
					:title="$locale.baseText('nodeView.stopWaitingForWebhookCall')"
					type="secondary"
					@click.stop="stopWaitingForWebhook"
					data-test-id="stop-execution-waiting-for-webhook-button"
				/>

				<n8n-icon-button
					v-if="!isReadOnly && workflowExecution && !workflowRunning && !allTriggersDisabled"
					:title="$locale.baseText('nodeView.deletesTheCurrentExecutionData')"
					icon="trash"
					size="large"
					@click.stop="clearExecutionData"
					data-test-id="clear-execution-data-button"
				/>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapStores } from 'pinia';

import type {
	Endpoint,
	Connection,
	ConnectionEstablishedParams,
	BeforeDropParams,
	ConnectionDetachedParams,
	ConnectionMovedParams,
} from '@jsplumb/core';
import {
	EVENT_CONNECTION,
	EVENT_CONNECTION_DETACHED,
	EVENT_CONNECTION_MOVED,
	INTERCEPT_BEFORE_DROP,
} from '@jsplumb/core';
import type { MessageBoxInputData } from 'element-ui/types/message-box';

import {
	FIRST_ONBOARDING_PROMPT_TIMEOUT,
	MAIN_HEADER_TABS,
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
	TRIGGER_NODE_CREATOR_VIEW,
	EnterpriseEditionFeature,
	REGULAR_NODE_CREATOR_VIEW,
	MANUAL_TRIGGER_NODE_TYPE,
	NODE_CREATOR_OPEN_SOURCES,
} from '@/constants';
import { copyPaste } from '@/mixins/copyPaste';
import { externalHooks } from '@/mixins/externalHooks';
import { genericHelpers } from '@/mixins/genericHelpers';
import { moveNodeWorkflow } from '@/mixins/moveNodeWorkflow';
import useGlobalLinkActions from '@/composables/useGlobalLinkActions';
import useCanvasMouseSelect from '@/composables/useCanvasMouseSelect';
import { showMessage } from '@/mixins/showMessage';
import { useTitleChange } from '@/composables/useTitleChange';
import { useUniqueNodeName } from '@/composables/useUniqueNodeName';
import { useI18n } from '@/composables/useI18n';

import { workflowHelpers } from '@/mixins/workflowHelpers';
import { workflowRun } from '@/mixins/workflowRun';

import NodeDetailsView from '@/components/NodeDetailsView.vue';
import Node from '@/components/Node.vue';
import NodeSettings from '@/components/NodeSettings.vue';
import Sticky from '@/components/Sticky.vue';
import CanvasAddButton from './CanvasAddButton.vue';
import mixins from 'vue-typed-mixins';
import { v4 as uuid } from 'uuid';
import type {
	IConnection,
	IConnections,
	IDataObject,
	IExecutionsSummary,
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
	Workflow,
} from 'n8n-workflow';
import { deepCopy, NodeHelpers, TelemetryHelpers } from 'n8n-workflow';
import type {
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
	INewWorkflowData,
	IWorkflowTemplate,
	IWorkflowToShare,
	IUser,
	INodeUpdatePropertiesInformation,
	NodeCreatorOpenSource,
} from '@/Interface';

import { debounceHelper } from '@/mixins/debounce';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import type { Route, RawLocation } from 'vue-router';
import { dataPinningEventBus, nodeViewEventBus } from '@/event-bus';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useSegment } from '@/stores/segment.store';
import { useTemplatesStore } from '@/stores/templates.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useTagsStore } from '@/stores/tags.store';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useCanvasStore } from '@/stores/canvas.store';
import { useWorkflowsEEStore } from '@/stores/workflows.ee.store';
import { useEnvironmentsStore } from '@/stores';
import * as NodeViewUtils from '@/utils/nodeViewUtils';
import { getAccountAge, getConnectionInfo, getNodeViewTab } from '@/utils';
import { useHistoryStore } from '@/stores/history.store';
import {
	AddConnectionCommand,
	AddNodeCommand,
	MoveNodeCommand,
	RemoveConnectionCommand,
	RemoveNodeCommand,
	RenameNodeCommand,
	historyBus,
} from '@/models/history';
import type { BrowserJsPlumbInstance } from '@jsplumb/browser-ui';
import {
	EVENT_ENDPOINT_MOUSEOVER,
	EVENT_ENDPOINT_MOUSEOUT,
	EVENT_DRAG_MOVE,
	EVENT_CONNECTION_DRAG,
	EVENT_CONNECTION_ABORT,
	EVENT_CONNECTION_MOUSEOUT,
	EVENT_CONNECTION_MOUSEOVER,
	ready,
} from '@jsplumb/browser-ui';
import type { N8nPlusEndpoint } from '@/plugins/endpoints/N8nPlusEndpointType';
import {
	N8nPlusEndpointType,
	EVENT_PLUS_ENDPOINT_CLICK,
} from '@/plugins/endpoints/N8nPlusEndpointType';

interface AddNodeOptions {
	position?: XYPosition;
	dragAndDrop?: boolean;
}

const NodeCreator = async () => import('@/components/Node/NodeCreator/NodeCreator.vue');
const NodeCreation = async () => import('@/components/Node/NodeCreation.vue');
const CanvasControls = async () => import('@/components/CanvasControls.vue');

export default mixins(
	copyPaste,
	externalHooks,
	genericHelpers,
	moveNodeWorkflow,
	showMessage,
	workflowHelpers,
	workflowRun,
	debounceHelper,
).extend({
	name: 'NodeView',
	components: {
		NodeDetailsView,
		Node,
		NodeCreator,
		NodeSettings,
		Sticky,
		CanvasAddButton,
		NodeCreation,
		CanvasControls,
	},
	setup() {
		return {
			...useCanvasMouseSelect(),
			...useGlobalLinkActions(),
			...useTitleChange(),
			...useUniqueNodeName(),
			...useI18n(),
		};
	},
	errorCaptured: (err, vm, info) => {
		console.error('errorCaptured'); // eslint-disable-line no-console
		console.error(err); // eslint-disable-line no-console
	},
	watch: {
		// Listen to route changes and load the workflow accordingly
		$route(to: Route, from: Route) {
			const currentTab = getNodeViewTab(to);
			const nodeViewNotInitialized = !this.uiStore.nodeViewInitialized;
			let workflowChanged =
				from.params.name !== to.params.name &&
				// Both 'new' and __EMPTY__ are new workflow names, so ignore them when detecting if wf changed
				!(from.params.name === 'new' && this.currentWorkflow === PLACEHOLDER_EMPTY_WORKFLOW_ID) &&
				// Also ignore if workflow id changes when saving new workflow
				to.params.action !== 'workflowSave';
			const isOpeningTemplate = to.name === VIEWS.TEMPLATE_IMPORT;

			// When entering this tab:
			if (currentTab === MAIN_HEADER_TABS.WORKFLOW || isOpeningTemplate) {
				if (workflowChanged || nodeViewNotInitialized || isOpeningTemplate) {
					this.startLoading();
					if (nodeViewNotInitialized) {
						const previousDirtyState = this.uiStore.stateIsDirty;
						this.resetWorkspace();
						this.uiStore.stateIsDirty = previousDirtyState;
					}
					void this.loadCredentials();
					void this.initView().then(() => {
						this.stopLoading();
						if (this.blankRedirect) {
							this.blankRedirect = false;
						}
					});
				}
			}
			// Also, when landing on executions tab, check if workflow data is changed
			if (currentTab === MAIN_HEADER_TABS.EXECUTIONS) {
				workflowChanged =
					from.params.name !== to.params.name &&
					!(to.params.name === 'new' && from.params.name === undefined);
				if (workflowChanged) {
					// This will trigger node view to update next time workflow tab is opened
					this.uiStore.nodeViewInitialized = false;
				}
			}
		},
		activeNode() {
			// When a node gets set as active deactivate the create-menu
			this.createNodeActive = false;
		},
		containsTrigger(containsTrigger) {
			// Re-center CanvasAddButton if there's no triggers
			if (containsTrigger === false)
				this.canvasStore.setRecenteredCanvasAddButtonPosition(this.getNodeViewOffsetPosition);
		},
		nodeViewScale(newScale) {
			const elementRef = this.$refs.nodeView as HTMLDivElement | undefined;
			if (elementRef) {
				elementRef.style.transform = `scale(${newScale})`;
			}
		},
	},
	async beforeRouteLeave(to, from, next) {
		if (getNodeViewTab(to) === MAIN_HEADER_TABS.EXECUTIONS || from.name === VIEWS.TEMPLATE_IMPORT) {
			next();
			return;
		}
		if (this.uiStore.stateIsDirty) {
			const confirmModal = await this.confirmModal(
				this.$locale.baseText('generic.unsavedWork.confirmMessage.message'),
				this.$locale.baseText('generic.unsavedWork.confirmMessage.headline'),
				'warning',
				this.$locale.baseText('generic.unsavedWork.confirmMessage.confirmButtonText'),
				this.$locale.baseText('generic.unsavedWork.confirmMessage.cancelButtonText'),
				true,
			);
			if (confirmModal === MODAL_CONFIRMED) {
				// Make sure workflow id is empty when leaving the editor
				this.workflowsStore.setWorkflowId(PLACEHOLDER_EMPTY_WORKFLOW_ID);
				const saved = await this.saveCurrentWorkflow({}, false);
				if (saved) {
					await this.settingsStore.fetchPromptsData();
				}
				this.uiStore.stateIsDirty = false;

				if (from.name === VIEWS.NEW_WORKFLOW) {
					// Replace the current route with the new workflow route
					// before navigating to the new route when saving new workflow.
					this.$router.replace(
						{ name: VIEWS.WORKFLOW, params: { name: this.currentWorkflow } },
						() => {
							// We can't use next() here since vue-router
							// would prevent the navigation with an error
							void this.$router.push(to as RawLocation);
						},
					);
				} else {
					next();
				}
			} else if (confirmModal === MODAL_CANCEL) {
				this.workflowsStore.setWorkflowId(PLACEHOLDER_EMPTY_WORKFLOW_ID);
				this.resetWorkspace();
				this.uiStore.stateIsDirty = false;
				next();
			}
		} else {
			next();
		}
	},
	computed: {
		...mapStores(
			useCanvasStore,
			useTagsStore,
			useCredentialsStore,
			useNodeCreatorStore,
			useNodeTypesStore,
			useNDVStore,
			useRootStore,
			useSettingsStore,
			useTemplatesStore,
			useUIStore,
			useWorkflowsStore,
			useUsersStore,
			useNodeCreatorStore,
			useEnvironmentsStore,
			useWorkflowsEEStore,
			useHistoryStore,
		),
		nativelyNumberSuffixedDefaults(): string[] {
			return this.rootStore.nativelyNumberSuffixedDefaults;
		},
		currentUser(): IUser | null {
			return this.usersStore.currentUser;
		},
		activeNode(): INodeUi | null {
			return this.ndvStore.activeNode;
		},
		executionWaitingForWebhook(): boolean {
			return this.workflowsStore.executionWaitingForWebhook;
		},
		isDemo(): boolean {
			return this.$route.name === VIEWS.DEMO;
		},
		showCanvasAddButton(): boolean {
			return this.loadingService === null && !this.containsTrigger && !this.isDemo;
		},
		lastSelectedNode(): INodeUi | null {
			return this.uiStore.getLastSelectedNode;
		},
		nodes(): INodeUi[] {
			return this.workflowsStore.allNodes;
		},
		runButtonText(): string {
			if (!this.workflowRunning) {
				return this.$locale.baseText('nodeView.runButtonText.executeWorkflow');
			}

			if (this.executionWaitingForWebhook) {
				return this.$locale.baseText('nodeView.runButtonText.waitingForTriggerEvent');
			}

			return this.$locale.baseText('nodeView.runButtonText.executingWorkflow');
		},
		workflowStyle(): object {
			const offsetPosition = this.uiStore.nodeViewOffsetPosition;
			return {
				left: offsetPosition[0] + 'px',
				top: offsetPosition[1] + 'px',
			};
		},
		canvasAddButtonStyle(): object {
			return {
				'pointer-events': this.createNodeActive ? 'none' : 'all',
			};
		},
		backgroundStyle(): object {
			return NodeViewUtils.getBackgroundStyles(
				this.nodeViewScale,
				this.uiStore.nodeViewOffsetPosition,
				this.isExecutionPreview,
			);
		},
		workflowClasses() {
			const returnClasses = [];
			if (this.ctrlKeyPressed || this.moveCanvasKeyPressed) {
				if (this.uiStore.nodeViewMoveInProgress === true) {
					returnClasses.push('move-in-process');
				} else {
					returnClasses.push('move-active');
				}
			}
			if (this.selectActive || this.ctrlKeyPressed || this.moveCanvasKeyPressed) {
				// Makes sure that nothing gets selected while select or move is active
				returnClasses.push('do-not-select');
			}
			return returnClasses;
		},
		workflowExecution(): IExecutionResponse | null {
			return this.workflowsStore.getWorkflowExecution;
		},
		workflowRunning(): boolean {
			return this.uiStore.isActionActive('workflowRunning');
		},
		currentWorkflow(): string {
			return this.$route.params.name || this.workflowsStore.workflowId;
		},
		workflowName(): string {
			return this.workflowsStore.workflowName;
		},
		allTriggersDisabled(): boolean {
			const disabledTriggerNodes = this.triggerNodes.filter((node) => node.disabled);
			return disabledTriggerNodes.length === this.triggerNodes.length;
		},
		triggerNodes(): INodeUi[] {
			return this.nodes.filter(
				(node) => node.type === START_NODE_TYPE || this.nodeTypesStore.isTriggerNode(node.type),
			);
		},
		containsTrigger(): boolean {
			return this.triggerNodes.length > 0;
		},
		isExecutionDisabled(): boolean {
			return !this.containsTrigger || this.allTriggersDisabled;
		},
		getNodeViewOffsetPosition(): XYPosition {
			return this.uiStore.nodeViewOffsetPosition;
		},
		nodeViewScale(): number {
			return this.canvasStore.nodeViewScale;
		},
		instance(): BrowserJsPlumbInstance {
			return this.canvasStore.jsPlumbInstance;
		},
	},
	data() {
		return {
			GRID_SIZE: NodeViewUtils.GRID_SIZE,
			STICKY_NODE_TYPE,
			createNodeActive: false,
			lastClickPosition: [450, 450] as XYPosition,
			ctrlKeyPressed: false,
			moveCanvasKeyPressed: false,
			stopExecutionInProgress: false,
			blankRedirect: false,
			credentialsUpdated: false,
			pullConnActiveNodeName: null as string | null,
			pullConnActive: false,
			dropPrevented: false,
			renamingActive: false,
			showStickyButton: false,
			isExecutionPreview: false,
			showTriggerMissingTooltip: false,
			workflowData: null as INewWorkflowData | null,
			activeConnection: null as null | Connection,
			isProductionExecutionPreview: false,
			enterTimer: undefined as undefined | ReturnType<typeof setTimeout>,
			exitTimer: undefined as undefined | ReturnType<typeof setTimeout>,
			// jsplumb automatically deletes all loose connections which is in turn recorded
			// in undo history as a user action.
			// This should prevent automatically removed connections from populating undo stack
			suspendRecordingDetachedConnections: false,
			NODE_CREATOR_OPEN_SOURCES,
		};
	},
	beforeDestroy() {
		this.resetWorkspace();
		// Make sure the event listeners get removed again else we
		// could add up with them registered multiple times
		document.removeEventListener('keydown', this.keyDown);
		document.removeEventListener('keyup', this.keyUp);
		this.unregisterCustomAction('showNodeCreator');
	},
	methods: {
		showTriggerMissingToltip(isVisible: boolean) {
			this.showTriggerMissingTooltip = isVisible;
		},
		onRunNode(nodeName: string, source: string) {
			const node = this.workflowsStore.getNodeByName(nodeName);
			const telemetryPayload = {
				node_type: node ? node.type : null,
				workflow_id: this.workflowsStore.workflowId,
				source: 'canvas',
			};
			this.$telemetry.track('User clicked execute node button', telemetryPayload);
			this.$externalHooks().run('nodeView.onRunNode', telemetryPayload);
			this.runWorkflow(nodeName, source);
		},
		async onRunWorkflow() {
			this.getWorkflowDataToSave().then((workflowData) => {
				const telemetryPayload = {
					workflow_id: this.workflowsStore.workflowId,
					node_graph_string: JSON.stringify(
						TelemetryHelpers.generateNodesGraph(workflowData as IWorkflowBase, this.getNodeTypes())
							.nodeGraph,
					),
				};
				this.$telemetry.track('User clicked execute workflow button', telemetryPayload);
				this.$externalHooks().run('nodeView.onRunWorkflow', telemetryPayload);
			});

			await this.runWorkflow();
		},
		onRunContainerClick() {
			if (this.containsTrigger && !this.allTriggersDisabled) return;

			const message =
				this.containsTrigger && this.allTriggersDisabled
					? this.$locale.baseText('nodeView.addOrEnableTriggerNode')
					: this.$locale.baseText('nodeView.addATriggerNodeFirst');

			this.registerCustomAction('showNodeCreator', () =>
				this.showTriggerCreator(NODE_CREATOR_OPEN_SOURCES.NO_TRIGGER_EXECUTION_TOOLTIP),
			);
			const notice = this.$showMessage({
				type: 'info',
				title: this.$locale.baseText('nodeView.cantExecuteNoTrigger'),
				message,
				duration: 3000,
				onClick: () =>
					setTimeout(() => {
						// Close the creator panel if user clicked on the link
						if (this.createNodeActive) notice.close();
					}, 0),
			});
		},
		clearExecutionData() {
			this.workflowsStore.workflowExecutionData = null;
			this.updateNodesExecutionIssues();
		},
		async onSaveKeyboardShortcut(e: KeyboardEvent) {
			let saved = await this.saveCurrentWorkflow();
			if (saved) await this.settingsStore.fetchPromptsData();
			if (this.activeNode) {
				// If NDV is open, save will not work from editable input fields
				// so don't show success message if this is true
				if (e.target instanceof HTMLInputElement) {
					saved = e.target.readOnly;
				} else {
					saved = true;
				}
				if (saved) {
					this.$showMessage({
						title: this.$locale.baseText('generic.workflowSaved'),
						type: 'success',
					});
				}
			}
		},
		showTriggerCreator(source: NodeCreatorOpenSource) {
			if (this.createNodeActive) return;
			this.nodeCreatorStore.setSelectedView(TRIGGER_NODE_CREATOR_VIEW);
			this.nodeCreatorStore.setShowScrim(true);
			this.onToggleNodeCreator({ source, createNodeActive: true });
		},
		async openExecution(executionId: string) {
			this.startLoading();
			this.resetWorkspace();
			let data: IExecutionResponse | undefined;
			try {
				data = await this.workflowsStore.getExecution(executionId);
			} catch (error) {
				this.$showError(error, this.$locale.baseText('nodeView.showError.openExecution.title'));
				return;
			}
			if (data === undefined) {
				throw new Error(`Execution with id "${executionId}" could not be found!`);
			}
			this.workflowsStore.setWorkflowName({
				newName: data.workflowData.name,
				setStateDirty: false,
			});
			this.workflowsStore.setWorkflowId(PLACEHOLDER_EMPTY_WORKFLOW_ID);
			this.workflowsStore.setWorkflowExecutionData(data);
			if (data.workflowData.pinData) {
				this.workflowsStore.setWorkflowPinData(data.workflowData.pinData);
			}

			await this.addNodes(
				deepCopy(data.workflowData.nodes),
				deepCopy(data.workflowData.connections),
			);
			this.$nextTick(() => {
				this.canvasStore.zoomToFit();
				this.uiStore.stateIsDirty = false;
			});
			this.$externalHooks().run('execution.open', {
				workflowId: data.workflowData.id,
				workflowName: data.workflowData.name,
				executionId,
			});
			this.$telemetry.track('User opened read-only execution', {
				workflow_id: data.workflowData.id,
				execution_mode: data.mode,
				execution_finished: data.finished,
			});

			if (!data.finished && data.data?.resultData?.error) {
				// Check if any node contains an error
				let nodeErrorFound = false;
				if (data.data.resultData.runData) {
					const runData = data.data.resultData.runData;
					errorCheck: for (const nodeName of Object.keys(runData)) {
						for (const taskData of runData[nodeName]) {
							if (taskData.error) {
								nodeErrorFound = true;
								break errorCheck;
							}
						}
					}
				}

				if (!nodeErrorFound && data.data.resultData.error.stack) {
					// Display some more information for now in console to make debugging easier
					// TODO: Improve this in the future by displaying in UI
					console.error(`Execution ${executionId} error:`); // eslint-disable-line no-console
					console.error(data.data.resultData.error.stack); // eslint-disable-line no-console
				}
			}
			if ((data as IExecutionsSummary).waitTill) {
				this.$showMessage({
					title: this.$locale.baseText('nodeView.thisExecutionHasntFinishedYet'),
					message: `<a data-action="reload">${this.$locale.baseText(
						'nodeView.refresh',
					)}</a> ${this.$locale.baseText(
						'nodeView.toSeeTheLatestStatus',
					)}.<br/> <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/" target="_blank">${this.$locale.baseText(
						'nodeView.moreInfo',
					)}</a>`,
					type: 'warning',
					duration: 0,
				});
			}
			this.stopLoading();
		},
		async importWorkflowExact(data: { workflow: IWorkflowDataUpdate }) {
			if (!data.workflow.nodes || !data.workflow.connections) {
				throw new Error('Invalid workflow object');
			}
			this.resetWorkspace();
			data.workflow.nodes = NodeViewUtils.getFixedNodesList(data.workflow.nodes);

			await this.addNodes(data.workflow.nodes as INodeUi[], data.workflow.connections);

			if (data.workflow.pinData) {
				this.workflowsStore.setWorkflowPinData(data.workflow.pinData);
			}

			this.$nextTick(() => {
				this.canvasStore.zoomToFit();
			});
		},
		async openWorkflowTemplate(templateId: string) {
			this.startLoading();
			this.setLoadingText(this.$locale.baseText('nodeView.loadingTemplate'));
			this.resetWorkspace();

			this.workflowsStore.currentWorkflowExecutions = [];
			this.workflowsStore.activeWorkflowExecution = null;

			let data: IWorkflowTemplate | undefined;
			try {
				this.$externalHooks().run('template.requested', { templateId });
				data = await this.templatesStore.getWorkflowTemplate(templateId);

				if (!data) {
					throw new Error(
						this.$locale.baseText('nodeView.workflowTemplateWithIdCouldNotBeFound', {
							interpolate: { templateId },
						}),
					);
				}
			} catch (error) {
				this.$showError(error, this.$locale.baseText('nodeView.couldntImportWorkflow'));
				void this.$router.replace({ name: VIEWS.NEW_WORKFLOW });
				return;
			}

			data.workflow.nodes = NodeViewUtils.getFixedNodesList(data.workflow.nodes) as INodeUi[];

			this.blankRedirect = true;
			void this.$router.replace({ name: VIEWS.NEW_WORKFLOW, query: { templateId } });

			await this.addNodes(data.workflow.nodes, data.workflow.connections);
			this.workflowData = (await this.workflowsStore.getNewWorkflowData(data.name)) || {};
			this.$nextTick(() => {
				this.canvasStore.zoomToFit();
				this.uiStore.stateIsDirty = true;
			});

			this.$externalHooks().run('template.open', {
				templateId,
				templateName: data.name,
				workflow: data.workflow,
			});
			this.stopLoading();
		},
		async openWorkflow(workflow: IWorkflowDb) {
			this.startLoading();

			const selectedExecution = this.workflowsStore.activeWorkflowExecution;

			this.resetWorkspace();

			this.workflowsStore.addWorkflow(workflow);
			this.workflowsStore.setActive(workflow.active || false);
			this.workflowsStore.setWorkflowId(workflow.id);
			this.workflowsStore.setWorkflowName({ newName: workflow.name, setStateDirty: false });
			this.workflowsStore.setWorkflowSettings(workflow.settings || {});
			this.workflowsStore.setWorkflowPinData(workflow.pinData || {});
			this.workflowsStore.setWorkflowVersionId(workflow.versionId);

			if (workflow.ownedBy) {
				this.workflowsEEStore.setWorkflowOwnedBy({
					workflowId: workflow.id,
					ownedBy: workflow.ownedBy,
				});
			}

			if (workflow.sharedWith) {
				this.workflowsEEStore.setWorkflowSharedWith({
					workflowId: workflow.id,
					sharedWith: workflow.sharedWith,
				});
			}

			if (workflow.usedCredentials) {
				this.workflowsStore.setUsedCredentials(workflow.usedCredentials);
			}

			const tags = (workflow.tags || []) as ITag[];
			const tagIds = tags.map((tag) => tag.id);
			this.workflowsStore.setWorkflowTagIds(tagIds || []);
			this.tagsStore.upsertTags(tags);

			await this.addNodes(workflow.nodes, workflow.connections);

			if (!this.credentialsUpdated) {
				this.uiStore.stateIsDirty = false;
			}
			this.canvasStore.zoomToFit();
			this.$externalHooks().run('workflow.open', {
				workflowId: workflow.id,
				workflowName: workflow.name,
			});
			if (selectedExecution?.workflowId !== workflow.id) {
				this.workflowsStore.activeWorkflowExecution = null;
				this.workflowsStore.currentWorkflowExecutions = [];
			} else {
				this.workflowsStore.activeWorkflowExecution = selectedExecution;
			}
			this.stopLoading();
		},
		touchTap(e: MouseEvent | TouchEvent) {
			if (this.isTouchDevice) {
				this.mouseDown(e);
			}
		},
		mouseDown(e: MouseEvent | TouchEvent) {
			// Save the location of the mouse click
			this.lastClickPosition = this.getMousePositionWithinNodeView(e);
			if (e instanceof MouseEvent && e.button === 1) {
				this.moveCanvasKeyPressed = true;
			}

			this.mouseDownMouseSelect(e as MouseEvent, this.moveCanvasKeyPressed);
			this.mouseDownMoveWorkflow(e as MouseEvent, this.moveCanvasKeyPressed);

			// Hide the node-creator
			this.createNodeActive = false;
		},
		mouseUp(e: MouseEvent) {
			if (e.button === 1) {
				this.moveCanvasKeyPressed = false;
			}
			this.mouseUpMouseSelect(e);
			this.mouseUpMoveWorkflow(e);
		},
		keyUp(e: KeyboardEvent) {
			if (e.key === this.controlKeyCode) {
				this.ctrlKeyPressed = false;
			}
			if (e.key === ' ') {
				this.moveCanvasKeyPressed = false;
			}
		},
		async keyDown(e: KeyboardEvent) {
			if (e.key === 's' && this.isCtrlKeyPressed(e)) {
				e.stopPropagation();
				e.preventDefault();

				if (this.isReadOnly) {
					return;
				}

				this.callDebounced('onSaveKeyboardShortcut', { debounceTime: 1000 }, e);

				return;
			}

			// @ts-ignore
			const path = e.path || (e.composedPath && e.composedPath());

			// Check if the keys got emitted from a message box or from something
			// else which should ignore the default keybindings
			for (const element of path) {
				if (
					element.className &&
					typeof element.className === 'string' &&
					element.className.includes('ignore-key-press')
				) {
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
					this.ndvStore.activeNodeName = null;
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
				this.onToggleNodeCreator({
					source: NODE_CREATOR_OPEN_SOURCES.TAB,
					createNodeActive: !this.createNodeActive && !this.isReadOnly,
				});
			} else if (e.key === this.controlKeyCode) {
				this.ctrlKeyPressed = true;
			} else if (e.key === ' ') {
				this.moveCanvasKeyPressed = true;
			} else if (e.key === 'F2' && !this.isReadOnly) {
				const lastSelectedNode = this.lastSelectedNode;
				if (lastSelectedNode !== null && lastSelectedNode.type !== STICKY_NODE_TYPE) {
					this.callDebounced('renameNodePrompt', { debounceTime: 1500 }, lastSelectedNode.name);
				}
			} else if (e.key === 'a' && this.isCtrlKeyPressed(e) === true) {
				// Select all nodes
				e.stopPropagation();
				e.preventDefault();

				this.callDebounced('selectAllNodes', { debounceTime: 1000 });
			} else if (e.key === 'c' && this.isCtrlKeyPressed(e)) {
				this.callDebounced('copySelectedNodes', { debounceTime: 1000 });
			} else if (e.key === 'x' && this.isCtrlKeyPressed(e)) {
				// Cut nodes
				e.stopPropagation();
				e.preventDefault();

				this.callDebounced('cutSelectedNodes', { debounceTime: 1000 });
			} else if (e.key === 'n' && this.isCtrlKeyPressed(e) && e.altKey) {
				// Create a new workflow
				e.stopPropagation();
				e.preventDefault();
				if (this.isDemo) {
					return;
				}

				if (this.$router.currentRoute.name === VIEWS.NEW_WORKFLOW) {
					this.$root.$emit('newWorkflow');
				} else {
					void this.$router.push({ name: VIEWS.NEW_WORKFLOW });
				}

				this.$showMessage({
					title: this.$locale.baseText('nodeView.showMessage.keyDown.title'),
					type: 'success',
				});
			} else if (e.key === 'Enter') {
				// Activate the last selected node
				const lastSelectedNode = this.lastSelectedNode;

				if (lastSelectedNode !== null) {
					if (lastSelectedNode.type === STICKY_NODE_TYPE && this.isReadOnly) {
						return;
					}
					this.ndvStore.activeNodeName = lastSelectedNode.name;
				}
			} else if (e.key === 'ArrowRight' && e.shiftKey) {
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

				const connections = this.workflowsStore.outgoingConnectionsByNodeName(
					lastSelectedNode.name,
				);

				if (connections.main === undefined || connections.main.length === 0) {
					return;
				}

				this.callDebounced(
					'nodeSelectedByName',
					{ debounceTime: 100 },
					connections.main[0][0].node,
					false,
					true,
				);
			} else if (e.key === 'ArrowLeft' && e.shiftKey) {
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

				this.callDebounced(
					'nodeSelectedByName',
					{ debounceTime: 100 },
					connections.main[0][0].node,
					false,
					true,
				);
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

				if (!Array.isArray(connections.main) || !connections.main.length) {
					return;
				}

				const parentNode = connections.main[0][0].node;
				const connectionsParent = this.workflowsStore.outgoingConnectionsByNodeName(parentNode);

				if (!Array.isArray(connectionsParent.main) || !connectionsParent.main.length) {
					return;
				}

				// Get all the sibling nodes and their x positions to know which one to set active
				let siblingNode: INodeUi | null;
				let lastCheckedNodePosition = e.key === 'ArrowUp' ? -99999999 : 99999999;
				let nextSelectNode: string | null = null;
				for (const ouputConnections of connectionsParent.main) {
					for (const ouputConnection of ouputConnections) {
						if (ouputConnection.node === lastSelectedNode.name) {
							// Ignore current node
							continue;
						}
						siblingNode = this.workflowsStore.getNodeByName(ouputConnection.node);

						if (siblingNode) {
							if (e.key === 'ArrowUp') {
								// Get the next node on the left
								if (
									siblingNode.position[1] <= lastSelectedNode.position[1] &&
									siblingNode.position[1] > lastCheckedNodePosition
								) {
									nextSelectNode = siblingNode.name;
									lastCheckedNodePosition = siblingNode.position[1];
								}
							} else {
								// Get the next node on the right
								if (
									siblingNode.position[1] >= lastSelectedNode.position[1] &&
									siblingNode.position[1] < lastCheckedNodePosition
								) {
									nextSelectNode = siblingNode.name;
									lastCheckedNodePosition = siblingNode.position[1];
								}
							}
						}
					}
				}

				if (nextSelectNode !== null) {
					this.callDebounced(
						'nodeSelectedByName',
						{ debounceTime: 100 },
						nextSelectNode,
						false,
						true,
					);
				}
			}
		},

		deactivateSelectedNode() {
			if (!this.editAllowedCheck()) {
				return;
			}
			this.disableNodes(this.uiStore.getSelectedNodes, true);
		},

		deleteSelectedNodes() {
			// Copy "selectedNodes" as the nodes get deleted out of selection
			// when they get deleted and if we would use original it would mess
			// with the index and would so not delete all nodes
			const nodesToDelete: string[] = this.uiStore.getSelectedNodes.map((node: INodeUi) => {
				return node.name;
			});
			this.historyStore.startRecordingUndo();
			nodesToDelete.forEach((nodeName: string) => {
				this.removeNode(nodeName, true, false);
			});
			setTimeout(() => {
				this.historyStore.stopRecordingUndo();
			}, 200);
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

		pushDownstreamNodes(sourceNodeName: string, margin: number, recordHistory = false) {
			const sourceNode = this.workflowsStore.nodesByName[sourceNodeName];
			const workflow = this.getCurrentWorkflow();
			const childNodes = workflow.getChildNodes(sourceNodeName);
			for (const nodeName of childNodes) {
				const node = this.workflowsStore.nodesByName[nodeName] as INodeUi;
				const oldPosition = node.position;

				if (node.position[0] < sourceNode.position[0]) {
					continue;
				}

				const updateInformation: INodeUpdatePropertiesInformation = {
					name: nodeName,
					properties: {
						position: [node.position[0] + margin, node.position[1]],
					},
				};

				this.workflowsStore.updateNodeProperties(updateInformation);
				this.onNodeMoved(node);

				if (
					(recordHistory && oldPosition[0] !== node.position[0]) ||
					oldPosition[1] !== node.position[1]
				) {
					this.historyStore.pushCommandToUndo(
						new MoveNodeCommand(nodeName, oldPosition, node.position, this),
						recordHistory,
					);
				}
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
			void this.getSelectedNodesToSave().then((data) => {
				const workflowToCopy: IWorkflowToShare = {
					meta: {
						instanceId: this.rootStore.instanceId,
					},
					...data,
				};

				this.removeForeignCredentialsFromWorkflow(
					workflowToCopy,
					this.credentialsStore.allCredentials,
				);

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
						workflow_id: this.workflowsStore.workflowId,
					});
				}
			});
		},
		async stopExecution() {
			const executionId = this.workflowsStore.activeExecutionId;
			if (executionId === null) {
				return;
			}

			try {
				this.stopExecutionInProgress = true;
				await this.workflowsStore.stopCurrentExecution(executionId);
				this.$showMessage({
					title: this.$locale.baseText('nodeView.showMessage.stopExecutionTry.title'),
					type: 'success',
				});
			} catch (error) {
				// Execution stop might fail when the execution has already finished. Let's treat this here.
				const execution = await this.workflowsStore.getExecution(executionId);

				if (execution === undefined) {
					// execution finished but was not saved (e.g. due to low connectivity)

					this.workflowsStore.finishActiveExecution({
						executionId,
						data: { finished: true, stoppedAt: new Date() },
					});
					this.workflowsStore.executingNode = null;
					this.uiStore.removeActiveAction('workflowRunning');

					this.titleSet(this.workflowsStore.workflowName, 'IDLE');
					this.$showMessage({
						title: this.$locale.baseText('nodeView.showMessage.stopExecutionCatch.unsaved.title'),
						message: this.$locale.baseText(
							'nodeView.showMessage.stopExecutionCatch.unsaved.message',
						),
						type: 'success',
					});
				} else if (execution?.finished) {
					// execution finished before it could be stopped

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
					this.workflowsStore.finishActiveExecution(pushData);
					this.titleSet(execution.workflowData.name, 'IDLE');
					this.workflowsStore.executingNode = null;
					this.workflowsStore.setWorkflowExecutionData(executedData as IExecutionResponse);
					this.uiStore.removeActiveAction('workflowRunning');
					this.$showMessage({
						title: this.$locale.baseText('nodeView.showMessage.stopExecutionCatch.title'),
						message: this.$locale.baseText('nodeView.showMessage.stopExecutionCatch.message'),
						type: 'success',
					});
				} else {
					this.$showError(error, this.$locale.baseText('nodeView.showError.stopExecution.title'));
				}
			}
			this.stopExecutionInProgress = false;

			this.getWorkflowDataToSave().then((workflowData) => {
				const trackProps = {
					workflow_id: this.workflowsStore.workflowId,
					node_graph_string: JSON.stringify(
						TelemetryHelpers.generateNodesGraph(workflowData as IWorkflowBase, this.getNodeTypes())
							.nodeGraph,
					),
				};

				this.$telemetry.track('User clicked stop workflow execution', trackProps);
			});
		},

		async stopWaitingForWebhook() {
			try {
				await this.workflowsStore.removeTestWebhook(this.workflowsStore.workflowId);
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
			const currentTab = getNodeViewTab(this.$route);
			if (currentTab === MAIN_HEADER_TABS.WORKFLOW) {
				let workflowData: IWorkflowDataUpdate | undefined;
				if (this.editAllowedCheck() === false) {
					return;
				}
				// Check if it is an URL which could contain workflow data
				if (plainTextData.match(/^http[s]?:\/\/.*\.json$/i)) {
					// Pasted data points to a possible workflow JSON file

					if (!this.editAllowedCheck()) {
						return;
					}

					const importConfirm = await this.confirmMessage(
						this.$locale.baseText('nodeView.confirmMessage.receivedCopyPasteData.message', {
							interpolate: { plainTextData },
						}),
						this.$locale.baseText('nodeView.confirmMessage.receivedCopyPasteData.headline'),
						'warning',
						this.$locale.baseText(
							'nodeView.confirmMessage.receivedCopyPasteData.confirmButtonText',
						),
						this.$locale.baseText('nodeView.confirmMessage.receivedCopyPasteData.cancelButtonText'),
					);

					if (!importConfirm) {
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

						if (!this.editAllowedCheck()) {
							return;
						}
					} catch (e) {
						// Is no valid JSON so ignore
						return;
					}
				}

				return this.importWorkflowData(workflowData!, 'paste', false);
			}
		},

		// Returns the workflow data from a given URL. If no data gets found or
		// data is invalid it returns undefined and displays an error message by itself.
		async getWorkflowDataFromUrl(url: string): Promise<IWorkflowDataUpdate | undefined> {
			let workflowData: IWorkflowDataUpdate;

			this.startLoading();
			try {
				workflowData = await this.workflowsStore.getWorkflowFromUrl(url);
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
		async importWorkflowData(
			workflowData: IWorkflowToShare,
			source: string,
			importTags = true,
		): Promise<void> {
			// eslint-disable-line @typescript-eslint/default-param-last
			// If it is JSON check if it looks on the first look like data we can use
			if (!workflowData.hasOwnProperty('nodes') || !workflowData.hasOwnProperty('connections')) {
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
						} else {
							node.id = uuid();
						}
					});
				}

				const currInstanceId = this.rootStore.instanceId;

				const nodeGraph = JSON.stringify(
					TelemetryHelpers.generateNodesGraph(workflowData as IWorkflowBase, this.getNodeTypes(), {
						nodeIdMap,
						sourceInstanceId:
							workflowData.meta && workflowData.meta.instanceId !== currInstanceId
								? workflowData.meta.instanceId
								: '',
					}).nodeGraph,
				);
				if (source === 'paste') {
					this.$telemetry.track('User pasted nodes', {
						workflow_id: this.workflowsStore.workflowId,
						node_graph_string: nodeGraph,
					});
				} else {
					this.$telemetry.track('User imported workflow', {
						source,
						workflow_id: this.workflowsStore.workflowId,
						node_graph_string: nodeGraph,
					});
				}

				// By default we automatically deselect all the currently
				// selected nodes and select the new ones
				this.deselectAllNodes();

				// Fix the node position as it could be totally offscreen
				// and the pasted nodes would so not be directly visible to
				// the user
				this.updateNodePositions(
					workflowData,
					NodeViewUtils.getNewNodePosition(this.nodes, this.lastClickPosition),
				);

				const data = await this.addNodesToWorkflow(workflowData);

				setTimeout(() => {
					data.nodes!.forEach((node: INodeUi) => {
						this.nodeSelectedByName(node.name);
					});
				});

				if (workflowData.pinData) {
					this.workflowsStore.setWorkflowPinData(workflowData.pinData);
				}

				const tagsEnabled = this.settingsStore.areTagsEnabled;
				if (importTags && tagsEnabled && Array.isArray(workflowData.tags)) {
					const allTags = await this.tagsStore.fetchAll();
					const tagNames = new Set(allTags.map((tag) => tag.name));

					const workflowTags = workflowData.tags as ITag[];
					const notFound = workflowTags.filter((tag) => !tagNames.has(tag.name));

					const creatingTagPromises: Array<Promise<ITag>> = [];
					for (const tag of notFound) {
						const creationPromise = this.tagsStore.create(tag.name).then((tag: ITag) => {
							allTags.push(tag);
							return tag;
						});

						creatingTagPromises.push(creationPromise);
					}

					await Promise.all(creatingTagPromises);

					const tagIds = workflowTags.reduce((accu: string[], imported: ITag) => {
						const tag = allTags.find((tag) => tag.name === imported.name);
						if (tag) {
							accu.push(tag.id);
						}

						return accu;
					}, []);

					this.workflowsStore.addWorkflowTagIds(tagIds);
				}
			} catch (error) {
				this.$showError(
					error,
					this.$locale.baseText('nodeView.showError.importWorkflowData.title'),
				);
			}
		},
		onDragOver(event: DragEvent) {
			event.preventDefault();
		},

		onDrop(event: DragEvent) {
			if (!event.dataTransfer) {
				return;
			}

			const nodeTypeNames = event.dataTransfer.getData('nodeTypeName').split(',');

			if (nodeTypeNames) {
				const mousePosition = this.getMousePositionWithinNodeView(event);

				const nodesToAdd = nodeTypeNames.map((nodeTypeName: string, index: number) => {
					return {
						nodeTypeName,
						position: [
							// If adding more than one node, offset the X position
							mousePosition[0] -
								NodeViewUtils.NODE_SIZE / 2 +
								NodeViewUtils.NODE_SIZE * index * 2 +
								NodeViewUtils.GRID_SIZE,
							mousePosition[1] - NodeViewUtils.NODE_SIZE / 2,
						] as XYPosition,
						dragAndDrop: true,
					};
				});

				this.onAddNode(nodesToAdd, true);
				this.createNodeActive = false;
			}
		},

		nodeDeselectedByName(nodeName: string) {
			const node = this.workflowsStore.getNodeByName(nodeName);
			if (node) {
				this.nodeDeselected(node);
			}
		},

		nodeSelectedByName(nodeName: string, setActive = false, deselectAllOthers?: boolean) {
			if (deselectAllOthers === true) {
				this.deselectAllNodes();
			}

			const node = this.workflowsStore.getNodeByName(nodeName);
			if (node) {
				this.nodeSelected(node);
				this.uiStore.lastSelectedNode = node.name;
				this.uiStore.lastSelectedNodeOutputIndex = null;
				this.canvasStore.lastSelectedConnection = null;
				this.canvasStore.newNodeInsertPosition = null;

				if (setActive) {
					this.ndvStore.activeNodeName = node.name;
				}
			}
		},
		showMaxNodeTypeError(nodeTypeData: INodeTypeDescription) {
			const maxNodes = nodeTypeData.maxNodes;
			this.$showMessage({
				title: this.$locale.baseText('nodeView.showMessage.showMaxNodeTypeError.title'),
				message: this.$locale.baseText('nodeView.showMessage.showMaxNodeTypeError.message', {
					adjustToNumber: maxNodes,
					interpolate: { nodeTypeDataDisplayName: nodeTypeData.displayName },
				}),
				type: 'error',
				duration: 0,
			});
		},

		async getNewNodeWithDefaultCredential(nodeTypeData: INodeTypeDescription) {
			let nodeVersion = nodeTypeData.defaultVersion;

			if (nodeVersion === undefined) {
				nodeVersion = Array.isArray(nodeTypeData.version)
					? nodeTypeData.version.slice(-1)[0]
					: nodeTypeData.version;
			}

			const newNodeData: INodeUi = {
				id: uuid(),
				name: nodeTypeData.defaults.name as string,
				type: nodeTypeData.name,
				typeVersion: nodeVersion,
				position: [0, 0],
				parameters: {},
			};

			const credentialPerType =
				nodeTypeData.credentials &&
				nodeTypeData.credentials
					.map((type) => this.credentialsStore.getUsableCredentialByType(type.name))
					.flat();

			if (credentialPerType && credentialPerType.length === 1) {
				const defaultCredential = credentialPerType[0];

				const selectedCredentials = this.credentialsStore.getCredentialById(defaultCredential.id);
				const selected = { id: selectedCredentials.id, name: selectedCredentials.name };
				const credentials = {
					[defaultCredential.type]: selected,
				};

				await this.loadNodesProperties(
					[newNodeData].map((node) => ({ name: node.type, version: node.typeVersion })),
				);
				const nodeType = this.nodeTypesStore.getNodeType(newNodeData.type, newNodeData.typeVersion);
				const nodeParameters = NodeHelpers.getNodeParameters(
					nodeType?.properties || [],
					{},
					true,
					false,
					newNodeData,
				);

				if (nodeTypeData.credentials) {
					const authentication = nodeTypeData.credentials.find(
						(type) => type.name === defaultCredential.type,
					);
					if (authentication?.displayOptions?.hide) {
						return newNodeData;
					}

					const authDisplayOptions = authentication?.displayOptions?.show;
					if (!authDisplayOptions) {
						newNodeData.credentials = credentials;
						return newNodeData;
					}

					if (
						Object.keys(authDisplayOptions).length === 1 &&
						authDisplayOptions['authentication']
					) {
						// ignore complex case when there's multiple dependencies
						newNodeData.credentials = credentials;

						let parameters: { [key: string]: string } = {};
						for (const displayOption of Object.keys(authDisplayOptions)) {
							if (nodeParameters && !nodeParameters[displayOption]) {
								parameters = {};
								newNodeData.credentials = undefined;
								break;
							}
							const optionValue = authDisplayOptions[displayOption]?.[0];
							if (optionValue && typeof optionValue === 'string') {
								parameters[displayOption] = optionValue;
							}
							newNodeData.parameters = {
								...newNodeData.parameters,
								...parameters,
							};
						}
					}
				}
			}
			return newNodeData;
		},

		async injectNode(
			nodeTypeName: string,
			options: AddNodeOptions = {},
			showDetail = true,
			trackHistory = false,
			isAutoAdd = false,
		) {
			const nodeTypeData: INodeTypeDescription | null =
				this.nodeTypesStore.getNodeType(nodeTypeName);

			if (nodeTypeData === null) {
				this.$showMessage({
					title: this.$locale.baseText('nodeView.showMessage.addNodeButton.title'),
					message: this.$locale.baseText('nodeView.showMessage.addNodeButton.message', {
						interpolate: { nodeTypeName },
					}),
					type: 'error',
				});
				return;
			}

			if (
				nodeTypeData.maxNodes !== undefined &&
				this.getNodeTypeCount(nodeTypeName) >= nodeTypeData.maxNodes
			) {
				this.showMaxNodeTypeError(nodeTypeData);
				return;
			}

			const newNodeData = await this.getNewNodeWithDefaultCredential(nodeTypeData);

			// when pulling new connection from node or injecting into a connection
			const lastSelectedNode = this.lastSelectedNode;

			if (options.position) {
				newNodeData.position = NodeViewUtils.getNewNodePosition(
					this.canvasStore.getNodesWithPlaceholderNode(),
					options.position,
				);
			} else if (lastSelectedNode) {
				const lastSelectedConnection = this.canvasStore.lastSelectedConnection;
				if (lastSelectedConnection) {
					// set when injecting into a connection
					const [diffX] = NodeViewUtils.getConnectorLengths(lastSelectedConnection);
					if (diffX <= NodeViewUtils.MAX_X_TO_PUSH_DOWNSTREAM_NODES) {
						this.pushDownstreamNodes(
							lastSelectedNode.name,
							NodeViewUtils.PUSH_NODES_OFFSET,
							trackHistory,
						);
					}
				}

				// set when pulling connections
				if (this.canvasStore.newNodeInsertPosition) {
					newNodeData.position = NodeViewUtils.getNewNodePosition(this.nodes, [
						this.canvasStore.newNodeInsertPosition[0] + NodeViewUtils.GRID_SIZE,
						this.canvasStore.newNodeInsertPosition[1] - NodeViewUtils.NODE_SIZE / 2,
					]);
					this.canvasStore.newNodeInsertPosition = null;
				} else {
					let yOffset = 0;

					if (lastSelectedConnection) {
						const sourceNodeType = this.nodeTypesStore.getNodeType(
							lastSelectedNode.type,
							lastSelectedNode.typeVersion,
						);
						const offsets = [
							[-100, 100],
							[-140, 0, 140],
							[-240, -100, 100, 240],
						];
						if (sourceNodeType && sourceNodeType.outputs.length > 1) {
							const offset = offsets[sourceNodeType.outputs.length - 2];
							const sourceOutputIndex = lastSelectedConnection.__meta
								? lastSelectedConnection.__meta.sourceOutputIndex
								: 0;
							yOffset = offset[sourceOutputIndex];
						}
					}

					// If a node is active then add the new node directly after the current one
					newNodeData.position = NodeViewUtils.getNewNodePosition(
						this.nodes,
						[
							lastSelectedNode.position[0] + NodeViewUtils.PUSH_NODES_OFFSET,
							lastSelectedNode.position[1] + yOffset,
						],
						[100, 0],
					);
				}
			} else {
				// If added node is a trigger and it's the first one added to the canvas
				// we place it at canvasAddButtonPosition to replace the canvas add button
				const position =
					this.nodeTypesStore.isTriggerNode(nodeTypeName) && !this.containsTrigger
						? this.canvasStore.canvasAddButtonPosition
						: // If no node is active find a free spot
						  (this.lastClickPosition as XYPosition);

				newNodeData.position = NodeViewUtils.getNewNodePosition(this.nodes, position);
			}

			const localizedName = this.localizeNodeName(newNodeData.name, newNodeData.type);

			newNodeData.name = this.uniqueNodeName(localizedName);

			if (nodeTypeData.webhooks && nodeTypeData.webhooks.length) {
				newNodeData.webhookId = uuid();
			}

			await this.addNodes([newNodeData], undefined, trackHistory);
			this.workflowsStore.setNodePristine(newNodeData.name, true);

			this.uiStore.stateIsDirty = true;

			if (nodeTypeName === STICKY_NODE_TYPE) {
				this.$telemetry.trackNodesPanel('nodeView.addSticky', {
					workflow_id: this.workflowsStore.workflowId,
				});
			} else {
				this.$externalHooks().run('nodeView.addNodeButton', { nodeTypeName });
				useSegment().trackAddedTrigger(nodeTypeName);
				const trackProperties: ITelemetryTrackProperties = {
					node_type: nodeTypeName,
					is_auto_add: isAutoAdd,
					workflow_id: this.workflowsStore.workflowId,
					drag_and_drop: options.dragAndDrop,
				};

				if (lastSelectedNode) {
					trackProperties.input_node_type = lastSelectedNode.type;
				}

				this.$telemetry.trackNodesPanel('nodeView.addNodeButton', trackProperties);
			}

			// Automatically deselect all nodes and select the current one and also active
			// current node. But only if it's added manually by the user (not by undo/redo mechanism)
			if (trackHistory) {
				this.deselectAllNodes();
				setTimeout(() => {
					this.nodeSelectedByName(
						newNodeData.name,
						showDetail && nodeTypeName !== STICKY_NODE_TYPE,
					);
				});
			}

			return newNodeData;
		},
		getConnection(
			sourceNodeName: string,
			sourceNodeOutputIndex: number,
			targetNodeName: string,
			targetNodeOuputIndex: number,
		): IConnection | undefined {
			const nodeConnections = (
				this.workflowsStore.outgoingConnectionsByNodeName(sourceNodeName) as INodeConnections
			).main;
			if (nodeConnections) {
				const connections: IConnection[] | null = nodeConnections[sourceNodeOutputIndex];

				if (connections) {
					return connections.find(
						(connection: IConnection) =>
							connection.node === targetNodeName && connection.index === targetNodeOuputIndex,
					);
				}
			}

			return undefined;
		},
		connectTwoNodes(
			sourceNodeName: string,
			sourceNodeOutputIndex: number,
			targetNodeName: string,
			targetNodeOuputIndex: number,
		) {
			this.uiStore.stateIsDirty = true;

			if (
				this.getConnection(
					sourceNodeName,
					sourceNodeOutputIndex,
					targetNodeName,
					targetNodeOuputIndex,
				)
			) {
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

			this.__addConnection(connectionData);
		},
		async addNode(
			nodeTypeName: string,
			options: AddNodeOptions = {},
			showDetail = true,
			trackHistory = false,
			isAutoAdd = false,
		) {
			if (!this.editAllowedCheck()) {
				return;
			}

			const lastSelectedConnection = this.canvasStore.lastSelectedConnection;
			const lastSelectedNode = this.lastSelectedNode;
			const lastSelectedNodeOutputIndex = this.uiStore.lastSelectedNodeOutputIndex;

			this.historyStore.startRecordingUndo();

			const newNodeData = await this.injectNode(
				nodeTypeName,
				options,
				showDetail,
				trackHistory,
				isAutoAdd,
			);
			if (!newNodeData) {
				return;
			}

			const outputIndex = lastSelectedNodeOutputIndex || 0;

			// If a node is last selected then connect between the active and its child ones
			if (lastSelectedNode) {
				await Vue.nextTick();

				if (lastSelectedConnection && lastSelectedConnection.__meta) {
					this.__deleteJSPlumbConnection(lastSelectedConnection, trackHistory);

					const targetNodeName = lastSelectedConnection.__meta.targetNodeName;
					const targetOutputIndex = lastSelectedConnection.__meta.targetOutputIndex;
					this.connectTwoNodes(newNodeData.name, 0, targetNodeName, targetOutputIndex);
				}

				// Connect active node to the newly created one
				this.connectTwoNodes(lastSelectedNode.name, outputIndex, newNodeData.name, 0);
			}
			this.historyStore.stopRecordingUndo();
		},
		insertNodeAfterSelected(info: {
			sourceId: string;
			index: number;
			eventSource: NodeCreatorOpenSource;
			connection?: Connection;
		}) {
			// Get the node and set it as active that new nodes
			// which get created get automatically connected
			// to it.
			const sourceNode = this.workflowsStore.getNodeById(info.sourceId);
			if (!sourceNode) {
				return;
			}

			this.uiStore.lastSelectedNode = sourceNode.name;
			this.uiStore.lastSelectedNodeOutputIndex = info.index;
			this.canvasStore.newNodeInsertPosition = null;

			if (info.connection) {
				this.canvasStore.lastSelectedConnection = info.connection;
			}

			this.onToggleNodeCreator({
				source: info.eventSource,
				createNodeActive: true,
			});
		},
		onEventConnectionAbort(connection: Connection) {
			try {
				if (this.dropPrevented) {
					this.dropPrevented = false;
					return;
				}

				if (this.pullConnActiveNodeName) {
					const sourceNode = this.workflowsStore.getNodeById(connection.parameters.nodeId);
					if (sourceNode) {
						const sourceNodeName = sourceNode.name;
						const outputIndex = connection.parameters.index;

						this.connectTwoNodes(sourceNodeName, outputIndex, this.pullConnActiveNodeName, 0);
						this.pullConnActiveNodeName = null;
						this.dropPrevented = true;
					}
					return;
				}

				this.insertNodeAfterSelected({
					sourceId: connection.parameters.nodeId,
					index: connection.parameters.index,
					eventSource: NODE_CREATOR_OPEN_SOURCES.NODE_CONNECTION_DROP,
				});
			} catch (e) {
				console.error(e); // eslint-disable-line no-console
			}
		},
		onInterceptBeforeDrop(info: BeforeDropParams) {
			try {
				const sourceInfo = info.connection.endpoints[0].parameters;
				const targetInfo = info.dropEndpoint.parameters;

				const sourceNodeName = this.workflowsStore.getNodeById(sourceInfo.nodeId)?.name || '';
				const targetNodeName = this.workflowsStore.getNodeById(targetInfo.nodeId)?.name || '';

				// check for duplicates
				if (
					this.getConnection(sourceNodeName, sourceInfo.index, targetNodeName, targetInfo.index)
				) {
					this.dropPrevented = true;
					this.pullConnActiveNodeName = null;
					return false;
				}

				return true;
			} catch (e) {
				console.error(e); // eslint-disable-line no-console
				return true;
			}
		},
		onEventConnection(info: ConnectionEstablishedParams) {
			try {
				const sourceInfo = info.sourceEndpoint.parameters;
				const targetInfo = info.targetEndpoint.parameters;

				const sourceNodeName = this.workflowsStore.getNodeById(sourceInfo.nodeId)?.name;
				const targetNodeName = this.workflowsStore.getNodeById(targetInfo.nodeId)?.name;

				if (sourceNodeName && targetNodeName) {
					info.connection.__meta = {
						sourceNodeName,
						sourceOutputIndex: sourceInfo.index,
						targetNodeName,
						targetOutputIndex: targetInfo.index,
					};
				}

				NodeViewUtils.resetConnection(info.connection);
				NodeViewUtils.moveBackInputLabelPosition(info.targetEndpoint);

				const connectionData: [IConnection, IConnection] = [
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
				];

				this.dropPrevented = true;
				this.workflowsStore.addConnection({ connection: connectionData });
				this.uiStore.stateIsDirty = true;
				if (!this.suspendRecordingDetachedConnections) {
					this.historyStore.pushCommandToUndo(new AddConnectionCommand(connectionData));
				}
				if (!this.isReadOnly) {
					NodeViewUtils.addConnectionActionsOverlay(
						info.connection,
						() => {
							this.activeConnection = null;
							this.__deleteJSPlumbConnection(info.connection);
						},
						() => {
							this.insertNodeAfterSelected({
								sourceId: info.sourceEndpoint.parameters.nodeId,
								index: sourceInfo.index,
								connection: info.connection,
								eventSource: NODE_CREATOR_OPEN_SOURCES.NODE_CONNECTION_ACTION,
							});
						},
					);
					setTimeout(() => {
						NodeViewUtils.addConnectionTestData(
							info.source,
							info.target,
							'canvas' in info.connection.connector
								? (info.connection.connector.canvas as HTMLElement)
								: undefined,
						);
					}, 0);
				}
			} catch (e) {
				console.error(e); // eslint-disable-line no-console
			}
		},
		onDragMove() {
			this.instance?.connections.forEach((connection) => {
				NodeViewUtils.showOrHideItemsLabel(connection);
				NodeViewUtils.showOrHideMidpointArrow(connection);

				Object.values(connection.overlays).forEach((overlay) => {
					if (!overlay.canvas) return;
					this.instance?.repaint(overlay.canvas);
				});
			});
		},
		onConnectionMouseOver(connection: Connection) {
			try {
				if (this.exitTimer !== undefined) {
					clearTimeout(this.exitTimer);
					this.exitTimer = undefined;
				}

				if (
					this.isReadOnly ||
					this.enterTimer ||
					!connection ||
					connection === this.activeConnection
				)
					return;

				if (this.activeConnection) NodeViewUtils.hideConnectionActions(this.activeConnection);

				this.enterTimer = setTimeout(() => {
					this.enterTimer = undefined;
					if (connection) {
						NodeViewUtils.showConnectionActions(connection);
						this.activeConnection = connection;
					}
				}, 150);
			} catch (e) {
				console.error(e); // eslint-disable-line no-console
			}
		},
		onConnectionMouseOut(connection: Connection) {
			try {
				if (this.exitTimer) return;

				if (this.enterTimer) {
					clearTimeout(this.enterTimer);
					this.enterTimer = undefined;
				}

				if (this.isReadOnly || !connection || this.activeConnection?.id !== connection.id) return;

				this.exitTimer = setTimeout(() => {
					this.exitTimer = undefined;

					if (connection && this.activeConnection === connection) {
						NodeViewUtils.hideConnectionActions(this.activeConnection);
						this.activeConnection = null;
					}
				}, 500);
			} catch (e) {
				console.error(e); // eslint-disable-line no-console
			}
		},
		onConnectionMoved(info: ConnectionMovedParams) {
			try {
				// When a connection gets moved from one node to another it for some reason
				// calls the "connection" event but not the "connectionDetached" one. So we listen
				// additionally to the "connectionMoved" event and then only delete the existing connection.

				NodeViewUtils.resetInputLabelPosition(info.connection);

				const sourceInfo = info.connection.parameters;
				const targetInfo = info.originalEndpoint.parameters;

				const connectionInfo = [
					{
						node: this.workflowsStore.getNodeById(sourceInfo.nodeId)?.name || '',
						type: sourceInfo.type,
						index: sourceInfo.index,
					},
					{
						node: this.workflowsStore.getNodeById(targetInfo.nodeId)?.name || '',
						type: targetInfo.type,
						index: targetInfo.index,
					},
				] as [IConnection, IConnection];

				this.__removeConnection(connectionInfo, false);
			} catch (e) {
				console.error(e); // eslint-disable-line no-console
			}
		},
		onEndpointMouseOver(endpoint: Endpoint, mouse) {
			// This event seems bugged. It gets called constantly even when the mouse is not over the endpoint
			// if the endpoint has a connection attached to it. So we need to check if the mouse is actually over
			// the endpoint.
			if (!endpoint.isTarget || mouse.target !== endpoint.endpoint.canvas) return;
			this.instance.setHover(endpoint, true);
		},
		onEndpointMouseOut(endpoint: Endpoint) {
			if (!endpoint.isTarget) return;
			this.instance.setHover(endpoint, false);
		},
		async onConnectionDetached(info: ConnectionDetachedParams) {
			try {
				const connectionInfo: [IConnection, IConnection] | null = getConnectionInfo(info);
				NodeViewUtils.resetInputLabelPosition(info.targetEndpoint);
				info.connection.removeOverlays();
				this.__removeConnectionByConnectionInfo(info, false, false);

				if (this.pullConnActiveNodeName) {
					// establish new connection when dragging connection from one node to another
					this.historyStore.startRecordingUndo();
					const sourceNode = this.workflowsStore.getNodeById(info.connection.parameters.nodeId);
					const sourceNodeName = sourceNode.name;
					const outputIndex = info.connection.parameters.index;

					if (connectionInfo) {
						this.historyStore.pushCommandToUndo(new RemoveConnectionCommand(connectionInfo));
					}
					this.connectTwoNodes(sourceNodeName, outputIndex, this.pullConnActiveNodeName, 0);
					this.pullConnActiveNodeName = null;
					await this.$nextTick();
					this.historyStore.stopRecordingUndo();
				} else if (
					!this.historyStore.bulkInProgress &&
					!this.suspendRecordingDetachedConnections &&
					connectionInfo
				) {
					// Ff connection being detached by user, save this in history
					// but skip if it's detached as a side effect of bulk undo/redo or node rename process
					const removeCommand = new RemoveConnectionCommand(connectionInfo, this);
					this.historyStore.pushCommandToUndo(removeCommand);
				}
			} catch (e) {
				console.error(e); // eslint-disable-line no-console
			}
		},
		onConnectionDrag(connection: Connection) {
			// The overlays are visible by default so we need to hide the midpoint arrow
			// manually
			connection.overlays['midpoint-arrow']?.setVisible(false);
			try {
				this.pullConnActiveNodeName = null;
				this.pullConnActive = true;
				this.canvasStore.newNodeInsertPosition = null;
				NodeViewUtils.resetConnection(connection);

				const nodes = [...document.querySelectorAll('.node-wrapper')];

				const onMouseMove = (e: MouseEvent | TouchEvent) => {
					if (!connection) {
						return;
					}

					const element = document.querySelector('.jtk-endpoint.jtk-drag-hover');
					if (element) {
						const endpoint = element.jtk.endpoint;
						NodeViewUtils.showDropConnectionState(connection, endpoint);
						return;
					}

					const inputMargin = 24;
					const intersecting = nodes.find((element: Element) => {
						const { top, left, right, bottom } = element.getBoundingClientRect();
						const [x, y] = NodeViewUtils.getMousePosition(e);
						if (top <= y && bottom >= y && left - inputMargin <= x && right >= x) {
							const nodeName = (element as HTMLElement).dataset['name'] as string;
							const node = this.workflowsStore.getNodeByName(nodeName) as INodeUi | null;
							if (node) {
								const nodeType = this.nodeTypesStore.getNodeType(node.type, node.typeVersion);
								if (nodeType && nodeType.inputs && nodeType.inputs.length === 1) {
									this.pullConnActiveNodeName = node.name;
									const endpointUUID = this.getInputEndpointUUID(nodeName, 0);
									if (endpointUUID) {
										const endpoint = this.instance?.getEndpoint(endpointUUID);

										NodeViewUtils.showDropConnectionState(connection, endpoint);

										return true;
									}
								}
							}
						}

						return false;
					});

					if (!intersecting) {
						NodeViewUtils.showPullConnectionState(connection);
						this.pullConnActiveNodeName = null;
					}
				};

				const onMouseUp = (e: MouseEvent | TouchEvent) => {
					this.pullConnActive = false;
					this.canvasStore.newNodeInsertPosition = this.getMousePositionWithinNodeView(e);
					NodeViewUtils.resetConnectionAfterPull(connection);
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
		},
		onConnectionDragAbortDetached(connection: Connection) {
			Object.values(this.instance?.endpointsByElement)
				.flatMap((endpoints) => Object.values(endpoints))
				.filter((endpoint) => endpoint.endpoint.type === 'N8nPlus')
				.forEach((endpoint) => setTimeout(() => endpoint.instance.revalidate(endpoint.element), 0));
		},
		onPlusEndpointClick(endpoint: Endpoint) {
			if (endpoint && endpoint.__meta) {
				this.insertNodeAfterSelected({
					sourceId: endpoint.__meta.nodeId,
					index: endpoint.__meta.index,
					eventSource: NODE_CREATOR_OPEN_SOURCES.PLUS_ENDPOINT,
				});
			}
		},
		bindCanvasEvents() {
			this.instance.bind(EVENT_CONNECTION_ABORT, this.onEventConnectionAbort);

			this.instance.bind(INTERCEPT_BEFORE_DROP, this.onInterceptBeforeDrop);

			this.instance.bind(EVENT_CONNECTION, this.onEventConnection);

			this.instance.bind(EVENT_DRAG_MOVE, this.onDragMove);
			this.instance.bind(EVENT_CONNECTION_MOUSEOVER, this.onConnectionMouseOver);
			this.instance.bind(EVENT_CONNECTION_MOUSEOUT, this.onConnectionMouseOut);

			this.instance.bind(EVENT_CONNECTION_MOVED, this.onConnectionMoved);
			this.instance.bind(EVENT_ENDPOINT_MOUSEOVER, this.onEndpointMouseOver);
			this.instance.bind(EVENT_ENDPOINT_MOUSEOUT, this.onEndpointMouseOut);
			this.instance.bind(EVENT_CONNECTION_DETACHED, this.onConnectionDetached);
			this.instance.bind(EVENT_CONNECTION_DRAG, this.onConnectionDrag);
			this.instance.bind(
				[EVENT_CONNECTION_DRAG, EVENT_CONNECTION_ABORT, EVENT_CONNECTION_DETACHED],
				this.onConnectionDragAbortDetached,
			);
			this.instance.bind(EVENT_PLUS_ENDPOINT_CLICK, this.onPlusEndpointClick);
		},
		unbindCanvasEvents() {
			this.instance.unbind(EVENT_CONNECTION_ABORT, this.onEventConnectionAbort);

			this.instance.unbind(INTERCEPT_BEFORE_DROP, this.onInterceptBeforeDrop);

			this.instance.unbind(EVENT_CONNECTION, this.onEventConnection);

			this.instance.unbind(EVENT_DRAG_MOVE, this.onDragMove);
			this.instance.unbind(EVENT_CONNECTION_MOUSEOVER, this.onConnectionMouseOver);
			this.instance.unbind(EVENT_CONNECTION_MOUSEOUT, this.onConnectionMouseOut);

			this.instance.unbind(EVENT_CONNECTION_MOVED, this.onConnectionMoved);
			this.instance.unbind(EVENT_ENDPOINT_MOUSEOVER, this.onEndpointMouseOver);
			this.instance.unbind(EVENT_ENDPOINT_MOUSEOUT, this.onEndpointMouseOut);
			this.instance.unbind(EVENT_CONNECTION_DETACHED, this.onConnectionDetached);
			this.instance.unbind(EVENT_CONNECTION_DRAG, this.onConnectionDrag);

			this.instance.unbind(EVENT_CONNECTION_DRAG, this.onConnectionDragAbortDetached);
			this.instance.unbind(EVENT_CONNECTION_ABORT, this.onConnectionDragAbortDetached);
			this.instance.unbind(EVENT_CONNECTION_DETACHED, this.onConnectionDragAbortDetached);
			this.instance.unbind(EVENT_PLUS_ENDPOINT_CLICK, this.onPlusEndpointClick);

			// Get all the endpoints and unbind the events
			const elements = this.instance.getManagedElements();
			for (const element of Object.values(elements)) {
				const endpoints = element.endpoints;
				for (const endpoint of endpoints || []) {
					const endpointInstance = endpoint?.endpoint;
					if (endpointInstance && endpointInstance.type === N8nPlusEndpointType) {
						(endpointInstance as N8nPlusEndpoint).unbindEvents();
					}
				}
			}
		},
		onBeforeUnload(e) {
			if (this.isDemo || window.preventNodeViewBeforeUnload) {
				return;
			} else if (this.uiStore.stateIsDirty) {
				const confirmationMessage = this.$locale.baseText(
					'nodeView.itLooksLikeYouHaveBeenEditingSomething',
				);
				(e || window.event).returnValue = confirmationMessage; //Gecko + IE
				return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
			} else {
				this.startLoading(this.$locale.baseText('nodeView.redirecting'));
				return;
			}
		},
		async newWorkflow(): Promise<void> {
			this.startLoading();
			this.resetWorkspace();
			this.workflowData = await this.workflowsStore.getNewWorkflowData();
			this.workflowsStore.currentWorkflowExecutions = [];
			this.workflowsStore.activeWorkflowExecution = null;

			this.uiStore.stateIsDirty = false;
			this.canvasStore.setZoomLevel(1, [0, 0]);
			await this.tryToAddWelcomeSticky();
			this.uiStore.nodeViewInitialized = true;
			this.historyStore.reset();
			this.workflowsStore.activeWorkflowExecution = null;
			this.stopLoading();
		},
		async tryToAddWelcomeSticky(): Promise<void> {
			const newWorkflow = this.workflowData;
			this.canvasStore.zoomToFit();
		},
		async initView(): Promise<void> {
			if (this.$route.params.action === 'workflowSave') {
				// In case the workflow got saved we do not have to run init
				// as only the route changed but all the needed data is already loaded
				this.uiStore.stateIsDirty = false;
				return;
			}
			if (this.blankRedirect) {
				this.blankRedirect = false;
			} else if (this.$route.name === VIEWS.TEMPLATE_IMPORT) {
				const templateId = this.$route.params.id;
				await this.openWorkflowTemplate(templateId);
			} else {
				const result = this.uiStore.stateIsDirty;
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
						if (saved) await this.settingsStore.fetchPromptsData();
					} else if (confirmModal === MODAL_CLOSE) {
						return;
					}
				}
				// Load a workflow
				let workflowId = null as string | null;
				if (this.$route.params.name) {
					workflowId = this.$route.params.name;
				}
				if (workflowId !== null) {
					let workflow: IWorkflowDb | undefined = undefined;
					try {
						workflow = await this.workflowsStore.fetchWorkflow(workflowId);
					} catch (error) {
						this.$showError(error, this.$locale.baseText('openWorkflow.workflowNotFoundError'));

						void this.$router.push({
							name: VIEWS.NEW_WORKFLOW,
						});
					}

					if (workflow) {
						this.titleSet(workflow.name, 'IDLE');
						// Open existing workflow
						await this.openWorkflow(workflow);
					}
				} else if (this.$route.meta?.nodeView === true) {
					// Create new workflow
					await this.newWorkflow();
				}
			}
			this.historyStore.reset();
			this.uiStore.nodeViewInitialized = true;
			document.addEventListener('keydown', this.keyDown);
			document.addEventListener('keyup', this.keyUp);

			window.addEventListener('beforeunload', this.onBeforeUnload);
		},
		getOutputEndpointUUID(nodeName: string, index: number): string | null {
			const node = this.workflowsStore.getNodeByName(nodeName);
			if (!node) {
				return null;
			}

			return NodeViewUtils.getOutputEndpointUUID(node.id, index);
		},
		getInputEndpointUUID(nodeName: string, index: number) {
			const node = this.workflowsStore.getNodeByName(nodeName);
			if (!node) {
				return null;
			}

			return NodeViewUtils.getInputEndpointUUID(node.id, index);
		},
		__addConnection(connection: [IConnection, IConnection]) {
			const outputUuid = this.getOutputEndpointUUID(connection[0].node, connection[0].index);
			const inputUuid = this.getInputEndpointUUID(connection[1].node, connection[1].index);
			if (!outputUuid || !inputUuid) {
				return;
			}

			const uuid: [string, string] = [outputUuid, inputUuid];
			// Create connections in DOM
			this.instance?.connect({
				uuids: uuid,
				detachable: !this.isReadOnly,
			});

			setTimeout(() => {
				this.addPinDataConnections(this.workflowsStore.pinData);
			});
		},
		__removeConnection(connection: [IConnection, IConnection], removeVisualConnection = false) {
			if (removeVisualConnection) {
				const sourceNode = this.workflowsStore.getNodeByName(connection[0].node);
				const targetNode = this.workflowsStore.getNodeByName(connection[1].node);

				if (!sourceNode || !targetNode) {
					return;
				}
				const connections = this.instance?.getConnections({
					source: sourceNode.id,
					target: targetNode.id,
				});

				connections.forEach((connectionInstance: Connection) => {
					if (connectionInstance.__meta) {
						// Only delete connections from specific indexes (if it can be determined by meta)
						if (
							connectionInstance.__meta.sourceOutputIndex === connection[0].index &&
							connectionInstance.__meta.targetOutputIndex === connection[1].index
						) {
							this.__deleteJSPlumbConnection(connectionInstance);
						}
					} else {
						this.__deleteJSPlumbConnection(connectionInstance);
					}
				});
			}

			this.workflowsStore.removeConnection({ connection });
		},
		__deleteJSPlumbConnection(connection: Connection, trackHistory = false) {
			// Make sure to remove the overlay else after the second move
			// it visibly stays behind free floating without a connection.
			connection.removeOverlays();

			this.pullConnActiveNodeName = null; // prevent new connections when connectionDetached is triggered
			this.instance?.deleteConnection(connection); // on delete, triggers connectionDetached event which applies mutation to store
			if (trackHistory && connection.__meta) {
				const connectionData: [IConnection, IConnection] = [
					{
						index: connection.__meta?.sourceOutputIndex,
						node: connection.__meta.sourceNodeName,
						type: 'main',
					},
					{
						index: connection.__meta?.targetOutputIndex,
						node: connection.__meta.targetNodeName,
						type: 'main',
					},
				];
				const removeCommand = new RemoveConnectionCommand(connectionData, this);
				this.historyStore.pushCommandToUndo(removeCommand);
			}
		},
		__removeConnectionByConnectionInfo(info, removeVisualConnection = false, trackHistory = false) {
			const connectionInfo: [IConnection, IConnection] | null = getConnectionInfo(info);

			if (connectionInfo) {
				if (removeVisualConnection) {
					this.__deleteJSPlumbConnection(info.connection, trackHistory);
				} else if (trackHistory) {
					this.historyStore.pushCommandToUndo(new RemoveConnectionCommand(connectionInfo));
				}
				this.workflowsStore.removeConnection({ connection: connectionInfo });
			}
		},
		async duplicateNode(nodeName: string) {
			if (!this.editAllowedCheck()) {
				return;
			}
			const node = this.workflowsStore.getNodeByName(nodeName);

			if (node) {
				const nodeTypeData = this.nodeTypesStore.getNodeType(node.type, node.typeVersion);

				if (
					nodeTypeData &&
					nodeTypeData.maxNodes !== undefined &&
					this.getNodeTypeCount(node.type) >= nodeTypeData.maxNodes
				) {
					this.showMaxNodeTypeError(nodeTypeData);
					return;
				}

				// Deep copy the data so that data on lower levels of the node-properties do
				// not share objects
				const newNodeData = deepCopy(this.getNodeDataToSave(node));
				newNodeData.id = uuid();

				const localizedName = this.localizeNodeName(newNodeData.name, newNodeData.type);

				newNodeData.name = this.uniqueNodeName(localizedName);

				newNodeData.position = NodeViewUtils.getNewNodePosition(
					this.nodes,
					[node.position[0], node.position[1] + 140],
					[0, 140],
				);

				if (newNodeData.webhookId) {
					// Make sure that the node gets a new unique webhook-ID
					newNodeData.webhookId = uuid();
				}

				if (
					newNodeData.credentials &&
					this.settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing)
				) {
					const usedCredentials = this.workflowsStore.usedCredentials;
					newNodeData.credentials = Object.fromEntries(
						Object.entries(newNodeData.credentials).filter(([_, credential]) => {
							return (
								credential.id &&
								(!usedCredentials[credential.id] ||
									usedCredentials[credential.id]?.currentUserHasAccess)
							);
						}),
					);
				}

				await this.addNodes([newNodeData], [], true);

				const pinData = this.workflowsStore.pinDataByNodeName(nodeName);
				if (pinData) {
					this.workflowsStore.pinData({
						node: newNodeData,
						data: pinData,
					});
				}

				this.uiStore.stateIsDirty = true;

				// Automatically deselect all nodes and select the current one and also active
				// current node
				this.deselectAllNodes();
				setTimeout(() => {
					this.nodeSelectedByName(newNodeData.name, false);
				});

				this.$telemetry.track('User duplicated node', {
					node_type: node.type,
					workflow_id: this.workflowsStore.workflowId,
				});
			}
		},
		getJSPlumbConnection(
			sourceNodeName: string,
			sourceOutputIndex: number,
			targetNodeName: string,
			targetInputIndex: number,
		): Connection | undefined {
			const sourceNode = this.workflowsStore.getNodeByName(sourceNodeName);
			const targetNode = this.workflowsStore.getNodeByName(targetNodeName);
			if (!sourceNode || !targetNode) {
				return;
			}

			const sourceId = sourceNode.id;
			const targetId = targetNode.id;

			const sourceEndpoint = NodeViewUtils.getOutputEndpointUUID(sourceId, sourceOutputIndex);
			const targetEndpoint = NodeViewUtils.getInputEndpointUUID(targetId, targetInputIndex);

			// @ts-ignore
			const connections = this.instance?.getConnections({
				source: sourceId,
				target: targetId,
			}) as Connection[];

			return connections.find((connection: Connection) => {
				const uuids = connection.getUuids();
				return uuids[0] === sourceEndpoint && uuids[1] === targetEndpoint;
			});
		},
		getJSPlumbEndpoints(nodeName: string): Endpoint[] {
			const node = this.workflowsStore.getNodeByName(nodeName);
			const nodeEl = this.instance.getManagedElement(node?.id);

			const endpoints = this.instance?.getEndpoints(nodeEl);
			return endpoints;
		},
		getPlusEndpoint(nodeName: string, outputIndex: number): Endpoint | undefined {
			const endpoints = this.getJSPlumbEndpoints(nodeName);
			return endpoints.find(
				(endpoint: Endpoint) =>
					// @ts-ignore
					endpoint.endpoint.type === 'N8nPlus' && endpoint?.__meta?.index === outputIndex,
			);
		},
		getIncomingOutgoingConnections(nodeName: string): {
			incoming: Connection[];
			outgoing: Connection[];
		} {
			const node = this.workflowsStore.getNodeByName(nodeName);

			if (node) {
				// @ts-ignore
				const outgoing = this.instance?.getConnections({
					source: node.id,
				});

				// @ts-ignore
				const incoming = this.instance?.getConnections({
					target: node.id,
				}) as Connection[];

				return {
					incoming,
					outgoing,
				};
			}
			return { incoming: [], outgoing: [] };
		},
		onNodeMoved(node: INodeUi) {
			const { incoming, outgoing } = this.getIncomingOutgoingConnections(node.name);

			[...incoming, ...outgoing].forEach((connection: Connection) => {
				NodeViewUtils.showOrHideMidpointArrow(connection);
				NodeViewUtils.showOrHideItemsLabel(connection);
			});
		},
		onNodeRun({
			name,
			data,
			waiting,
		}: {
			name: string;
			data: ITaskData[] | null;
			waiting: boolean;
		}) {
			const pinData = this.workflowsStore.getPinData;

			if (pinData && pinData[name]) return;

			const sourceNodeName = name;
			const sourceNode = this.workflowsStore.getNodeByName(sourceNodeName);
			const sourceId = sourceNode !== null ? sourceNode.id : '';

			if (data === null || data.length === 0 || waiting) {
				const outgoing = this.instance?.getConnections({
					source: sourceId,
				}) as Connection[];

				outgoing.forEach((connection: Connection) => {
					NodeViewUtils.resetConnection(connection);
				});
				const endpoints = this.getJSPlumbEndpoints(sourceNodeName);
				endpoints.forEach((endpoint: Endpoint) => {
					if (endpoint.endpoint.type === 'N8nPlus') {
						(endpoint.endpoint as N8nPlusEndpoint).clearSuccessOutput();
					}
				});

				return;
			}

			const nodeConnections =
				this.workflowsStore.outgoingConnectionsByNodeName(sourceNodeName).main;
			const outputMap = NodeViewUtils.getOutputSummary(data, nodeConnections || []);

			Object.keys(outputMap).forEach((sourceOutputIndex: string) => {
				Object.keys(outputMap[sourceOutputIndex]).forEach((targetNodeName: string) => {
					Object.keys(outputMap[sourceOutputIndex][targetNodeName]).forEach(
						(targetInputIndex: string) => {
							if (targetNodeName) {
								const connection = this.getJSPlumbConnection(
									sourceNodeName,
									parseInt(sourceOutputIndex, 10),
									targetNodeName,
									parseInt(targetInputIndex, 10),
								);

								if (connection) {
									const output = outputMap[sourceOutputIndex][targetNodeName][targetInputIndex];

									if (output.isArtificialRecoveredEventItem) {
										NodeViewUtils.recoveredConnection(connection);
									} else if ((!output || !output.total) && !output.isArtificialRecoveredEventItem) {
										NodeViewUtils.resetConnection(connection);
									} else {
										NodeViewUtils.addConnectionOutputSuccess(connection, output);
									}
								}
							}

							const endpoint = this.getPlusEndpoint(
								sourceNodeName,
								parseInt(sourceOutputIndex, 10),
							);
							if (endpoint && endpoint.endpoint) {
								const output = outputMap[sourceOutputIndex][NODE_OUTPUT_DEFAULT_KEY][0];

								if (output && output.total > 0) {
									(endpoint.endpoint as N8nPlusEndpoint).setSuccessOutput(
										NodeViewUtils.getRunItemsLabel(output),
									);
								} else {
									(endpoint.endpoint as N8nPlusEndpoint).clearSuccessOutput();
								}
							}
						},
					);
				});
			});
		},
		removeNode(nodeName: string, trackHistory = false, trackBulk = true) {
			if (!this.editAllowedCheck()) {
				return;
			}

			const node = this.workflowsStore.getNodeByName(nodeName);
			if (!node) {
				return;
			}

			if (trackHistory && trackBulk) {
				this.historyStore.startRecordingUndo();
			}

			// "requiredNodeTypes" are also defined in cli/commands/run.ts
			const requiredNodeTypes: string[] = [];

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

				if (!deleteAllowed) {
					return;
				}
			}

			if (node.type === STICKY_NODE_TYPE) {
				this.$telemetry.track('User deleted workflow note', {
					workflow_id: this.workflowsStore.workflowId,
					is_welcome_note: node.name === QUICKSTART_NOTE_NAME,
				});
			} else {
				this.$externalHooks().run('node.deleteNode', { node });
				this.$telemetry.track('User deleted node', {
					node_type: node.type,
					workflow_id: this.workflowsStore.workflowId,
				});
			}

			let waitForNewConnection = false;
			// connect nodes before/after deleted node
			const nodeType = this.nodeTypesStore.getNodeType(node.type, node.typeVersion);
			if (nodeType && nodeType.outputs.length === 1 && nodeType.inputs.length === 1) {
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
							this.connectTwoNodes(
								sourceNodeName,
								sourceNodeOutputIndex,
								targetNodeName,
								targetNodeOuputIndex,
							);

							if (waitForNewConnection) {
								this.instance?.setSuspendDrawing(false, true);
								waitForNewConnection = false;
							}
						}, 100); // just to make it clear to users that this is a new connection
					}
				}
			}

			setTimeout(() => {
				// Suspend drawing
				this.instance?.setSuspendDrawing(true);
				(this.instance?.endpointsByElement[node.id] || [])
					.flat()
					.forEach((endpoint) => this.instance?.deleteEndpoint(endpoint));

				// Remove the connections in data
				this.workflowsStore.removeAllNodeConnection(node);
				this.workflowsStore.removeNode(node);
				this.workflowsStore.clearNodeExecutionData(node.name);

				if (!waitForNewConnection) {
					// Now it can draw again
					this.instance?.setSuspendDrawing(false, true);
				}

				// Remove node from selected index if found in it
				this.uiStore.removeNodeFromSelection(node);
				if (trackHistory) {
					this.historyStore.pushCommandToUndo(new RemoveNodeCommand(node));
				}
			}, 0); // allow other events to finish like drag stop
			if (trackHistory && trackBulk) {
				const recordingTimeout = waitForNewConnection ? 100 : 0;
				setTimeout(() => {
					this.historyStore.stopRecordingUndo();
				}, recordingTimeout);
			}
		},
		valueChanged(parameterData: IUpdateInformation) {
			if (parameterData.name === 'name' && parameterData.oldValue) {
				// The name changed so we have to take care that
				// the connections get changed.
				void this.renameNode(parameterData.oldValue as string, parameterData.value as string);
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
				const nameInput = document.querySelector('.rename-prompt .el-input__inner') as
					| HTMLInputElement
					| undefined;
				if (nameInput) {
					nameInput.focus();
					nameInput.select();
				}

				const promptResponse = (await promptResponsePromise) as MessageBoxInputData;

				await this.renameNode(currentName, promptResponse.value, true);
			} catch (e) {}
		},
		async renameNode(currentName: string, newName: string, trackHistory = false) {
			if (currentName === newName) {
				return;
			}

			this.suspendRecordingDetachedConnections = true;
			if (trackHistory) {
				this.historyStore.startRecordingUndo();
			}

			const activeNodeName = this.activeNode && this.activeNode.name;
			const isActive = activeNodeName === currentName;
			if (isActive) {
				this.renamingActive = true;
			}

			newName = this.uniqueNodeName(newName);

			// Rename the node and update the connections
			const workflow = this.getCurrentWorkflow(true);
			workflow.renameNode(currentName, newName);

			if (trackHistory) {
				this.historyStore.pushCommandToUndo(new RenameNodeCommand(currentName, newName));
			}

			// Update also last selected node and execution data
			this.workflowsStore.renameNodeSelectedAndExecution({ old: currentName, new: newName });

			// Reset all nodes and connections to load the new ones
			this.deleteEveryEndpoint();

			this.workflowsStore.removeAllConnections({ setStateDirty: false });
			this.workflowsStore.removeAllNodes({ removePinData: false, setStateDirty: true });

			// Wait a tick that the old nodes had time to get removed
			await Vue.nextTick();

			// Add the new updated nodes
			await this.addNodes(Object.values(workflow.nodes), workflow.connectionsBySourceNode, false);

			// Make sure that the node is selected again
			this.deselectAllNodes();
			this.nodeSelectedByName(newName);

			if (isActive) {
				this.ndvStore.activeNodeName = newName;
				this.renamingActive = false;
			}

			if (trackHistory) {
				this.historyStore.stopRecordingUndo();
			}
			this.suspendRecordingDetachedConnections = false;
		},
		deleteEveryEndpoint() {
			// Check as it does not exist on first load
			if (this.instance) {
				this.instance?.reset();
				Object.values(this.instance?.endpointsByElement)
					.flatMap((endpoint) => endpoint)
					.forEach((endpoint) => endpoint.destroy());

				this.instance.deleteEveryConnection({ fireEvent: true });
			}
		},
		matchCredentials(node: INodeUi) {
			if (!node.credentials) {
				return;
			}
			Object.entries(node.credentials).forEach(
				([nodeCredentialType, nodeCredentials]: [string, INodeCredentialsDetails]) => {
					const credentialOptions = this.credentialsStore.getCredentialsByType(nodeCredentialType);

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
						const credentialsForId = credentialOptions.find(
							(optionData: ICredentialsResponse) => optionData.id === credentialsId,
						);
						if (credentialsForId) {
							if (
								credentialsForId.name !== nodeCredentials.name ||
								typeof nodeCredentials.id === 'number'
							) {
								node.credentials![nodeCredentialType] = {
									id: credentialsForId.id,
									name: credentialsForId.name,
								};
								this.credentialsUpdated = true;
							}
							return;
						}
					}

					// No match for id found or old credentials type used
					node.credentials![nodeCredentialType] = nodeCredentials;

					// check if only one option with the name would exist
					const credentialsForName = credentialOptions.filter(
						(optionData: ICredentialsResponse) => optionData.name === nodeCredentials.name,
					);

					// only one option exists for the name, take it
					if (credentialsForName.length === 1) {
						node.credentials![nodeCredentialType].id = credentialsForName[0].id;
						this.credentialsUpdated = true;
					}
				},
			);
		},
		async addNodes(nodes: INodeUi[], connections?: IConnections, trackHistory = false) {
			if (!nodes || !nodes.length) {
				return;
			}

			// Before proceeding we must check if all nodes contain the `properties` attribute.
			// Nodes are loaded without this information so we must make sure that all nodes
			// being added have this information.
			await this.loadNodesProperties(
				nodes.map((node) => ({ name: node.type, version: node.typeVersion })),
			);

			// Add the node to the node-list
			let nodeType: INodeTypeDescription | null;
			let foundNodeIssues: INodeIssues | null;
			nodes.forEach((node) => {
				if (!node.id) {
					node.id = uuid();
				}

				nodeType = this.nodeTypesStore.getNodeType(node.type, node.typeVersion);

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
						nodeParameters = NodeHelpers.getNodeParameters(
							nodeType.properties,
							node.parameters,
							true,
							false,
							node,
						);
					} catch (e) {
						console.error(
							this.$locale.baseText('nodeView.thereWasAProblemLoadingTheNodeParametersOfNode') +
								`: "${node.name}"`,
						); // eslint-disable-line no-console
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

				this.workflowsStore.addNode(node);
				if (trackHistory) {
					this.historyStore.pushCommandToUndo(new AddNodeCommand(node));
				}
			});

			// Wait for the node to be rendered
			await Vue.nextTick();

			// Suspend drawing
			this.instance?.setSuspendDrawing(true);

			// Load the connections
			if (connections !== undefined) {
				let connectionData;
				for (const sourceNode of Object.keys(connections)) {
					for (const type of Object.keys(connections[sourceNode])) {
						for (
							let sourceIndex = 0;
							sourceIndex < connections[sourceNode][type].length;
							sourceIndex++
						) {
							const outwardConnections = connections[sourceNode][type][sourceIndex];
							if (!outwardConnections) {
								continue;
							}
							outwardConnections.forEach((targetData) => {
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

								this.__addConnection(connectionData);
							});
						}
					}
				}
			}
			// Now it can draw again
			this.instance?.setSuspendDrawing(false, true);
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
				throw new Error(this.$locale.baseText('nodeView.noNodesGivenToAdd'));
			}

			// Get how many of the nodes of the types which have
			// a max limit set already exist
			const nodeTypesCount = this.getNodeTypesMaxCount();

			let oldName: string;
			let newName: string;
			const createNodes: INode[] = [];

			await this.loadNodesProperties(
				data.nodes.map((node) => ({ name: node.type, version: node.typeVersion })),
			);

			data.nodes.forEach((node) => {
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

				const localized = this.localizeNodeName(node.name, node.type);

				newName = this.uniqueNodeName(localized, newNodeNames);

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
					for (
						sourceIndex = 0;
						sourceIndex < currentConnections[sourceNode][type].length;
						sourceIndex++
					) {
						const nodeSourceConnections = [];
						if (currentConnections[sourceNode][type][sourceIndex]) {
							for (
								connectionIndex = 0;
								connectionIndex < currentConnections[sourceNode][type][sourceIndex].length;
								connectionIndex++
							) {
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
			this.historyStore.startRecordingUndo();
			await this.addNodes(
				Object.values(tempWorkflow.nodes),
				tempWorkflow.connectionsBySourceNode,
				true,
			);

			this.historyStore.stopRecordingUndo();

			this.uiStore.stateIsDirty = true;

			return {
				nodes: Object.values(tempWorkflow.nodes),
				connections: tempWorkflow.connectionsBySourceNode,
			};
		},
		async getSelectedNodesToSave(): Promise<IWorkflowData> {
			const data: IWorkflowData = {
				nodes: [],
				connections: {},
			};

			// Get data of all the selected noes
			let nodeData;
			const exportNodeNames: string[] = [];

			for (const node of this.uiStore.getSelectedNodes) {
				nodeData = this.getNodeDataToSave(node);
				exportNodeNames.push(node.name);

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
				connections = this.workflowsStore.outgoingConnectionsByNodeName(node.name);
				if (Object.keys(connections).length === 0) {
					return;
				}

				// Keep only the connection to node which get also exported
				typeConnections = {};
				for (type of Object.keys(connections)) {
					for (sourceIndex = 0; sourceIndex < connections[type].length; sourceIndex++) {
						connectionToKeep = [];
						for (
							connectionIndex = 0;
							connectionIndex < connections[type][sourceIndex].length;
							connectionIndex++
						) {
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

			return data;
		},
		resetWorkspace() {
			this.workflowsStore.resetWorkflow();

			this.onToggleNodeCreator({ createNodeActive: false });
			this.nodeCreatorStore.setShowScrim(false);

			// Reset nodes
			this.deleteEveryEndpoint();

			if (this.executionWaitingForWebhook) {
				// Make sure that if there is a waiting test-webhook that
				// it gets removed
				this.restApi()
					.removeTestWebhook(this.workflowsStore.workflowId)
					.catch(() => {
						// Ignore all errors
					});
			}
			this.workflowsStore.removeAllConnections({ setStateDirty: false });
			this.workflowsStore.removeAllNodes({ setStateDirty: false, removePinData: true });

			// Reset workflow execution data
			this.workflowsStore.setWorkflowExecutionData(null);
			this.workflowsStore.resetAllNodesIssues();

			this.workflowsStore.setActive(false);
			this.workflowsStore.setWorkflowId(PLACEHOLDER_EMPTY_WORKFLOW_ID);
			this.workflowsStore.setWorkflowName({ newName: '', setStateDirty: false });
			this.workflowsStore.setWorkflowSettings({});
			this.workflowsStore.setWorkflowTagIds([]);

			this.workflowsStore.activeExecutionId = null;
			this.workflowsStore.executingNode = null;
			this.workflowsStore.executionWaitingForWebhook = false;
			this.uiStore.removeActiveAction('workflowRunning');

			this.uiStore.resetSelectedNodes();
			this.uiStore.nodeViewOffsetPosition = [0, 0];

			this.credentialsUpdated = false;
		},
		async loadActiveWorkflows(): Promise<void> {
			await this.workflowsStore.fetchActiveWorkflows();
		},
		async loadNodeTypes(): Promise<void> {
			await this.nodeTypesStore.getNodeTypes();
		},
		async loadCredentialTypes(): Promise<void> {
			await this.credentialsStore.fetchCredentialTypes(true);
		},
		async loadCredentials(): Promise<void> {
			await this.credentialsStore.fetchAllCredentials();
		},
		async loadVariables(): Promise<void> {
			await this.environmentsStore.fetchAllVariables();
		},
		async loadNodesProperties(nodeInfos: INodeTypeNameVersion[]): Promise<void> {
			const allNodes: INodeTypeDescription[] = this.nodeTypesStore.allNodeTypes;

			const nodesToBeFetched: INodeTypeNameVersion[] = [];
			allNodes.forEach((node) => {
				const nodeVersions = Array.isArray(node.version) ? node.version : [node.version];
				if (
					!!nodeInfos.find((n) => n.name === node.name && nodeVersions.includes(n.version)) &&
					!node.hasOwnProperty('properties')
				) {
					nodesToBeFetched.push({
						name: node.name,
						version: Array.isArray(node.version) ? node.version.slice(-1)[0] : node.version,
					});
				}
			});

			if (nodesToBeFetched.length > 0) {
				// Only call API if node information is actually missing
				this.startLoading();
				await this.nodeTypesStore.getNodesInformation(nodesToBeFetched);
				this.stopLoading();
			}
		},
		async onPostMessageReceived(message: MessageEvent) {
			try {
				const json = JSON.parse(message.data);
				if (json && json.command === 'openWorkflow') {
					try {
						await this.importWorkflowExact(json);
						this.isExecutionPreview = false;
					} catch (e) {
						if (window.top) {
							window.top.postMessage(
								JSON.stringify({
									command: 'error',
									message: this.$locale.baseText('openWorkflow.workflowImportError'),
								}),
								'*',
							);
						}
						this.$showMessage({
							title: this.$locale.baseText('openWorkflow.workflowImportError'),
							message: (e as Error).message,
							type: 'error',
						});
					}
				} else if (json && json.command === 'openExecution') {
					try {
						// If this NodeView is used in preview mode (in iframe) it will not have access to the main app store
						// so everything it needs has to be sent using post messages and passed down to child components
						this.isProductionExecutionPreview = json.executionMode !== 'manual';

						await this.openExecution(json.executionId);
						this.isExecutionPreview = true;
					} catch (e) {
						if (window.top) {
							window.top.postMessage(
								JSON.stringify({
									command: 'error',
									message: this.$locale.baseText('nodeView.showError.openExecution.title'),
								}),
								'*',
							);
						}
						this.$showMessage({
							title: this.$locale.baseText('nodeView.showError.openExecution.title'),
							message: (e as Error).message,
							type: 'error',
						});
					}
				}
			} catch (e) {}
		},
		async onImportWorkflowDataEvent(data: IDataObject) {
			await this.importWorkflowData(data.data as IWorkflowDataUpdate, 'file');
		},
		async onImportWorkflowUrlEvent(data: IDataObject) {
			const workflowData = await this.getWorkflowDataFromUrl(data.url as string);
			if (workflowData !== undefined) {
				await this.importWorkflowData(workflowData, 'url');
			}
		},
		addPinDataConnections(pinData: IPinData) {
			Object.keys(pinData).forEach((nodeName) => {
				const node = this.workflowsStore.getNodeByName(nodeName);
				if (!node) {
					return;
				}

				// @ts-ignore
				const connections = this.instance?.getConnections({
					source: node.id,
				}) as Connection[];

				connections.forEach((connection) => {
					NodeViewUtils.addConnectionOutputSuccess(connection, {
						total: pinData[nodeName].length,
						iterations: 0,
					});
				});
			});
		},
		removePinDataConnections(pinData: IPinData) {
			Object.keys(pinData).forEach((nodeName) => {
				const node = this.workflowsStore.getNodeByName(nodeName);
				if (!node) {
					return;
				}

				// @ts-ignore
				const connections = this.instance?.getConnections({
					source: node.id,
				}) as Connection[];

				this.instance.setSuspendDrawing(true);
				connections.forEach(NodeViewUtils.resetConnection);
				this.instance.setSuspendDrawing(false, true);
			});
		},
		onToggleNodeCreator({
			source,
			createNodeActive,
		}: {
			source?: NodeCreatorOpenSource;
			createNodeActive: boolean;
		}) {
			if (createNodeActive === this.createNodeActive) return;

			// Default to the trigger tab in node creator if there's no trigger node yet
			this.nodeCreatorStore.setSelectedView(
				this.containsTrigger ? REGULAR_NODE_CREATOR_VIEW : TRIGGER_NODE_CREATOR_VIEW,
			);

			this.createNodeActive = createNodeActive;

			const mode =
				this.nodeCreatorStore.selectedView === TRIGGER_NODE_CREATOR_VIEW ? 'trigger' : 'regular';

			if (createNodeActive === true) this.nodeCreatorStore.setOpenSource(source);
			this.$externalHooks().run('nodeView.createNodeActiveChanged', {
				source,
				mode,
				createNodeActive,
			});
			this.$telemetry.trackNodesPanel('nodeView.createNodeActiveChanged', {
				source,
				mode,
				createNodeActive,
				workflow_id: this.workflowsStore.workflowId,
			});
		},
		onAddNode(
			nodeTypes: Array<{ nodeTypeName: string; position: XYPosition }>,
			dragAndDrop: boolean,
		) {
			nodeTypes.forEach(({ nodeTypeName, position }, index) => {
				const isManualTrigger = nodeTypeName === MANUAL_TRIGGER_NODE_TYPE;
				const openNDV = !isManualTrigger && (nodeTypes.length === 1 || index > 0);
				void this.addNode(
					nodeTypeName,
					{ position, dragAndDrop },
					openNDV,
					true,
					nodeTypes.length > 1 && index < 1,
				);
				if (index === 0) return;
				// If there's more than one node, we want to connect them
				// this has to be done in mutation subscriber to make sure both nodes already
				// exist
				const actionWatcher = this.workflowsStore.$onAction(({ name, after, args }) => {
					if (name === 'addNode' && args[0].type === nodeTypeName) {
						after(() => {
							const lastAddedNode = this.nodes[this.nodes.length - 1];
							const previouslyAddedNode = this.nodes[this.nodes.length - 2];

							this.$nextTick(() =>
								this.connectTwoNodes(previouslyAddedNode.name, 0, lastAddedNode.name, 0),
							);

							// Position the added node to the right side of the previously added one
							lastAddedNode.position = [
								previouslyAddedNode.position[0] +
									NodeViewUtils.NODE_SIZE * 2 +
									NodeViewUtils.GRID_SIZE,
								previouslyAddedNode.position[1],
							];
							actionWatcher();
						});
					}
				});
			});
		},
		async saveCurrentWorkflowExternal(callback: () => void) {
			await this.saveCurrentWorkflow();
			callback?.();
		},
		setSuspendRecordingDetachedConnections(suspend: boolean) {
			this.suspendRecordingDetachedConnections = suspend;
		},
		onMoveNode({ nodeName, position }: { nodeName: string; position: XYPosition }): void {
			this.workflowsStore.updateNodeProperties({ name: nodeName, properties: { position } });
			const node = this.workflowsStore.getNodeByName(nodeName);
			setTimeout(() => {
				if (node) {
					this.instance?.repaintEverything();
					this.onNodeMoved(node);
				}
			}, 0);
		},
		onRevertAddNode({ node }: { node: INodeUi }): void {
			this.removeNode(node.name, false);
		},
		async onRevertRemoveNode({ node }: { node: INodeUi }): Promise<void> {
			const prevNode = this.workflowsStore.workflow.nodes.find((n) => n.id === node.id);
			if (prevNode) {
				return;
			}
			// For some reason, returning node to canvas with old id
			// makes it's endpoint to render at wrong position
			node.id = uuid();
			await this.addNodes([node]);
		},
		onRevertAddConnection({ connection }: { connection: [IConnection, IConnection] }) {
			this.suspendRecordingDetachedConnections = true;
			this.__removeConnection(connection, true);
			this.suspendRecordingDetachedConnections = false;
		},
		async onRevertRemoveConnection({ connection }: { connection: [IConnection, IConnection] }) {
			this.suspendRecordingDetachedConnections = true;
			this.__addConnection(connection);
			this.suspendRecordingDetachedConnections = false;
		},
		async onRevertNameChange({ currentName, newName }: { currentName: string; newName: string }) {
			await this.renameNode(newName, currentName);
		},
		onRevertEnableToggle({ nodeName, isDisabled }: { nodeName: string; isDisabled: boolean }) {
			const node = this.workflowsStore.getNodeByName(nodeName);
			if (node) {
				this.disableNodes([node]);
			}
		},
	},
	async mounted() {
		this.resetWorkspace();
		this.canvasStore.initInstance(this.$refs.nodeView as HTMLElement);
		this.titleReset();
		window.addEventListener('message', this.onPostMessageReceived);

		this.startLoading();
		const loadPromises = [
			this.loadActiveWorkflows(),
			this.loadCredentials(),
			this.loadCredentialTypes(),
			this.loadVariables(),
		];

		if (this.nodeTypesStore.allNodeTypes.length === 0) {
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
		ready(async () => {
			try {
				try {
					this.bindCanvasEvents();
				} catch {} // This will break if mounted after jsplumb has been initiated from executions preview, so continue if it breaks
				await this.initView();
				if (window.parent) {
					window.parent.postMessage(
						JSON.stringify({ command: 'n8nReady', version: this.rootStore.versionCli }),
						'*',
					);
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
				void this.usersStore.showPersonalizationSurvey();
				this.addPinDataConnections(this.workflowsStore.getPinData || ({} as IPinData));
			}, 0);
		});

		// TODO: This currently breaks since front-end hooks are still not updated to work with pinia store
		this.$externalHooks()
			.run('nodeView.mount')
			.catch((e) => {});

		if (
			this.currentUser?.personalizationAnswers !== null &&
			this.settingsStore.onboardingCallPromptEnabled &&
			this.currentUser &&
			getAccountAge(this.currentUser) <= ONBOARDING_PROMPT_TIMEBOX
		) {
			const onboardingResponse = await this.uiStore.getNextOnboardingPrompt();
			const promptTimeout =
				onboardingResponse.toast_sequence_number === 1 ? FIRST_ONBOARDING_PROMPT_TIMEOUT : 1000;

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
							this.uiStore.openModal(ONBOARDING_CALL_SIGNUP_MODAL_KEY);
						},
					});
				}, promptTimeout);
			}
		}
	},
	activated() {
		const openSideMenu = this.uiStore.addFirstStepOnLoad;
		if (openSideMenu) {
			this.showTriggerCreator(NODE_CREATOR_OPEN_SOURCES.TRIGGER_PLACEHOLDER_BUTTON);
		}
		this.uiStore.addFirstStepOnLoad = false;
		this.bindCanvasEvents();
		document.addEventListener('keydown', this.keyDown);
		document.addEventListener('keyup', this.keyUp);
		window.addEventListener('message', this.onPostMessageReceived);

		this.$root.$on('newWorkflow', this.newWorkflow);
		this.$root.$on('importWorkflowData', this.onImportWorkflowDataEvent);
		this.$root.$on('importWorkflowUrl', this.onImportWorkflowUrlEvent);
		historyBus.on('nodeMove', this.onMoveNode);
		historyBus.on('revertAddNode', this.onRevertAddNode);
		historyBus.on('revertRemoveNode', this.onRevertRemoveNode);
		historyBus.on('revertAddConnection', this.onRevertAddConnection);
		historyBus.on('revertRemoveConnection', this.onRevertRemoveConnection);
		historyBus.on('revertRenameNode', this.onRevertNameChange);
		historyBus.on('enableNodeToggle', this.onRevertEnableToggle);

		dataPinningEventBus.on('pin-data', this.addPinDataConnections);
		dataPinningEventBus.on('unpin-data', this.removePinDataConnections);
		nodeViewEventBus.on('saveWorkflow', this.saveCurrentWorkflowExternal);

		this.canvasStore.isDemo = this.isDemo;
	},
	deactivated() {
		this.unbindCanvasEvents();
		document.removeEventListener('keydown', this.keyDown);
		document.removeEventListener('keyup', this.keyUp);
		window.removeEventListener('message', this.onPostMessageReceived);
		window.removeEventListener('beforeunload', this.onBeforeUnload);

		this.$root.$off('newWorkflow', this.newWorkflow);
		this.$root.$off('importWorkflowData', this.onImportWorkflowDataEvent);
		this.$root.$off('importWorkflowUrl', this.onImportWorkflowUrlEvent);
		historyBus.off('nodeMove', this.onMoveNode);
		historyBus.off('revertAddNode', this.onRevertAddNode);
		historyBus.off('revertRemoveNode', this.onRevertRemoveNode);
		historyBus.off('revertAddConnection', this.onRevertAddConnection);
		historyBus.off('revertRemoveConnection', this.onRevertRemoveConnection);
		historyBus.off('revertRenameNode', this.onRevertNameChange);
		historyBus.off('enableNodeToggle', this.onRevertEnableToggle);

		dataPinningEventBus.off('pin-data', this.addPinDataConnections);
		dataPinningEventBus.off('unpin-data', this.removePinDataConnections);
		nodeViewEventBus.off('saveWorkflow', this.saveCurrentWorkflowExternal);
	},
	destroyed() {
		this.resetWorkspace();
		this.instance.unbind();
		this.instance.destroy();
		this.uiStore.stateIsDirty = false;
		window.removeEventListener('message', this.onPostMessageReceived);
		this.$root.$off('newWorkflow', this.newWorkflow);
		this.$root.$off('importWorkflowData', this.onImportWorkflowDataEvent);
		this.$root.$off('importWorkflowUrl', this.onImportWorkflowUrlEvent);
		this.workflowsStore.setWorkflowId(PLACEHOLDER_EMPTY_WORKFLOW_ID);
	},
});
</script>

<style scoped lang="scss">
.node-view-root {
	position: relative;
	flex: 1;
	overflow: hidden;
	background-color: var(--color-canvas-background);
	width: 100%;
	height: 100%;
	position: relative;
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
	position: absolute;
	display: flex;
	justify-content: center;
	align-items: center;
	left: 50%;
	transform: translateX(-50%);
	bottom: 110px;
	width: auto;

	@media (max-width: $breakpoint-2xs) {
		bottom: 150px;
	}

	button {
		display: flex;
		justify-content: center;
		align-items: center;
		margin-left: 0.625rem;

		&:first-child {
			margin: 0;
		}
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
.drop-add-node-label {
	color: var(--color-text-dark);
	font-weight: 600;
	font-size: 0.8em;
	text-align: center;
	background-color: #ffffff55;
}

.connection-actions {
	&:hover {
		display: block !important;
	}

	> button {
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

<style module lang="scss">
.content {
	position: relative;
	display: flex;
	overflow: auto;
	height: 100%;
	width: 100%;
}

.shake {
	animation: 1s 200ms shake;
}

@keyframes shake {
	10%,
	90% {
		transform: translate3d(-1px, 0, 0);
	}

	20%,
	80% {
		transform: translate3d(2px, 0, 0);
	}

	30%,
	50%,
	70% {
		transform: translate3d(-4px, 0, 0);
	}

	40%,
	60% {
		transform: translate3d(4px, 0, 0);
	}
}
</style>
