<template>
	<el-dialog
		:model-value="(!!activeNode || renaming) && !isActiveStickyNode"
		:before-close="close"
		:show-close="false"
		class="data-display-wrapper ndv-wrapper"
		overlay-class="data-display-overlay"
		width="auto"
		append-to-body
		data-test-id="ndv"
		:data-has-output-connection="hasOutputConnection"
	>
		<n8n-tooltip
			placement="bottom-start"
			:visible="showTriggerWaitingWarning"
			:disabled="!showTriggerWaitingWarning"
		>
			<template #content>
				<div :class="$style.triggerWarning">
					{{ $locale.baseText('ndv.backToCanvas.waitingForTriggerWarning') }}
				</div>
			</template>
			<div :class="$style.backToCanvas" data-test-id="back-to-canvas" @click="close">
				<n8n-icon icon="arrow-left" color="text-xlight" size="medium" />
				<n8n-text color="text-xlight" size="medium" :bold="true">
					{{ $locale.baseText('ndv.backToCanvas') }}
				</n8n-text>
			</div>
		</n8n-tooltip>

		<div
			v-if="activeNode"
			ref="container"
			class="data-display"
			tabindex="0"
			@keydown.capture="onKeyDown"
		>
			<div :class="$style.modalBackground" @click="close"></div>
			<NDVDraggablePanels
				:key="activeNode.name"
				:is-trigger-node="isTriggerNode"
				:hide-input-and-output="activeNodeType === null"
				:position="isTriggerNode && !showTriggerPanel ? 0 : undefined"
				:is-draggable="!isTriggerNode"
				:has-double-width="activeNodeType?.parameterPane === 'wide'"
				:node-type="activeNodeType"
				@switchSelectedNode="onSwitchSelectedNode"
				@close="close"
				@init="onPanelsInit"
				@dragstart="onDragStart"
				@dragend="onDragEnd"
			>
				<template v-if="showTriggerPanel || !isTriggerNode" #input>
					<TriggerPanel
						v-if="showTriggerPanel"
						:node-name="activeNode.name"
						:session-id="sessionId"
						@execute="onNodeExecute"
						@activate="onWorkflowActivate"
					/>
					<InputPanel
						v-else-if="!isTriggerNode"
						:workflow="workflow"
						:can-link-runs="canLinkRuns"
						:run-index="inputRun"
						:linked-runs="linked"
						:current-node-name="inputNodeName"
						:session-id="sessionId"
						:read-only="readOnly || hasForeignCredential"
						:is-production-execution-preview="isProductionExecutionPreview"
						:is-pane-active="isInputPaneActive"
						@activatePane="activateInputPane"
						@linkRun="onLinkRunToInput"
						@unlinkRun="() => onUnlinkRun('input')"
						@runChange="onRunInputIndexChange"
						@openSettings="openSettings"
						@changeInputNode="onInputNodeChange"
						@execute="onNodeExecute"
						@tableMounted="onInputTableMounted"
						@itemHover="onInputItemHover"
						@search="onSearch"
					/>
				</template>
				<template #output>
					<OutputPanel
						data-test-id="output-panel"
						:can-link-runs="canLinkRuns"
						:run-index="outputRun"
						:linked-runs="linked"
						:session-id="sessionId"
						:is-read-only="readOnly || hasForeignCredential"
						:block-u-i="blockUi && isTriggerNode && !isExecutableTriggerNode"
						:is-production-execution-preview="isProductionExecutionPreview"
						:is-pane-active="isOutputPaneActive"
						@activatePane="activateOutputPane"
						@linkRun="onLinkRunToOutput"
						@unlinkRun="() => onUnlinkRun('output')"
						@runChange="onRunOutputIndexChange"
						@openSettings="openSettings"
						@tableMounted="onOutputTableMounted"
						@itemHover="onOutputItemHover"
						@search="onSearch"
					/>
				</template>
				<template #main>
					<NodeSettings
						:event-bus="settingsEventBus"
						:dragging="isDragging"
						:session-id="sessionId"
						:node-type="activeNodeType"
						:foreign-credentials="foreignCredentials"
						:read-only="readOnly"
						:block-u-i="blockUi && showTriggerPanel"
						:executable="!readOnly"
						@valueChanged="valueChanged"
						@execute="onNodeExecute"
						@stopExecution="onStopExecution"
						@redrawRequired="redrawRequired = true"
						@activate="onWorkflowActivate"
					/>
					<a
						v-if="featureRequestUrl"
						:class="$style.featureRequest"
						target="_blank"
						@click="onFeatureRequestClick"
					>
						<font-awesome-icon icon="lightbulb" />
						{{ $locale.baseText('ndv.featureRequest') }}
					</a>
				</template>
			</NDVDraggablePanels>
		</div>
	</el-dialog>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores, storeToRefs } from 'pinia';
import { createEventBus } from 'n8n-design-system/utils';
import type {
	INodeConnections,
	INodeTypeDescription,
	IRunData,
	IRunExecutionData,
	Workflow,
} from 'n8n-workflow';
import { jsonParse, NodeHelpers, NodeConnectionType } from 'n8n-workflow';
import type { IExecutionResponse, INodeUi, IUpdateInformation, TargetItem } from '@/Interface';
import { workflowHelpers } from '@/mixins/workflowHelpers';

import NodeSettings from '@/components/NodeSettings.vue';
import NDVDraggablePanels from './NDVDraggablePanels.vue';

import OutputPanel from './OutputPanel.vue';
import InputPanel from './InputPanel.vue';
import TriggerPanel from './TriggerPanel.vue';
import {
	BASE_NODE_SURVEY_URL,
	EnterpriseEditionFeature,
	EXECUTABLE_TRIGGER_NODE_TYPES,
	MODAL_CONFIRM,
	START_NODE_TYPE,
	STICKY_NODE_TYPE,
} from '@/constants';
import { workflowActivate } from '@/mixins/workflowActivate';
import { dataPinningEventBus } from '@/event-bus';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useDeviceSupport } from 'n8n-design-system/composables/useDeviceSupport';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useMessage } from '@/composables/useMessage';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { usePinnedData } from '@/composables/usePinnedData';

export default defineComponent({
	name: 'NodeDetailsView',
	components: {
		NodeSettings,
		InputPanel,
		OutputPanel,
		NDVDraggablePanels,
		TriggerPanel,
	},
	mixins: [workflowHelpers, workflowActivate],
	props: {
		readOnly: {
			type: Boolean,
		},
		renaming: {
			type: Boolean,
		},
		isProductionExecutionPreview: {
			type: Boolean,
			default: false,
		},
	},
	setup(props, ctx) {
		const ndvStore = useNDVStore();
		const externalHooks = useExternalHooks();
		const nodeHelpers = useNodeHelpers();
		const { activeNode } = storeToRefs(ndvStore);
		const pinnedData = usePinnedData(activeNode);

		return {
			externalHooks,
			nodeHelpers,
			pinnedData,
			...useDeviceSupport(),
			...useMessage(),
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			...workflowActivate.setup?.(props, ctx),
		};
	},
	data() {
		return {
			settingsEventBus: createEventBus(),
			redrawRequired: false,
			runInputIndex: -1,
			runOutputIndex: -1,
			isLinkingEnabled: true,
			selectedInput: undefined as string | undefined,
			triggerWaitingWarningEnabled: false,
			isDragging: false,
			mainPanelPosition: 0,
			pinDataDiscoveryTooltipVisible: false,
			avgInputRowHeight: 0,
			avgOutputRowHeight: 0,
			isInputPaneActive: false,
			isOutputPaneActive: false,
			isPairedItemHoveringEnabled: true,
		};
	},
	mounted() {
		dataPinningEventBus.on('data-pinning-discovery', this.setIsTooltipVisible);
	},
	beforeUnmount() {
		dataPinningEventBus.off('data-pinning-discovery', this.setIsTooltipVisible);
	},
	computed: {
		...mapStores(useNodeTypesStore, useNDVStore, useUIStore, useWorkflowsStore, useSettingsStore),
		sessionId(): string {
			return this.ndvStore.sessionId;
		},
		workflowRunning(): boolean {
			return this.uiStore.isActionActive('workflowRunning');
		},
		showTriggerWaitingWarning(): boolean {
			return (
				this.triggerWaitingWarningEnabled &&
				!!this.activeNodeType &&
				!this.activeNodeType.group.includes('trigger') &&
				this.workflowRunning &&
				this.workflowsStore.executionWaitingForWebhook
			);
		},
		activeNode(): INodeUi | null {
			return this.ndvStore.activeNode;
		},
		inputNodeName(): string | undefined {
			return this.selectedInput || this.parentNode;
		},
		inputNode(): INodeUi | null {
			if (this.inputNodeName) {
				return this.workflowsStore.getNodeByName(this.inputNodeName);
			}

			return null;
		},
		activeNodeType(): INodeTypeDescription | null {
			if (this.activeNode) {
				return this.nodeTypesStore.getNodeType(this.activeNode.type, this.activeNode.typeVersion);
			}
			return null;
		},
		showTriggerPanel(): boolean {
			const override = !!this.activeNodeType?.triggerPanel;
			if (typeof this.activeNodeType?.triggerPanel === 'boolean') {
				return override;
			}

			const isWebhookBasedNode = !!this.activeNodeType?.webhooks?.length;
			const isPollingNode = this.activeNodeType?.polling;

			return (
				!this.readOnly && this.isTriggerNode && (isWebhookBasedNode || isPollingNode || override)
			);
		},
		workflow(): Workflow {
			return this.getCurrentWorkflow();
		},
		hasOutputConnection() {
			if (!this.activeNode) return false;
			const outgoingConnections = this.workflowsStore.outgoingConnectionsByNodeName(
				this.activeNode.name,
			) as INodeConnections;

			// Check if there's at-least one output connection
			return (Object.values(outgoingConnections)?.[0]?.[0] ?? []).length > 0;
		},
		parentNodes(): string[] {
			if (this.activeNode) {
				return (
					this.workflow.getParentNodesByDepth(this.activeNode.name, 1).map(({ name }) => name) || []
				);
			}

			return [];
		},
		parentNode(): string | undefined {
			// Return the first parent node that contains data
			for (const parentNodeName of this.parentNodes) {
				// Check first for pinned data
				if (this.workflowsStore.pinnedWorkflowData[parentNodeName]) {
					return parentNodeName;
				}

				// Check then the data of the current execution
				if (this.workflowRunData?.[parentNodeName]) {
					return parentNodeName;
				}
			}

			return this.parentNodes[0];
		},
		isExecutableTriggerNode(): boolean {
			if (!this.activeNodeType) return false;

			return EXECUTABLE_TRIGGER_NODE_TYPES.includes(this.activeNodeType.name);
		},
		isTriggerNode(): boolean {
			return (
				!!this.activeNodeType &&
				(this.activeNodeType.group.includes('trigger') ||
					this.activeNodeType.name === START_NODE_TYPE)
			);
		},
		isActiveStickyNode(): boolean {
			return !!this.ndvStore.activeNode && this.ndvStore.activeNode.type === STICKY_NODE_TYPE;
		},
		workflowExecution(): IExecutionResponse | null {
			return this.workflowsStore.getWorkflowExecution;
		},
		workflowRunData(): IRunData | null {
			if (this.workflowExecution === null) {
				return null;
			}
			const executionData: IRunExecutionData | undefined = this.workflowExecution.data;
			if (executionData?.resultData) {
				return executionData.resultData.runData;
			}
			return null;
		},
		maxOutputRun(): number {
			if (this.activeNode === null) {
				return 0;
			}

			const runData: IRunData | null = this.workflowRunData;

			if (runData === null || !runData.hasOwnProperty(this.activeNode.name)) {
				return 0;
			}

			if (runData[this.activeNode.name].length) {
				return runData[this.activeNode.name].length - 1;
			}

			return 0;
		},
		outputRun(): number {
			if (this.runOutputIndex === -1) {
				return this.maxOutputRun;
			}

			return Math.min(this.runOutputIndex, this.maxOutputRun);
		},
		maxInputRun(): number {
			if (this.inputNode === null || this.activeNode === null) {
				return 0;
			}

			const workflowNode = this.workflow.getNode(this.activeNode.name);
			const outputs = NodeHelpers.getNodeOutputs(this.workflow, workflowNode, this.activeNodeType);

			let node = this.inputNode;

			const runData: IRunData | null = this.workflowRunData;

			if (outputs.some((output) => output !== NodeConnectionType.Main)) {
				node = this.activeNode;
			}

			if (!node || !runData || !runData.hasOwnProperty(node.name)) {
				return 0;
			}

			if (runData[node.name].length) {
				return runData[node.name].length - 1;
			}

			return 0;
		},
		inputRun(): number {
			if (this.isLinkingEnabled && this.maxOutputRun === this.maxInputRun) {
				return this.outputRun;
			}
			if (this.runInputIndex === -1) {
				return this.maxInputRun;
			}

			return Math.min(this.runInputIndex, this.maxInputRun);
		},
		canLinkRuns(): boolean {
			return this.maxOutputRun > 0 && this.maxOutputRun === this.maxInputRun;
		},
		linked(): boolean {
			return this.isLinkingEnabled && this.canLinkRuns;
		},
		inputPanelMargin(): number {
			return this.isTriggerNode ? 0 : 80;
		},
		featureRequestUrl(): string {
			if (!this.activeNodeType) {
				return '';
			}
			return `${BASE_NODE_SURVEY_URL}${this.activeNodeType.name}`;
		},
		outputPanelEditMode(): { enabled: boolean; value: string } {
			return this.ndvStore.outputPanelEditMode;
		},
		isWorkflowRunning(): boolean {
			return this.uiStore.isActionActive('workflowRunning');
		},
		isExecutionWaitingForWebhook(): boolean {
			return this.workflowsStore.executionWaitingForWebhook;
		},
		blockUi(): boolean {
			return this.isWorkflowRunning || this.isExecutionWaitingForWebhook;
		},
		foreignCredentials(): string[] {
			const credentials = (this.activeNode || {}).credentials;
			const usedCredentials = this.workflowsStore.usedCredentials;

			const foreignCredentials: string[] = [];
			if (
				credentials &&
				this.settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing)
			) {
				Object.values(credentials).forEach((credential) => {
					if (
						credential.id &&
						usedCredentials[credential.id] &&
						!usedCredentials[credential.id].currentUserHasAccess
					) {
						foreignCredentials.push(credential.id);
					}
				});
			}

			return foreignCredentials;
		},
		hasForeignCredential(): boolean {
			return this.foreignCredentials.length > 0;
		},
	},
	watch: {
		activeNode(node: INodeUi | null, oldNode: INodeUi | null) {
			if (node && node.name !== oldNode?.name && !this.isActiveStickyNode) {
				this.runInputIndex = -1;
				this.runOutputIndex = -1;
				this.isLinkingEnabled = true;
				this.selectedInput = undefined;
				this.triggerWaitingWarningEnabled = false;
				this.avgOutputRowHeight = 0;
				this.avgInputRowHeight = 0;

				setTimeout(() => this.ndvStore.setNDVSessionId(), 0);
				void this.externalHooks.run('dataDisplay.nodeTypeChanged', {
					nodeSubtitle: this.nodeHelpers.getNodeSubtitle(
						node,
						this.activeNodeType,
						this.getCurrentWorkflow(),
					),
				});

				setTimeout(() => {
					if (this.activeNode) {
						const outgoingConnections = this.workflowsStore.outgoingConnectionsByNodeName(
							this.activeNode.name,
						);

						this.$telemetry.track('User opened node modal', {
							node_type: this.activeNodeType ? this.activeNodeType.name : '',
							workflow_id: this.workflowsStore.workflowId,
							session_id: this.sessionId,
							is_editable: !this.hasForeignCredential,
							parameters_pane_position: this.mainPanelPosition,
							input_first_connector_runs: this.maxInputRun,
							output_first_connector_runs: this.maxOutputRun,
							selected_view_inputs: this.isTriggerNode
								? 'trigger'
								: this.ndvStore.inputPanelDisplayMode,
							selected_view_outputs: this.ndvStore.outputPanelDisplayMode,
							input_connectors: this.parentNodes.length,
							output_connectors: outgoingConnections?.main?.length,
							input_displayed_run_index: this.inputRun,
							output_displayed_run_index: this.outputRun,
							data_pinning_tooltip_presented: this.pinDataDiscoveryTooltipVisible,
							input_displayed_row_height_avg: this.avgInputRowHeight,
							output_displayed_row_height_avg: this.avgOutputRowHeight,
						});
					}
				}, 2000); // wait for RunData to mount and present pindata discovery tooltip
			}
			if (window.top && !this.isActiveStickyNode) {
				window.top.postMessage(JSON.stringify({ command: node ? 'openNDV' : 'closeNDV' }), '*');
			}
		},
		maxOutputRun() {
			this.runOutputIndex = -1;
		},
		maxInputRun() {
			this.runInputIndex = -1;
		},
		inputNodeName(nodeName: string | undefined) {
			setTimeout(() => {
				this.ndvStore.setInputNodeName(nodeName);
			}, 0);
		},
		inputRun() {
			setTimeout(() => {
				this.ndvStore.setInputRunIndex(this.inputRun);
			}, 0);
		},
	},
	methods: {
		setIsTooltipVisible({ isTooltipVisible }: { isTooltipVisible: boolean }) {
			this.pinDataDiscoveryTooltipVisible = isTooltipVisible;
		},
		onKeyDown(e: KeyboardEvent) {
			if (e.key === 's' && this.isCtrlKeyPressed(e)) {
				e.stopPropagation();
				e.preventDefault();

				if (this.readOnly) return;

				this.$emit('saveKeyboardShortcut', e);
			}
		},
		onInputItemHover(e: { itemIndex: number; outputIndex: number } | null) {
			if (e === null || !this.inputNodeName || !this.isPairedItemHoveringEnabled) {
				this.ndvStore.setHoveringItem(null);
				return;
			}

			const item: TargetItem = {
				nodeName: this.inputNodeName,
				runIndex: this.inputRun,
				outputIndex: e.outputIndex,
				itemIndex: e.itemIndex,
			};
			this.ndvStore.setHoveringItem(item);
		},
		onOutputItemHover(e: { itemIndex: number; outputIndex: number } | null) {
			if (e === null || !this.activeNode || !this.isPairedItemHoveringEnabled) {
				this.ndvStore.setHoveringItem(null);
				return;
			}

			const item: TargetItem = {
				nodeName: this.activeNode.name,
				runIndex: this.outputRun,
				outputIndex: e.outputIndex,
				itemIndex: e.itemIndex,
			};
			this.ndvStore.setHoveringItem(item);
		},
		onInputTableMounted(e: { avgRowHeight: number }) {
			this.avgInputRowHeight = e.avgRowHeight;
		},
		onOutputTableMounted(e: { avgRowHeight: number }) {
			this.avgOutputRowHeight = e.avgRowHeight;
		},
		onWorkflowActivate() {
			this.ndvStore.activeNodeName = null;
			setTimeout(() => {
				void this.activateCurrentWorkflow('ndv');
			}, 1000);
		},
		onFeatureRequestClick() {
			window.open(this.featureRequestUrl, '_blank');
			if (this.activeNode) {
				this.$telemetry.track('User clicked ndv link', {
					node_type: this.activeNode.type,
					workflow_id: this.workflowsStore.workflowId,
					session_id: this.sessionId,
					pane: NodeConnectionType.Main,
					type: 'i-wish-this-node-would',
				});
			}
		},
		onPanelsInit(e: { position: number }) {
			this.mainPanelPosition = e.position;
		},
		onDragStart(e: { position: number }) {
			this.isDragging = true;
			this.mainPanelPosition = e.position;
		},
		onDragEnd(e: { windowWidth: number; position: number }) {
			this.isDragging = false;
			this.$telemetry.track('User moved parameters pane', {
				window_width: e.windowWidth,
				start_position: this.mainPanelPosition,
				end_position: e.position,
				node_type: this.activeNodeType ? this.activeNodeType.name : '',
				session_id: this.sessionId,
				workflow_id: this.workflowsStore.workflowId,
			});
			this.mainPanelPosition = e.position;
		},
		onLinkRunToInput() {
			this.runOutputIndex = this.runInputIndex;
			this.isLinkingEnabled = true;
			this.trackLinking('input');
		},
		onLinkRunToOutput() {
			this.isLinkingEnabled = true;
			this.trackLinking('output');
		},
		onUnlinkRun(pane: string) {
			this.runInputIndex = this.runOutputIndex;
			this.isLinkingEnabled = false;
			this.trackLinking(pane);
		},
		trackLinking(pane: string) {
			this.$telemetry.track('User changed ndv run linking', {
				node_type: this.activeNodeType ? this.activeNodeType.name : '',
				session_id: this.sessionId,
				linked: this.linked,
				pane,
			});
		},
		onNodeExecute() {
			setTimeout(() => {
				if (!this.activeNode || !this.workflowRunning) {
					return;
				}
				this.triggerWaitingWarningEnabled = true;
			}, 1000);
		},
		openSettings() {
			this.settingsEventBus.emit('openSettings');
		},
		valueChanged(parameterData: IUpdateInformation) {
			this.$emit('valueChanged', parameterData);
		},
		nodeTypeSelected(nodeTypeName: string) {
			this.$emit('nodeTypeSelected', nodeTypeName);
		},
		async onSwitchSelectedNode(nodeTypeName: string) {
			this.$emit('switchSelectedNode', nodeTypeName);
		},
		async close() {
			if (this.isDragging) {
				return;
			}

			if (
				this.activeNode &&
				(typeof this.activeNodeType?.outputs === 'string' ||
					typeof this.activeNodeType?.inputs === 'string' ||
					this.redrawRequired)
			) {
				// TODO: We should keep track of if it actually changed and only do if required
				// Whenever a node with custom inputs and outputs gets closed redraw it in case
				// they changed
				const nodeName = this.activeNode.name;
				setTimeout(() => {
					this.$emit('redrawNode', nodeName);
				}, 1);
			}

			if (this.outputPanelEditMode.enabled && this.activeNode) {
				const shouldPinDataBeforeClosing = await this.confirm(
					'',
					this.$locale.baseText('ndv.pinData.beforeClosing.title'),
					{
						confirmButtonText: this.$locale.baseText('ndv.pinData.beforeClosing.confirm'),
						cancelButtonText: this.$locale.baseText('ndv.pinData.beforeClosing.cancel'),
					},
				);

				if (shouldPinDataBeforeClosing === MODAL_CONFIRM) {
					const { value } = this.outputPanelEditMode;
					try {
						this.pinnedData.setData(jsonParse(value), 'on-ndv-close-modal');
					} catch (error) {
						console.error(error);
					}
				}

				this.ndvStore.setOutputPanelEditModeEnabled(false);
			}

			await this.externalHooks.run('dataDisplay.nodeEditingFinished');
			this.$telemetry.track('User closed node modal', {
				node_type: this.activeNodeType ? this.activeNodeType.name : '',
				session_id: this.sessionId,
				workflow_id: this.workflowsStore.workflowId,
			});
			this.triggerWaitingWarningEnabled = false;
			this.ndvStore.activeNodeName = null;
			this.ndvStore.resetNDVSessionId();
		},
		onRunOutputIndexChange(run: number) {
			this.runOutputIndex = run;
			this.trackRunChange(run, 'output');
		},
		onRunInputIndexChange(run: number) {
			this.runInputIndex = run;
			if (this.linked) {
				this.runOutputIndex = run;
			}
			this.trackRunChange(run, 'input');
		},
		trackRunChange(run: number, pane: string) {
			this.$telemetry.track('User changed ndv run dropdown', {
				session_id: this.sessionId,
				run_index: run,
				node_type: this.activeNodeType ? this.activeNodeType.name : '',
				pane,
			});
		},
		onInputNodeChange(value: string, index: number) {
			this.runInputIndex = -1;
			this.isLinkingEnabled = true;
			this.selectedInput = value;

			this.$telemetry.track('User changed ndv input dropdown', {
				node_type: this.activeNode ? this.activeNode.type : '',
				session_id: this.sessionId,
				workflow_id: this.workflowsStore.workflowId,
				selection_value: index,
				input_node_type: this.inputNode ? this.inputNode.type : '',
			});
		},
		onStopExecution() {
			this.$emit('stopExecution');
		},
		activateInputPane() {
			this.isInputPaneActive = true;
			this.isOutputPaneActive = false;
		},
		activateOutputPane() {
			this.isInputPaneActive = false;
			this.isOutputPaneActive = true;
		},
		onSearch(search: string) {
			this.isPairedItemHoveringEnabled = !search;
		},
	},
});
</script>

<style lang="scss">
// Hide notice(.ndv-connection-hint-notice) warning when node has output connection
[data-has-output-connection='true'] .ndv-connection-hint-notice {
	display: none;
}
.ndv-wrapper {
	overflow: visible;
	margin-top: 0;
}

.data-display-wrapper {
	height: calc(100% - var(--spacing-2xl));
	margin-top: var(--spacing-xl) !important;
	width: 100%;
	background: none;
	border: none;

	.el-dialog__header {
		padding: 0 !important;
	}

	.el-dialog__body {
		padding: 0 !important;
		height: 100%;
		min-height: 400px;
		overflow: visible;
		border-radius: 8px;
	}
}

.data-display {
	height: 100%;
	width: 100%;
	display: flex;
}
</style>

<style lang="scss" module>
$main-panel-width: 360px;

.modalBackground {
	height: 100%;
	width: 100%;
}

.triggerWarning {
	max-width: 180px;
}

.backToCanvas {
	position: fixed;
	top: var(--spacing-xs);
	left: var(--spacing-l);

	span {
		color: var(--color-ndv-back-font);
	}

	&:hover {
		cursor: pointer;
	}

	> * {
		margin-right: var(--spacing-3xs);
	}
}

@media (min-width: $breakpoint-lg) {
	.backToCanvas {
		top: var(--spacing-xs);
		left: var(--spacing-m);
	}
}

.featureRequest {
	position: absolute;
	bottom: var(--spacing-4xs);
	left: calc(100% + var(--spacing-s));
	color: var(--color-feature-request-font);
	font-size: var(--font-size-2xs);
	white-space: nowrap;

	* {
		margin-right: var(--spacing-3xs);
	}
}
</style>
