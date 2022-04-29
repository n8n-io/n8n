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
					@linkRun="onLinkRunToInput"
					@unlinkRun="onUnlinkRun"
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
					@linkRun="onLinkRunToOutput"
					@unlinkRun="onUnlinkRun"
					@runChange="onRunOutputIndexChange"
					@openSettings="openSettings"
				/>
			</div>
			<div :class="$style.mainPanel" :style="mainPanelStyles">
				<div :class="{[$style.dragButton]: true, [$style.visible]: isDragging}" @mousedown="onDragStart">
					<div :class="$style.grid">
						<div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
						</div>
						<div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
						</div>
					</div>
				</div>
				<NodeSettings
					:eventBus="settingsEventBus"
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
import { START_NODE_TYPE, STICKY_NODE_TYPE } from '@/constants';

const MAIN_PANEL_WIDTH = 350;

export default mixins(externalHooks, nodeHelpers, workflowHelpers).extend({
	name: 'DataDisplay',
	components: {
		NodeSettings,
		InputPanel,
		OutputPanel,
	},
	props: {
		renaming: {
			type: Boolean,
		},
	},
	data() {
		return {
			settingsEventBus: new Vue(),
			runInputIndex: 0,
			runOutputIndex: 0,
			linkedRuns: true,
			selectedInput: undefined as string | undefined,
			triggerWaitingWarningEnabled: false,
			windowWidth: 0,
			mainPanelPosition: 0,
			isDragging: false,
		};
	},
	mounted() {
		window.addEventListener('resize', this.setTotalWidth);
	},
	destroyed() {
		window.removeEventListener('resize', this.setTotalWidth);
	},
	computed: {
		...mapGetters(['executionWaitingForWebhook']),
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
		inputNode(): INodeUi {
			return this.$store.getters.getNodeByName(this.inputNodeName);
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
			return Math.min(this.runInputIndex, this.maxInputRun);
		},
		canLinkRuns(): boolean {
			return this.maxOutputRun > 0 && this.maxOutputRun === this.maxInputRun;
		},
		linked(): boolean {
			return this.linkedRuns && this.canLinkRuns;
		},
		mainPanelStyles(): { left: string } {
			const padding = 24 + 80; // padding + min width for panels
			let pos = this.mainPanelPosition + MAIN_PANEL_WIDTH / 2;
			pos = Math.max(padding, pos - MAIN_PANEL_WIDTH);
			pos = Math.min(pos, this.windowWidth - MAIN_PANEL_WIDTH - padding);

			return {
				left: `${pos}px`,
			};
		},
		inputPanelStyles(): {width: string} {
			let width = this.mainPanelPosition - MAIN_PANEL_WIDTH / 2 - 24;
			width = Math.min(width, this.windowWidth - 24 * 2 - 80 - MAIN_PANEL_WIDTH);
			width = Math.max(320, width);
			return {
				width: `${width}px`,
			};
		},
		outputPanelStyles(): {width: string} {
			let width = this.windowWidth - this.mainPanelPosition - MAIN_PANEL_WIDTH / 2 - 24;
			width = Math.min(width, this.windowWidth - 24 * 2 - 80 - MAIN_PANEL_WIDTH);
			width = Math.max(320, width);
			return {
				width: `${width}px`,
			};
		},
	},
	watch: {
		activeNode(node, oldNode) {
			if (node && !oldNode && !this.isActiveStickyNode) {
				this.runInputIndex = 0;
				this.runOutputIndex = 0;
				this.linkedRuns = true;
				this.selectedInput = undefined;
				this.triggerWaitingWarningEnabled = false;

				this.setTotalWidth();
				this.mainPanelPosition = this.windowWidth / 2 ;

				this.$externalHooks().run('dataDisplay.nodeTypeChanged', {
					nodeSubtitle: this.getNodeSubtitle(node, this.activeNodeType, this.getWorkflow()),
				});
				this.$telemetry.track('User opened node modal', {
					node_type: this.activeNodeType ? this.activeNodeType.name : '',
					workflow_id: this.$store.getters.workflowId,
				});
			}
			if (window.top && !this.isActiveStickyNode) {
				window.top.postMessage(JSON.stringify({ command: node ? 'openNDV' : 'closeNDV' }), '*');
			}
		},
	},
	methods: {
		onDragStart(e: MouseEvent) {
			e.preventDefault();
			e.stopPropagation();
			this.isDragging = true;

			window.addEventListener('mousemove', this.onDrag);
			window.addEventListener('mouseup', this.onDragEnd);
		},
		onDrag(e: MouseEvent) {
			e.preventDefault();
			e.stopPropagation();

			this.mainPanelPosition = e.pageX;
		},
		onDragEnd(e: MouseEvent) {
			e.preventDefault();
			e.stopPropagation();

			window.removeEventListener('mousemove', this.onDrag);
			window.removeEventListener('mouseup', this.onDragEnd);

			setTimeout(() => {
				this.isDragging = false;
			}, 0);
		},
		setTotalWidth() {
			this.windowWidth = window.innerWidth;
		},
		onLinkRunToInput() {
			this.linkedRuns = true;
			this.runOutputIndex = this.runInputIndex;
		},
		onLinkRunToOutput() {
			this.linkedRuns = true;
			this.runInputIndex = this.runOutputIndex;
		},
		onUnlinkRun() {
			this.linkedRuns = false;
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
			this.triggerWaitingWarningEnabled = false;
			this.$store.commit('setActiveNode', null);
		},
		onRunOutputIndexChange(run: number) {
			this.runOutputIndex = run;
			if (this.linked) {
				this.runInputIndex = run;
			}
		},
		onRunInputIndexChange(run: number) {
			this.runInputIndex = run;
			if (this.linked) {
				this.runOutputIndex = run;
			}
		},
		onInputSelect(value: string) {
			this.runInputIndex = this.runOutputIndex;
			this.linkedRuns = true;
			this.selectedInput = value;
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
$--main-panel-width: 350px;

.modalBackground {
	height: 100%;
	width: 100%;
}

.panel {
	position: absolute;
	> * {
		overflow: hidden;
	}
}

.dataPanel {
	composes: panel;
	height: calc(100% - 2 * var(--spacing-s));
	position: absolute;
	top: var(--spacing-l);
	> * {
		overflow: hidden;
	}
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

	> * {
		border-radius: 0 var(--border-radius-large) var(--border-radius-large) 0;
	}
}

.mainPanel {
	composes: panel;
	height: 100%;
	box-shadow: 0px 4px 24px rgba(50, 61, 85, 0.06);

	&:hover {
		.dragButton {
			visibility: visible;
		}
	}
}

.dragButton {
	background-color: var(--color-background-base);
	width: 64px;
	height: 21px;
	top: -20px;
	left: 40%;
	border-top-left-radius: var(--border-radius-large);
	border-top-right-radius: var(--border-radius-large);
	position: absolute;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	visibility: hidden;
}

.visible {
	visibility: visible;
}

.grid {
	> div:first-child {
		> div {
			margin-bottom: 2px;
		}
	}

	> div {
		display: flex;

		> div {
			height: 2px;
			width: 2px;
			border-radius: 50%;
			background-color: var(--color-foreground-xdark);
			margin-right: 4px;
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
</style>
