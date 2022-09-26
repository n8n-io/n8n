<template>
	<div class="node-wrapper" :style="nodePosition" :id="nodeId">
		<div class="select-background" v-show="isSelected"></div>
		<div :class="{'node-default': true, 'touch-active': isTouchActive, 'is-touch-device': isTouchDevice}" :data-name="data.name" :ref="data.name">
			<div :class="nodeClass" :style="nodeStyle"  @dblclick="setNodeActive" @click.left="mouseLeftClick" v-touch:start="touchStart" v-touch:end="touchEnd">
				<div v-if="!data.disabled" :class="{'node-info-icon': true, 'shift-icon': shiftOutputCount}">
					<div v-if="hasIssues" class="node-issues">
						<n8n-tooltip placement="bottom" >
							<titled-list slot="content" :title="`${$locale.baseText('node.issues')}:`" :items="nodeIssues" />
							<font-awesome-icon icon="exclamation-triangle" />
						</n8n-tooltip>
					</div>
					<div v-else-if="waiting" class="waiting">
						<n8n-tooltip placement="bottom">
							<div slot="content" v-text="waiting"></div>
							<font-awesome-icon icon="clock" />
						</n8n-tooltip>
					</div>
					<span v-else-if="hasPinData" class="node-pin-data-icon">
						<font-awesome-icon icon="thumbtack" />
						<span v-if="workflowDataItems > 1" class="items-count"> {{ workflowDataItems }}</span>
					</span>
					<span v-else-if="workflowDataItems" class="data-count">
						<font-awesome-icon icon="check" />
						<span v-if="workflowDataItems > 1" class="items-count"> {{ workflowDataItems }}</span>
					</span>
				</div>

				<div class="node-executing-info" :title="$locale.baseText('node.nodeIsExecuting')">
					<font-awesome-icon icon="sync-alt" spin />
				</div>

				<div class="node-trigger-tooltip__wrapper">
					<n8n-tooltip placement="top" manual :value="showTriggerNodeTooltip" popper-class="node-trigger-tooltip__wrapper--item">
						<div slot="content" v-text="getTriggerNodeTooltip"></div>
						<span />
					</n8n-tooltip>
					<n8n-tooltip
						v-if="isTriggerNode"
						placement="top"
						manual
						:value="pinDataDiscoveryTooltipVisible"
						popper-class="node-trigger-tooltip__wrapper--item"
					>
						<template #content>
							{{ $locale.baseText('node.discovery.pinData.canvas') }}
						</template>
						<span />
					</n8n-tooltip>
				</div>

				<NodeIcon class="node-icon" :nodeType="nodeType" :size="40" :shrink="false" :disabled="this.data.disabled"/>
			</div>

			<div class="node-options no-select-on-click" v-if="!isReadOnly" v-show="!hideActions">
				<div v-touch:tap="deleteNode" class="option" :title="$locale.baseText('node.deleteNode')" >

					<font-awesome-icon icon="trash" />
				</div>
				<div v-touch:tap="disableNode" class="option" :title="$locale.baseText('node.activateDeactivateNode')">
					<font-awesome-icon :icon="nodeDisabledIcon" />
				</div>
				<div v-touch:tap="duplicateNode" class="option" :title="$locale.baseText('node.duplicateNode')">
					<font-awesome-icon icon="clone" />
				</div>
				<div v-touch:tap="setNodeActive" class="option touch" :title="$locale.baseText('node.editNode')" v-if="!isReadOnly">
					<font-awesome-icon class="execute-icon" icon="cog" />
				</div>
				<div v-touch:tap="executeNode" class="option" :title="$locale.baseText('node.executeNode')" v-if="!isReadOnly && !workflowRunning">
					<font-awesome-icon class="execute-icon" icon="play-circle" />
				</div>
			</div>
			<div :class="{'disabled-linethrough': true, success: workflowDataItems > 0}" v-if="showDisabledLinethrough"></div>
		</div>
		<div class="node-description">
			<div class="node-name ph-no-capture" :title="nodeTitle">
				<p>
					{{ nodeTitle }}
				</p>
				<p v-if="data.disabled">
					({{ $locale.baseText('node.disabled') }})
				</p>
			</div>
			<div v-if="nodeSubtitle !== undefined" class="node-subtitle" :title="nodeSubtitle">
				{{ nodeSubtitle }}
			</div>
		</div>
	</div>
</template>

<script lang="ts">

import Vue from 'vue';
import {CUSTOM_API_CALL_KEY, LOCAL_STORAGE_PIN_DATA_DISCOVERY_CANVAS_FLAG, WAIT_TIME_UNLIMITED} from '@/constants';
import { externalHooks } from '@/components/mixins/externalHooks';
import { nodeBase } from '@/components/mixins/nodeBase';
import { nodeHelpers } from '@/components/mixins/nodeHelpers';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import { pinData } from '@/components/mixins/pinData';

import {
	INodeTypeDescription,
	ITaskData,
	NodeHelpers,
} from 'n8n-workflow';

import NodeIcon from '@/components/NodeIcon.vue';
import TitledList from '@/components/TitledList.vue';

import mixins from 'vue-typed-mixins';

import { get } from 'lodash';
import { getStyleTokenValue, getTriggerNodeServiceName } from './helpers';
import { INodeUi, XYPosition } from '@/Interface';

export default mixins(
	externalHooks,
	nodeBase,
	nodeHelpers,
	workflowHelpers,
	pinData,
).extend({
	name: 'Node',
	components: {
		TitledList,
		NodeIcon,
	},
	computed: {
		nodeRunData(): ITaskData[] {
			return this.$store.getters.getWorkflowResultDataByNodeName(this.data.name);
		},
		hasIssues (): boolean {
			if (this.hasPinData) return false;
			if (this.data.issues !== undefined && Object.keys(this.data.issues).length) {
				return true;
			}
			return false;
		},
		workflowDataItems (): number {
			const workflowResultDataNode = this.nodeRunData;
			if (workflowResultDataNode === null) {
				return 0;
			}

			return workflowResultDataNode.length;
		},
		canvasOffsetPosition() {
			return this.$store.getters.getNodeViewOffsetPosition;
		},
		getTriggerNodeTooltip (): string | undefined {
			if (this.nodeType !== null && this.nodeType.hasOwnProperty('eventTriggerDescription')) {
				const nodeName = this.$locale.shortNodeType(this.nodeType.name);
				const { eventTriggerDescription } = this.nodeType;
				return this.$locale.nodeText().eventTriggerDescription(
					nodeName,
					eventTriggerDescription || '',
				);
			} else {
				return this.$locale.baseText(
					'node.waitingForYouToCreateAnEventIn',
					{
						interpolate: {
							nodeType: this.nodeType ? getTriggerNodeServiceName(this.nodeType) : '',
						},
					},
				);
			}
		},
		isPollingTypeNode (): boolean {
			return !!(this.nodeType && this.nodeType.polling);
		},
		isExecuting (): boolean {
			return this.$store.getters.executingNode === this.data.name;
		},
		isSingleActiveTriggerNode (): boolean {
			const nodes = this.$store.getters.workflowTriggerNodes.filter((node: INodeUi) => {
				const nodeType =  this.$store.getters['nodeTypes/getNodeType'](node.type, node.typeVersion) as INodeTypeDescription | null;
				return nodeType && nodeType.eventTriggerDescription !== '' && !node.disabled;
			});

			return nodes.length === 1;
		},
		isTriggerNode (): boolean {
			return !!(this.nodeType && this.nodeType.group.includes('trigger'));
		},
		isTriggerNodeTooltipEmpty () : boolean {
			return this.nodeType !== null ? this.nodeType.eventTriggerDescription === '' : false;
		},
		isNodeDisabled (): boolean | undefined {
			return this.node && this.node.disabled;
		},
		nodeType (): INodeTypeDescription | null {
			return this.data && this.$store.getters['nodeTypes/getNodeType'](this.data.type, this.data.typeVersion);
		},
		node (): INodeUi | undefined { // same as this.data but reactive..
			return this.$store.getters.nodesByName[this.name] as INodeUi | undefined;
		},
		nodeClass (): object {
			return {
				'node-box': true,
				disabled: this.data.disabled,
				executing: this.isExecuting,
			};
		},
		nodeIssues (): string[] {
			if (this.data.issues === undefined) {
				return [];
			}

			return NodeHelpers.nodeIssuesToString(this.data.issues, this.data);
		},
		nodeDisabledIcon (): string {
			if (this.data.disabled === false) {
				return 'pause';
			} else {
				return 'play';
			}
		},
		position (): XYPosition {
			return this.node ? this.node.position : [0, 0];
		},
		showDisabledLinethrough(): boolean {
			return !!(this.data.disabled && this.nodeType && this.nodeType.inputs.length === 1 && this.nodeType.outputs.length === 1);
		},
		nodePosition (): object {
			const returnStyles: {
				[key: string]: string;
			} = {
				left: this.position[0] + 'px',
				top: this.position[1] + 'px',
			};

			return returnStyles;
		},
		shortNodeType (): string {
			return this.$locale.shortNodeType(this.data.type);
		},
		nodeTitle (): string {
			if (this.data.name === 'Start') {
				return this.$locale.headerText({
					key: `headers.start.displayName`,
					fallback: 'Start',
				});
			}

			return this.data.name;
		},
		waiting (): string | undefined {
			const workflowExecution = this.$store.getters.getWorkflowExecution;

			if (workflowExecution && workflowExecution.waitTill) {
				const lastNodeExecuted = get(workflowExecution, 'data.resultData.lastNodeExecuted');
				if (this.name === lastNodeExecuted) {
					const waitDate = new Date(workflowExecution.waitTill);
					if (waitDate.toISOString() === WAIT_TIME_UNLIMITED) {
						return this.$locale.baseText('node.theNodeIsWaitingIndefinitelyForAnIncomingWebhookCall');
					}
					return this.$locale.baseText(
						'node.nodeIsWaitingTill',
						{
							interpolate: {
								date: waitDate.toLocaleDateString(),
								time: waitDate.toLocaleTimeString(),
						 	},
						},
					);
				}
			}

			return;
		},
		workflowRunning (): boolean {
			return this.$store.getters.isActionActive('workflowRunning');
		},
		nodeStyle (): object {
			let borderColor = getStyleTokenValue('--color-foreground-xdark');

			if (this.data.disabled) {
				borderColor = getStyleTokenValue('--color-foreground-base');
			}
			else if (!this.isExecuting) {
				if (this.hasIssues) {
					borderColor = getStyleTokenValue('--color-danger');
				} else if (this.waiting || this.hasPinData) {
					borderColor = getStyleTokenValue('--color-secondary');
				} else if (this.workflowDataItems) {
					borderColor = getStyleTokenValue('--color-success');
				}
			}

			const returnStyles: {
				[key: string]: string;
			} = {
				'border-color': borderColor,
			};

			return returnStyles;
		},
		isSelected (): boolean {
			return this.$store.getters.getSelectedNodes.find((node: INodeUi) => node.name === this.data.name);
		},
		shiftOutputCount (): boolean {
			return !!(this.nodeType && this.nodeType.outputs.length > 2);
		},
		shouldShowTriggerTooltip () : boolean {
			return !!this.node &&
				this.isTriggerNode &&
				!this.isPollingTypeNode &&
				!this.isNodeDisabled &&
				this.workflowRunning &&
				this.workflowDataItems === 0 &&
				this.isSingleActiveTriggerNode &&
				!this.isTriggerNodeTooltipEmpty &&
				!this.hasIssues &&
				!this.dragging;
		},
 	},
	watch: {
		isActive(newValue, oldValue) {
			if (!newValue && oldValue) {
				this.setSubtitle();
			}
		},
		canvasOffsetPosition() {
			if (this.showTriggerNodeTooltip) {
				this.showTriggerNodeTooltip = false;
				setTimeout(() => {
					this.showTriggerNodeTooltip = this.shouldShowTriggerTooltip;
				}, 200);
			}

			if (this.pinDataDiscoveryTooltipVisible) {
				this.pinDataDiscoveryTooltipVisible = false;
				setTimeout(() => {
					this.pinDataDiscoveryTooltipVisible = true;
				}, 200);
			}
		},
		shouldShowTriggerTooltip(shouldShowTriggerTooltip) {
			if (shouldShowTriggerTooltip) {
				setTimeout(() => {
					this.showTriggerNodeTooltip = this.shouldShowTriggerTooltip;
				}, 2500);
			} else {
				this.showTriggerNodeTooltip = false;
			}
		},
		nodeRunData(newValue) {
			this.$emit('run', {name: this.data.name, data: newValue, waiting: !!this.waiting});
		},
	},
	created() {
		const hasSeenPinDataTooltip = localStorage.getItem(LOCAL_STORAGE_PIN_DATA_DISCOVERY_CANVAS_FLAG);
		if (!hasSeenPinDataTooltip) {
			this.unwatchWorkflowDataItems = this.$watch('workflowDataItems', (dataItemsCount: number) => {
				this.showPinDataDiscoveryTooltip(dataItemsCount);
			});
		}
	},
	mounted() {
		this.setSubtitle();
		setTimeout(() => {
			this.$emit('run', {name: this.data && this.data.name, data: this.nodeRunData, waiting: !!this.waiting});
		}, 0);
	},
	data () {
		return {
			isTouchActive: false,
			nodeSubtitle: '',
			showTriggerNodeTooltip: false,
			pinDataDiscoveryTooltipVisible: false,
			dragging: false,
			unwatchWorkflowDataItems: () => {},
		};
	},
	methods: {
		showPinDataDiscoveryTooltip(dataItemsCount: number): void {
			if (!this.isTriggerNode) { return; }

			if (dataItemsCount > 0) {
				localStorage.setItem(LOCAL_STORAGE_PIN_DATA_DISCOVERY_CANVAS_FLAG, 'true');

				this.pinDataDiscoveryTooltipVisible = true;
				this.unwatchWorkflowDataItems();
			}
		},
		setSubtitle() {
			const nodeSubtitle = this.getNodeSubtitle(this.data, this.nodeType, this.getCurrentWorkflow()) || '';

			this.nodeSubtitle = nodeSubtitle.includes(CUSTOM_API_CALL_KEY)
				? ''
				: nodeSubtitle;
		},
		disableNode () {
			this.disableNodes([this.data]);
			this.$telemetry.track('User clicked node hover button', { node_type: this.data.type, button_name: 'disable', workflow_id: this.$store.getters.workflowId });
		},
		executeNode () {
			this.$emit('runWorkflow', this.data.name, 'Node.executeNode');
			this.$telemetry.track('User clicked node hover button', { node_type: this.data.type, button_name: 'execute', workflow_id: this.$store.getters.workflowId });
		},
		deleteNode () {
			this.$telemetry.track('User clicked node hover button', { node_type: this.data.type, button_name: 'delete', workflow_id: this.$store.getters.workflowId });

			Vue.nextTick(() => {
				// Wait a tick else vue causes problems because the data is gone
				this.$emit('removeNode', this.data.name);
			});
		},
		duplicateNode () {
			this.$telemetry.track('User clicked node hover button', { node_type: this.data.type, button_name: 'duplicate', workflow_id: this.$store.getters.workflowId });
			Vue.nextTick(() => {
				// Wait a tick else vue causes problems because the data is gone
				this.$emit('duplicateNode', this.data.name);
			});
		},

		setNodeActive () {
			this.$store.commit('setActiveNode', this.data.name);
			this.pinDataDiscoveryTooltipVisible = false;
		},
		touchStart () {
			if (this.isTouchDevice === true && this.isMacOs === false && this.isTouchActive === false) {
				this.isTouchActive = true;
				setTimeout(() => {
					this.isTouchActive = false;
				}, 2000);
			}
		},
	},
});

</script>

<style lang="scss" scoped>

.node-wrapper {
	position: absolute;
	width: 100px;
	height: 100px;

	.node-description {
		position: absolute;
		top: 100px;
		left: -50px;
		line-height: 1.5;
		text-align: center;
		cursor: default;
		padding: 8px;
		width: 200px;
		pointer-events: none; // prevent container from being draggable

		.node-name > p { // must be paragraph tag to have two lines in safari
			text-overflow: ellipsis;
			display: -webkit-box;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 2;
			overflow: hidden;
			overflow-wrap: anywhere;
			font-weight: var(--font-weight-bold);
			line-height: var(--font-line-height-compact);
		}

		.node-subtitle {
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			font-weight: 400;
			color: $custom-font-light;
			font-size: 0.8em;
		}
	}

	.node-default {
		position: absolute;
		width: 100%;
		height: 100%;
		cursor: pointer;

		.node-box {
			width: 100%;
			height: 100%;
			border: 2px solid var(--color-foreground-xdark);
			border-radius: var(--border-radius-large);
			background-color: var(--color-background-xlight);

			&.executing {
				background-color: var(--color-primary-tint-3) !important;

				.node-executing-info {
					display: inline-block;
				}
			}
		}

		&.touch-active,
		&:hover {
			.node-execute {
				display: initial;
			}

			.node-options {
				display: initial;
			}
		}

		.node-executing-info {
			display: none;
			position: absolute;
			left: 0px;
			top: 0px;
			z-index: 12;
			width: 100%;
			height: 100%;
			font-size: 3.75em;
			line-height: 1.65em;
			text-align: center;
			color: hsla(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l), 0.7);
		}

		.node-icon {
			position: absolute;
			top: calc(50% - 20px);
			left: calc(50% - 20px);
		}

		.node-info-icon {
			position: absolute;
			bottom: 6px;
			right: 6px;

			&.shift-icon {
				right: 12px;
			}

			.data-count {
				font-weight: 600;
				color: var(--color-success);
			}

			.node-issues {
				color: var(--color-danger);
			}

			.items-count {
				font-size: var(--font-size-s);
			}
		}

		.node-pin-data-icon {
			color: var(--color-secondary);
			margin-right: 2px;

			svg {
				height: 0.85rem;
			}
		}

		.waiting {
			color: var(--color-secondary);
		}

		.node-options {
			display: none;
			position: absolute;
			top: -25px;
			left: -10px;
			width: 120px;
			height: 26px;
			font-size: 0.9em;
			text-align: left;
			z-index: 10;
			color: #aaa;
			text-align: center;

			.option {
				width: 28px;
				display: inline-block;

				&.touch {
					display: none;
				}

				&:hover {
					color: $color-primary;
				}

				.execute-icon {
					position: relative;
					top: 2px;
					font-size: 1.2em;
				}
			}
		}

		&.is-touch-device .node-options {
			left: -25px;
			width: 150px;

			.option.touch {
				display: initial;
			}
		}
	}
}

.select-background {
	display: block;
	background-color: hsla(var(--color-foreground-base-h), var(--color-foreground-base-s), var(--color-foreground-base-l), 60%);
	border-radius: var(--border-radius-xlarge);
	overflow: hidden;
	position: absolute;
	left: -8px !important;
	top: -8px !important;
	height: 116px;
	width: 116px !important;
}

.disabled-linethrough {
	border: 1px solid var(--color-foreground-dark);
	position: absolute;
	top: 49px;
	left: -3px;
	width: 111px;
	pointer-events: none;

	&.success {
		border-color: var(--color-success-light);
	}
}
</style>

<style lang="scss">
.jtk-endpoint {
	z-index: 2;
}

.node-trigger-tooltip {
	&__wrapper {
		top: -22px;
		left: 50px;
		position: relative;

		&--item {
			max-width: 160px;
			position: fixed;
			z-index: 0!important;
		}
	}
}

/** connector */
.jtk-connector {
	z-index: 3;
}

.jtk-connector path {
	transition: stroke .1s ease-in-out;
}

.jtk-connector.success {
	z-index: 4;
}

.jtk-connector.jtk-hover {
	z-index: 6;
}

.jtk-endpoint.plus-endpoint {
	z-index: 6;
}

.jtk-endpoint.dot-output-endpoint {
	z-index: 7;
}

.jtk-overlay {
	z-index: 7;
}

.disabled-linethrough {
	z-index: 8;
}

.jtk-connector.jtk-dragging {
	z-index: 8;
}

.jtk-drag-active.dot-output-endpoint, .jtk-drag-active.rect-input-endpoint {
	z-index: 9;
}

.connection-actions {
	z-index: 10;
}

.node-options {
	z-index: 10;
}

.drop-add-node-label {
	z-index: 10;
}

</style>

<style lang="scss">
	$--stalklength: 40px;
	$--box-size-medium: 24px;
	$--box-size-small: 18px;

	.plus-endpoint {
		cursor: pointer;

		.plus-stalk {
			border-top: 2px solid var(--color-foreground-dark);
			position: absolute;
			width: $--stalklength;
			height: 0;
			right: 100%;
			top: calc(50% - 1px);
			pointer-events: none;

		  .connection-run-items-label {
				position: relative;
				width: 100%;

				span {
					display: none;
					left: calc(50% + 4px);
				}
			}
		}

		.plus-container {
			color: var(--color-foreground-xdark);
			border: 2px solid var(--color-foreground-xdark);
			background-color: var(--color-background-xlight);
			border-radius: var(--border-radius-base);
			height: $--box-size-medium;
			width: $--box-size-medium;

			display: inline-flex;
			align-items: center;
			justify-content: center;
			font-size: var(--font-size-2xs);
			position: absolute;

			top: 0;
			right: 0;
			pointer-events: none;

			&.small {
				height: $--box-size-small;
				width: $--box-size-small;
				font-size: 8px;
			}

			.fa-plus {
				width: 1em;
			}
		}

		.drop-hover-message {
			font-weight: var(--font-weight-bold);
			font-size: var(--font-size-2xs);
			line-height: var(--font-line-height-regular);
			color: var(--color-text-light);

			position: absolute;
			top: -6px;
			left: calc(100% + 8px);
			width: 200px;
			display: none;
		}

		&.hidden > * {
			display: none;
		}

		&.success .plus-stalk {
			border-color: var(--color-success-light);

			span {
				display: inline;
			}
		}
	}
</style>
