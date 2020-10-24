<template>
	<div class="node-wrapper" :style="nodePosition">
		<div class="node-default" :ref="data.name" :style="nodeStyle" :class="nodeClass" @dblclick="setNodeActive" @click.left="mouseLeftClick" v-touch:start="touchStart" v-touch:end="touchEnd">
			<div v-if="hasIssues" class="node-info-icon node-issues">
				<el-tooltip placement="top" effect="light">
					<div slot="content" v-html="nodeIssues"></div>
					<font-awesome-icon icon="exclamation-triangle" />
				</el-tooltip>
			</div>
			<el-badge v-else :hidden="workflowDataItems === 0" class="node-info-icon data-count" :value="workflowDataItems"></el-badge>

			<div class="node-executing-info" title="Node is executing">
				<font-awesome-icon icon="sync-alt" spin />
			</div>
			<div class="node-options" v-if="!isReadOnly">
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

			<NodeIcon class="node-icon" :nodeType="nodeType" size="60" :style="nodeIconStyle"/>
		</div>
		<div class="node-description">
			<div class="node-name" :title="data.name">
				{{data.name}}
			</div>
			<div v-if="nodeSubtitle !== undefined" class="node-subtitle" :title="nodeSubtitle">
				{{nodeSubtitle}}
			</div>
		</div>
	</div>
</template>

<script lang="ts">

import Vue from 'vue';
import { nodeBase } from '@/components/mixins/nodeBase';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';

import {
	INode,
	INodeIssueObjectProperty,
	INodePropertyOptions,
	INodeTypeDescription,
	ITaskData,
	NodeHelpers,
} from 'n8n-workflow';

import NodeIcon from '@/components/NodeIcon.vue';

import mixins from 'vue-typed-mixins';

export default mixins(nodeBase, workflowHelpers).extend({
	name: 'Node',
	components: {
		NodeIcon,
	},
	computed: {
		workflowDataItems () {
			const workflowResultDataNode = this.$store.getters.getWorkflowResultDataByNodeName(this.data.name);
			if (workflowResultDataNode === null) {
				return 0;
			}

			return workflowResultDataNode.length;
		},
		isExecuting (): boolean {
			return this.$store.getters.executingNode === this.data.name;
		},
		nodeIconStyle (): object {
			return {
				color: this.data.disabled ? '#ccc' : this.data.color,
			};
		},
		nodeType (): INodeTypeDescription | null {
			return this.$store.getters.nodeType(this.data.type);
		},
		nodeClass () {
			const classes = [];

			if (this.data.disabled) {
				classes.push('disabled');
			}

			if (this.isExecuting) {
				classes.push('executing');
			}

			if (this.workflowDataItems !== 0) {
				classes.push('has-data');
			}

			if (this.hasIssues) {
				classes.push('has-issues');
			}

			if (this.isTouchDevice) {
				classes.push('is-touch-device');
			}

			if (this.isTouchActive) {
				classes.push('touch-active');
			}

			return classes;
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
		nodeSubtitle (): string | undefined {
			if (this.data.notesInFlow) {
				return this.data.notes;
			}

			if (this.nodeType !== null && this.nodeType.subtitle !== undefined) {
				return this.workflow.expression.getSimpleParameterValue(this.data as INode, this.nodeType.subtitle) as string | undefined;
			}

			if (this.data.parameters.operation !== undefined) {
				const operation = this.data.parameters.operation as string;
				if (this.nodeType === null) {
					return operation;
				}

				const operationData = this.nodeType.properties.find((property) => {
					return property.name === 'operation';
				});
				if (operationData === undefined) {
					return operation;
				}

				if (operationData.options === undefined) {
					return operation;
				}

				const optionData = operationData.options.find((option) => {
					return (option as INodePropertyOptions).value === this.data.parameters.operation;
				});
				if (optionData === undefined) {
					return operation;
				}

				return optionData.name;
			}
			return undefined;
		},
		workflowRunning (): boolean {
			return this.$store.getters.isActionActive('workflowRunning');
		},
		workflow () {
			return this.getWorkflow();
		},
	},
	data () {
		return {
			isTouchActive: false,
		};
	},
	methods: {
		disableNode () {
			this.disableNodes([this.data]);
		},
		executeNode () {
			this.$emit('runWorkflow', this.data.name);
		},
		deleteNode () {
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

<style lang="scss">

.node-wrapper {
	position: absolute;
	width: 100px;
	height: 100px;

	.node-description {
		position: absolute;
		bottom: -55px;
		left: -50px;
		width: 200px;
		height: 50px;
		text-align: center;
		cursor: default;

		.node-name {
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			font-weight: 500;
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
		width: 100%;
		height: 100%;
		background-color: #fff;
		border-radius: 25px;
		text-align: center;
		z-index: 24;
		cursor: pointer;
		color: #444;
		border: 1px dashed grey;

		&.has-data {
			border-style: solid;
		}

		&.disabled {
			color: #a0a0a0;
			text-decoration: line-through;
			border: 1px solid #eee !important;
			background-color: #eee;
		}

		&.executing {
			background-color: $--color-primary-light !important;
			border-color: $--color-primary !important;

			.node-executing-info {
				display: inline-block;
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
			top: calc(50% - 30px);
			left: calc(50% - 30px);
		}

		.node-info-icon {
			position: absolute;
			top: -18px;
			right: 12px;
			z-index: 10;

			&.data-count {
				font-weight: 600;
				top: -12px;
			}
		}

		.node-issues {
			width: 25px;
			height: 25px;
			font-size: 20px;
			color: #ff0000;
		}

		.node-options {
			display: none;
			position: absolute;
			top: -25px;
			left: -10px;
			width: 120px;
			height: 45px;
			font-size: 0.9em;
			text-align: left;
			z-index: 10;
			color: #aaa;
			text-align: center;

			.option {
				width: 20px;
				display: inline-block;
				padding: 0 0.3em;

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

		&.has-data .node-options,
		&.has-issues .node-options {
			top: -35px;
		}
	}
}

</style>

<style>
.el-badge__content {
	border-width: 2px;
	background-color: #67c23a;
}

.jtk-connector {
	z-index:4;
}
.jtk-endpoint {
	z-index:5;
}
.jtk-overlay {
	z-index:6;
}

.jtk-endpoint.dropHover {
	border: 2px solid #ff2244;
}

.jtk-drag-selected .node-default {
	/* https://www.cssmatic.com/box-shadow */
	-webkit-box-shadow: 0px 0px 6px 2px rgba(50, 75, 216, 0.37);
	-moz-box-shadow: 0px 0px 6px 2px rgba(50, 75, 216, 0.37);
	box-shadow: 0px 0px 6px 2px rgba(50, 75, 216, 0.37);
}

.disabled .node-icon img {
	-webkit-filter: contrast(40%) brightness(1.5) grayscale(100%);
	filter: contrast(40%) brightness(1.5) grayscale(100%);
}
</style>
