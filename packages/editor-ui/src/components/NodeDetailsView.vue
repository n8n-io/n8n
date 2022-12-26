<template>
	<el-dialog
		:visible="(!!activeNode || renaming) && !isActiveStickyNode"
		:before-close="close"
		:show-close="false"
		custom-class="data-display-wrapper"
		class="ndv-wrapper"
		width="auto"
		append-to-body
		data-test-id="ndv"
	>
		<n8n-tooltip
			placement="bottom-start"
			:value="showTriggerWaitingWarning"
			:disabled="!showTriggerWaitingWarning"
			manual
		>
			<template #content>
				<div :class="$style.triggerWarning">
					{{ $locale.baseText('ndv.backToCanvas.waitingForTriggerWarning') }}
				</div>
			</template>
			<div :class="$style.backToCanvas" @click="close" data-test-id="back-to-canvas">
				<n8n-icon icon="arrow-left" color="text-xlight" size="medium" />
				<n8n-text color="text-xlight" size="medium" :bold="true">
					{{ $locale.baseText('ndv.backToCanvas') }}
				</n8n-text>
			</div>
		</n8n-tooltip>

		<div class="data-display" v-if="activeNode">
			<div @click="close" :class="$style.modalBackground"></div>
			<NDVDraggablePanels
				:isTriggerNode="isTriggerNode"
				:hideInputAndOutput="activeNodeType === null"
				:position="isTriggerNode && !showTriggerPanel ? 0 : undefined"
				:isDraggable="!isTriggerNode"
				:nodeType="activeNodeType"
				@close="close"
				@init="onPanelsInit"
				@dragstart="onDragStart"
				@dragend="onDragEnd"
			>
				<template #input>
					<TriggerPanel
						v-if="showTriggerPanel"
						:nodeName="activeNode.name"
						:sessionId="sessionId"
						@execute="onNodeExecute"
						@activate="onWorkflowActivate"
					/>
					<InputPanel
						v-else-if="!isTriggerNode"
						:workflow="workflow"
						:canLinkRuns="canLinkRuns"
						:runIndex="inputRun"
						:linkedRuns="linked"
						:currentNodeName="inputNodeName"
						:sessionId="sessionId"
						:readOnly="readOnly || hasForeignCredential"
						:isProductionExecutionPreview="isProductionExecutionPreview"
						@linkRun="onLinkRunToInput"
						@unlinkRun="() => onUnlinkRun('input')"
						@runChange="onRunInputIndexChange"
						@openSettings="openSettings"
						@select="onInputSelect"
						@execute="onNodeExecute"
						@tableMounted="onInputTableMounted"
						@itemHover="onInputItemHover"
					/>
				</template>
				<template #output>
					<OutputPanel
						data-test-id="output-panel"
						:canLinkRuns="canLinkRuns"
						:runIndex="outputRun"
						:linkedRuns="linked"
						:sessionId="sessionId"
						:isReadOnly="readOnly || hasForeignCredential"
						:blockUI="blockUi && isTriggerNode"
						:isProductionExecutionPreview="isProductionExecutionPreview"
						@linkRun="onLinkRunToOutput"
						@unlinkRun="() => onUnlinkRun('output')"
						@runChange="onRunOutputIndexChange"
						@openSettings="openSettings"
						@tableMounted="onOutputTableMounted"
						@itemHover="onOutputItemHover"
					/>
				</template>
				<template #main>
					<NodeSettings
						:eventBus="settingsEventBus"
						:dragging="isDragging"
						:sessionId="sessionId"
						:nodeType="activeNodeType"
						:hasForeignCredential="hasForeignCredential"
						:readOnly="readOnly"
						:blockUI="blockUi && showTriggerPanel"
						:executable="!readOnly"
						@valueChanged="valueChanged"
						@execute="onNodeExecute"
						@stopExecution="onStopExecution"
						@activate="onWorkflowActivate"
					/>
					<a
						v-if="featureRequestUrl"
						@click="onFeatureRequestClick"
						:class="$style.featureRequest"
						target="_blank"
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
import {
	INodeConnections,
	INodeTypeDescription,
	IRunData,
	IRunExecutionData,
	Workflow,
	jsonParse,
} from 'n8n-workflow';
import { IExecutionResponse, INodeUi, IUpdateInformation, TargetItem } from '@/Interface';

import { externalHooks } from '@/mixins/externalHooks';
import { nodeHelpers } from '@/mixins/nodeHelpers';
import { workflowHelpers } from '@/mixins/workflowHelpers';

import NodeSettings from '@/components/NodeSettings.vue';
import NDVDraggablePanels from './NDVDraggablePanels.vue';

import mixins from 'vue-typed-mixins';
import Vue from 'vue';
import OutputPanel from './OutputPanel.vue';
import InputPanel from './InputPanel.vue';
import TriggerPanel from './TriggerPanel.vue';
import {
	BASE_NODE_SURVEY_URL,
	EnterpriseEditionFeature,
	START_NODE_TYPE,
	STICKY_NODE_TYPE,
} from '@/constants';
import { workflowActivate } from '@/mixins/workflowActivate';
import { pinData } from '@/mixins/pinData';
import { dataPinningEventBus } from '@/event-bus/data-pinning-event-bus';
import { mapStores } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows';
import { useNDVStore } from '@/stores/ndv';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { useUIStore } from '@/stores/ui';
import { useSettingsStore } from '@/stores/settings';

export default mixins(
	externalHooks,
	nodeHelpers,
	workflowHelpers,
	workflowActivate,
	pinData,
).extend({
	name: 'NodeDetailsView',
	components: {
		NodeSettings,
		InputPanel,
		OutputPanel,
		NDVDraggablePanels,
		TriggerPanel,
	},
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
	data() {
		return {
			settingsEventBus: new Vue(),
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
		};
	},
	mounted() {
		this.ndvStore.setNDVSessionId;
		dataPinningEventBus.$on(
			'data-pinning-discovery',
			({ isTooltipVisible }: { isTooltipVisible: boolean }) => {
				this.pinDataDiscoveryTooltipVisible = isTooltipVisible;
			},
		);
	},
	destroyed() {
		dataPinningEventBus.$off('data-pinning-discovery');
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
			const isWebhookBasedNode = !!this.activeNodeType?.webhooks?.length;
			const isPollingNode = this.activeNodeType?.polling;
			const override = !!this.activeNodeType?.triggerPanel;
			return (
				!this.readOnly && this.isTriggerNode && (isWebhookBasedNode || isPollingNode || override)
			);
		},
		workflow(): Workflow {
			return this.getCurrentWorkflow();
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
			return this.parentNodes[0];
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
			if (executionData && executionData.resultData) {
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
			if (this.inputNode === null) {
				return 0;
			}

			const runData: IRunData | null = this.workflowRunData;

			if (runData === null || !runData.hasOwnProperty(this.inputNode.name)) {
				return 0;
			}

			if (runData[this.inputNode.name].length) {
				return runData[this.inputNode.name].length - 1;
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
		hasForeignCredential(): boolean {
			const credentials = (this.activeNode || {}).credentials;
			const usedCredentials = this.workflowsStore.usedCredentials;

			let hasForeignCredential = false;
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
						hasForeignCredential = true;
					}
				});
			}

			return hasForeignCredential;
		},
	},
	watch: {
		activeNode(node: INodeUi | null) {
			if (node && !this.isActiveStickyNode) {
				this.runInputIndex = -1;
				this.runOutputIndex = -1;
				this.isLinkingEnabled = true;
				this.selectedInput = undefined;
				this.triggerWaitingWarningEnabled = false;
				this.avgOutputRowHeight = 0;
				this.avgInputRowHeight = 0;

				setTimeout(() => {
					this.ndvStore.setNDVSessionId;
				}, 0);
				this.$externalHooks().run('dataDisplay.nodeTypeChanged', {
					nodeSubtitle: this.getNodeSubtitle(node, this.activeNodeType, this.getCurrentWorkflow()),
				});

				setTimeout(() => {
					if (this.activeNode) {
						const outgoingConnections = this.workflowsStore.outgoingConnectionsByNodeName(
							this.activeNode.name,
						) as INodeConnections;

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
							output_connectors:
								outgoingConnections && outgoingConnections.main && outgoingConnections.main.length,
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
		onInputItemHover(e: { itemIndex: number; outputIndex: number } | null) {
			if (!this.inputNodeName) {
				return;
			}
			if (e === null) {
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
			if (e === null || !this.activeNode) {
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
				this.activateCurrentWorkflow('ndv');
			}, 1000);
		},
		onFeatureRequestClick() {
			window.open(this.featureRequestUrl, '_blank');
			if (this.activeNode) {
				this.$telemetry.track('User clicked ndv link', {
					node_type: this.activeNode.type,
					workflow_id: this.workflowsStore.workflowId,
					session_id: this.sessionId,
					pane: 'main',
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
			this.settingsEventBus.$emit('openSettings');
		},
		valueChanged(parameterData: IUpdateInformation) {
			this.$emit('valueChanged', parameterData);
		},
		nodeTypeSelected(nodeTypeName: string) {
			this.$emit('nodeTypeSelected', nodeTypeName);
		},
		async close() {
			if (this.isDragging) {
				return;
			}

			if (this.outputPanelEditMode.enabled) {
				const shouldPinDataBeforeClosing = await this.confirmMessage(
					'',
					this.$locale.baseText('ndv.pinData.beforeClosing.title'),
					null,
					this.$locale.baseText('ndv.pinData.beforeClosing.confirm'),
					this.$locale.baseText('ndv.pinData.beforeClosing.cancel'),
				);

				if (shouldPinDataBeforeClosing) {
					const { value } = this.outputPanelEditMode;

					if (!this.isValidPinDataSize(value)) {
						dataPinningEventBus.$emit('data-pinning-error', {
							errorType: 'data-too-large',
							source: 'on-ndv-close-modal',
						});
						return;
					}

					if (!this.isValidPinDataJSON(value)) {
						dataPinningEventBus.$emit('data-pinning-error', {
							errorType: 'invalid-json',
							source: 'on-ndv-close-modal',
						});
						return;
					}

					if (this.activeNode) {
						this.workflowsStore.pinData({ node: this.activeNode, data: jsonParse(value) });
					}
				}

				this.ndvStore.setOutputPanelEditModeEnabled(false);
			}

			this.$externalHooks().run('dataDisplay.nodeEditingFinished');
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
		onInputSelect(value: string, index: number) {
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
	},
});
</script>

<style lang="scss">
.ndv-wrapper {
	overflow: hidden;
}

.data-display-wrapper {
	height: 93%;
	width: 100%;
	margin-top: var(--spacing-xl) !important;
	background: none;
	border: none;

	.el-dialog__header {
		padding: 0 !important;
	}

	.el-dialog__body {
		padding: 0 !important;
		height: 100%;
		min-height: 400px;
		overflow: hidden;
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
	color: var(--color-text-xlight);
	font-size: var(--font-size-2xs);
	white-space: nowrap;

	* {
		margin-right: var(--spacing-3xs);
	}
}
</style>
