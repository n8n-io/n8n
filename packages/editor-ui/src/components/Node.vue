<template>
	<div class="node-default" :style="nodeStyle" :class="nodeClass" :ref="data.name" @dblclick="setNodeActive" @click.left="mouseLeftClick">
		<div v-if="hasIssues" class="node-info-icon node-issues">
			<el-tooltip placement="top" effect="light">
				<div slot="content" v-html="nodeIssues"></div>
				<font-awesome-icon icon="exclamation-triangle" />
			</el-tooltip>
		</div>
		<el-badge v-else :hidden="workflowDataItems === 0" class="node-info-icon data-count" :value="workflowDataItems"></el-badge>

		<div class="node-executing-info" title="Node is executing">
			<font-awesome-icon icon="spinner" spin />
		</div>
		<div class="node-execute" v-if="!isReadOnly && !workflowRunning">
			<font-awesome-icon class="execute-icon" @click.stop.left="executeNode" icon="play-circle" title="Execute Node"/>
		</div>
		<div class="node-options" v-if="!isReadOnly">
			<div @click.stop.left="deleteNode" class="option indent" title="Delete Node" >
				<font-awesome-icon icon="trash" />
			</div>
			<div @click.stop.left="duplicateNode" class="option" title="Duplicate Node" >
				<font-awesome-icon icon="clone" />
			</div>
			<div @click.stop.left="disableNode" class="option indent" title="Activate/Deactivate Node" >
				<font-awesome-icon :icon="nodeDisabledIcon" />
			</div>
		</div>

		<NodeIcon class="node-icon" :nodeType="nodeType" :style="nodeIconStyle"/>
		<div class="node-name" :title="data.name">
			{{data.name}}
		</div>
		<div v-if="nodeOperation !== null" class="node-operation" :title="nodeOperation">
			{{nodeOperation}}
		</div>
		<div class="node-edit" @click.left.stop="setNodeActive" title="Edit Node">
			<font-awesome-icon icon="pen" />
		</div>
	</div>
</template>

<script lang="ts">

import Vue from 'vue';
import { nodeBase } from '@/components/mixins/nodeBase';

import {
	INodeIssueObjectProperty,
	INodePropertyOptions,
	INodeTypeDescription,
	ITaskData,
	NodeHelpers,
} from 'n8n-workflow';

import NodeIcon from '@/components/NodeIcon.vue';

import mixins from 'vue-typed-mixins';

export default mixins(nodeBase).extend({
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

			if (this.nodeOperation) {
				classes.push('has-operation');
			}

			if (this.isExecuting) {
				classes.push('executing');
			}

			if (this.workflowDataItems !== 0) {
				classes.push('has-data');
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
		nodeOperation (): string | null {
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
			return null;
		},
		workflowRunning (): boolean {
			return this.$store.getters.isActionActive('workflowRunning');
		},
	},
	data () {
		return {
		};
	},
	methods: {
		disableNode () {
			// Toggle disabled flag
			const updateInformation = {
				name: this.data.name,
				properties: {
					disabled: !this.data.disabled,
				},
			};

			this.$store.commit('updateNodeProperties', updateInformation);
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
	},
});

</script>

<style lang="scss">

.node-default {
	position: absolute;
	width: 160px;
	height: 50px;
	background-color: #fff;
	border-radius: 25px;
	text-align: center;
	z-index: 24;
	cursor: pointer;
	color: #444;
	line-height: 50px;
	font-size: 0.8em;
	font-weight: 600;
	border: 1px dashed grey;

	&.has-data {
		border-style: solid;
	}

	&.has-operation {
		line-height: 38px;

		.node-info-icon {
			top: -22px;

			&.data-count {
				top: -15px;
			}
		}
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
			display: initial;
		}
	}

	&:hover {
		.node-execute {
			display: initial;
		}

		.node-options {
			display: initial;
		}
	}

	.node-edit {
		position: absolute;
		top: 0;
		right: 0;
		width: 50px;
		height: 100%;
		font-size: 1.1em;
		color: #ccc;
		border-radius: 0 25px 25px 0;

		&:hover {
			color: #00cc00;
		}

		.svg-inline--fa {
			height: 100%;
		}
	}

	.node-execute {
		display: none;
		position: absolute;
		right: -25px;
		width: 45px;
		line-height: 50px;
		font-size: 1.5em;
		text-align: right;
		z-index: 10;
		color: #aaa;

		.execute-icon:hover {
			color: $--color-primary;
		}
	}

	.node-executing-info {
		display: none;
		position: absolute;
		right: -35px;
		top: 8px;
		z-index: 12;
		width: 30px;
		height: 30px;
		line-height: 30px;
		font-size: 18px;
		text-align: center;
		border-radius: 15px;
		background-color: $--color-primary-light;
		color: $--color-primary;
	}

	.node-icon {
		position: absolute;
		top: 0;
		height: 30px;
		margin: 10px;
	}

	.node-info-icon {
		position: absolute;
		top: -28px;
		right: 18px;
		z-index: 10;

		&.data-count {
			top: -22px;
		}
	}

	.node-issues {
		width: 25px;
		height: 25px;
		font-size: 20px;
		color: #ff0000;
	}

	.node-name {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin: 0 37px;
	}

	.node-operation {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin: -23px 20px 0 20px;
		font-weight: 400;
		color: $--custom-font-light;
		font-size: 0.9em;
	}

	.node-options {
		display: none;
		position: absolute;
		left: -28px;
		width: 45px;
		top: -8px;
		line-height: 1.8em;
		font-size: 12px;
		text-align: left;
		z-index: 10;
		color: #aaa;

		.option {
			width: 20px;
			text-align: center;

			&:hover {
				color: $--color-primary;
			}
			&.indent {
				margin-left: 7px;
			}
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

.node-default.jtk-drag-selected {
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
