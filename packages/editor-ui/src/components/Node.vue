<template>
	<div :class="{'node-wrapper': true, selected: isSelected}" :style="nodePosition">
		<div class="select-background" v-show="isSelected"></div>
		<div :class="{'node-default': true, 'touch-active': isTouchActive, 'is-touch-device': isTouchDevice}" :data-name="data.name" :ref="data.name">
			<div :class="nodeClass" :style="nodeStyle"  @dblclick="setNodeActive" @click.left="mouseLeftClick" v-touch:start="touchStart" v-touch:end="touchEnd">
				<div v-if="!data.disabled" :class="{'node-info-icon': true, 'shift-icon': shiftOutputCount}">
					<div v-if="hasIssues" class="node-issues">
						<n8n-tooltip placement="bottom" >
							<div slot="content" v-html="nodeIssues"></div>
							<font-awesome-icon icon="exclamation-triangle" />
						</n8n-tooltip>
					</div>
					<div v-else-if="waiting" class="waiting">
						<n8n-tooltip placement="bottom">
							<div slot="content" v-html="waiting"></div>
							<font-awesome-icon icon="clock" />
						</n8n-tooltip>
					</div>
					<span v-else-if="workflowDataItems" class="data-count">
						<font-awesome-icon icon="check" />
						<span v-if="workflowDataItems > 1" class="items-count"> {{ workflowDataItems }}</span>
					</span>
				</div>

				<div class="node-executing-info" title="Node is executing">
					<font-awesome-icon icon="sync-alt" spin />
				</div>

				<NodeIcon class="node-icon" :nodeType="nodeType" :size="40" :shrink="false" :disabled="this.data.disabled"/>
			</div>

			<div class="node-options no-select-on-click" v-if="!isReadOnly" v-show="!hideActions">
				<div v-touch:tap="deleteNode" class="option" title="Delete Node" >
					<font-awesome-icon icon="trash" />
				</div>
				<div v-touch:tap="disableNode" class="option" title="Activate/Deactivate Node" >
					<font-awesome-icon :icon="nodeDisabledIcon" />
				</div>
				<div v-touch:tap="duplicateNode" class="option" title="Duplicate Node" >
					<font-awesome-icon icon="clone" />
				</div>
				<div v-touch:tap="setNodeActive" class="option touch" title="Edit Node" v-if="!isReadOnly">
					<font-awesome-icon class="execute-icon" icon="cog" />
				</div>
				<div v-touch:tap="executeNode" class="option" title="Execute Node" v-if="!isReadOnly && !workflowRunning">
					<font-awesome-icon class="execute-icon" icon="play-circle" />
				</div>
			</div>
			<div :class="{'disabled-linethrough': true, success: workflowDataItems > 0}" v-if="showDisabledLinethrough"></div>
		</div>
		<div class="node-description">
			<div class="node-name" :title="data.name">
				<p>{{ nodeTitle }}</p>
				<p v-if="data.disabled">(Disabled)</p>
			</div>
			<div v-if="nodeSubtitle !== undefined" class="node-subtitle" :title="nodeSubtitle">
				{{nodeSubtitle}}
			</div>
		</div>
	</div>
</template>

<script lang="ts">

import Vue from 'vue';
import { WAIT_TIME_UNLIMITED } from '@/constants';
import { externalHooks } from '@/components/mixins/externalHooks';
import { nodeBase } from '@/components/mixins/nodeBase';
import { nodeHelpers } from '@/components/mixins/nodeHelpers';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';

import {
	INodeTypeDescription,
	ITaskData,
	NodeHelpers,
} from 'n8n-workflow';

import NodeIcon from '@/components/NodeIcon.vue';

import mixins from 'vue-typed-mixins';

import { get } from 'lodash';
import { getStyleTokenValue } from './helpers';
import { INodeUi, XYPosition } from '@/Interface';

export default mixins(externalHooks, nodeBase, nodeHelpers, workflowHelpers).extend({
	name: 'Node',
	components: {
		NodeIcon,
	},
	computed: {
		nodeRunData(): ITaskData[] {
			return this.$store.getters.getWorkflowResultDataByNodeName(this.data.name);
		},
		hasIssues (): boolean {
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
		isExecuting (): boolean {
			return this.$store.getters.executingNode === this.data.name;
		},
		nodeType (): INodeTypeDescription | null {
			return this.$store.getters.nodeType(this.data.type);
		},
		nodeClass (): object {
			return {
				'node-box': true,
				disabled: this.data.disabled,
				executing: this.isExecuting,
			};
		},
		nodeIssues (): string {
			if (this.data.issues === undefined) {
				return '';
			}

			const nodeIssues = NodeHelpers.nodeIssuesToString(this.data.issues, this.data);

			return 'Issues:<br />&nbsp;&nbsp;- ' + nodeIssues.join('<br />&nbsp;&nbsp;- ');
		},
		nodeDisabledIcon (): string {
			if (this.data.disabled === false) {
				return 'pause';
			} else {
				return 'play';
			}
		},
		position (): XYPosition {
			const node = this.$store.getters.nodesByName[this.name] as INodeUi; // position responsive to store changes

			return node.position;
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
		nodeTitle (): string {
			return this.data.name;
		},
		waiting (): string | undefined {
			const workflowExecution = this.$store.getters.getWorkflowExecution;

			if (workflowExecution && workflowExecution.waitTill) {
				const lastNodeExecuted = get(workflowExecution, 'data.resultData.lastNodeExecuted');
				if (this.name === lastNodeExecuted) {
					const waitDate = new Date(workflowExecution.waitTill);
					if (waitDate.toISOString() === WAIT_TIME_UNLIMITED) {
						return 'The node is waiting indefinitely for an incoming webhook call.';
					}
					return `Node is waiting till ${waitDate.toLocaleDateString()} ${waitDate.toLocaleTimeString()}`;
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
				}
				else if (this.waiting) {
					borderColor = getStyleTokenValue('--color-secondary');
				}
				else if (this.workflowDataItems) {
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
	},
	watch: {
		isActive(newValue, oldValue) {
			if (!newValue && oldValue) {
				this.setSubtitle();
			}
		},
		nodeRunData(newValue) {
			this.$emit('run', {name: this.data.name, data: newValue, waiting: !!this.waiting});
		},
	},
	mounted() {
		this.setSubtitle();
		setTimeout(() => {
			this.$emit('run', {name: this.data.name, data: this.nodeRunData, waiting: !!this.waiting});
		}, 0);
	},
	data () {
		return {
			isTouchActive: false,
			nodeSubtitle: '',
		};
	},
	methods: {
		setSubtitle() {
			this.nodeSubtitle = this.getNodeSubtitle(this.data, this.nodeType, this.getWorkflow()) || '';
		},
		disableNode () {
			this.disableNodes([this.data]);
			this.$telemetry.track('User set node enabled status', { node_type: this.data.type, is_enabled: !this.data.disabled, workflow_id: this.$store.getters.workflowId });
		},
		executeNode () {
			this.$emit('runWorkflow', this.data.name, 'Node.executeNode');
		},
		deleteNode () {
			this.$externalHooks().run('node.deleteNode', { node: this.data});
			this.$telemetry.track('User deleted node', { node_type: this.data.type, workflow_id: this.$store.getters.workflowId });

			Vue.nextTick(() => {
				// Wait a tick else vue causes problems because the data is gone
				this.$emit('removeNode', this.data.name);
			});
		},
		duplicateNode () {
			Vue.nextTick(() => {
				// Wait a tick else vue causes problems because the data is gone
				this.$emit('duplicateNode', this.data.name);
			});
		},
		setNodeActive () {
			this.$store.commit('setActiveNode', this.data.name);
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
			color: $--custom-font-light;
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
				background-color: $--color-primary-light !important;

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
			color: rgba($--color-primary, 0.7);
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

		.waiting {
			color: var(--color-secondary);
		}

		.node-options {
			display: none;
			position: absolute;
			top: -25px;
			left: -10px;
			width: 120px;
			height: 24px;
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
					color: $--color-primary;
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
/** node */
.node-wrapper.selected {
	z-index: 2;
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

/** node endpoints */
.jtk-endpoint {
	z-index:5;
}

.jtk-connector.jtk-hover {
	z-index: 6;
}

.disabled-linethrough {
	z-index: 6;
}

.jtk-endpoint.jtk-hover {
	z-index: 7;
}

.jtk-overlay {
	z-index:7;
}

.jtk-connector.jtk-dragging {
	z-index: 8;
}

.jtk-endpoint.jtk-drag-active {
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
