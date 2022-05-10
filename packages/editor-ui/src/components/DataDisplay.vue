<template>
	<el-dialog
		:visible="(!!activeNode || renaming) && !isActiveStickyNode"
		:before-close="close"
		:show-close="false"
		custom-class="data-display-wrapper"
		width="auto"
		append-to-body
	>
		<n8n-tooltip
			placement="bottom-start"
			:value="showTriggerWaitingWarning"
			:disabled="!showTriggerWaitingWarning"
			:manual="true"
		>
			<div slot="content" :class="$style.triggerWarning">
				{{ $locale.baseText('ndv.backToCanvas.waitingForTriggerWarning') }}
			</div>
			<div :class="$style.backToCanvas" @click="close">
				<n8n-icon icon="arrow-left" color="text-xlight" size="medium" />
				<n8n-text color="text-xlight" size="medium" :bold="true">{{
					$locale.baseText('ndv.backToCanvas')
				}}</n8n-text>
			</div>
		</n8n-tooltip>

		<a v-if="featureRequestUrl" @click="onFeatureRequestClick" :class="$style.featureRequest" target="_blank">
			<font-awesome-icon icon="lightbulb" />
			{{ $locale.baseText('ndv.featureRequest') }}
		</a>

		<div class="data-display" v-if="activeNode">
			<div @click="close" :class="$style.modalBackground"></div>
			<div :class="$style.inputPanel" v-if="!isTriggerNode" :style="inputPanelStyles">
				<InputPanel
					:workflow="workflow"
					:canLinkRuns="canLinkRuns"
					:runIndex="inputRun"
					:linkedRuns="linked"
					:currentNodeName="inputNodeName"
					:immediate="!selectedInput"
					:immediateNodeName="parentNode"
					:sessionId="sessionId"
					@linkRun="onLinkRunToInput"
					@unlinkRun="() => onUnlinkRun('input')"
					@runChange="onRunInputIndexChange"
					@openSettings="openSettings"
					@select="onInputSelect"
					@execute="onNodeExecute"
				/>
			</div>
			<div :class="$style.outputPanel" :style="outputPanelStyles">
				<OutputPanel
					:canLinkRuns="canLinkRuns"
					:runIndex="outputRun"
					:linkedRuns="linked"
					:sessionId="sessionId"
					@linkRun="onLinkRunToOutput"
					@unlinkRun="() => onUnlinkRun('output')"
					@runChange="onRunOutputIndexChange"
					@openSettings="openSettings"
				/>
			</div>
			<div :class="$style.mainPanel" :style="mainPanelStyles">
				<PanelDragButton
					:class="{[$style.draggable]: true, [$style.visible]: isDragging}"
					v-if="!isTriggerNode"
					:isDragging="isDragging"
					:canMoveLeft="canMoveLeft"
					:canMoveRight="canMoveRight"
					@mousedown="onDragStart"
				/>
				<NodeSettings
					:eventBus="settingsEventBus"
					:dragging="isDragging"
					:sessionId="sessionId"
					@valueChanged="valueChanged"
					@execute="onNodeExecute"
				/>
			</div>
		</div>
	</el-dialog>
</template>

<script lang="ts">
import { INodeTypeDescription, IRunData, IRunExecutionData, Workflow } from 'n8n-workflow';
import { IExecutionResponse, INodeUi, IUpdateInformation } from '../Interface';

import { externalHooks } from '@/components/mixins/externalHooks';
import { nodeHelpers } from '@/components/mixins/nodeHelpers';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';

import NodeSettings from '@/components/NodeSettings.vue';

import mixins from 'vue-typed-mixins';
import Vue from 'vue';
import OutputPanel from './OutputPanel.vue';
import InputPanel from './InputPanel.vue';
import { mapGetters } from 'vuex';
import { IMMEDIATE_INPUT_KEY, START_NODE_TYPE, STICKY_NODE_TYPE } from '@/constants';
import { isNumber } from './helpers';
import { editor } from 'monaco-editor';
import PanelDragButton from './PanelDragButton.vue';

const MAIN_PANEL_WIDTH = 360;
const SIDE_MARGIN = 24;

export default mixins(externalHooks, nodeHelpers, workflowHelpers).extend({
	name: 'DataDisplay',
	components: {
		NodeSettings,
		InputPanel,
		OutputPanel,
		PanelDragButton,
	},
	props: {
		renaming: {
			type: Boolean,
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
			windowWidth: 0,
			isDragging: false,
			dragStartPosition: 0,
		};
	},
	mounted() {
		this.setTotalWidth();
		this.$store.commit('ui/setNDVSessionId');
		window.addEventListener('resize', this.setTotalWidth);
	},
	destroyed() {
		window.removeEventListener('resize', this.setTotalWidth);
	},
	computed: {
		...mapGetters(['executionWaitingForWebhook']),
		sessionId(): string {
			return this.$store.getters['ui/ndvSessionId'];
		},
		mainPanelPosition(): number {
			if (this.isTriggerNode) {
				return 0;
			}

			const relativePosition = this.$store.getters.getNodeMainPanelPosition(this.activeNode.name) as number | undefined;

			if (isNumber(relativePosition)) {
				return relativePosition * this.windowWidth;
			}

			return .5 * this.windowWidth;
		},
		workflowRunning(): boolean {
			return this.$store.getters.isActionActive('workflowRunning');
		},
		showTriggerWaitingWarning(): boolean {
			return (
				this.triggerWaitingWarningEnabled &&
				!!this.activeNodeType &&
				!this.activeNodeType.group.includes('trigger') &&
				this.workflowRunning &&
				this.executionWaitingForWebhook
			);
		},
		activeNode(): INodeUi {
			return this.$store.getters.activeNode;
		},
		inputNodeName(): string | undefined {
			return this.selectedInput || this.parentNode;
		},
		inputNode(): INodeUi | null {
			if (this.inputNodeName) {
				return this.$store.getters.getNodeByName(this.inputNodeName);
			}

			return null;
		},
		activeNodeType(): INodeTypeDescription | null {
			if (this.activeNode) {
				return this.$store.getters.nodeType(this.activeNode.type, this.activeNode.typeVersion);
			}
			return null;
		},
		workflow(): Workflow {
			return this.getWorkflow();
		},
		parentNode(): string | undefined {
			if (!this.activeNode) {
				return undefined;
			}

			return this.workflow.getParentNodes(this.activeNode.name, 'main', 1)[0];
		},
		isTriggerNode(): boolean {
			return (
				!!this.activeNodeType &&
				(this.activeNodeType.group.includes('trigger') ||
					this.activeNodeType.name === START_NODE_TYPE)
			);
		},
		isActiveStickyNode(): boolean {
			return (
				!!this.$store.getters.activeNode && this.$store.getters.activeNode.type === STICKY_NODE_TYPE
			);
		},
		workflowExecution(): IExecutionResponse | null {
			return this.$store.getters.getWorkflowExecution;
		},
		workflowRunData(): IRunData | null {
			if (this.workflowExecution === null) {
				return null;
			}
			const executionData: IRunExecutionData = this.workflowExecution.data;
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
			return this.isTriggerNode ? 0: 80;
		},
		minimumLeftPosition(): number {
			return SIDE_MARGIN + this.inputPanelMargin;
		},
		maximumRightPosition(): number {
			return  this.windowWidth - MAIN_PANEL_WIDTH - this.minimumLeftPosition;
		},
		mainPanelFinalPositionPx(): number {
			const padding = this.minimumLeftPosition;
			let pos = this.mainPanelPosition + MAIN_PANEL_WIDTH / 2;
			pos = Math.max(padding, pos - MAIN_PANEL_WIDTH);
			pos = Math.min(pos, this.maximumRightPosition);

			return pos;
		},
		canMoveLeft(): boolean {
			return this.mainPanelFinalPositionPx > this.minimumLeftPosition;
		},
		canMoveRight(): boolean {
			return this.mainPanelFinalPositionPx < this.maximumRightPosition;
		},
		mainPanelStyles(): { left: string } {
			return {
				left: `${this.mainPanelFinalPositionPx}px`,
			};
		},
		inputPanelStyles(): {width: string} {
			let width = this.mainPanelPosition - MAIN_PANEL_WIDTH / 2 - SIDE_MARGIN;
			width = Math.min(width, this.windowWidth - SIDE_MARGIN * 2 - this.inputPanelMargin - MAIN_PANEL_WIDTH);
			width = Math.max(320, width);
			return {
				width: `${width}px`,
			};
		},
		outputPanelStyles(): {width: string} {
			let width = this.windowWidth - this.mainPanelPosition - MAIN_PANEL_WIDTH / 2 - SIDE_MARGIN;
			width = Math.min(width, this.windowWidth - SIDE_MARGIN * 2 - this.inputPanelMargin - MAIN_PANEL_WIDTH);
			width = Math.max(320, width);
			return {
				width: `${width}px`,
			};
		},
		featureRequestUrl(): string {
			if (!this.activeNodeType) {
				return '';
			}
			return `https://n8n-community.typeform.com/to/BvmzxqYv#nodename=${this.activeNodeType.name}`;
		},
	},
	watch: {
		activeNode(node, oldNode) {
			if (node && !oldNode && !this.isActiveStickyNode) {
				this.runInputIndex = -1;
				this.runOutputIndex = -1;
				this.isLinkingEnabled = true;
				this.selectedInput = undefined;
				this.triggerWaitingWarningEnabled = false;
				this.setTotalWidth();

				this.$store.commit('ui/setNDVSessionId');
				this.$externalHooks().run('dataDisplay.nodeTypeChanged', {
					nodeSubtitle: this.getNodeSubtitle(node, this.activeNodeType, this.getWorkflow()),
				});
				this.$telemetry.track('User opened node modal', {
					node_type: this.activeNodeType ? this.activeNodeType.name : '',
					workflow_id: this.$store.getters.workflowId,
					session_id: this.sessionId,
					parameters_pane_position: this.getRelativePosition(),
					input_first_connector_runs: this.maxInputRun,
					output_first_connector_runs: this.maxOutputRun,
					// todo
					// input_state with the following events: node has no connection, no input data yet, no input data
					// input_connectors (# of connectors attached to the node, independent of how many ways of connecting there are)
					// output_connectors(# of connectors attached to the node, independent of how many ways of connecting there are)
					// input_first_connector_first_run_rows int
					// input_first_connector_first_run_columns int
					// output_state with the following events: no output data returned, output data is too large, execute node to output data
					// output_first_connector_first_run_rows int
					// output_first_connector_first_run_columns int
					// selected_view_inputs table, json, binary
					// selected_view_outputs table, json, binary
				});
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
	},
	methods: {
		onFeatureRequestClick() {
			window.open(this.featureRequestUrl, '_blank');
		},
		getRelativePosition() {
			const current = this.mainPanelFinalPositionPx + MAIN_PANEL_WIDTH / 2 - this.windowWidth / 2;

			return Math.floor(current / ((this.maximumRightPosition - this.minimumLeftPosition) / 2) * 100);
		},
		onDragStart(e: MouseEvent) {
			e.preventDefault();
			e.stopPropagation();
			this.isDragging = true;

			this.dragStartPosition = this.getRelativePosition();

			window.addEventListener('mousemove', this.onDrag);
			window.addEventListener('mouseup', this.onDragEnd);
		},
		onDrag(e: MouseEvent) {
			e.preventDefault();
			e.stopPropagation();

			const newPosition = e.pageX;
			const relativePosition = newPosition / this.windowWidth;
			this.$store.commit('setNodeMainPanelRelativePosition', {nodeName: this.activeNode.name, relativePosition });
		},
		onDragEnd(e: MouseEvent) {
			e.preventDefault();
			e.stopPropagation();

			window.removeEventListener('mousemove', this.onDrag);
			window.removeEventListener('mouseup', this.onDragEnd);

			this.$telemetry.track('User moved parameters pane', {
				window_width: this.windowWidth,
				start_position: this.dragStartPosition,
				end_position: this.getRelativePosition(),
				node_type: this.activeNodeType ? this.activeNodeType.name : '',
				session_id: this.sessionId,
				workflow_id: this.$store.getters.workflowId,
			});

			setTimeout(() => {
				this.isDragging = false;
			}, 0);
		},
		setTotalWidth() {
			this.windowWidth = window.innerWidth;
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
		close() {
			if (this.isDragging) {
				return;
			}
			this.$externalHooks().run('dataDisplay.nodeEditingFinished');
			this.$telemetry.track('User closed node modal', {
				node_type: this.activeNodeType ? this.activeNodeType.name : '',
				session_id: this.sessionId,
				workflow_id: this.$store.getters.workflowId,
			});
			this.triggerWaitingWarningEnabled = false;
			this.$store.commit('setActiveNode', null);
			this.$store.commit('ui/resetNDVSessionId');
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
				node_type: this.activeNodeType? this.activeNodeType.name: '',
				pane,
			});
		},
		onInputSelect(value: string, index: number) {
			this.runInputIndex = -1;
			this.isLinkingEnabled = true;
			this.selectedInput = value !== IMMEDIATE_INPUT_KEY ? value : undefined;

			this.$telemetry.track('User changed ndv input dropdown', {
				node_type: this.activeNode ? this.activeNode.type : '',
				session_id: this.sessionId,
				workflow_id: this.$store.getters.workflowId,
				selection_value: index,
				input_node_type: this.inputNode? this.inputNode.type: '',
			});
		},
	},
});
</script>

<style lang="scss">
.data-display-wrapper {
	height: 90%;
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

.fade-enter-active,
.fade-enter-to,
.fade-leave-active {
	transition: all 0.75s ease;
	opacity: 1;
}

.fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
	opacity: 0;
}
</style>

<style lang="scss" module>
$--main-panel-width: 360px;

.modalBackground {
	height: 100%;
	width: 100%;
}

.dataPanel {
	position: absolute;
	height: calc(100% - 2 * var(--spacing-l));
	position: absolute;
	top: var(--spacing-l);
	z-index: 0;
}

.inputPanel {
	composes: dataPanel;
	left: var(--spacing-l);

	> * {
		border-radius: var(--border-radius-large) 0 0 var(--border-radius-large);
	}
}

.outputPanel {
	composes: dataPanel;
	right: var(--spacing-l);
	width: $--main-panel-width;

	> * {
		border-radius: 0 var(--border-radius-large) var(--border-radius-large) 0;
	}
}

.mainPanel {
	position: absolute;
	height: 100%;

	&:hover {
		.draggable {
			visibility: visible;
		}
	}
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

@media (min-width: $--breakpoint-lg) {
	.backToCanvas {
		top: var(--spacing-xs);
		left: var(--spacing-m);
	}
}

.featureRequest {
	position: absolute;
	bottom: 0;
	right: var(--spacing-l);
	color: var(--color-text-xlight);
	font-size: var(--font-size-2xs);

	* {
		margin-right: var(--spacing-3xs);
	}
}

.draggable {
	top: -20px;
	left: 40%;
	position: absolute;
	visibility: hidden;
}

.visible {
	visibility: visible;
}

</style>
