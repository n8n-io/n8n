<template>
	<div ref="nodeViewRootRef" :class="$style['content']">
		<div
			id="node-view-root"
			class="node-view-root do-not-select"
			data-test-id="node-view-root"
			@dragover="onDragOver"
			@drop="onDrop"
		>
			<div
				v-touch:tap="touchTap"
				class="node-view-wrapper"
				:class="workflowClasses"
				data-test-id="node-view-wrapper"
				@touchstart="mouseDown"
				@touchend="mouseUp"
				@touchmove="canvasPanning.onMouseMove"
				@mousedown="mouseDown"
				@mouseup="mouseUp"
				@contextmenu="contextMenu.open"
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
					ref="nodeViewRef"
					class="node-view"
					:style="workflowStyle"
					data-test-id="node-view"
				>
					<CanvasAddButton
						v-show="showCanvasAddButton"
						ref="canvasAddButton"
						:style="canvasAddButtonStyle"
						:show-tooltip="!containsTrigger && showTriggerMissingTooltip"
						:position="canvasStore.canvasAddButtonPosition"
						data-test-id="canvas-add-button"
						@click="onCanvasAddButtonCLick"
						@hook:mounted="canvasStore.setRecenteredCanvasAddButtonPosition"
					/>
					<Node
						v-for="nodeData in nodesToRender"
						:key="`${nodeData.id}_node`"
						:name="nodeData.name"
						:is-read-only="isReadOnlyRoute || readOnlyEnv"
						:instance="instance"
						:is-active="!!activeNode && activeNode.name === nodeData.name"
						:hide-actions="pullConnActive"
						:is-production-execution-preview="isProductionExecutionPreview"
						:workflow="currentWorkflowObject"
						:disable-pointer-events="!canOpenNDV"
						:hide-node-issues="hideNodeIssues"
						@deselect-all-nodes="deselectAllNodes"
						@deselect-node="nodeDeselectedByName"
						@node-selected="nodeSelectedByName"
						@run-workflow="onRunNode"
						@moved="onNodeMoved"
						@run="onNodeRun"
						@remove-node="(name) => removeNode(name, true)"
						@toggle-disable-node="(node) => toggleActivationNodes([node])"
					>
						<template #custom-tooltip>
							<span
								v-text="$locale.baseText('nodeView.canvasAddButton.addATriggerNodeBeforeExecuting')"
							/>
						</template>
					</Node>
					<Sticky
						v-for="stickyData in stickiesToRender"
						:key="`${stickyData.id}_sticky`"
						:name="stickyData.name"
						:workflow="currentWorkflowObject"
						:is-read-only="isReadOnlyRoute || readOnlyEnv"
						:instance="instance"
						:is-active="!!activeNode && activeNode.name === stickyData.name"
						:node-view-scale="nodeViewScale"
						:grid-size="GRID_SIZE"
						:hide-actions="pullConnActive"
						@deselect-all-nodes="deselectAllNodes"
						@deselect-node="nodeDeselectedByName"
						@node-selected="nodeSelectedByName"
						@remove-node="(name) => removeNode(name, true)"
					/>
				</div>
			</div>
			<NodeDetailsView
				:read-only="isReadOnlyRoute || readOnlyEnv"
				:renaming="renamingActive"
				:is-production-execution-preview="isProductionExecutionPreview"
				@redraw-node="redrawNode"
				@switch-selected-node="onSwitchSelectedNode"
				@open-connection-node-creator="onOpenConnectionNodeCreator"
				@value-changed="valueChanged"
				@stop-execution="stopExecution"
				@save-keyboard-shortcut="onSaveKeyboardShortcut"
			/>
			<Suspense>
				<div :class="$style.setupCredentialsButtonWrapper">
					<SetupWorkflowCredentialsButton />
				</div>
			</Suspense>
			<Suspense>
				<NodeCreation
					v-if="!isReadOnlyRoute && !readOnlyEnv"
					:create-node-active="createNodeActive"
					:node-view-scale="nodeViewScale"
					@toggle-node-creator="onToggleNodeCreator"
					@add-nodes="onAddNodes"
				/>
			</Suspense>
			<Suspense>
				<CanvasControls />
			</Suspense>
			<Suspense>
				<ContextMenu @action="onContextMenuAction" />
			</Suspense>
			<Suspense>
				<NextStepPopup v-show="isNextStepPopupVisible" @option-selected="onNextStepSelected" />
			</Suspense>
			<div v-if="!isReadOnlyRoute && !readOnlyEnv" class="workflow-execute-wrapper">
				<span
					v-if="!isManualChatOnly"
					@mouseenter="showTriggerMissingToltip(true)"
					@mouseleave="showTriggerMissingToltip(false)"
					@click="onRunContainerClick"
				>
					<KeyboardShortcutTooltip
						:label="runButtonText"
						:shortcut="{ metaKey: true, keys: ['↵'] }"
					>
						<n8n-button
							:loading="workflowRunning"
							:label="runButtonText"
							size="large"
							icon="flask"
							type="primary"
							:disabled="isExecutionDisabled"
							data-test-id="execute-workflow-button"
							@click.stop="onRunWorkflow"
						/>
					</KeyboardShortcutTooltip>
				</span>

				<n8n-button
					v-if="containsChatNodes"
					label="Chat"
					size="large"
					icon="comment"
					type="primary"
					data-test-id="workflow-chat-button"
					@click.stop="onOpenChat"
				/>

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
					data-test-id="stop-execution-button"
					@click.stop="stopExecution"
				/>

				<n8n-icon-button
					v-if="workflowRunning === true && executionWaitingForWebhook === true"
					class="stop-execution"
					icon="stop"
					size="large"
					:title="$locale.baseText('nodeView.stopWaitingForWebhookCall')"
					type="secondary"
					data-test-id="stop-execution-waiting-for-webhook-button"
					@click.stop="stopWaitingForWebhook"
				/>

				<n8n-icon-button
					v-if="
						!isReadOnlyRoute &&
						!readOnlyEnv &&
						workflowExecution &&
						!workflowRunning &&
						!allTriggersDisabled
					"
					:title="$locale.baseText('nodeView.deletesTheCurrentExecutionData')"
					icon="trash"
					size="large"
					data-test-id="clear-execution-data-button"
					@click.stop="clearExecutionData"
				/>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { defineAsyncComponent, defineComponent, nextTick, ref } from 'vue';
import { mapStores, storeToRefs } from 'pinia';

import type {
	Endpoint,
	Connection,
	ConnectionEstablishedParams,
	BeforeDropParams,
	ConnectionDetachedParams,
	ConnectionMovedParams,
	ComponentParameters,
} from '@jsplumb/core';
import {
	EVENT_CONNECTION,
	EVENT_CONNECTION_DETACHED,
	EVENT_CONNECTION_MOVED,
	INTERCEPT_BEFORE_DROP,
} from '@jsplumb/core';
import type { NotificationHandle } from 'element-plus';

import {
	FIRST_ONBOARDING_PROMPT_TIMEOUT,
	MAIN_HEADER_TABS,
	MODAL_CANCEL,
	MODAL_CONFIRM,
	ONBOARDING_CALL_SIGNUP_MODAL_KEY,
	ONBOARDING_PROMPT_TIMEBOX,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	QUICKSTART_NOTE_NAME,
	START_NODE_TYPE,
	STICKY_NODE_TYPE,
	VIEWS,
	WEBHOOK_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	TRIGGER_NODE_CREATOR_VIEW,
	EnterpriseEditionFeature,
	REGULAR_NODE_CREATOR_VIEW,
	NODE_CREATOR_OPEN_SOURCES,
	CHAT_TRIGGER_NODE_TYPE,
	MANUAL_CHAT_TRIGGER_NODE_TYPE,
	WORKFLOW_LM_CHAT_MODAL_KEY,
	AI_NODE_CREATOR_VIEW,
	DRAG_EVENT_DATA_KEY,
	UPDATE_WEBHOOK_ID_NODE_TYPES,
	TIME,
	AI_ASSISTANT_LOCAL_STORAGE_KEY,
	CANVAS_AUTO_ADD_MANUAL_TRIGGER_EXPERIMENT,
} from '@/constants';

import useGlobalLinkActions from '@/composables/useGlobalLinkActions';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import useCanvasMouseSelect from '@/composables/useCanvasMouseSelect';
import { useExecutionDebugging } from '@/composables/useExecutionDebugging';
import { useTitleChange } from '@/composables/useTitleChange';
import { useDataSchema } from '@/composables/useDataSchema';
import { type ContextMenuAction, useContextMenu } from '@/composables/useContextMenu';
import { useUniqueNodeName } from '@/composables/useUniqueNodeName';
import { useI18n } from '@/composables/useI18n';
import { useMessage } from '@/composables/useMessage';
import { useToast } from '@/composables/useToast';

import NodeDetailsView from '@/components/NodeDetailsView.vue';
import ContextMenu from '@/components/ContextMenu/ContextMenu.vue';
import Node from '@/components/Node.vue';
import Sticky from '@/components/Sticky.vue';
import CanvasAddButton from './CanvasAddButton.vue';
import KeyboardShortcutTooltip from '@/components/KeyboardShortcutTooltip.vue';
import NextStepPopup from '@/components/AIAssistantChat/NextStepPopup.vue';
import { v4 as uuid } from 'uuid';
import type {
	IConnection,
	IConnections,
	IDataObject,
	ExecutionSummary,
	INode,
	INodeConnections,
	INodeCredentialsDetails,
	INodeInputConfiguration,
	INodeTypeDescription,
	INodeTypeNameVersion,
	IPinData,
	ITaskData,
	ITelemetryTrackProperties,
	IWorkflowBase,
	Workflow,
	ConnectionTypes,
	INodeOutputConfiguration,
	IRun,
} from 'n8n-workflow';
import {
	deepCopy,
	jsonParse,
	NodeConnectionType,
	nodeConnectionTypes,
	NodeHelpers,
	TelemetryHelpers,
} from 'n8n-workflow';
import type {
	NewConnectionInfo,
	ICredentialsResponse,
	IExecutionResponse,
	IWorkflowDb,
	IWorkflowData,
	INodeUi,
	IUpdateInformation,
	IWorkflowDataUpdate,
	XYPosition,
	ITag,
	INewWorkflowData,
	IWorkflowTemplate,
	IWorkflowToShare,
	IUser,
	INodeUpdatePropertiesInformation,
	NodeCreatorOpenSource,
	AddedNodesAndConnections,
	ToggleNodeCreatorOptions,
	IPushDataExecutionFinished,
	AIAssistantConnectionInfo,
	NodeFilterType,
} from '@/Interface';

import { type RouteLocation, useRouter } from 'vue-router';
import { dataPinningEventBus, nodeViewEventBus } from '@/event-bus';
import { useCanvasStore } from '@/stores/canvas.store';
import { useCollaborationStore } from '@/stores/collaboration.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useEnvironmentsStore } from '@/stores/environments.ee.store';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import { useHistoryStore } from '@/stores/history.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { usePushConnectionStore } from '@/stores/pushConnection.store';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useSegment } from '@/stores/segment.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useTagsStore } from '@/stores/tags.store';
import { useTemplatesStore } from '@/stores/templates.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsEEStore } from '@/stores/workflows.ee.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import * as NodeViewUtils from '@/utils/nodeViewUtils';
import { getAccountAge } from '@/utils/userUtils';
import { getConnectionInfo, getNodeViewTab } from '@/utils/canvasUtils';
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
import type { N8nPlusEndpoint } from '@/plugins/jsplumb/N8nPlusEndpointType';
import {
	N8nPlusEndpointType,
	EVENT_PLUS_ENDPOINT_CLICK,
} from '@/plugins/jsplumb/N8nPlusEndpointType';
import type { N8nAddInputEndpoint } from '@/plugins/jsplumb/N8nAddInputEndpointType';
import {
	EVENT_ADD_INPUT_ENDPOINT_CLICK,
	N8nAddInputEndpointType,
} from '@/plugins/jsplumb/N8nAddInputEndpointType';
import { sourceControlEventBus } from '@/event-bus/source-control';
import {
	getConnectorPaintStyleData,
	OVERLAY_ENDPOINT_ARROW_ID,
	getEndpointScope,
} from '@/utils/nodeViewUtils';
import { useViewStacks } from '@/components/Node/NodeCreator/composables/useViewStacks';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useClipboard } from '@/composables/useClipboard';
import { usePinnedData } from '@/composables/usePinnedData';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useDeviceSupport } from 'n8n-design-system';
import { useDebounce } from '@/composables/useDebounce';
import { useExecutionsStore } from '@/stores/executions.store';
import { useCanvasPanning } from '@/composables/useCanvasPanning';
import { tryToParseNumber } from '@/utils/typesUtils';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { useProjectsStore } from '@/stores/projects.store';
import type { ProjectSharingData } from '@/types/projects.types';
import { ProjectTypes } from '@/types/projects.types';
import { useAIStore } from '@/stores/ai.store';
import { useStorage } from '@/composables/useStorage';
import { isJSPlumbEndpointElement, isJSPlumbConnection } from '@/utils/typeGuards';
import { usePostHog } from '@/stores/posthog.store';

interface AddNodeOptions {
	position?: XYPosition;
	dragAndDrop?: boolean;
	name?: string;
}

const NodeCreation = defineAsyncComponent(
	async () => await import('@/components/Node/NodeCreation.vue'),
);
const CanvasControls = defineAsyncComponent(
	async () => await import('@/components/CanvasControls.vue'),
);
const SetupWorkflowCredentialsButton = defineAsyncComponent(
	async () =>
		await import('@/components/SetupWorkflowCredentialsButton/SetupWorkflowCredentialsButton.vue'),
);

export default defineComponent({
	name: 'NodeView',
	components: {
		NodeDetailsView,
		Node,
		Sticky,
		CanvasAddButton,
		KeyboardShortcutTooltip,
		NodeCreation,
		CanvasControls,
		ContextMenu,
		SetupWorkflowCredentialsButton,
		NextStepPopup,
	},
	async beforeRouteLeave(to, from, next) {
		if (
			getNodeViewTab(to) === MAIN_HEADER_TABS.EXECUTIONS ||
			from.name === VIEWS.TEMPLATE_IMPORT ||
			(getNodeViewTab(to) === MAIN_HEADER_TABS.WORKFLOW && from.name === VIEWS.EXECUTION_DEBUG)
		) {
			next();
			return;
		}
		if (this.uiStore.stateIsDirty && !this.readOnlyEnv) {
			const confirmModal = await this.confirm(
				this.$locale.baseText('generic.unsavedWork.confirmMessage.message'),
				{
					title: this.$locale.baseText('generic.unsavedWork.confirmMessage.headline'),
					type: 'warning',
					confirmButtonText: this.$locale.baseText(
						'generic.unsavedWork.confirmMessage.confirmButtonText',
					),
					cancelButtonText: this.$locale.baseText(
						'generic.unsavedWork.confirmMessage.cancelButtonText',
					),
					showClose: true,
				},
			);
			if (confirmModal === MODAL_CONFIRM) {
				// Make sure workflow id is empty when leaving the editor
				this.workflowsStore.setWorkflowId(PLACEHOLDER_EMPTY_WORKFLOW_ID);
				const saved = await this.workflowHelpers.saveCurrentWorkflow({}, false);
				if (saved) {
					await this.settingsStore.fetchPromptsData();
				}
				this.uiStore.stateIsDirty = false;

				if (from.name === VIEWS.NEW_WORKFLOW) {
					// Replace the current route with the new workflow route
					// before navigating to the new route when saving new workflow.
					await this.$router.replace({
						name: VIEWS.WORKFLOW,
						params: { name: this.currentWorkflow },
					});

					await this.$router.push(to);
				} else {
					this.collaborationStore.notifyWorkflowClosed(this.currentWorkflow);
					next();
				}
			} else if (confirmModal === MODAL_CANCEL) {
				this.collaborationStore.notifyWorkflowClosed(this.currentWorkflow);
				this.workflowsStore.setWorkflowId(PLACEHOLDER_EMPTY_WORKFLOW_ID);
				this.resetWorkspace();
				this.uiStore.stateIsDirty = false;
				next();
			}
		} else {
			this.collaborationStore.notifyWorkflowClosed(this.currentWorkflow);
			next();
		}
	},
	setup() {
		const nodeViewRootRef = ref<HTMLElement | null>(null);
		const nodeViewRef = ref<HTMLElement | null>(null);
		const onMouseMoveEnd = ref<((e: MouseEvent | TouchEvent) => void) | null>(null);
		const router = useRouter();

		const ndvStore = useNDVStore();
		const externalHooks = useExternalHooks();
		const locale = useI18n();
		const contextMenu = useContextMenu();
		const dataSchema = useDataSchema();
		const nodeHelpers = useNodeHelpers();
		const clipboard = useClipboard();
		const { activeNode } = storeToRefs(ndvStore);
		const pinnedData = usePinnedData(activeNode);
		const deviceSupport = useDeviceSupport();
		const { callDebounced } = useDebounce();
		const canvasPanning = useCanvasPanning(nodeViewRootRef, { onMouseMoveEnd });
		const workflowHelpers = useWorkflowHelpers({ router });
		const { runWorkflow, stopCurrentExecution } = useRunWorkflow({ router });

		return {
			locale,
			contextMenu,
			dataSchema,
			nodeHelpers,
			externalHooks,
			clipboard,
			pinnedData,
			deviceSupport,
			canvasPanning,
			nodeViewRootRef,
			nodeViewRef,
			onMouseMoveEnd,
			workflowHelpers,
			runWorkflow,
			stopCurrentExecution,
			callDebounced,
			...useCanvasMouseSelect(),
			...useGlobalLinkActions(),
			...useTitleChange(),
			...useToast(),
			...useMessage(),
			...useUniqueNodeName(),
			...useExecutionDebugging(),
		};
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
			connectionDragScope: {
				type: null,
				connection: null,
			} as { type: string | null; connection: 'source' | 'target' | null },
			renamingActive: false,
			showStickyButton: false,
			isExecutionPreview: false,
			showTriggerMissingTooltip: false,
			workflowData: null as INewWorkflowData | null,
			activeConnection: null as null | Connection,
			isInsertingNodes: false,
			isProductionExecutionPreview: false,
			enterTimer: undefined as undefined | ReturnType<typeof setTimeout>,
			exitTimer: undefined as undefined | ReturnType<typeof setTimeout>,
			readOnlyNotification: null as null | NotificationHandle,
			// jsplumb automatically deletes all loose connections which is in turn recorded
			// in undo history as a user action.
			// This should prevent automatically removed connections from populating undo stack
			suspendRecordingDetachedConnections: false,
			NODE_CREATOR_OPEN_SOURCES,
			eventsAttached: false,
			unloadTimeout: undefined as undefined | ReturnType<typeof setTimeout>,
			canOpenNDV: true,
			hideNodeIssues: false,
		};
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
			useExternalSecretsStore,
			useCollaborationStore,
			usePushConnectionStore,
			useSourceControlStore,
			useExecutionsStore,
			useProjectsStore,
			useAIStore,
		),
		nativelyNumberSuffixedDefaults(): string[] {
			return this.nodeTypesStore.nativelyNumberSuffixedDefaults;
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
			return !this.isLoading && !this.containsTrigger && !this.isDemo && !this.readOnlyEnv;
		},
		lastSelectedNode(): INodeUi | null {
			return this.uiStore.getLastSelectedNode;
		},
		nodes(): INodeUi[] {
			return this.workflowsStore.allNodes;
		},
		nodesToRender(): INodeUi[] {
			return this.workflowsStore.allNodes.filter((node) => node.type !== STICKY_NODE_TYPE);
		},
		stickiesToRender(): INodeUi[] {
			return this.workflowsStore.allNodes.filter((node) => node.type === STICKY_NODE_TYPE);
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
		workflowStyle() {
			const offsetPosition = this.uiStore.nodeViewOffsetPosition;
			return {
				left: offsetPosition[0] + 'px',
				top: offsetPosition[1] + 'px',
			};
		},
		canvasAddButtonStyle() {
			return {
				'pointer-events': this.createNodeActive ? 'none' : 'all',
			};
		},
		backgroundStyle() {
			return NodeViewUtils.getBackgroundStyles(
				this.nodeViewScale,
				this.uiStore.nodeViewOffsetPosition,
				this.isExecutionPreview,
			);
		},
		workflowClasses() {
			const returnClasses = [];
			if (this.ctrlKeyPressed || this.moveCanvasKeyPressed) {
				if (this.uiStore.nodeViewMoveInProgress) {
					returnClasses.push('move-in-process');
				} else {
					returnClasses.push('move-active');
				}
			}
			if (this.selectActive || this.ctrlKeyPressed || this.moveCanvasKeyPressed) {
				// Makes sure that nothing gets selected while select or move is active
				returnClasses.push('do-not-select');
			}

			if (this.connectionDragScope.type) {
				returnClasses.push('connection-drag-scope-active');
				returnClasses.push(`connection-drag-scope-active-type-${this.connectionDragScope.type}`);
				returnClasses.push(
					`connection-drag-scope-active-connection-${this.connectionDragScope.connection}`,
				);
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
			return this.$route.params.name?.toString() || this.workflowsStore.workflowId;
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
		containsChatNodes(): boolean {
			return (
				!this.executionWaitingForWebhook &&
				!!this.nodes.find(
					(node) =>
						[MANUAL_CHAT_TRIGGER_NODE_TYPE, CHAT_TRIGGER_NODE_TYPE].includes(node.type) &&
						node.disabled !== true,
				)
			);
		},
		isManualChatOnly(): boolean {
			if (!this.canvasChatNode) return false;

			return this.containsChatNodes && this.triggerNodes.length === 1 && !this.pinnedChatNodeData;
		},
		canvasChatNode() {
			return this.nodes.find((node) => node.type === CHAT_TRIGGER_NODE_TYPE);
		},
		pinnedChatNodeData() {
			if (!this.canvasChatNode) return null;

			return this.workflowsStore.pinDataByNodeName(this.canvasChatNode.name);
		},
		isExecutionDisabled(): boolean {
			if (
				this.containsChatNodes &&
				this.triggerNodes.every((node) => node.disabled || node.type === CHAT_TRIGGER_NODE_TYPE) &&
				!this.pinnedChatNodeData
			) {
				return true;
			}
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
		isLoading(): boolean {
			return this.canvasStore.isLoading;
		},
		currentWorkflowObject(): Workflow {
			return this.workflowsStore.getCurrentWorkflow();
		},
		readOnlyEnv(): boolean {
			return this.sourceControlStore.preferences.branchReadOnly;
		},
		isReadOnlyRoute() {
			return this.$route?.meta?.readOnlyCanvas === true;
		},
		isNextStepPopupVisible(): boolean {
			return this.aiStore.nextStepPopupConfig.open;
		},
		shouldShowNextStepDialog(): boolean {
			const userHasSeenAIAssistantExperiment =
				useStorage(AI_ASSISTANT_LOCAL_STORAGE_KEY).value === 'true';
			const experimentEnabled = this.aiStore.isAssistantExperimentEnabled;
			const isCloudDeployment = this.settingsStore.isCloudDeployment;
			return isCloudDeployment && experimentEnabled && !userHasSeenAIAssistantExperiment;
		},
	},
	watch: {
		// Listen to route changes and load the workflow accordingly
		async $route(to: RouteLocation, from: RouteLocation) {
			this.readOnlyEnvRouteCheck();

			const currentTab = getNodeViewTab(to);
			const nodeViewNotInitialized = !this.uiStore.nodeViewInitialized;
			let workflowChanged =
				from.params.name !== to.params.name &&
				// Both 'new' and __EMPTY__ are new workflow names, so ignore them when detecting if wf changed
				!(from.params.name === 'new' && this.currentWorkflow === PLACEHOLDER_EMPTY_WORKFLOW_ID) &&
				!(from.name === VIEWS.NEW_WORKFLOW) &&
				// Also ignore if workflow id changes when saving new workflow
				to.params.action !== 'workflowSave';
			const isOpeningTemplate = to.name === VIEWS.TEMPLATE_IMPORT;

			// When entering this tab:
			if (currentTab === MAIN_HEADER_TABS.WORKFLOW || isOpeningTemplate) {
				if (workflowChanged || nodeViewNotInitialized || isOpeningTemplate) {
					this.canvasStore.startLoading();
					if (nodeViewNotInitialized) {
						const previousDirtyState = this.uiStore.stateIsDirty;
						this.resetWorkspace();
						this.uiStore.stateIsDirty = previousDirtyState;
					}
					await this.initView();
					this.canvasStore.stopLoading();
					if (this.blankRedirect) {
						this.blankRedirect = false;
					}
				}
				await this.checkAndInitDebugMode();
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
			const elementRef = this.nodeViewRef;
			if (elementRef) {
				elementRef.style.transform = `scale(${newScale})`;
			}
		},
	},
	errorCaptured: (err) => {
		console.error('errorCaptured');
		console.error(err);
	},
	async mounted() {
		// To be refactored (unref) when migrating to composition API
		this.onMouseMoveEnd = this.mouseUp;

		this.resetWorkspace();
		if (!this.nodeViewRef) {
			this.showError(
				new Error('NodeView reference not found'),
				this.$locale.baseText('nodeView.showError.mounted1.title'),
				this.$locale.baseText('nodeView.showError.mounted1.message') + ':',
			);
			return;
		}
		this.canvasStore.initInstance(this.nodeViewRef);
		this.titleReset();

		window.addEventListener('message', this.onPostMessageReceived);

		this.clipboard.onPaste.value = this.onClipboardPasteEvent;

		this.canvasStore.startLoading();

		const loadPromises = (() => {
			if (this.settingsStore.isPreviewMode && this.isDemo) return [];
			const promises = [this.loadActiveWorkflows(), this.loadCredentialTypes()];
			if (this.settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Variables)) {
				promises.push(this.loadVariables());
			}
			if (this.settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.ExternalSecrets)) {
				promises.push(this.loadSecrets());
			}
			return promises;
		})();

		if (this.nodeTypesStore.allNodeTypes.length === 0) {
			loadPromises.push(this.loadNodeTypes());
		}

		try {
			await Promise.all(loadPromises);
		} catch (error) {
			this.showError(
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
				this.showError(
					error,
					this.$locale.baseText('nodeView.showError.mounted2.title'),
					this.$locale.baseText('nodeView.showError.mounted2.message') + ':',
				);
			}
			this.canvasStore.stopLoading();

			setTimeout(() => {
				void this.usersStore.showPersonalizationSurvey();
				this.addPinDataConnections(this.workflowsStore.pinnedWorkflowData || ({} as IPinData));
			}, 0);
		});

		// TODO: This currently breaks since front-end hooks are still not updated to work with pinia store
		void this.externalHooks.run('nodeView.mount').catch(() => {});

		if (
			this.currentUser?.personalizationAnswers !== null &&
			this.settingsStore.onboardingCallPromptEnabled &&
			this.currentUser &&
			getAccountAge(this.currentUser) <= ONBOARDING_PROMPT_TIMEBOX
		) {
			const onboardingResponse = await this.uiStore.getNextOnboardingPrompt();
			const promptTimeout =
				onboardingResponse?.toast_sequence_number === 1 ? FIRST_ONBOARDING_PROMPT_TIMEOUT : 1000;

			if (onboardingResponse?.title && onboardingResponse?.description) {
				setTimeout(async () => {
					this.showToast({
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

		sourceControlEventBus.on('pull', this.onSourceControlPull);

		this.registerCustomAction({
			key: 'openNodeDetail',
			action: ({ node }: { node: string }) => {
				this.nodeSelectedByName(node, true);
			},
		});

		this.registerCustomAction({
			key: 'openSelectiveNodeCreator',
			action: this.openSelectiveNodeCreator,
		});

		this.registerCustomAction({
			key: 'showNodeCreator',
			action: () => {
				this.ndvStore.activeNodeName = null;

				void this.$nextTick(() => {
					this.showTriggerCreator(NODE_CREATOR_OPEN_SOURCES.TAB);
				});
			},
		});

		this.readOnlyEnvRouteCheck();
		this.canvasStore.isDemo = this.isDemo;
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
		window.addEventListener('pageshow', this.onPageShow);

		nodeViewEventBus.on('newWorkflow', this.newWorkflow);
		nodeViewEventBus.on('importWorkflowData', this.onImportWorkflowDataEvent);
		nodeViewEventBus.on('importWorkflowUrl', this.onImportWorkflowUrlEvent);
		nodeViewEventBus.on('openChat', this.onOpenChat);
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
		window.removeEventListener('pageshow', this.onPageShow);

		nodeViewEventBus.off('newWorkflow', this.newWorkflow);
		nodeViewEventBus.off('importWorkflowData', this.onImportWorkflowDataEvent);
		nodeViewEventBus.off('importWorkflowUrl', this.onImportWorkflowUrlEvent);
		nodeViewEventBus.off('openChat', this.onOpenChat);
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
	beforeMount() {
		if (!this.isDemo) {
			this.pushStore.pushConnect();
		}
		this.collaborationStore.initialize();
	},
	beforeUnmount() {
		// Make sure the event listeners get removed again else we
		// could add up with them registered multiple times
		document.removeEventListener('keydown', this.keyDown);
		document.removeEventListener('keyup', this.keyUp);
		this.unregisterCustomAction('showNodeCreator');
		this.unregisterCustomAction('openNodeDetail');
		this.unregisterCustomAction('openSelectiveNodeCreator');

		if (!this.isDemo) {
			this.pushStore.pushDisconnect();
		}
		this.collaborationStore.terminate();

		this.resetWorkspace();
		this.instance.unbind();
		this.instance.destroy();
		this.uiStore.stateIsDirty = false;
		this.workflowsStore.resetChatMessages();
		window.removeEventListener('message', this.onPostMessageReceived);
		nodeViewEventBus.off('newWorkflow', this.newWorkflow);
		nodeViewEventBus.off('importWorkflowData', this.onImportWorkflowDataEvent);
		nodeViewEventBus.off('importWorkflowUrl', this.onImportWorkflowUrlEvent);
		this.workflowsStore.setWorkflowId(PLACEHOLDER_EMPTY_WORKFLOW_ID);
		sourceControlEventBus.off('pull', this.onSourceControlPull);
	},
	methods: {
		async openSelectiveNodeCreator({
			connectiontype,
			node,
			creatorview,
		}: {
			connectiontype: NodeConnectionType;
			node: string;
			creatorview?: NodeFilterType;
		}) {
			const nodeName = node ?? this.ndvStore.activeNodeName;
			const nodeData = nodeName ? this.workflowsStore.getNodeByName(nodeName) : null;

			this.ndvStore.activeNodeName = null;
			await this.redrawNode(node);
			// Wait for UI to update
			setTimeout(() => {
				if (creatorview) {
					this.onToggleNodeCreator({
						createNodeActive: true,
						nodeCreatorView: creatorview,
					});
				} else if (connectiontype && nodeData) {
					this.insertNodeAfterSelected({
						index: 0,
						endpointUuid: `${nodeData.id}-input${connectiontype}0`,
						eventSource: NODE_CREATOR_OPEN_SOURCES.NOTICE_ERROR_MESSAGE,
						outputType: connectiontype,
						sourceId: nodeData.id,
					});
				}
			});
		},
		editAllowedCheck(): boolean {
			if (this.readOnlyNotification) {
				return false;
			}
			if (this.isReadOnlyRoute || this.readOnlyEnv) {
				this.readOnlyNotification = this.showMessage({
					title: this.$locale.baseText(
						this.readOnlyEnv
							? `readOnlyEnv.showMessage.${this.isReadOnlyRoute ? 'executions' : 'workflows'}.title`
							: 'readOnly.showMessage.executions.title',
					),
					message: this.$locale.baseText(
						this.readOnlyEnv
							? `readOnlyEnv.showMessage.${
									this.isReadOnlyRoute ? 'executions' : 'workflows'
								}.message`
							: 'readOnly.showMessage.executions.message',
					),
					type: 'info',
					dangerouslyUseHTMLString: true,
					onClose: () => {
						this.readOnlyNotification = null;
					},
				});

				return false;
			}
			return true;
		},
		showTriggerMissingToltip(isVisible: boolean) {
			this.showTriggerMissingTooltip = isVisible;
		},
		onRunNode(nodeName: string, source: string) {
			const node = this.workflowsStore.getNodeByName(nodeName);
			const telemetryPayload = {
				node_type: node ? node.type : null,
				workflow_id: this.workflowsStore.workflowId,
				source: 'canvas',
				push_ref: this.ndvStore.pushRef,
			};
			this.$telemetry.track('User clicked execute node button', telemetryPayload);
			void this.externalHooks.run('nodeView.onRunNode', telemetryPayload);
			void this.runWorkflow({ destinationNode: nodeName, source });
		},
		async onOpenChat() {
			const telemetryPayload = {
				workflow_id: this.workflowsStore.workflowId,
			};
			this.$telemetry.track('User clicked chat open button', telemetryPayload);
			void this.externalHooks.run('nodeView.onOpenChat', telemetryPayload);
			this.uiStore.openModal(WORKFLOW_LM_CHAT_MODAL_KEY);
		},
		async onRunWorkflow() {
			void this.workflowHelpers.getWorkflowDataToSave().then((workflowData) => {
				const telemetryPayload = {
					workflow_id: this.workflowsStore.workflowId,
					node_graph_string: JSON.stringify(
						TelemetryHelpers.generateNodesGraph(
							workflowData as IWorkflowBase,
							this.workflowHelpers.getNodeTypes(),
							{ isCloudDeployment: this.settingsStore.isCloudDeployment },
						).nodeGraph,
					),
				};
				this.$telemetry.track('User clicked execute workflow button', telemetryPayload);
				void this.externalHooks.run('nodeView.onRunWorkflow', telemetryPayload);
			});

			await this.runWorkflow({});
			this.refreshEndpointsErrorsState();
		},
		resetEndpointsErrors() {
			const allEndpoints = Object.values(this.instance.getManagedElements()).flatMap(
				(el) => el.endpoints,
			);

			allEndpoints
				.filter((endpoint) => endpoint?.endpoint.type === N8nAddInputEndpointType)
				.forEach((endpoint) => {
					const n8nAddInputEndpoint = endpoint?.endpoint as N8nAddInputEndpoint;
					if (n8nAddInputEndpoint && (endpoint?.connections ?? []).length > 0) {
						n8nAddInputEndpoint.resetError();
					}
				});
		},
		refreshEndpointsErrorsState() {
			const nodeIssues = this.workflowsStore.allNodes.filter((n) => n.issues);
			// Set input color to red if there are issues
			this.resetEndpointsErrors();
			nodeIssues.forEach((node) => {
				const managedNode = this.instance.getManagedElement(node.id);
				const endpoints = this.instance.getEndpoints(managedNode);

				Object.keys(node?.issues?.input ?? {}).forEach((connectionType) => {
					const inputEndpointsWithIssues = endpoints.filter(
						(e) => e._defaultType.scope === connectionType,
					);
					inputEndpointsWithIssues.forEach((endpoint) => {
						const n8nAddInputEndpoint = endpoint?.endpoint as N8nAddInputEndpoint;
						if (n8nAddInputEndpoint) {
							n8nAddInputEndpoint.setError();
						}
					});
				});
			});
		},
		onRunContainerClick() {
			if (this.containsTrigger && !this.allTriggersDisabled) return;

			const message =
				this.containsTrigger && this.allTriggersDisabled
					? this.$locale.baseText('nodeView.addOrEnableTriggerNode')
					: this.$locale.baseText('nodeView.addATriggerNodeFirst');

			const notice = this.showMessage({
				type: 'info',
				title: this.$locale.baseText('nodeView.cantExecuteNoTrigger'),
				message,
				duration: 3000,
				onClick: () =>
					setTimeout(() => {
						// Close the creator panel if user clicked on the link
						if (this.createNodeActive) notice.close();
					}, 0),
				dangerouslyUseHTMLString: true,
			});
		},
		clearExecutionData() {
			this.workflowsStore.workflowExecutionData = null;
			this.nodeHelpers.updateNodesExecutionIssues();
		},
		async onSaveKeyboardShortcut(e: KeyboardEvent) {
			let saved = await this.workflowHelpers.saveCurrentWorkflow();
			if (saved) {
				await this.settingsStore.fetchPromptsData();

				if (this.$route.name === VIEWS.EXECUTION_DEBUG) {
					await this.$router.replace({
						name: VIEWS.WORKFLOW,
						params: { name: this.currentWorkflow },
					});
				}
			}
			if (this.activeNode) {
				// If NDV is open, save will not work from editable input fields
				// so don't show success message if this is true
				if (e.target instanceof HTMLInputElement) {
					saved = e.target.readOnly;
				} else {
					saved = true;
				}
				if (saved) {
					this.showMessage({
						title: this.$locale.baseText('generic.workflowSaved'),
						type: 'success',
					});
				}
			}
		},
		async onCanvasAddButtonCLick(event: PointerEvent) {
			if (event) {
				if (this.shouldShowNextStepDialog) {
					const newNodeButton = (event.target as HTMLElement).closest('button');
					if (newNodeButton) {
						this.aiStore.latestConnectionInfo = null;
						this.aiStore.openNextStepPopup(
							this.$locale.baseText('nextStepPopup.title.firstStep'),
							newNodeButton,
						);
					}
					return;
				}
				this.showTriggerCreator(NODE_CREATOR_OPEN_SOURCES.TRIGGER_PLACEHOLDER_BUTTON);
				return;
			}
		},
		onNextStepSelected(action: string) {
			if (action === 'choose') {
				const lastConnectionInfo = this.aiStore.latestConnectionInfo as NewConnectionInfo;
				if (lastConnectionInfo === null) {
					this.showTriggerCreator(NODE_CREATOR_OPEN_SOURCES.TRIGGER_PLACEHOLDER_BUTTON);
				} else {
					this.insertNodeAfterSelected(lastConnectionInfo);
				}
			}
		},
		showTriggerCreator(source: NodeCreatorOpenSource) {
			if (this.createNodeActive) return;

			this.ndvStore.activeNodeName = null;
			this.nodeCreatorStore.setSelectedView(TRIGGER_NODE_CREATOR_VIEW);
			this.nodeCreatorStore.setShowScrim(true);
			this.onToggleNodeCreator({
				source,
				createNodeActive: true,
				nodeCreatorView: TRIGGER_NODE_CREATOR_VIEW,
			});
		},
		async openExecution(executionId: string) {
			this.canvasStore.startLoading();
			this.resetWorkspace();
			let data: IExecutionResponse | undefined;
			try {
				data = await this.workflowsStore.getExecution(executionId);
			} catch (error) {
				this.showError(error, this.$locale.baseText('nodeView.showError.openExecution.title'));
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

			if (data.workflowData.sharedWithProjects) {
				this.workflowsEEStore.setWorkflowSharedWith({
					workflowId: data.workflowData.id,
					sharedWithProjects: data.workflowData.sharedWithProjects,
				});
			}

			if (data.workflowData.usedCredentials) {
				this.workflowsStore.setUsedCredentials(data.workflowData.usedCredentials);
			}

			await this.addNodes(
				deepCopy(data.workflowData.nodes),
				deepCopy(data.workflowData.connections),
			);
			await this.$nextTick();
			this.canvasStore.zoomToFit();
			this.uiStore.stateIsDirty = false;
			void this.externalHooks.run('execution.open', {
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

				if (
					!nodeErrorFound &&
					(data.data.resultData.error.stack || data.data.resultData.error.message)
				) {
					// Display some more information for now in console to make debugging easier
					console.error(`Execution ${executionId} error:`);
					console.error(data.data.resultData.error.stack);
					this.showMessage({
						title: this.$locale.baseText('nodeView.showError.workflowError'),
						message: data.data.resultData.error.message,
						type: 'error',
						duration: 0,
					});
				}
			}
			if ((data as ExecutionSummary).waitTill) {
				this.showMessage({
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
			this.canvasStore.stopLoading();
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
			await this.$nextTick();
			this.canvasStore.zoomToFit();
		},
		async openWorkflowTemplate(templateId: string) {
			this.canvasStore.startLoading();
			this.canvasStore.setLoadingText(this.$locale.baseText('nodeView.loadingTemplate'));
			this.resetWorkspace();

			this.workflowsStore.currentWorkflowExecutions = [];
			this.executionsStore.activeExecution = null;

			let data: IWorkflowTemplate | undefined;
			try {
				void this.externalHooks.run('template.requested', { templateId });
				data = await this.templatesStore.getFixedWorkflowTemplate(templateId);

				if (!data) {
					throw new Error(
						this.$locale.baseText('nodeView.workflowTemplateWithIdCouldNotBeFound', {
							interpolate: { templateId },
						}),
					);
				}
			} catch (error) {
				this.showError(error, this.$locale.baseText('nodeView.couldntImportWorkflow'));
				await this.$router.replace({ name: VIEWS.NEW_WORKFLOW });
				return;
			}

			this.$telemetry.track(
				'User inserted workflow template',
				{
					source: 'workflow',
					template_id: tryToParseNumber(templateId),
					wf_template_repo_session_id: this.templatesStore.previousSessionId,
				},
				{
					withPostHog: true,
				},
			);

			this.blankRedirect = true;
			await this.$router.replace({ name: VIEWS.NEW_WORKFLOW, query: { templateId } });

			const convertedNodes = data.workflow.nodes.map(
				this.workflowsStore.convertTemplateNodeToNodeUi,
			);
			await this.addNodes(convertedNodes, data.workflow.connections);
			this.workflowData =
				(await this.workflowsStore.getNewWorkflowData(
					data.name,
					this.projectsStore.currentProjectId,
				)) || {};
			this.workflowsStore.addToWorkflowMetadata({ templateId });
			await this.$nextTick();
			this.canvasStore.zoomToFit();
			this.uiStore.stateIsDirty = true;

			void this.externalHooks.run('template.open', {
				templateId,
				templateName: data.name,
				workflow: data.workflow,
			});
			this.canvasStore.stopLoading();
		},
		async openWorkflow(workflow: IWorkflowDb) {
			this.canvasStore.startLoading();

			const selectedExecution = this.executionsStore.activeExecution;

			this.resetWorkspace();

			this.workflowsStore.addWorkflow(workflow);
			this.workflowsStore.setActive(workflow.active || false);
			this.workflowsStore.setWorkflowId(workflow.id);
			this.workflowsStore.setWorkflowName({ newName: workflow.name, setStateDirty: false });
			this.workflowsStore.setWorkflowSettings(workflow.settings ?? {});
			this.workflowsStore.setWorkflowPinData(workflow.pinData ?? {});
			this.workflowsStore.setWorkflowVersionId(workflow.versionId);
			this.workflowsStore.setWorkflowMetadata(workflow.meta);

			if (workflow.sharedWithProjects) {
				this.workflowsEEStore.setWorkflowSharedWith({
					workflowId: workflow.id,
					sharedWithProjects: workflow.sharedWithProjects,
				});
			}

			if (workflow.usedCredentials) {
				this.workflowsStore.setUsedCredentials(workflow.usedCredentials);
			}

			const tags = (workflow.tags ?? []) as ITag[];
			const tagIds = tags.map((tag) => tag.id);
			this.workflowsStore.setWorkflowTagIds(tagIds || []);
			this.tagsStore.upsertTags(tags);

			await this.addNodes(workflow.nodes, workflow.connections);

			if (!this.credentialsUpdated) {
				this.uiStore.stateIsDirty = false;
			}
			this.canvasStore.zoomToFit();
			void this.externalHooks.run('workflow.open', {
				workflowId: workflow.id,
				workflowName: workflow.name,
			});
			if (selectedExecution?.workflowId !== workflow.id) {
				this.executionsStore.activeExecution = null;
				this.workflowsStore.currentWorkflowExecutions = [];
			} else {
				this.executionsStore.activeExecution = selectedExecution;
			}
			this.canvasStore.stopLoading();
			this.collaborationStore.notifyWorkflowOpened(workflow.id);
		},
		touchTap(e: MouseEvent | TouchEvent) {
			if (this.deviceSupport.isTouchDevice) {
				this.mouseDown(e);
			}
		},
		mouseDown(e: MouseEvent | TouchEvent) {
			// Save the location of the mouse click
			this.lastClickPosition = this.getMousePositionWithinNodeView(e);
			if (e instanceof MouseEvent && e.button === 1) {
				this.aiStore.closeNextStepPopup();
				this.moveCanvasKeyPressed = true;
			}

			this.mouseDownMouseSelect(e as MouseEvent, this.moveCanvasKeyPressed);
			this.canvasPanning.onMouseDown(e as MouseEvent, this.moveCanvasKeyPressed);

			// Hide the node-creator
			this.createNodeActive = false;
		},
		mouseUp(e: MouseEvent | TouchEvent) {
			if (e instanceof MouseEvent && e.button === 1) {
				this.moveCanvasKeyPressed = false;
			}
			this.mouseUpMouseSelect(e);
			this.canvasPanning.onMouseUp();
		},
		keyUp(e: KeyboardEvent) {
			if (e.key === this.deviceSupport.controlKeyCode) {
				this.ctrlKeyPressed = false;
			}
			if (e.key === ' ') {
				this.moveCanvasKeyPressed = false;
			}
		},
		async keyDown(e: KeyboardEvent) {
			this.contextMenu.close();
			this.aiStore.closeNextStepPopup();

			const ctrlModifier = this.deviceSupport.isCtrlKeyPressed(e) && !e.shiftKey && !e.altKey;
			const shiftModifier = e.shiftKey && !e.altKey && !this.deviceSupport.isCtrlKeyPressed(e);
			const ctrlAltModifier = this.deviceSupport.isCtrlKeyPressed(e) && e.altKey && !e.shiftKey;
			const noModifierKeys = !this.deviceSupport.isCtrlKeyPressed(e) && !e.shiftKey && !e.altKey;
			const readOnly = this.isReadOnlyRoute || this.readOnlyEnv;

			if (e.key === 's' && ctrlModifier && !readOnly) {
				e.stopPropagation();
				e.preventDefault();

				if (this.isReadOnlyRoute || this.readOnlyEnv) {
					return;
				}

				void this.callDebounced(this.onSaveKeyboardShortcut, { debounceTime: 1000 }, e);

				return;
			}

			const path = e?.composedPath() ?? [];

			// Check if the keys got emitted from a message box or from something
			// else which should ignore the default keybindings
			for (const element of path) {
				if (
					element instanceof HTMLElement &&
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

			if (e.key === 'Escape' && noModifierKeys) {
				this.createNodeActive = false;
				if (this.activeNode) {
					void this.externalHooks.run('dataDisplay.nodeEditingFinished');
					this.ndvStore.activeNodeName = null;
				}

				return;
			}

			// node modal is open
			if (this.activeNode) {
				return;
			}

			const selectedNodes = this.uiStore.getSelectedNodes
				.map((node) => node && this.workflowsStore.getNodeByName(node.name))
				.filter((node) => !!node) as INode[];

			if (e.key === 'd' && noModifierKeys && !readOnly) {
				void this.callDebounced(this.toggleActivationNodes, { debounceTime: 350 }, selectedNodes);
			} else if (e.key === 'd' && ctrlModifier && !readOnly) {
				if (selectedNodes.length > 0) {
					e.preventDefault();
					void this.duplicateNodes(selectedNodes);
				}
			} else if (e.key === 'p' && noModifierKeys && !readOnly) {
				if (selectedNodes.length > 0) {
					e.preventDefault();
					this.togglePinNodes(selectedNodes, 'keyboard-shortcut');
				}
			} else if ((e.key === 'Delete' || e.key === 'Backspace') && noModifierKeys && !readOnly) {
				e.stopPropagation();
				e.preventDefault();

				void this.callDebounced(this.deleteNodes, { debounceTime: 500 }, selectedNodes);
			} else if (e.key === 'Tab' && noModifierKeys && !readOnly) {
				this.onToggleNodeCreator({
					source: NODE_CREATOR_OPEN_SOURCES.TAB,
					createNodeActive: !this.createNodeActive && !this.isReadOnlyRoute && !this.readOnlyEnv,
				});
			} else if (e.key === 'Enter' && ctrlModifier && !readOnly && !this.isExecutionDisabled) {
				void this.onRunWorkflow();
			} else if (e.key === 'S' && shiftModifier && !readOnly) {
				void this.onAddNodes({ nodes: [{ type: STICKY_NODE_TYPE }], connections: [] });
			} else if (e.key === this.deviceSupport.controlKeyCode) {
				this.ctrlKeyPressed = true;
			} else if (e.key === ' ') {
				this.moveCanvasKeyPressed = true;
			} else if (e.key === 'F2' && noModifierKeys && !readOnly) {
				const lastSelectedNode = this.lastSelectedNode;
				if (lastSelectedNode !== null && lastSelectedNode.type !== STICKY_NODE_TYPE) {
					void this.callDebounced(
						this.renameNodePrompt,
						{ debounceTime: 1500 },
						lastSelectedNode.name,
					);
				}
			} else if (e.key === 'a' && ctrlModifier) {
				// Select all nodes
				e.stopPropagation();
				e.preventDefault();

				void this.callDebounced(this.selectAllNodes, { debounceTime: 1000 });
			} else if (e.key === 'c' && ctrlModifier) {
				void this.callDebounced(this.copyNodes, { debounceTime: 1000 }, selectedNodes);
			} else if (e.key === 'x' && ctrlModifier && !readOnly) {
				// Cut nodes
				e.stopPropagation();
				e.preventDefault();

				void this.callDebounced(this.cutNodes, { debounceTime: 1000 }, selectedNodes);
			} else if (e.key === 'n' && ctrlAltModifier) {
				// Create a new workflow
				e.stopPropagation();
				e.preventDefault();
				if (this.isDemo) {
					return;
				}

				if (this.$router.currentRoute.value.name === VIEWS.NEW_WORKFLOW) {
					nodeViewEventBus.emit('newWorkflow');
				} else {
					void this.$router.push({ name: VIEWS.NEW_WORKFLOW });
				}

				this.showMessage({
					title: this.$locale.baseText('nodeView.showMessage.keyDown.title'),
					type: 'success',
				});
			} else if (e.key === 'Enter' && noModifierKeys) {
				// Activate the last selected node
				const lastSelectedNode = this.lastSelectedNode;

				if (lastSelectedNode !== null) {
					if (
						lastSelectedNode.type === STICKY_NODE_TYPE &&
						(this.isReadOnlyRoute || this.readOnlyEnv)
					) {
						return;
					}
					this.ndvStore.activeNodeName = lastSelectedNode.name;
				}
			} else if (e.key === 'ArrowRight' && shiftModifier) {
				// Select all downstream nodes
				e.stopPropagation();
				e.preventDefault();

				void this.callDebounced(this.selectDownstreamNodes, {
					debounceTime: 1000,
				});
			} else if (e.key === 'ArrowRight' && noModifierKeys) {
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

				void this.callDebounced(
					this.nodeSelectedByName,
					{ debounceTime: 100 },
					connections.main[0][0].node,
					false,
					true,
				);
			} else if (e.key === 'ArrowLeft' && shiftModifier) {
				// Select all downstream nodes
				e.stopPropagation();
				e.preventDefault();

				void this.callDebounced(this.selectUpstreamNodes, {
					debounceTime: 1000,
				});
			} else if (e.key === 'ArrowLeft' && noModifierKeys) {
				// Set parent node active
				const lastSelectedNode = this.lastSelectedNode;
				if (lastSelectedNode === null) {
					return;
				}

				const workflow = this.workflowHelpers.getCurrentWorkflow();

				if (!workflow.connectionsByDestinationNode.hasOwnProperty(lastSelectedNode.name)) {
					return;
				}

				const connections = workflow.connectionsByDestinationNode[lastSelectedNode.name];

				if (connections.main === undefined || connections.main.length === 0) {
					return;
				}

				void this.callDebounced(
					this.nodeSelectedByName,
					{ debounceTime: 100 },
					connections.main[0][0].node,
					false,
					true,
				);
			} else if (['ArrowUp', 'ArrowDown'].includes(e.key) && noModifierKeys) {
				// Set sibling node as active

				// Check first if it has a parent node
				const lastSelectedNode = this.lastSelectedNode;
				if (lastSelectedNode === null) {
					return;
				}

				const workflow = this.workflowHelpers.getCurrentWorkflow();

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
					void this.callDebounced(
						this.nodeSelectedByName,
						{ debounceTime: 100 },
						nextSelectNode,
						false,
						true,
					);
				}
			}
		},

		toggleActivationNodes(nodes: INode[]) {
			if (!this.editAllowedCheck()) {
				return;
			}

			this.nodeHelpers.disableNodes(nodes, true);
		},

		togglePinNodes(nodes: INode[], source: 'keyboard-shortcut' | 'context-menu') {
			if (!this.editAllowedCheck()) {
				return;
			}

			this.historyStore.startRecordingUndo();

			const nextStatePinned = nodes.some(
				(node) => !this.workflowsStore.pinDataByNodeName(node.name),
			);

			for (const node of nodes) {
				const pinnedDataForNode = usePinnedData(node);
				if (nextStatePinned) {
					const dataToPin = this.dataSchema.getInputDataWithPinned(node);
					if (dataToPin.length !== 0) {
						pinnedDataForNode.setData(dataToPin, source);
					}
				} else {
					pinnedDataForNode.unsetData(source);
				}
			}

			this.historyStore.stopRecordingUndo();
		},

		deleteNodes(nodes: INode[]) {
			// Copy "selectedNodes" as the nodes get deleted out of selection
			// when they get deleted and if we would use original it would mess
			// with the index and would so not delete all nodes
			this.historyStore.startRecordingUndo();
			nodes.forEach((node) => {
				this.removeNode(node.name, true, false);
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
			const workflow = this.workflowHelpers.getCurrentWorkflow();

			const checkNodes = this.workflowHelpers.getConnectedNodes(
				'upstream',
				workflow,
				lastSelectedNode.name,
			);
			for (const nodeName of checkNodes) {
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
			const workflow = this.workflowHelpers.getCurrentWorkflow();

			const checkNodes = this.workflowHelpers.getConnectedNodes(
				'downstream',
				workflow,
				lastSelectedNode.name,
			);
			for (const nodeName of checkNodes) {
				this.nodeSelectedByName(nodeName);
			}

			// At the end select the previously selected node again
			this.nodeSelectedByName(lastSelectedNode.name);
		},

		pushDownstreamNodes(sourceNodeName: string, margin: number, recordHistory = false) {
			const sourceNode = this.workflowsStore.nodesByName[sourceNodeName];

			const workflow = this.workflowHelpers.getCurrentWorkflow();

			const checkNodes = this.workflowHelpers.getConnectedNodes(
				'downstream',
				workflow,
				sourceNodeName,
			);
			for (const nodeName of checkNodes) {
				const node = this.workflowsStore.nodesByName[nodeName];
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
					(recordHistory && oldPosition[0] !== updateInformation.properties.position[0]) ||
					oldPosition[1] !== updateInformation.properties.position[1]
				) {
					this.historyStore.pushCommandToUndo(
						new MoveNodeCommand(nodeName, oldPosition, updateInformation.properties.position),
						recordHistory,
					);
				}
			}
		},

		cutNodes(nodes: INode[]) {
			const deleteCopiedNodes = !this.isReadOnlyRoute && !this.readOnlyEnv;
			this.copyNodes(nodes, deleteCopiedNodes);
			if (deleteCopiedNodes) {
				this.deleteNodes(nodes);
			}
		},

		copyNodes(nodes: INode[], isCut = false) {
			void this.getNodesToSave(nodes).then((data) => {
				const workflowToCopy: IWorkflowToShare = {
					meta: {
						...(this.workflowsStore.workflow.meta ?? {}),
						instanceId: this.rootStore.instanceId,
					},
					...data,
				};

				this.workflowHelpers.removeForeignCredentialsFromWorkflow(
					workflowToCopy,
					this.credentialsStore.allCredentials,
				);

				const nodeData = JSON.stringify(workflowToCopy, null, 2);

				void this.clipboard.copy(nodeData);
				if (data.nodes.length > 0) {
					if (!isCut) {
						this.showMessage({
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
				await this.executionsStore.stopCurrentExecution(executionId);
			} catch (error) {
				// Execution stop might fail when the execution has already finished. Let's treat this here.
				const execution = await this.workflowsStore.getExecution(executionId);

				if (execution === undefined) {
					// execution finished but was not saved (e.g. due to low connectivity)

					this.workflowsStore.finishActiveExecution({
						executionId,
						data: { finished: true, stoppedAt: new Date() },
					});
					this.workflowsStore.executingNode.length = 0;
					this.uiStore.removeActiveAction('workflowRunning');

					this.titleSet(this.workflowsStore.workflowName, 'IDLE');
					this.showMessage({
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
					this.workflowsStore.executingNode.length = 0;
					this.workflowsStore.setWorkflowExecutionData(executedData as IExecutionResponse);
					this.uiStore.removeActiveAction('workflowRunning');
					this.showMessage({
						title: this.$locale.baseText('nodeView.showMessage.stopExecutionCatch.title'),
						message: this.$locale.baseText('nodeView.showMessage.stopExecutionCatch.message'),
						type: 'success',
					});
				} else {
					this.showError(error, this.$locale.baseText('nodeView.showError.stopExecution.title'));
				}
			}
			this.stopExecutionInProgress = false;
			void this.workflowHelpers.getWorkflowDataToSave().then((workflowData) => {
				const trackProps = {
					workflow_id: this.workflowsStore.workflowId,
					node_graph_string: JSON.stringify(
						TelemetryHelpers.generateNodesGraph(
							workflowData as IWorkflowBase,
							this.workflowHelpers.getNodeTypes(),
							{ isCloudDeployment: this.settingsStore.isCloudDeployment },
						).nodeGraph,
					),
				};

				this.$telemetry.track('User clicked stop workflow execution', trackProps);
			});
		},

		async stopWaitingForWebhook() {
			try {
				await this.workflowsStore.removeTestWebhook(this.workflowsStore.workflowId);
			} catch (error) {
				this.showError(
					error,
					this.$locale.baseText('nodeView.showError.stopWaitingForWebhook.title'),
				);
				return;
			}
		},
		/**
		 * This method gets called when data got pasted into the window
		 */
		async onClipboardPasteEvent(plainTextData: string): Promise<void> {
			if (this.readOnlyEnv) {
				return;
			}

			const currentTab = getNodeViewTab(this.$route);
			if (currentTab === MAIN_HEADER_TABS.WORKFLOW) {
				let workflowData: IWorkflowDataUpdate | undefined;
				if (!this.editAllowedCheck()) {
					return;
				}
				// Check if it is an URL which could contain workflow data
				if (plainTextData.match(/^http[s]?:\/\/.*\.json$/i)) {
					// Pasted data points to a possible workflow JSON file

					if (!this.editAllowedCheck()) {
						return;
					}

					const importConfirm = await this.confirm(
						this.$locale.baseText('nodeView.confirmMessage.onClipboardPasteEvent.message', {
							interpolate: { plainTextData },
						}),
						this.$locale.baseText('nodeView.confirmMessage.onClipboardPasteEvent.headline'),
						{
							type: 'warning',
							confirmButtonText: this.$locale.baseText(
								'nodeView.confirmMessage.onClipboardPasteEvent.confirmButtonText',
							),
							cancelButtonText: this.$locale.baseText(
								'nodeView.confirmMessage.onClipboardPasteEvent.cancelButtonText',
							),
							dangerouslyUseHTMLString: true,
						},
					);

					if (importConfirm !== MODAL_CONFIRM) {
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

				return await this.importWorkflowData(workflowData!, 'paste', false);
			}
		},

		// Returns the workflow data from a given URL. If no data gets found or
		// data is invalid it returns undefined and displays an error message by itself.
		async getWorkflowDataFromUrl(url: string): Promise<IWorkflowDataUpdate | undefined> {
			let workflowData: IWorkflowDataUpdate;

			this.canvasStore.startLoading();
			try {
				workflowData = await this.workflowsStore.getWorkflowFromUrl(url);
			} catch (error) {
				this.canvasStore.stopLoading();
				this.showError(
					error,
					this.$locale.baseText('nodeView.showError.getWorkflowDataFromUrl.title'),
				);
				return;
			}
			this.canvasStore.stopLoading();

			return workflowData;
		},

		// Imports the given workflow data into the current workflow
		async importWorkflowData(
			workflowData: IWorkflowToShare,
			source: string,
			importTags = true,
		): Promise<void> {
			// If it is JSON check if it looks on the first look like data we can use
			if (!workflowData.hasOwnProperty('nodes') || !workflowData.hasOwnProperty('connections')) {
				return;
			}

			try {
				const nodeIdMap: { [prev: string]: string } = {};
				if (workflowData.nodes) {
					const nodeNames = workflowData.nodes.map((node) => node.name);
					workflowData.nodes.forEach((node: INode) => {
						// Provide a new name for nodes that don't have one
						if (!node.name) {
							const nodeType = this.nodeTypesStore.getNodeType(node.type);
							const newName = this.uniqueNodeName(nodeType?.displayName ?? node.type, nodeNames);
							node.name = newName;
							nodeNames.push(newName);
						}
						//generate new webhookId if workflow already contains a node with the same webhookId
						if (node.webhookId && UPDATE_WEBHOOK_ID_NODE_TYPES.includes(node.type)) {
							const isDuplicate = Object.values(
								this.workflowHelpers.getCurrentWorkflow().nodes,
							).some((n) => n.webhookId === node.webhookId);
							if (isDuplicate) {
								node.webhookId = uuid();
							}
						}

						// set all new ids when pasting/importing workflows
						if (node.id) {
							const newId = uuid();
							nodeIdMap[newId] = node.id;
							node.id = newId;
						} else {
							node.id = uuid();
						}
					});
				}

				this.removeUnknownCredentials(workflowData);

				const currInstanceId = this.rootStore.instanceId;

				const nodeGraph = JSON.stringify(
					TelemetryHelpers.generateNodesGraph(
						workflowData as IWorkflowBase,
						this.workflowHelpers.getNodeTypes(),
						{
							nodeIdMap,
							sourceInstanceId:
								workflowData.meta && workflowData.meta.instanceId !== currInstanceId
									? workflowData.meta.instanceId
									: '',
							isCloudDeployment: this.settingsStore.isCloudDeployment,
						},
					).nodeGraph,
				);
				if (source === 'paste') {
					this.$telemetry.track('User pasted nodes', {
						workflow_id: this.workflowsStore.workflowId,
						node_graph_string: nodeGraph,
					});
				} else if (source === 'duplicate') {
					this.$telemetry.track('User duplicated nodes', {
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
				this.workflowHelpers.updateNodePositions(
					workflowData,
					NodeViewUtils.getNewNodePosition(this.nodes, this.lastClickPosition),
				);

				const data = await this.addNodesToWorkflow(workflowData);

				setTimeout(() => {
					(data?.nodes ?? []).forEach((node: INodeUi) => {
						this.nodeSelectedByName(node.name);
					});
				});

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
					setTimeout(() => {
						this.addPinDataConnections(this.workflowsStore.pinnedWorkflowData || ({} as IPinData));
					});
				}
			} catch (error) {
				this.showError(error, this.$locale.baseText('nodeView.showError.importWorkflowData.title'));
			}
		},

		removeUnknownCredentials(workflow: IWorkflowToShare) {
			if (!workflow?.nodes) return;

			for (const node of workflow.nodes) {
				if (!node.credentials) continue;

				for (const [name, credential] of Object.entries(node.credentials)) {
					if (typeof credential === 'string' || credential.id === null) continue;

					if (!this.credentialsStore.getCredentialById(credential.id)) {
						delete node.credentials[name];
					}
				}
			}
		},

		onDragOver(event: DragEvent) {
			event.preventDefault();
		},

		async onDrop(event: DragEvent) {
			if (!event.dataTransfer) {
				return;
			}

			const dropData = jsonParse<AddedNodesAndConnections>(
				event.dataTransfer.getData(DRAG_EVENT_DATA_KEY),
			);
			if (dropData) {
				const mousePosition = this.getMousePositionWithinNodeView(event);
				const insertNodePosition = [
					mousePosition[0] - NodeViewUtils.NODE_SIZE / 2 + NodeViewUtils.GRID_SIZE,
					mousePosition[1] - NodeViewUtils.NODE_SIZE / 2,
				] as XYPosition;

				await this.onAddNodes(dropData, true, insertNodePosition);
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
				this.uiStore.lastSelectedNodeEndpointUuid = null;
				this.canvasStore.newNodeInsertPosition = null;
				this.canvasStore.setLastSelectedConnection(undefined);

				if (setActive) {
					this.ndvStore.activeNodeName = node.name;
				}
			}
		},
		showMaxNodeTypeError(nodeTypeData: INodeTypeDescription) {
			const maxNodes = nodeTypeData.maxNodes;
			this.showMessage({
				title: this.$locale.baseText('nodeView.showMessage.showMaxNodeTypeError.title'),
				message: this.$locale.baseText('nodeView.showMessage.showMaxNodeTypeError.message', {
					adjustToNumber: maxNodes,
					interpolate: { nodeTypeDataDisplayName: nodeTypeData.displayName },
				}),
				type: 'error',
				duration: 0,
			});
		},

		async getNewNodeWithDefaultCredential(
			nodeTypeData: INodeTypeDescription,
			overrides: Partial<INodeUi>,
		) {
			let nodeVersion = nodeTypeData.defaultVersion;

			if (nodeVersion === undefined) {
				nodeVersion = Array.isArray(nodeTypeData.version)
					? nodeTypeData.version.slice(-1)[0]
					: nodeTypeData.version;
			}

			const newNodeData: INodeUi = {
				id: uuid(),
				name: overrides.name ?? (nodeTypeData.defaults.name as string),
				type: nodeTypeData.name,
				typeVersion: nodeVersion,
				position: [0, 0],
				parameters: {},
			};

			const credentialPerType = nodeTypeData.credentials
				?.map((type) => this.credentialsStore.getUsableCredentialByType(type.name))
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

					if (Object.keys(authDisplayOptions).length === 1 && authDisplayOptions.authentication) {
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
				this.showMessage({
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
				this.workflowHelpers.getNodeTypeCount(nodeTypeName) >= nodeTypeData.maxNodes
			) {
				this.showMaxNodeTypeError(nodeTypeData);
				return;
			}

			const newNodeData = await this.getNewNodeWithDefaultCredential(nodeTypeData, {
				name: options.name,
			});

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
					const workflow = this.workflowHelpers.getCurrentWorkflow();

					if (lastSelectedConnection) {
						const sourceNodeType = this.nodeTypesStore.getNodeType(
							lastSelectedNode.type,
							lastSelectedNode.typeVersion,
						);

						if (sourceNodeType) {
							const offsets = [
								[-100, 100],
								[-140, 0, 140],
								[-240, -100, 100, 240],
							];

							const sourceNodeOutputs = NodeHelpers.getNodeOutputs(
								workflow,
								lastSelectedNode,
								sourceNodeType,
							);
							const sourceNodeOutputTypes = NodeHelpers.getConnectionTypes(sourceNodeOutputs);

							const sourceNodeOutputMainOutputs = sourceNodeOutputTypes.filter(
								(output) => output === NodeConnectionType.Main,
							);

							if (sourceNodeOutputMainOutputs.length > 1) {
								const offset = offsets[sourceNodeOutputMainOutputs.length - 2];
								const sourceOutputIndex = lastSelectedConnection.__meta
									? lastSelectedConnection.__meta.sourceOutputIndex
									: 0;
								yOffset = offset[sourceOutputIndex];
							}
						}
					}

					let outputs: Array<ConnectionTypes | INodeOutputConfiguration> = [];
					try {
						// It fails when the outputs are an expression. As those nodes have
						// normally no outputs by default and the only reason we need the
						// outputs here is to calculate the position, it is fine to assume
						// that they have no outputs and are so treated as a regular node
						// with only "main" outputs.
						outputs = NodeHelpers.getNodeOutputs(workflow, newNodeData, nodeTypeData);
					} catch (e) {}
					const outputTypes = NodeHelpers.getConnectionTypes(outputs);
					const lastSelectedNodeType = this.nodeTypesStore.getNodeType(
						lastSelectedNode.type,
						lastSelectedNode.typeVersion,
					);

					// If node has only scoped outputs, position it below the last selected node
					const lastSelectedNodeWorkflow = workflow.getNode(lastSelectedNode.name);
					if (!lastSelectedNodeWorkflow || !lastSelectedNodeType) {
						console.error('Could not find last selected node or node type');
						return;
					}
					if (
						outputTypes.length > 0 &&
						outputTypes.every((outputName) => outputName !== NodeConnectionType.Main)
					) {
						const lastSelectedInputs = NodeHelpers.getNodeInputs(
							workflow,
							lastSelectedNodeWorkflow,
							lastSelectedNodeType,
						);
						const lastSelectedInputTypes = NodeHelpers.getConnectionTypes(lastSelectedInputs);

						const scopedConnectionIndex = (lastSelectedInputTypes || [])
							.filter((input) => input !== NodeConnectionType.Main)
							.findIndex((inputType) => outputs[0] === inputType);

						newNodeData.position = NodeViewUtils.getNewNodePosition(
							this.nodes,
							[
								lastSelectedNode.position[0] +
									(NodeViewUtils.NODE_SIZE /
										(Math.max(lastSelectedNodeType?.inputs?.length ?? 1), 1)) *
										scopedConnectionIndex,
								lastSelectedNode.position[1] + NodeViewUtils.PUSH_NODES_OFFSET,
							],
							[100, 0],
						);
					} else {
						// Has only main outputs or no outputs at all
						const inputs = NodeHelpers.getNodeInputs(
							workflow,
							lastSelectedNode,
							lastSelectedNodeType,
						);
						const inputsTypes = NodeHelpers.getConnectionTypes(inputs);

						let pushOffset = NodeViewUtils.PUSH_NODES_OFFSET;
						if (!!inputsTypes.find((input) => input !== NodeConnectionType.Main)) {
							// If the node has scoped inputs, push it down a bit more
							pushOffset += 150;
						}

						// If a node is active then add the new node directly after the current one
						newNodeData.position = NodeViewUtils.getNewNodePosition(
							this.nodes,
							[lastSelectedNode.position[0] + pushOffset, lastSelectedNode.position[1] + yOffset],
							[100, 0],
						);
					}
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

			const localizedName = this.locale.localizeNodeName(newNodeData.name, newNodeData.type);

			newNodeData.name = this.uniqueNodeName(localizedName);

			if (nodeTypeData.webhooks?.length) {
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
				void this.externalHooks.run('nodeView.addNodeButton', { nodeTypeName });
				useSegment().trackAddedTrigger(nodeTypeName);
				const trackProperties: ITelemetryTrackProperties = {
					node_type: nodeTypeName,
					node_version: newNodeData.typeVersion,
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
			type: ConnectionTypes,
		): IConnection | undefined {
			const nodeConnections =
				this.workflowsStore.outgoingConnectionsByNodeName(sourceNodeName)[type];
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
			targetNodeOutputIndex: number,
			type: NodeConnectionType,
		) {
			this.uiStore.stateIsDirty = true;

			const sourceNode = this.workflowsStore.getNodeByName(sourceNodeName);
			const targetNode = this.workflowsStore.getNodeByName(targetNodeName);

			if (
				sourceNode &&
				targetNode &&
				!this.checkNodeConnectionAllowed(sourceNode, targetNode, type)
			) {
				return;
			}

			if (
				this.getConnection(
					sourceNodeName,
					sourceNodeOutputIndex,
					targetNodeName,
					targetNodeOutputIndex,
					type,
				)
			) {
				return;
			}

			const connectionData = [
				{
					node: sourceNodeName,
					type,
					index: sourceNodeOutputIndex,
				},
				{
					node: targetNodeName,
					type,
					index: targetNodeOutputIndex,
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

			const lastSelectedNode = this.lastSelectedNode;
			const lastSelectedNodeOutputIndex = this.uiStore.lastSelectedNodeOutputIndex;
			const lastSelectedNodeEndpointUuid = this.uiStore.lastSelectedNodeEndpointUuid;
			const lastSelectedConnection = this.canvasStore.lastSelectedConnection;

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
			const targetEndpoint = lastSelectedNodeEndpointUuid || '';

			// Handle connection of scoped_endpoint types
			if (lastSelectedNodeEndpointUuid && !isAutoAdd && lastSelectedNode) {
				const lastSelectedEndpoint = this.instance.getEndpoint(lastSelectedNodeEndpointUuid);
				if (
					lastSelectedEndpoint &&
					this.checkNodeConnectionAllowed(
						lastSelectedNode,
						newNodeData,
						lastSelectedEndpoint.scope as NodeConnectionType,
					)
				) {
					const connectionType = lastSelectedEndpoint.scope as ConnectionTypes;
					const newNodeElement = this.instance.getManagedElement(newNodeData.id);
					const newNodeConnections = this.instance.getEndpoints(newNodeElement);
					const viableConnection = newNodeConnections.find((conn) => {
						return (
							conn.scope === connectionType &&
							lastSelectedEndpoint.parameters.connection !== conn.parameters.connection
						);
					});

					this.instance?.connect({
						uuids: [targetEndpoint, viableConnection?.uuid || ''],
						detachable: !this.isReadOnlyRoute && !this.readOnlyEnv,
					});
					this.historyStore.stopRecordingUndo();
					return;
				}
			}
			// If a node is last selected then connect between the active and its child ones
			if (lastSelectedNode && !isAutoAdd) {
				await this.$nextTick();

				if (lastSelectedConnection?.__meta) {
					this.__deleteJSPlumbConnection(lastSelectedConnection, trackHistory);

					const targetNodeName = lastSelectedConnection.__meta.targetNodeName;
					const targetOutputIndex = lastSelectedConnection.__meta.targetOutputIndex;
					this.connectTwoNodes(
						newNodeData.name,
						0,
						targetNodeName,
						targetOutputIndex,
						NodeConnectionType.Main,
					);
				}

				// Connect active node to the newly created one
				this.connectTwoNodes(
					lastSelectedNode.name,
					outputIndex,
					newNodeData.name,
					0,
					NodeConnectionType.Main,
				);
			}
			this.historyStore.stopRecordingUndo();
		},
		getNodeCreatorFilter(nodeName: string, outputType?: NodeConnectionType) {
			let filter;
			const workflow = this.workflowHelpers.getCurrentWorkflow();
			const workflowNode = workflow.getNode(nodeName);
			if (!workflowNode) return { nodes: [] };

			const nodeType = this.nodeTypesStore.getNodeType(
				workflowNode?.type,
				workflowNode.typeVersion,
			);
			if (nodeType) {
				const inputs = NodeHelpers.getNodeInputs(workflow, workflowNode, nodeType);

				const filterFound = inputs.filter((input) => {
					if (typeof input === 'string' || input.type !== outputType || !input.filter) {
						// No filters defined or wrong connection type
						return false;
					}

					return true;
				}) as INodeInputConfiguration[];

				if (filterFound.length) {
					filter = filterFound[0].filter;
				}
			}

			return filter;
		},
		insertNodeAfterSelected(info: AIAssistantConnectionInfo) {
			const type = info.outputType ?? NodeConnectionType.Main;
			// Get the node and set it as active that new nodes
			// which get created get automatically connected
			// to it.
			const sourceNode = this.workflowsStore.getNodeById(info.sourceId);
			if (!sourceNode) {
				return;
			}

			this.uiStore.lastSelectedNode = sourceNode.name;
			this.uiStore.lastSelectedNodeEndpointUuid =
				info.endpointUuid ?? info.connection?.target.jtk?.endpoint.uuid;
			this.uiStore.lastSelectedNodeOutputIndex = info.index;
			this.canvasStore.newNodeInsertPosition = null;

			if (info.connection) {
				this.canvasStore.setLastSelectedConnection(info.connection);
			}

			this.onToggleNodeCreator({
				source: info.eventSource,
				createNodeActive: true,
				nodeCreatorView: info.nodeCreatorView,
			});

			// TODO: The animation is a bit glitchy because we're updating view stack immediately
			// after the node creator is opened
			const isOutput = info.connection?.endpoints[0].parameters.connection === 'source';
			const isScopedConnection =
				type !== NodeConnectionType.Main && nodeConnectionTypes.includes(type);

			if (isScopedConnection) {
				useViewStacks()
					.gotoCompatibleConnectionView(
						type,
						isOutput,
						this.getNodeCreatorFilter(sourceNode.name, type),
					)
					.catch(() => {});
			}
		},
		async onEventConnectionAbort(connection: Connection) {
			try {
				if (this.dropPrevented) {
					this.dropPrevented = false;
					return;
				}
				if (this.pullConnActiveNodeName) {
					const sourceNode = this.workflowsStore.getNodeById(connection.parameters.nodeId);
					const connectionType = connection.parameters.type ?? NodeConnectionType.Main;
					const overrideTargetEndpoint = connection?.connector
						?.overrideTargetEndpoint as Endpoint | null;

					if (sourceNode) {
						const isTarget = connection.parameters.connection === 'target';
						const sourceNodeName = isTarget ? this.pullConnActiveNodeName : sourceNode.name;
						const targetNodeName = isTarget ? sourceNode.name : this.pullConnActiveNodeName;
						const outputIndex = connection.parameters.index;
						NodeViewUtils.resetConnectionAfterPull(connection);
						await this.$nextTick();

						this.connectTwoNodes(
							sourceNodeName,
							outputIndex,
							targetNodeName,
							overrideTargetEndpoint?.parameters?.index ?? 0,
							connectionType,
						);
						this.pullConnActiveNodeName = null;
						this.dropPrevented = false;
					}
					return;
				}
				// When connection is aborted, we want to show the 'Next step' popup
				const endpointId = `${connection.parameters.nodeId}-output${connection.parameters.index}`;
				const endpoint = connection.instance.getEndpoint(endpointId);
				// First, show node creator if endpoint is not a plus endpoint
				// or if the AI Assistant experiment doesn't need to be shown to user
				if (!endpoint?.endpoint?.canvas || !this.shouldShowNextStepDialog) {
					this.insertNodeAfterSelected({
						sourceId: connection.parameters.nodeId,
						index: connection.parameters.index,
						eventSource: NODE_CREATOR_OPEN_SOURCES.NODE_CONNECTION_DROP,
						connection,
						outputType: connection.parameters.type,
					});
					return;
				}
				// Else render the popup
				const endpointElement: HTMLElement = endpoint.endpoint.canvas;
				// Use observer to trigger the popup once the endpoint is rendered back again
				// after connection drag is aborted (so we can get it's position and dimensions)
				const observer = new MutationObserver((mutations) => {
					// Find the mutation in which the current endpoint becomes visible again
					const endpointMutation = mutations.find((mutation) => {
						const target = mutation.target;

						return (
							isJSPlumbEndpointElement(target) &&
							target.jtk?.endpoint?.uuid === endpoint.uuid &&
							target.style.display === 'block'
						);
					});
					if (endpointMutation) {
						// When found, display the popup
						const newConnectionInfo: AIAssistantConnectionInfo = {
							sourceId: connection.parameters.nodeId,
							index: connection.parameters.index,
							eventSource: NODE_CREATOR_OPEN_SOURCES.NODE_CONNECTION_DROP,
							outputType: connection.parameters.type,
							endpointUuid: endpoint.uuid,
							stepName: endpoint.__meta.nodeName,
						};
						this.aiStore.latestConnectionInfo = newConnectionInfo;
						this.aiStore.openNextStepPopup(
							this.$locale.baseText('nextStepPopup.title.nextStep'),
							endpointElement,
						);
						observer.disconnect();
						return;
					}
				});
				observer.observe(this.$refs.nodeViewRef as HTMLElement, {
					attributes: true,
					attributeFilter: ['style'],
					subtree: true,
				});
			} catch (e) {
				console.error(e);
			}
		},
		checkNodeConnectionAllowed(
			sourceNode: INodeUi,
			targetNode: INodeUi,
			targetInfoType: NodeConnectionType,
		): boolean {
			const targetNodeType = this.nodeTypesStore.getNodeType(
				targetNode.type,
				targetNode.typeVersion,
			);

			if (targetNodeType?.inputs?.length) {
				const workflow = this.workflowHelpers.getCurrentWorkflow();
				const workflowNode = workflow.getNode(targetNode.name);
				let inputs: Array<ConnectionTypes | INodeInputConfiguration> = [];
				if (targetNodeType && workflowNode) {
					inputs = NodeHelpers.getNodeInputs(workflow, workflowNode, targetNodeType);
				}

				for (const input of inputs || []) {
					if (typeof input === 'string' || input.type !== targetInfoType || !input.filter) {
						// No filters defined or wrong connection type
						continue;
					}

					if (input.filter.nodes.length) {
						if (!input.filter.nodes.includes(sourceNode.type)) {
							this.dropPrevented = true;
							this.showToast({
								title: this.$locale.baseText('nodeView.showError.nodeNodeCompatible.title'),
								message: this.$locale.baseText('nodeView.showError.nodeNodeCompatible.message', {
									interpolate: { sourceNodeName: sourceNode.name, targetNodeName: targetNode.name },
								}),
								type: 'error',
								duration: 5000,
							});
							return false;
						}
					}
				}
			}
			return true;
		},
		onInterceptBeforeDrop(info: BeforeDropParams) {
			try {
				let sourceInfo: ComponentParameters;
				let targetInfo: ComponentParameters;
				if (info.connection.endpoints[0].parameters.connection === 'target') {
					sourceInfo = info.dropEndpoint.parameters;
					targetInfo = info.connection.endpoints[0].parameters;
				} else {
					sourceInfo = info.connection.endpoints[0].parameters;
					targetInfo = info.dropEndpoint.parameters;
				}

				if (
					sourceInfo.type !== targetInfo.type ||
					sourceInfo.connection === targetInfo.connection
				) {
					this.dropPrevented = true;
					return false;
				}

				const sourceNode = this.workflowsStore.getNodeById(sourceInfo.nodeId);
				const targetNode = this.workflowsStore.getNodeById(targetInfo.nodeId);

				const sourceNodeName = sourceNode?.name || '';
				const targetNodeName = targetNode?.name || '';

				if (sourceNode && targetNode) {
					if (!this.checkNodeConnectionAllowed(sourceNode, targetNode, targetInfo.type)) {
						return false;
					}
				}

				// check for duplicates
				if (
					this.getConnection(
						sourceNodeName,
						sourceInfo.index,
						targetNodeName,
						targetInfo.index,
						sourceInfo.type,
					)
				) {
					this.dropPrevented = true;
					this.pullConnActiveNodeName = null;
					return false;
				}

				return true;
			} catch (e) {
				console.error(e);
				return true;
			}
		},
		onEventConnection(info: ConnectionEstablishedParams) {
			try {
				if (info.sourceEndpoint.parameters.connection === 'target') {
					// Allow that not "main" connections can also be dragged the other way around
					// so switch them around if necessary
					const tempEndpoint = info.sourceEndpoint;
					info.sourceEndpoint = info.targetEndpoint;
					info.targetEndpoint = tempEndpoint;
				}

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

				if (!sourceNodeName || !targetNodeName) {
					console.error('Could not find source or target node name');
					return;
				}
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

				if (!this.isReadOnlyRoute && !this.readOnlyEnv) {
					NodeViewUtils.hideOutputNameLabel(info.sourceEndpoint);
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

					const endpointArrow = NodeViewUtils.getOverlay(
						info.connection,
						OVERLAY_ENDPOINT_ARROW_ID,
					);
					if (sourceInfo.type !== NodeConnectionType.Main) {
						// Not "main" connections get a different connection style
						info.connection.setPaintStyle(
							getConnectorPaintStyleData(info.connection, info.sourceEndpoint.parameters.category),
						);
						endpointArrow?.setVisible(false);
					}
				}
				this.dropPrevented = false;
				if (!this.isLoading) {
					this.uiStore.stateIsDirty = true;
					if (!this.suspendRecordingDetachedConnections) {
						this.historyStore.pushCommandToUndo(new AddConnectionCommand(connectionData));
					}
					// When we add multiple nodes, this event could be fired hundreds of times for large workflows.
					// And because the updateNodesInputIssues() method is quite expensive, we only call it if not in insert mode
					if (!this.isInsertingNodes) {
						this.nodeHelpers.updateNodesInputIssues();
						this.resetEndpointsErrors();
						setTimeout(() => {
							NodeViewUtils.addConnectionTestData(
								info.source,
								info.target,
								info.connection?.connector?.hasOwnProperty('canvas')
									? info.connection.connector.canvas
									: undefined,
							);
						}, 0);
					}
				}
			} catch (e) {
				console.error(e);
			}
		},
		addConectionsTestData() {
			this.instance.connections.forEach((connection) => {
				NodeViewUtils.addConnectionTestData(
					connection.source,
					connection.target,
					connection?.connector?.hasOwnProperty('canvas')
						? connection?.connector.canvas
						: undefined,
				);
			});
		},
		onDragMove() {
			const totalNodes = this.nodes.length;
			void this.callDebounced(this.updateConnectionsOverlays, {
				debounceTime: totalNodes > 20 ? 200 : 0,
			});
		},
		updateConnectionsOverlays() {
			this.instance?.connections.forEach((connection) => {
				NodeViewUtils.showOrHideItemsLabel(connection);
				NodeViewUtils.showOrHideMidpointArrow(connection);

				Object.values(connection.overlays).forEach((overlay) => {
					if (!overlay.canvas) return;
					this.instance?.repaint(overlay.canvas);
				});
			});
		},
		isConnectionActive(connection: Connection | null) {
			if (!connection?.id || !this.activeConnection?.id) return false;

			return this.activeConnection?.id === connection.id;
		},
		onConnectionMouseOver(connection: Connection) {
			try {
				if (this.exitTimer !== undefined) {
					clearTimeout(this.exitTimer);
					this.exitTimer = undefined;
				}

				if (
					// eslint-disable-next-line no-constant-binary-expression
					this.isReadOnlyRoute ??
					this.readOnlyEnv ??
					this.enterTimer ??
					!connection ??
					this.isConnectionActive(connection)
				)
					return;

				this.enterTimer = setTimeout(() => {
					// If there is already an active connection then hide it first
					if (
						this.activeConnection &&
						!this.isConnectionActive(connection) &&
						isJSPlumbConnection(this.activeConnection)
					) {
						NodeViewUtils.hideConnectionActions(this.activeConnection);
					}
					this.enterTimer = undefined;
					if (connection) {
						NodeViewUtils.showConnectionActions(connection);
						this.activeConnection = connection;
					}
				}, 150);
			} catch (e) {
				console.error(e);
			}
		},
		onConnectionMouseOut(connection: Connection) {
			try {
				if (this.exitTimer) return;

				if (this.enterTimer) {
					clearTimeout(this.enterTimer);
					this.enterTimer = undefined;
				}

				if (
					// eslint-disable-next-line no-constant-binary-expression
					this.isReadOnlyRoute ??
					this.readOnlyEnv ??
					!connection ??
					!this.isConnectionActive(connection)
				)
					return;

				this.exitTimer = setTimeout(() => {
					this.exitTimer = undefined;

					if (
						connection &&
						this.isConnectionActive(connection) &&
						isJSPlumbConnection(this.activeConnection)
					) {
						NodeViewUtils.hideConnectionActions(this.activeConnection);
						this.activeConnection = null;
					}
				}, 500);
			} catch (e) {
				console.error(e);
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
				console.error(e);
			}
		},
		onEndpointMouseOver(endpoint: Endpoint, mouse: MouseEvent) {
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
				if (info.sourceEndpoint.parameters.connection === 'target') {
					// Allow that not "main" connections can also be dragged the other way around
					const tempEndpoint = info.sourceEndpoint;
					info.sourceEndpoint = info.targetEndpoint;
					info.targetEndpoint = tempEndpoint;
				}

				const connectionInfo: [IConnection, IConnection] | null = getConnectionInfo(info);
				NodeViewUtils.resetInputLabelPosition(info.targetEndpoint);
				NodeViewUtils.showOutputNameLabel(info.sourceEndpoint, info.connection);

				info.connection.removeOverlays();
				this.__removeConnectionByConnectionInfo(info, false, false);

				if (this.pullConnActiveNodeName) {
					// establish new connection when dragging connection from one node to another
					this.historyStore.startRecordingUndo();
					const sourceNode = this.workflowsStore.getNodeById(info.connection.parameters.nodeId);

					if (!sourceNode) {
						throw new Error('Could not find source node');
					}

					const sourceNodeName = sourceNode.name;
					const outputIndex = info.connection.parameters.index;
					const overrideTargetEndpoint = info.connection.connector
						.overrideTargetEndpoint as Endpoint | null;

					if (connectionInfo) {
						this.historyStore.pushCommandToUndo(new RemoveConnectionCommand(connectionInfo));
					}
					this.connectTwoNodes(
						sourceNodeName,
						outputIndex,
						this.pullConnActiveNodeName,
						overrideTargetEndpoint?.parameters?.index ?? 0,
						NodeConnectionType.Main,
					);
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
					const removeCommand = new RemoveConnectionCommand(connectionInfo);
					this.historyStore.pushCommandToUndo(removeCommand);
				}

				void this.nodeHelpers.updateNodesInputIssues();
			} catch (e) {
				console.error(e);
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
				NodeViewUtils.hideConnectionActions(connection);
				NodeViewUtils.resetConnection(connection);

				const scope = connection.scope as ConnectionTypes;
				const scopedEndpoints = Array.from(
					document.querySelectorAll(`[data-jtk-scope-${scope}=true]`),
				);
				const connectionType = connection.parameters.connection;
				const requiredType = connectionType === 'source' ? 'target' : 'source';

				const filteredEndpoints = scopedEndpoints.filter((el) => {
					if (!isJSPlumbEndpointElement(el)) return false;

					const endpoint = el.jtk.endpoint;
					if (!endpoint) return false;

					// Prevent snapping(but not connecting) to the same node
					const isSameNode = endpoint.parameters.nodeId === connection.parameters.nodeId;
					const endpointType = endpoint.parameters.connection;

					return !isSameNode && endpointType === requiredType;
				});

				const onMouseMove = (e: MouseEvent | TouchEvent) => {
					if (!connection) {
						return;
					}

					const intersectingEndpoints = filteredEndpoints
						.filter((element: Element) => {
							if (!isJSPlumbEndpointElement(element)) return false;
							const endpoint = element.jtk.endpoint as Endpoint;

							if (element.classList.contains('jtk-floating-endpoint')) {
								return false;
							}
							const isEndpointIntersect = NodeViewUtils.isElementIntersection(element, e, 50);
							const isNodeElementIntersect = NodeViewUtils.isElementIntersection(
								endpoint.element,
								e,
								30,
							);

							if (isEndpointIntersect || isNodeElementIntersect) {
								const node = this.workflowsStore.getNodeById(endpoint.parameters.nodeId);

								if (node) {
									const nodeType = this.nodeTypesStore.getNodeType(node.type, node.typeVersion);

									if (!nodeType) return false;

									return true;
								}
							}

							return false;
						})
						.sort((a, b) => {
							const aEndpointIntersect = NodeViewUtils.calculateElementIntersection(a, e, 50);
							const bEndpointIntersect = NodeViewUtils.calculateElementIntersection(b, e, 50);

							// If both intersections are null, treat them as equal
							if (!aEndpointIntersect?.y && !bEndpointIntersect?.y) {
								return 0;
							}

							// If one intersection is null, sort the non-null one first
							if (!aEndpointIntersect?.y) return 1;
							if (!bEndpointIntersect?.y) return -1;

							// Otherwise, sort by ascending Y distance
							return bEndpointIntersect.y - aEndpointIntersect.y;
						});

					if (
						intersectingEndpoints.length > 0 &&
						isJSPlumbEndpointElement(intersectingEndpoints[0])
					) {
						const intersectingEndpoint = intersectingEndpoints[0];
						const endpoint = intersectingEndpoint.jtk.endpoint as Endpoint;
						const node = this.workflowsStore.getNodeById(endpoint.parameters.nodeId);

						this.pullConnActiveNodeName = node?.name ?? null;

						NodeViewUtils.showDropConnectionState(connection, endpoint);
					} else {
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

					this.connectionDragScope = {
						type: null,
						connection: null,
					};
				};

				window.addEventListener('mousemove', onMouseMove);
				window.addEventListener('touchmove', onMouseMove);
				window.addEventListener('mouseup', onMouseUp);
				window.addEventListener('touchend', onMouseMove);

				this.connectionDragScope = {
					type: connection.parameters.type,
					connection: connection.parameters.connection,
				};
			} catch (e) {
				console.error(e);
			}
		},
		onConnectionDragAbortDetached() {
			Object.values(this.instance?.endpointsByElement)
				.flatMap((endpoints) => Object.values(endpoints))
				.filter((endpoint) => endpoint.endpoint.type === 'N8nPlus')
				.forEach((endpoint) => setTimeout(() => endpoint.instance.revalidate(endpoint.element), 0));
		},
		onPlusEndpointClick(endpoint: Endpoint) {
			if (this.shouldShowNextStepDialog) {
				if (endpoint?.__meta) {
					this.aiStore.latestConnectionInfo = {
						sourceId: endpoint.__meta.nodeId,
						index: endpoint.__meta.index,
						eventSource: NODE_CREATOR_OPEN_SOURCES.PLUS_ENDPOINT,
						outputType: getEndpointScope(endpoint.scope),
						endpointUuid: endpoint.uuid,
						stepName: endpoint.__meta.nodeName,
					};
					const endpointElement = endpoint.endpoint.canvas;
					this.aiStore.openNextStepPopup(
						this.$locale.baseText('nextStepPopup.title.nextStep'),
						endpointElement,
					);
				}
			} else {
				this.insertNodeAfterSelected({
					sourceId: endpoint.__meta.nodeId,
					index: endpoint.__meta.index,
					eventSource: NODE_CREATOR_OPEN_SOURCES.PLUS_ENDPOINT,
					outputType: getEndpointScope(endpoint.scope),
					endpointUuid: endpoint.uuid,
					stepName: endpoint.__meta.nodeName,
				});
			}
		},
		onAddInputEndpointClick(endpoint: Endpoint) {
			if (endpoint?.__meta) {
				this.insertNodeAfterSelected({
					sourceId: endpoint.__meta.nodeId,
					index: endpoint.__meta.index,
					eventSource: NODE_CREATOR_OPEN_SOURCES.ADD_INPUT_ENDPOINT,
					nodeCreatorView: AI_NODE_CREATOR_VIEW,
					outputType: getEndpointScope(endpoint.scope),
					endpointUuid: endpoint.uuid,
				});
			}
		},
		bindCanvasEvents() {
			if (this.eventsAttached) return;
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
			this.instance.bind(EVENT_ADD_INPUT_ENDPOINT_CLICK, this.onAddInputEndpointClick);

			this.eventsAttached = true;
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
			this.instance.unbind(EVENT_ADD_INPUT_ENDPOINT_CLICK, this.onAddInputEndpointClick);
			this.eventsAttached = false;
		},
		unbindEndpointEventListeners() {
			if (this.instance) {
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
			}

			this.eventsAttached = false;
		},
		onBeforeUnload(e: BeforeUnloadEvent) {
			if (this.isDemo || window.preventNodeViewBeforeUnload) {
				return;
			} else if (this.uiStore.stateIsDirty) {
				// A bit hacky solution to detecting users leaving the page after prompt:
				// 1. Notify that workflow is closed straight away
				this.collaborationStore.notifyWorkflowClosed(this.workflowsStore.workflowId);
				// 2. If user decided to stay on the page we notify that the workflow is opened again
				this.unloadTimeout = setTimeout(() => {
					this.collaborationStore.notifyWorkflowOpened(this.workflowsStore.workflowId);
				}, 5 * TIME.SECOND);
				e.returnValue = true; //Gecko + IE
				return true; //Gecko + Webkit, Safari, Chrome etc.
			} else {
				this.canvasStore.startLoading(this.$locale.baseText('nodeView.redirecting'));
				this.collaborationStore.notifyWorkflowClosed(this.workflowsStore.workflowId);
				return;
			}
		},
		onUnload() {
			// This will fire if users decides to leave the page after prompted
			// Clear the interval to prevent the notification from being sent
			clearTimeout(this.unloadTimeout);
		},
		makeNewWorkflowShareable() {
			const { currentProject, personalProject } = this.projectsStore;
			const homeProject = currentProject ?? personalProject ?? {};
			const scopes = currentProject?.scopes ?? personalProject?.scopes ?? [];

			this.workflowsStore.workflow.homeProject = homeProject as ProjectSharingData;
			this.workflowsStore.workflow.scopes = scopes;
		},
		async newWorkflow(): Promise<void> {
			const { getVariant } = usePostHog();
			this.canvasStore.startLoading();
			this.resetWorkspace();
			this.workflowData = await this.workflowsStore.getNewWorkflowData(
				undefined,
				this.projectsStore.currentProjectId,
			);
			this.workflowsStore.currentWorkflowExecutions = [];
			this.executionsStore.activeExecution = null;

			this.uiStore.stateIsDirty = false;
			this.canvasStore.setZoomLevel(1, [0, 0]);
			this.canvasStore.zoomToFit();
			this.uiStore.nodeViewInitialized = true;
			this.historyStore.reset();
			this.executionsStore.activeExecution = null;
			this.makeNewWorkflowShareable();
			this.canvasStore.stopLoading();

			// Pre-populate the canvas with the manual trigger node if the experiment is enabled and the user is in the variant group
			if (
				getVariant(CANVAS_AUTO_ADD_MANUAL_TRIGGER_EXPERIMENT.name) ===
				CANVAS_AUTO_ADD_MANUAL_TRIGGER_EXPERIMENT.variant
			) {
				const manualTriggerNode = this.canvasStore.getAutoAddManualTriggerNode();
				if (manualTriggerNode) {
					await this.addNodes([manualTriggerNode]);
					this.uiStore.lastSelectedNode = manualTriggerNode.name;
				}
			}
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
				await this.openWorkflowTemplate(templateId.toString());
			} else {
				if (this.uiStore.stateIsDirty && !this.readOnlyEnv) {
					const confirmModal = await this.confirm(
						this.$locale.baseText('generic.unsavedWork.confirmMessage.message'),
						{
							title: this.$locale.baseText('generic.unsavedWork.confirmMessage.headline'),
							type: 'warning',
							confirmButtonText: this.$locale.baseText(
								'generic.unsavedWork.confirmMessage.confirmButtonText',
							),
							cancelButtonText: this.$locale.baseText(
								'generic.unsavedWork.confirmMessage.cancelButtonText',
							),
							showClose: true,
						},
					);
					if (confirmModal === MODAL_CONFIRM) {
						const saved = await this.workflowHelpers.saveCurrentWorkflow();
						if (saved) await this.settingsStore.fetchPromptsData();
					} else if (confirmModal === MODAL_CANCEL) {
						return;
					}
				}
				// Load a workflow
				let workflowId = null as string | null;
				if (this.$route.params.name) {
					workflowId = this.$route.params.name.toString();
				}
				if (workflowId !== null) {
					let workflow: IWorkflowDb | undefined = undefined;
					try {
						workflow = await this.workflowsStore.fetchWorkflow(workflowId);
					} catch (error) {
						this.showError(error, this.$locale.baseText('openWorkflow.workflowNotFoundError'));

						void this.$router.push({
							name: VIEWS.NEW_WORKFLOW,
						});
					}

					if (workflow) {
						this.titleSet(workflow.name, 'IDLE');
						await this.openWorkflow(workflow);
						await this.checkAndInitDebugMode();

						await this.projectsStore.setProjectNavActiveIdByWorkflowHomeProject(
							workflow.homeProject,
						);

						if (workflow.meta?.onboardingId) {
							this.$telemetry.track(
								`User opened workflow from onboarding template with ID ${workflow.meta.onboardingId}`,
								{
									workflow_id: workflow.id,
								},
								{
									withPostHog: true,
								},
							);
						}
					}
				} else if (this.$route.meta?.nodeView === true) {
					// Create new workflow
					await this.newWorkflow();
				}
			}
			await this.loadCredentials();
			this.historyStore.reset();
			this.uiStore.nodeViewInitialized = true;
			document.addEventListener('keydown', this.keyDown);
			document.addEventListener('keyup', this.keyUp);

			window.addEventListener('beforeunload', this.onBeforeUnload);
			window.addEventListener('unload', this.onUnload);
			// Once view is initialized, pick up all toast notifications
			// waiting in the store and display them
			this.showNotificationForViews([VIEWS.WORKFLOW, VIEWS.NEW_WORKFLOW]);
		},
		getOutputEndpointUUID(
			nodeName: string,
			connectionType: NodeConnectionType,
			index: number,
		): string | null {
			const node = this.workflowsStore.getNodeByName(nodeName);
			if (!node) {
				return null;
			}

			return NodeViewUtils.getOutputEndpointUUID(node.id, connectionType, index);
		},
		getInputEndpointUUID(nodeName: string, connectionType: NodeConnectionType, index: number) {
			const node = this.workflowsStore.getNodeByName(nodeName);
			if (!node) {
				return null;
			}

			return NodeViewUtils.getInputEndpointUUID(node.id, connectionType, index);
		},
		__addConnection(connection: [IConnection, IConnection]) {
			const outputUuid = this.getOutputEndpointUUID(
				connection[0].node,
				connection[0].type,
				connection[0].index,
			);
			const inputUuid = this.getInputEndpointUUID(
				connection[1].node,
				connection[1].type,
				connection[1].index,
			);
			if (!outputUuid || !inputUuid) {
				return;
			}

			const uuid: [string, string] = [outputUuid, inputUuid];
			// Create connections in DOM
			this.instance?.connect({
				uuids: uuid,
				detachable: !this.isReadOnlyRoute && !this.readOnlyEnv,
			});

			setTimeout(() => {
				this.addPinDataConnections(this.workflowsStore.pinnedWorkflowData ?? ({} as IPinData));
			});
		},
		__removeConnection(connection: [IConnection, IConnection], removeVisualConnection = false) {
			if (removeVisualConnection) {
				const sourceNode = this.workflowsStore.getNodeByName(connection[0].node);
				const targetNode = this.workflowsStore.getNodeByName(connection[1].node);

				if (!sourceNode || !targetNode) {
					return;
				}

				const sourceElement = document.getElementById(sourceNode.id);
				const targetElement = document.getElementById(targetNode.id);

				if (sourceElement && targetElement) {
					const connections = this.instance?.getConnections({
						source: sourceElement,
						target: targetElement,
					});

					if (Array.isArray(connections)) {
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
				}
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
						type: NodeConnectionType.Main,
					},
					{
						index: connection.__meta?.targetOutputIndex,
						node: connection.__meta.targetNodeName,
						type: NodeConnectionType.Main,
					},
				];
				const removeCommand = new RemoveConnectionCommand(connectionData);
				this.historyStore.pushCommandToUndo(removeCommand);
			}
		},
		__removeConnectionByConnectionInfo(
			info: ConnectionDetachedParams,
			removeVisualConnection = false,
			trackHistory = false,
		) {
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
		async duplicateNodes(nodes: INode[]): Promise<void> {
			if (!this.editAllowedCheck()) {
				return;
			}

			const workflowData = deepCopy(await this.getNodesToSave(nodes));
			await this.importWorkflowData(workflowData, 'duplicate', false);
		},
		getIncomingOutgoingConnections(nodeName: string): {
			incoming: Connection[];
			outgoing: Connection[];
		} {
			const node = this.workflowsStore.getNodeByName(nodeName);

			if (node) {
				const nodeEl = document.getElementById(node.id);
				if (!nodeEl) {
					return { incoming: [], outgoing: [] };
				}

				const outgoing = this.instance?.getConnections({
					source: nodeEl,
				});

				const incoming = this.instance?.getConnections({
					target: nodeEl,
				});
				return {
					incoming: Array.isArray(incoming) ? incoming : Object.values(incoming),
					outgoing: Array.isArray(outgoing) ? outgoing : Object.values(outgoing),
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
			const pinData = this.workflowsStore.pinnedWorkflowData;

			if (pinData?.[name]) {
				const { outgoing } = this.getIncomingOutgoingConnections(name);

				outgoing.forEach((connection: Connection) => {
					if (connection.__meta?.sourceNodeName === name) {
						const hasRun = this.workflowsStore.getWorkflowResultDataByNodeName(name) !== null;
						NodeViewUtils.addClassesToOverlays({
							connection,
							overlayIds: [NodeViewUtils.OVERLAY_RUN_ITEMS_ID],
							classNames: hasRun ? ['has-run'] : [],
							includeConnector: true,
						});
					}
				});
				return;
			}

			const sourceNodeName = name;
			const sourceNode = this.workflowsStore.getNodeByName(sourceNodeName);
			const sourceId = sourceNode !== null ? sourceNode.id : '';

			if (data === null || data.length === 0 || waiting) {
				const sourceElement = document.getElementById(sourceId);
				if (!sourceElement) {
					return;
				}

				const outgoing = this.instance?.getConnections({
					source: sourceElement,
				});

				(Array.isArray(outgoing) ? outgoing : Object.values(outgoing)).forEach(
					(connection: Connection) => {
						NodeViewUtils.resetConnection(connection);
					},
				);
				const endpoints = NodeViewUtils.getJSPlumbEndpoints(sourceNode, this.instance);
				endpoints.forEach((endpoint: Endpoint) => {
					if (endpoint.endpoint.type === 'N8nPlus') {
						(endpoint.endpoint as N8nPlusEndpoint).clearSuccessOutput();
					}
				});

				return;
			}

			this.nodeHelpers.setSuccessOutput(data, sourceNode);
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
				void this.externalHooks.run('node.deleteNode', { node });
				this.$telemetry.track('User deleted node', {
					node_type: node.type,
					workflow_id: this.workflowsStore.workflowId,
				});
			}

			let waitForNewConnection = false;
			// connect nodes before/after deleted node
			const nodeType = this.nodeTypesStore.getNodeType(node.type, node.typeVersion);

			const workflow = this.workflowHelpers.getCurrentWorkflow();
			const workflowNode = workflow.getNode(node.name);
			let inputs: Array<ConnectionTypes | INodeInputConfiguration> = [];
			let outputs: Array<ConnectionTypes | INodeOutputConfiguration> = [];
			if (nodeType && workflowNode) {
				inputs = NodeHelpers.getNodeInputs(workflow, workflowNode, nodeType);
				outputs = NodeHelpers.getNodeOutputs(workflow, workflowNode, nodeType);
			}

			if (outputs.length === 1 && inputs.length === 1) {
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
								NodeConnectionType.Main,
							);

							if (waitForNewConnection) {
								this.instance?.setSuspendDrawing(false, true);
								waitForNewConnection = false;
							}
						}, 100); // just to make it clear to users that this is a new connection
					}
				}
			}

			void nextTick(() => {
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
			}); // allow other events to finish like drag stop

			if (trackHistory && trackBulk) {
				const recordingTimeout = waitForNewConnection ? 100 : 0;
				setTimeout(() => {
					this.historyStore.stopRecordingUndo();
				}, recordingTimeout);
			}
		},
		async onSwitchSelectedNode(nodeName: string) {
			this.nodeSelectedByName(nodeName, true, true);
		},
		async onOpenConnectionNodeCreator(node: string, connectionType: NodeConnectionType) {
			await this.openSelectiveNodeCreator({
				connectiontype: connectionType,
				node,
			});
		},
		async redrawNode(nodeName: string) {
			// TODO: Improve later
			// For now we redraw the node by simply renaming it. Can for sure be
			// done better later but should be fine for now.
			const tempName = 'x____XXXX____x';
			await this.renameNode(nodeName, tempName);
			await this.renameNode(tempName, nodeName);
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
				const promptResponsePromise = this.prompt(
					this.$locale.baseText('nodeView.prompt.newName') + ':',
					this.$locale.baseText('nodeView.prompt.renameNode') + `: ${currentName}`,
					{
						customClass: 'rename-prompt',
						confirmButtonText: this.$locale.baseText('nodeView.prompt.rename'),
						cancelButtonText: this.$locale.baseText('nodeView.prompt.cancel'),
						inputErrorMessage: this.$locale.baseText('nodeView.prompt.invalidName'),
						inputValue: currentName,
						inputValidator: (value: string) => {
							if (!value.trim()) {
								return this.$locale.baseText('nodeView.prompt.invalidName');
							}
							return true;
						},
					},
				);

				// Wait till it had time to display
				await this.$nextTick();

				// Get the input and select the text in it
				const nameInput = document.querySelector('.rename-prompt .el-input__inner') as
					| HTMLInputElement
					| undefined;
				if (nameInput) {
					nameInput.focus();
					nameInput.select();
				}

				const promptResponse = await promptResponsePromise;

				if (promptResponse?.action !== MODAL_CONFIRM) {
					return;
				}

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

			const activeNodeName = this.activeNode?.name;
			const isActive = activeNodeName === currentName;
			if (isActive) {
				this.renamingActive = true;
			}

			newName = this.uniqueNodeName(newName);

			// Rename the node and update the connections
			const workflow = this.workflowHelpers.getCurrentWorkflow(true);
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
			await this.$nextTick();

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
			if (!nodes?.length) {
				return;
			}
			this.isInsertingNodes = true;
			// Before proceeding we must check if all nodes contain the `properties` attribute.
			// Nodes are loaded without this information so we must make sure that all nodes
			// being added have this information.
			await this.loadNodesProperties(
				nodes.map((node) => ({ name: node.type, version: node.typeVersion })),
			);

			// Add the node to the node-list
			let nodeType: INodeTypeDescription | null;
			nodes.forEach((node) => {
				const newNode: INodeUi = {
					...node,
				};

				if (!newNode.id) {
					newNode.id = uuid();
				}

				nodeType = this.nodeTypesStore.getNodeType(newNode.type, newNode.typeVersion);

				// Make sure that some properties always exist
				if (!newNode.hasOwnProperty('disabled')) {
					newNode.disabled = false;
				}

				if (!newNode.hasOwnProperty('parameters')) {
					newNode.parameters = {};
				}

				// Load the default parameter values because only values which differ
				// from the defaults get saved
				if (nodeType !== null) {
					let nodeParameters = null;
					try {
						nodeParameters = NodeHelpers.getNodeParameters(
							nodeType.properties,
							newNode.parameters,
							true,
							false,
							node,
						);
					} catch (e) {
						console.error(
							this.$locale.baseText('nodeView.thereWasAProblemLoadingTheNodeParametersOfNode') +
								`: "${newNode.name}"`,
						);
						console.error(e);
					}
					newNode.parameters = nodeParameters ?? {};

					// if it's a webhook and the path is empty set the UUID as the default path
					if (
						[WEBHOOK_NODE_TYPE, FORM_TRIGGER_NODE_TYPE].includes(newNode.type) &&
						newNode.parameters.path === ''
					) {
						newNode.parameters.path = newNode.webhookId as string;
					}
				}

				// check and match credentials, apply new format if old is used
				this.matchCredentials(newNode);
				this.workflowsStore.addNode(newNode);
				if (trackHistory) {
					this.historyStore.pushCommandToUndo(new AddNodeCommand(newNode));
				}
			});

			// Wait for the nodes to be rendered
			await this.$nextTick();

			this.instance?.setSuspendDrawing(true);

			if (connections) {
				await this.addConnections(connections);
			}
			// Add the node issues at the end as the node-connections are required
			this.nodeHelpers.refreshNodeIssues();
			this.nodeHelpers.updateNodesInputIssues();
			this.resetEndpointsErrors();
			this.isInsertingNodes = false;

			// Now it can draw again
			this.instance?.setSuspendDrawing(false, true);
		},
		async addConnections(connections: IConnections) {
			const batchedConnectionData: Array<[IConnection, IConnection]> = [];

			for (const sourceNode in connections) {
				for (const type in connections[sourceNode]) {
					connections[sourceNode][type].forEach((outwardConnections, sourceIndex) => {
						if (outwardConnections) {
							outwardConnections.forEach((targetData) => {
								batchedConnectionData.push([
									{
										node: sourceNode,
										type: getEndpointScope(type) ?? NodeConnectionType.Main,
										index: sourceIndex,
									},
									{ node: targetData.node, type: targetData.type, index: targetData.index },
								]);
							});
						}
					});
				}
			}

			// Process the connections in batches
			await this.processConnectionBatch(batchedConnectionData);
			setTimeout(this.addConectionsTestData, 0);
		},

		async processConnectionBatch(batchedConnectionData: Array<[IConnection, IConnection]>) {
			const batchSize = 100;

			for (let i = 0; i < batchedConnectionData.length; i += batchSize) {
				const batch = batchedConnectionData.slice(i, i + batchSize);

				batch.forEach((connectionData) => {
					this.__addConnection(connectionData);
				});
			}
		},

		async addNodesToWorkflow(data: IWorkflowDataUpdate): Promise<IWorkflowDataUpdate> {
			// Because nodes with the same name maybe already exist, it could
			// be needed that they have to be renamed. Also could it be possible
			// that nodes are not allowed to be created because they have a create
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
			const nodeTypesCount = this.workflowHelpers.getNodeTypesMaxCount();

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

				const localized = this.locale.localizeNodeName(node.name, node.type);

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
			const tempWorkflow: Workflow = this.workflowHelpers.getWorkflow(createNodes, newConnections);

			// Rename all the nodes of which the name changed
			for (oldName in nodeNameTable) {
				if (oldName === nodeNameTable[oldName]) {
					// Name did not change so skip
					continue;
				}
				tempWorkflow.renameNode(oldName, nodeNameTable[oldName]);
			}

			if (data.pinData) {
				let pinDataSuccess = true;
				for (const nodeName of Object.keys(data.pinData)) {
					// Pin data limit reached
					if (!pinDataSuccess) {
						this.showError(
							new Error(this.$locale.baseText('ndv.pinData.error.tooLarge.description')),
							this.$locale.baseText('ndv.pinData.error.tooLarge.title'),
						);
						continue;
					}

					const node = tempWorkflow.nodes[nodeNameTable[nodeName]];
					try {
						const pinnedDataForNode = usePinnedData(node);
						pinnedDataForNode.setData(data.pinData[nodeName], 'add-nodes');
						pinDataSuccess = true;
					} catch (error) {
						pinDataSuccess = false;
						console.error(error);
					}
				}
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
		async getNodesToSave(nodes: INode[]): Promise<IWorkflowData> {
			const data: IWorkflowData = {
				nodes: [],
				connections: {},
				pinData: {},
			};

			// Get data of all the selected noes
			let nodeData;
			const exportNodeNames: string[] = [];

			for (const node of nodes) {
				nodeData = this.workflowHelpers.getNodeDataToSave(node);
				exportNodeNames.push(node.name);

				data.nodes.push(nodeData);

				const pinDataForNode = this.workflowsStore.pinDataByNodeName(node.name);
				if (pinDataForNode) {
					data.pinData![node.name] = pinDataForNode;
				}

				if (
					nodeData.credentials &&
					this.settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing)
				) {
					const usedCredentials = this.workflowsStore.usedCredentials;
					nodeData.credentials = Object.fromEntries(
						Object.entries(nodeData.credentials).filter(([_, credential]) => {
							return (
								credential.id &&
								(!usedCredentials[credential.id] ||
									usedCredentials[credential.id]?.currentUserHasAccess)
							);
						}),
					);
				}
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
			this.canvasStore.resetZoom();

			// Reset nodes
			this.unbindEndpointEventListeners();
			this.deleteEveryEndpoint();

			// Make sure that if there is a waiting test-webhook that it gets removed
			if (this.executionWaitingForWebhook) {
				try {
					void this.workflowsStore.removeTestWebhook(this.workflowsStore.workflowId);
				} catch (error) {}
			}
			this.workflowsStore.resetState();
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
			const workflow = this.workflowsStore.getWorkflowById(this.currentWorkflow);
			let projectId: string | undefined;
			if (workflow) {
				projectId =
					workflow.homeProject?.type === ProjectTypes.Personal
						? this.projectsStore.personalProject?.id
						: workflow?.homeProject?.id ?? this.projectsStore.currentProjectId;
			} else {
				const queryParam =
					typeof this.$route.query?.projectId === 'string'
						? this.$route.query?.projectId
						: undefined;
				projectId = queryParam ?? this.projectsStore.personalProject?.id;
			}
			await this.credentialsStore.fetchAllCredentials(projectId, false);
		},
		async loadVariables(): Promise<void> {
			await this.environmentsStore.fetchAllVariables();
		},
		async loadSecrets(): Promise<void> {
			await this.externalSecretsStore.fetchAllSecrets();
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
				this.canvasStore.startLoading();
				await this.nodeTypesStore.getNodesInformation(nodesToBeFetched);
				this.canvasStore.stopLoading();
			}
		},
		async onPostMessageReceived(message: MessageEvent) {
			if (!message || typeof message.data !== 'string' || !message.data?.includes?.('"command"')) {
				return;
			}
			try {
				const json = JSON.parse(message.data);
				if (json && json.command === 'openWorkflow') {
					try {
						await this.importWorkflowExact(json);
						this.canOpenNDV = json.canOpenNDV ?? true;
						this.hideNodeIssues = json.hideNodeIssues ?? false;
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
						this.showMessage({
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
						this.canOpenNDV = json.canOpenNDV ?? true;
						this.hideNodeIssues = json.hideNodeIssues ?? false;
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
						this.showMessage({
							title: this.$locale.baseText('nodeView.showError.openExecution.title'),
							message: (e as Error).message,
							type: 'error',
						});
					}
				} else if (json?.command === 'setActiveExecution') {
					this.executionsStore.activeExecution = (await this.executionsStore.fetchExecution(
						json.executionId,
					)) as ExecutionSummary;
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

				const hasRun = this.workflowsStore.getWorkflowResultDataByNodeName(nodeName) !== null;
				const classNames = ['pinned'];

				if (hasRun) {
					classNames.push('has-run');
				}
				const nodeElement = document.getElementById(node.id);
				if (!nodeElement) {
					return;
				}
				const connections = this.instance?.getConnections({
					source: nodeElement,
				});

				const connectionsArray = Array.isArray(connections)
					? connections
					: Object.values(connections);

				connectionsArray.forEach((connection) => {
					NodeViewUtils.addConnectionOutputSuccess(connection, {
						total: pinData[nodeName].length,
						iterations: 0,
						classNames,
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

				const nodeElement = document.getElementById(node.id);
				if (!nodeElement) {
					return;
				}

				const connections = this.instance?.getConnections({
					source: nodeElement,
				});

				const connectionsArray = Array.isArray(connections)
					? connections
					: Object.values(connections);

				this.instance.setSuspendDrawing(true);
				connectionsArray.forEach(NodeViewUtils.resetConnection);
				this.instance.setSuspendDrawing(false, true);
			});
		},
		onToggleNodeCreator({ source, createNodeActive, nodeCreatorView }: ToggleNodeCreatorOptions) {
			if (createNodeActive === this.createNodeActive) return;

			if (!nodeCreatorView) {
				nodeCreatorView = this.containsTrigger
					? REGULAR_NODE_CREATOR_VIEW
					: TRIGGER_NODE_CREATOR_VIEW;
			}

			// Default to the trigger tab in node creator if there's no trigger node yet
			this.nodeCreatorStore.setSelectedView(nodeCreatorView);

			this.createNodeActive = createNodeActive;

			let mode;
			switch (this.nodeCreatorStore.selectedView) {
				case AI_NODE_CREATOR_VIEW:
					mode = 'ai';
					break;
				case REGULAR_NODE_CREATOR_VIEW:
					mode = 'regular';
					break;
				default:
					mode = 'regular';
			}

			if (createNodeActive && source) this.nodeCreatorStore.setOpenSource(source);
			void this.externalHooks.run('nodeView.createNodeActiveChanged', {
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
		async onAddNodes(
			{ nodes, connections }: AddedNodesAndConnections,
			dragAndDrop = false,
			position?: XYPosition,
		) {
			let currentPosition = position;
			for (const { type, isAutoAdd, name, openDetail, position: nodePosition } of nodes) {
				await this.addNode(
					type,
					{ position: nodePosition ?? currentPosition, dragAndDrop, name },
					openDetail ?? false,
					true,
					isAutoAdd,
				);

				const lastAddedNode = this.nodes[this.nodes.length - 1];
				currentPosition = [
					lastAddedNode.position[0] + NodeViewUtils.NODE_SIZE * 2 + NodeViewUtils.GRID_SIZE,
					lastAddedNode.position[1],
				];
			}

			const newNodesOffset = this.nodes.length - nodes.length;
			for (const { from, to } of connections) {
				const fromNode = this.nodes[newNodesOffset + from.nodeIndex];
				const toNode = this.nodes[newNodesOffset + to.nodeIndex];

				this.connectTwoNodes(
					fromNode.name,
					from.outputIndex ?? 0,
					toNode.name,
					to.inputIndex ?? 0,
					NodeConnectionType.Main,
				);
			}

			const lastAddedNode = this.nodes[this.nodes.length - 1];
			const workflow = this.workflowHelpers.getCurrentWorkflow();
			const lastNodeInputs = workflow.getParentNodesByDepth(lastAddedNode.name, 1);

			// If the last added node has multiple inputs, move them down
			if (lastNodeInputs.length > 1) {
				lastNodeInputs.slice(1).forEach((node, index) => {
					const nodeUi = this.workflowsStore.getNodeByName(node.name);
					if (!nodeUi) return;

					this.onMoveNode({
						nodeName: nodeUi.name,
						position: [nodeUi.position[0], nodeUi.position[1] + 100 * (index + 1)],
					});
				});
			}

			this.addPinDataConnections(this.workflowsStore.pinnedWorkflowData || ({} as IPinData));
		},

		async saveCurrentWorkflowExternal(callback: () => void) {
			await this.workflowHelpers.saveCurrentWorkflow();
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
		onRevertEnableToggle({ nodeName }: { nodeName: string }) {
			const node = this.workflowsStore.getNodeByName(nodeName);
			if (node) {
				this.nodeHelpers.disableNodes([node]);
			}
		},
		onPageShow(e: PageTransitionEvent) {
			// Page was restored from the bfcache (back-forward cache)
			if (e.persisted) {
				this.canvasStore.stopLoading();
			}
		},
		readOnlyEnvRouteCheck() {
			if (
				this.readOnlyEnv &&
				(this.$route.name === VIEWS.NEW_WORKFLOW || this.$route.name === VIEWS.TEMPLATE_IMPORT)
			) {
				void this.$nextTick(async () => {
					this.resetWorkspace();
					this.uiStore.stateIsDirty = false;

					await this.$router.replace({ name: VIEWS.HOMEPAGE });
				});
			}
		},
		async checkAndInitDebugMode() {
			if (this.$route.name === VIEWS.EXECUTION_DEBUG) {
				this.titleSet(this.workflowName, 'DEBUG');
				if (!this.workflowsStore.isInDebugMode) {
					await this.applyExecutionData(this.$route.params.executionId as string);
					this.workflowsStore.isInDebugMode = true;
				}
			}
		},
		onContextMenuAction(action: ContextMenuAction, nodes: INode[]): void {
			switch (action) {
				case 'copy':
					this.copyNodes(nodes);
					break;
				case 'delete':
					this.deleteNodes(nodes);
					break;
				case 'duplicate':
					void this.duplicateNodes(nodes);
					break;
				case 'execute':
					this.onRunNode(nodes[0].name, 'NodeView.onContextMenuAction');
					break;
				case 'open':
					this.ndvStore.activeNodeName = nodes[0].name;
					break;
				case 'rename':
					void this.renameNodePrompt(nodes[0].name);
					break;
				case 'toggle_activation':
					this.toggleActivationNodes(nodes);
					break;
				case 'toggle_pin':
					this.togglePinNodes(nodes, 'context-menu');
					break;
				case 'add_node':
					this.onToggleNodeCreator({
						source: NODE_CREATOR_OPEN_SOURCES.CONTEXT_MENU,
						createNodeActive: !this.isReadOnlyRoute && !this.readOnlyEnv,
					});
					break;
				case 'add_sticky':
					void this.onAddNodes({ nodes: [{ type: STICKY_NODE_TYPE }], connections: [] });
					break;
				case 'select_all':
					this.selectAllNodes();
					break;
				case 'deselect_all':
					this.deselectAllNodes();
					break;
			}
		},
		async onSourceControlPull() {
			let workflowId = null as string | null;
			if (this.$route.params.name) {
				workflowId = this.$route.params.name.toString();
			}

			try {
				await Promise.all([
					this.loadVariables(),
					this.tagsStore.fetchAll(),
					this.loadCredentials(),
				]);

				if (workflowId !== null && !this.uiStore.stateIsDirty) {
					const workflow: IWorkflowDb | undefined =
						await this.workflowsStore.fetchWorkflow(workflowId);
					if (workflow) {
						this.titleSet(workflow.name, 'IDLE');
						await this.openWorkflow(workflow);
					}
				}
			} catch (error) {
				console.error(error);
			}
		},
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
	width: 100vw;
	height: 100vh;
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
	bottom: var(--spacing-l);
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
.node-view-wrapper {
	--drag-scope-active-disabled-color: var(--color-foreground-dark);

	&.connection-drag-scope-active {
		@each $node-type in $supplemental-node-types {
			// Grey out incompatible node type endpoints
			&:not(.connection-drag-scope-active-type-#{$node-type}) {
				.diamond-output-endpoint,
				.jtk-connector,
				.add-input-endpoint {
					--node-type-#{$node-type}-color: var(--drag-scope-active-disabled-color);
				}

				.node-input-endpoint-label,
				.node-output-endpoint-label {
					--node-type-#{$node-type}-color: var(--drag-scope-active-disabled-color);
				}
			}

			&.connection-drag-scope-active-type-#{$node-type} {
				// Dragging input
				&.connection-drag-scope-active-connection-target {
					// Apply style to compatible output endpoints
					.diamond-output-endpoint[data-jtk-scope-#{$node-type}='true'] {
						transform: scale(1.5) rotate(45deg);
					}

					.add-input-endpoint[data-jtk-scope-#{$node-type}='true'] {
						// Apply style to dragged compatible input endpoint
						&.jtk-dragging {
							.add-input-endpoint-default {
								transform: translate(-5px, -5px) scale(1.5);
							}
						}

						// Apply style to non-dragged compatible input endpoints
						&:not(.jtk-dragging) {
							--node-type-#{$node-type}-color: var(--drag-scope-active-disabled-color);
						}
					}

					.node-input-endpoint-label {
						&:not(.jtk-dragging) {
							--node-type-#{$node-type}-color: var(--drag-scope-active-disabled-color);
						}
					}
				}

				// Dragging output
				&.connection-drag-scope-active-connection-source {
					// Apply style to dragged compatible output endpoint
					.diamond-output-endpoint[data-jtk-scope-#{$node-type}='true'] {
						&.jtk-dragging {
							transform: scale(1.5) rotate(45deg);
						}

						// Apply style to non-dragged compatible input endpoints
						&:not(.jtk-dragging) {
							--node-type-#{$node-type}-color: var(--drag-scope-active-disabled-color);
						}
					}

					// Apply style to compatible output endpoints
					.add-input-endpoint[data-jtk-scope-#{$node-type}='true'] {
						.add-input-endpoint-default {
							transform: translate(-5px, -5px) scale(1.5);
						}
					}

					.node-output-endpoint-label {
						&:not(.jtk-dragging) {
							--node-type-#{$node-type}-color: var(--drag-scope-active-disabled-color);
						}
					}
				}
			}
		}
	}
}

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

		&.delete-single {
			left: -12px;
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

.setupCredentialsButtonWrapper {
	position: absolute;
	left: var(--spacing-l);
	top: var(--spacing-l);
}
</style>

<style lang="scss" scoped>
@mixin applyColorToConnection($partialSelector, $cssColorVarName, $labelCssColorVarName) {
	.jtk-connector#{$partialSelector}:not(.jtk-hover) {
		path:not(.jtk-connector-outline) {
			stroke: var(#{$cssColorVarName});
		}
		path[jtk-overlay-id='reverse-arrow'],
		path[jtk-overlay-id='endpoint-arrow'],
		path[jtk-overlay-id='midpoint-arrow'] {
			fill: var(#{$cssColorVarName});
		}
	}

	.connection-run-items-label#{$partialSelector} {
		color: var(#{$labelCssColorVarName});
	}
}

:deep(.node-view) {
	@include applyColorToConnection('.success', '--color-success-light', '--color-success');
	@include applyColorToConnection(
		'.success.pinned',
		'--color-foreground-xdark',
		'--color-foreground-xdark'
	);
	@include applyColorToConnection(
		'.success.pinned.has-run',
		'--color-secondary',
		'--color-secondary'
	);
}
</style>
