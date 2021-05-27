<template>
	<div class="node-settings" @keydown.stop>
		<div class="header-side-menu">
			<span v-if="node">
				<display-with-change :key-name="'name'" @valueChanged="valueChanged"></display-with-change>
				<a v-if="nodeType" :href="'http://n8n.io/nodes/' + nodeType.name" target="_blank" class="node-info">
					<el-tooltip class="clickable" placement="top" effect="light">
						<div slot="content" v-html="'<strong>Node Description:</strong><br />' + nodeTypeDescription + '<br /><br /><strong>Click the \'?\' icon to open this node on n8n.io </strong>'"></div>
						<font-awesome-icon icon="question-circle" />
					</el-tooltip>
				</a>
			</span>
			<span v-else>No node active</span>
		</div>
		<div class="node-is-not-valid" v-if="node && !nodeValid">
			The node is not valid as its type "{{node.type}}" is unknown.
		</div>
		<div class="node-parameters-wrapper" v-if="node && nodeValid">
			<el-tabs stretch>
				<el-tab-pane label="Parameters">
					<node-credentials :node="node" @credentialSelected="credentialSelected"></node-credentials>
					<node-webhooks :node="node" :nodeType="nodeType" />
					<parameter-input-list :parameters="parametersNoneSetting" :hideDelete="true" :nodeValues="nodeValues" path="parameters" @valueChanged="valueChanged" />
					<div v-if="parametersNoneSetting.length === 0">
						This node does not have any parameters.
					</div>
				</el-tab-pane>
				<el-tab-pane label="Settings">
					<parameter-input-list :parameters="nodeSettings" :hideDelete="true" :nodeValues="nodeValues" path="" @valueChanged="valueChanged" />
					<parameter-input-list :parameters="parametersSetting" :nodeValues="nodeValues" path="parameters" @valueChanged="valueChanged" />
				</el-tab-pane>
			</el-tabs>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import {
	INodeTypeDescription,
	INodeParameters,
	INodeProperties,
	NodeHelpers,
	NodeParameterValue,
} from 'n8n-workflow';
import {
	INodeUi,
	INodeUpdatePropertiesInformation,
	IUpdateInformation,
} from '@/Interface';

import DisplayWithChange from '@/components/DisplayWithChange.vue';
import ParameterInputFull from '@/components/ParameterInputFull.vue';
import ParameterInputList from '@/components/ParameterInputList.vue';
import NodeCredentials from '@/components/NodeCredentials.vue';
import NodeWebhooks from '@/components/NodeWebhooks.vue';
import { get, set, unset } from 'lodash';

import { externalHooks } from '@/components/mixins/externalHooks';
import { genericHelpers } from '@/components/mixins/genericHelpers';
import { nodeHelpers } from '@/components/mixins/nodeHelpers';

import mixins from 'vue-typed-mixins';

export default mixins(
	externalHooks,
	genericHelpers,
	nodeHelpers,
)

	.extend({
		name: 'NodeSettings',
		components: {
			DisplayWithChange,
			NodeCredentials,
			ParameterInputFull,
			ParameterInputList,
			NodeWebhooks,
		},
		computed: {
			nodeType (): INodeTypeDescription | null {
				const activeNode = this.node;

				if (this.node) {
					return this.$store.getters.nodeType(this.node.type);
				}

				return null;
			},
			nodeTypeDescription (): string {
				if (this.nodeType && this.nodeType.description) {
					return this.nodeType.description;
				} else {
					return 'No description found';
				}
			},
			headerStyle (): object {
				if (!this.node) {
					return {};
				}

				return {
					'background-color': this.node.color,
				};
			},
			node (): INodeUi {
				return this.$store.getters.activeNode;
			},
			parametersSetting (): INodeProperties[] {
				return this.parameters.filter((item) => {
					return item.isNodeSetting;
				});
			},
			parametersNoneSetting (): INodeProperties[] {
				return this.parameters.filter((item) => {
					return !item.isNodeSetting;
				});
			},
			parameters (): INodeProperties[] {
				if (this.nodeType === null) {
					return [];
				}

				return this.nodeType.properties;
			},
			isColorDefaultValue (): boolean {
				if (this.nodeType === null) {
					return false;
				}

				return this.node.color === this.nodeType.defaults.color;
			},
			workflowRunning (): boolean {
				return this.$store.getters.isActionActive('workflowRunning');
			},
		},
		data () {
			return {
				nodeValid: true,
				nodeColor: null,
				nodeValues: {
					color: '#ff0000',
					alwaysOutputData: false,
					executeOnce: false,
					notesInFlow: false,
					continueOnFail: false,
					retryOnFail: false,
					maxTries: 3,
					waitBetweenTries: 1000,
					notes: '',
					parameters: {},
				} as INodeParameters,

				nodeSettings: [
					{
						displayName: 'Notes',
						name: 'notes',
						type: 'string',
						typeOptions: {
							rows: 5,
						},
						default: '',
						noDataExpression: true,
						description: 'Optional note to save with the node.',
					},
					{
						displayName: 'Display note in flow?',
						name: 'notesInFlow',
						type: 'boolean',
						default: false,
						noDataExpression: true,
						description: 'If active, the note above will display in the flow as a subtitle.',
					},
					{
						displayName: 'Node Color',
						name: 'color',
						type: 'color',
						default: '#ff0000',
						noDataExpression: true,
						description: 'The color of the node in the flow.',
					},
					{
						displayName: 'Always Output Data',
						name: 'alwaysOutputData',
						type: 'boolean',
						default: false,
						noDataExpression: true,
						description: 'If active, the node will return an empty item even if the <br />node returns no data during an initial execution. Be careful setting <br />this on IF-Nodes as it could cause an infinite loop.',
					},
					{
						displayName: 'Execute Once',
						name: 'executeOnce',
						type: 'boolean',
						default: false,
						noDataExpression: true,
						description: 'If active, the node executes only once, with data<br /> from the first item it recieves. ',
					},
					{
						displayName: 'Retry On Fail',
						name: 'retryOnFail',
						type: 'boolean',
						default: false,
						noDataExpression: true,
						description: 'If active, the node tries to execute a failed attempt <br /> multiple times until it succeeds.',
					},
					{
						displayName: 'Max. Tries',
						name: 'maxTries',
						type: 'number',
						typeOptions: {
							minValue: 2,
							maxValue: 5,
						},
						default: 3,
						displayOptions: {
							show: {
								retryOnFail: [
									true,
								],
							},
						},
						noDataExpression: true,
						description: 'Number of times Retry On Fail should attempt to execute the node <br />before stopping and returning the execution as failed.',
					},
					{
						displayName: 'Wait Between Tries',
						name: 'waitBetweenTries',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 5000,
						},
						default: 1000,
						displayOptions: {
							show: {
								retryOnFail: [
									true,
								],
							},
						},
						noDataExpression: true,
						description: 'How long to wait between each attempt. Value in ms.',
					},
					{
						displayName: 'Continue On Fail',
						name: 'continueOnFail',
						type: 'boolean',
						default: false,
						noDataExpression: true,
						description: 'If active, the workflow continues even if this node\'s <br />execution fails. When this occurs, the node passes along input data from<br />previous nodes - so your workflow should account for unexpected output data.',
					},
				] as INodeProperties[],

			};
		},
		watch: {
			node (newNode, oldNode) {
				this.setNodeValues();
			},
		},
		methods: {
			noOp () {},
			setValue (name: string, value: NodeParameterValue) {
				const nameParts = name.split('.');
				let lastNamePart: string | undefined = nameParts.pop();

				let isArray = false;
				if (lastNamePart !== undefined && lastNamePart.includes('[')) {
					// It incldues an index so we have to extract it
					const lastNameParts = lastNamePart.match(/(.*)\[(\d+)\]$/);
					if (lastNameParts) {
						nameParts.push(lastNameParts[1]);
						lastNamePart = lastNameParts[2];
						isArray = true;
					}
				}

				// Set the value via Vue.set that everything updates correctly in the UI
				if (nameParts.length === 0) {
					// Data is on top level
					if (value === null) {
						// Property should be deleted
						// @ts-ignore
						Vue.delete(this.nodeValues, lastNamePart);
					} else {
						// Value should be set
						// @ts-ignore
						Vue.set(this.nodeValues, lastNamePart, value);
					}
				} else {
					// Data is on lower level
					if (value === null) {
						// Property should be deleted
						// @ts-ignore
						let tempValue = get(this.nodeValues, nameParts.join('.')) as INodeParameters | NodeParameters[];
						Vue.delete(tempValue as object, lastNamePart as string);

						if (isArray === true && (tempValue as INodeParameters[]).length === 0) {
							// If a value from an array got delete and no values are left
							// delete also the parent
							lastNamePart = nameParts.pop();
							tempValue = get(this.nodeValues, nameParts.join('.')) as INodeParameters;
							Vue.delete(tempValue as object, lastNamePart as string);
						}
					} else {
						// Value should be set
						if (typeof value === 'object') {
							// @ts-ignore
							Vue.set(get(this.nodeValues, nameParts.join('.')), lastNamePart, JSON.parse(JSON.stringify(value)));
						} else {
							// @ts-ignore
							Vue.set(get(this.nodeValues, nameParts.join('.')), lastNamePart, value);
						}
					}
				}
			},
			credentialSelected (updateInformation: INodeUpdatePropertiesInformation) {
				// Update the values on the node
				this.$store.commit('updateNodeProperties', updateInformation);

				const node = this.$store.getters.nodeByName(updateInformation.name);

				// Update the issues
				this.updateNodeCredentialIssues(node);

				this.$externalHooks().run('nodeSettings.credentialSelected', { updateInformation });
			},
			valueChanged (parameterData: IUpdateInformation) {
				let newValue: NodeParameterValue;
				if (parameterData.hasOwnProperty('value')) {
					// New value is given
					newValue = parameterData.value;
				} else {
					// Get new value from nodeData where it is set already
					newValue = get(this.nodeValues, parameterData.name) as NodeParameterValue;
				}

				// Save the node name before we commit the change because
				// we need the old name to rename the node properly
				const nodeNameBefore = parameterData.node || this.node.name;
				const node = this.$store.getters.nodeByName(nodeNameBefore);
				if (parameterData.name === 'name') {
					// Name of node changed so we have to set also the new node name as active

					// Update happens in NodeView so emit event
					const sendData = {
						value: newValue,
						oldValue: nodeNameBefore,
						name: parameterData.name,
					};
					this.$emit('valueChanged', sendData);

					this.$store.commit('setActiveNode', newValue);
				} else if (parameterData.name.startsWith('parameters.')) {
					// A node parameter changed

					const nodeType = this.$store.getters.nodeType(node.type);

					// Get only the parameters which are different to the defaults
					let nodeParameters = NodeHelpers.getNodeParameters(nodeType.properties, node.parameters, false, false);
					const oldNodeParameters = Object.assign({}, nodeParameters);

					// Copy the data because it is the data of vuex so make sure that
					// we do not edit it directly
					nodeParameters = JSON.parse(JSON.stringify(nodeParameters));

					// Remove the 'parameters.' from the beginning to just have the
					// actual parameter name
					const parameterPath = parameterData.name.split('.').slice(1).join('.');

					// Check if the path is supposed to change an array and if so get
					// the needed data like path and index
					const parameterPathArray = parameterPath.match(/(.*)\[(\d+)\]$/);

					// Apply the new value
					if (parameterData.value === undefined && parameterPathArray !== null) {
						// Delete array item
						const path = parameterPathArray[1];
						const index = parameterPathArray[2];
						const data = get(nodeParameters, path);

						if (Array.isArray(data)) {
							data.splice(parseInt(index, 10), 1);
							Vue.set(nodeParameters as object, path, data);
						}
					} else {
						if (newValue === undefined) {
							unset(nodeParameters as object, parameterPath);
						} else {
							set(nodeParameters as object, parameterPath, newValue);
						}
					}

					// Get the parameters with the now new defaults according to the
					// from the user actually defined parameters
					nodeParameters = NodeHelpers.getNodeParameters(nodeType.properties, nodeParameters as INodeParameters, true, false);

					for (const key of Object.keys(nodeParameters as object)) {
						if (nodeParameters && nodeParameters[key] !== null && nodeParameters[key] !== undefined) {
							this.setValue(`parameters.${key}`, nodeParameters[key] as string);
						}
					}

					// Update the data in vuex
					const updateInformation = {
						name: node.name,
						value: nodeParameters,
					};

					this.$store.commit('setNodeParameters', updateInformation);

					this.$externalHooks().run('nodeSettings.valueChanged', { parameterPath, newValue, parameters: this.parameters, oldNodeParameters });

					this.updateNodeParameterIssues(node, nodeType);
					this.updateNodeCredentialIssues(node);
				} else {
					// A property on the node itself changed

					// Update data in settings
					Vue.set(this.nodeValues, parameterData.name, newValue);

					// Update data in vuex
					const updateInformation = {
						name: node.name,
						key: parameterData.name,
						value: newValue,
					};
					this.$store.commit('setNodeValue', updateInformation);
				}
			},
			/**
			 * Sets the values of the active node in the internal settings variables
			 */
			setNodeValues () {
				if (!this.node) {
					// No node selected
					return;
				}

				if (this.nodeType !== null) {
					this.nodeValid = true;

					const foundNodeSettings = [];
					if (this.node.color) {
						foundNodeSettings.push('color');
						Vue.set(this.nodeValues, 'color', this.node.color);
					}

					if (this.node.notes) {
						foundNodeSettings.push('notes');
						Vue.set(this.nodeValues, 'notes', this.node.notes);
					}

					if (this.node.alwaysOutputData) {
						foundNodeSettings.push('alwaysOutputData');
						Vue.set(this.nodeValues, 'alwaysOutputData', this.node.alwaysOutputData);
					}

					if (this.node.executeOnce) {
						foundNodeSettings.push('executeOnce');
						Vue.set(this.nodeValues, 'executeOnce', this.node.executeOnce);
					}

					if (this.node.continueOnFail) {
						foundNodeSettings.push('continueOnFail');
						Vue.set(this.nodeValues, 'continueOnFail', this.node.continueOnFail);
					}

					if (this.node.notesInFlow) {
						foundNodeSettings.push('notesInFlow');
						Vue.set(this.nodeValues, 'notesInFlow', this.node.notesInFlow);
					}

					if (this.node.retryOnFail) {
						foundNodeSettings.push('retryOnFail');
						Vue.set(this.nodeValues, 'retryOnFail', this.node.retryOnFail);
					}

					if (this.node.maxTries) {
						foundNodeSettings.push('maxTries');
						Vue.set(this.nodeValues, 'maxTries', this.node.maxTries);
					}

					if (this.node.waitBetweenTries) {
						foundNodeSettings.push('waitBetweenTries');
						Vue.set(this.nodeValues, 'waitBetweenTries', this.node.waitBetweenTries);
					}

					// Set default node settings
					for (const nodeSetting of this.nodeSettings) {
						if (!foundNodeSettings.includes(nodeSetting.name)) {
							// Set default value
							Vue.set(this.nodeValues, nodeSetting.name, nodeSetting.default);
						}
						if (nodeSetting.name === 'color') {
							// For color also apply the default node color to the node settings
							nodeSetting.default = this.nodeType.defaults.color;
						}
					}

					Vue.set(this.nodeValues, 'parameters', JSON.parse(JSON.stringify(this.node.parameters)));
				} else {
					this.nodeValid = false;
				}
			},
		},
		mounted () {
			this.setNodeValues();
		},
	});
</script>

<style lang="scss">

.node-settings {
	position: absolute;
	left: 0;
	width: 350px;
	height: 100%;
	border: none;
	z-index: 200;
	font-size: 0.8em;
	color: #555;
	border-radius: 2px 0 0 2px;

	textarea {
		font-size: 0.9em;
		line-height: 1.5em;
		margin: 0.2em 0;

	}
	textarea:hover {
		line-height: 1.5em;
	}

	.header-side-menu {
		padding: 1em 0 1em 1.8em;
		font-size: 1.35em;
		background-color: $--custom-window-sidebar-top;
		color: #555;

		.node-info {
			color: #555;
			display: none;
			padding-left: 0.5em;
			font-size: 0.8em;
		}

		&:hover {
			.node-info {
				display: inline;
			}
		}
	}

	.node-is-not-valid {
		padding: 10px;
	}

	.node-parameters-wrapper {
		height: calc(100% - 110px);

		.el-tabs__header {
			background-color: #fff5f2;
			line-height: 2em;
		}

		.el-tabs {
			height: 100%;
			.el-tabs__content {
				height: calc(100% - 17px);
				overflow-y: auto;

				.el-tab-pane {
					margin: 0 1em;
				}
			}
		}

		.el-tabs__nav {
			padding-bottom: 1em;
		}

		.add-option > .el-input input::placeholder {
			color: #fff;
			font-weight: 600;
		}

		.el-button,
		.add-option > .el-input .el-input__inner,
		.add-option > .el-input .el-input__inner:hover
		{
			background-color: $--color-primary;
			color: #fff;
			text-align: center;
			height: 38px;
		}

		.el-button,
		.add-option > .el-input .el-input__inner
		{
			border: 1px solid $--color-primary;
			border-radius: 17px;
			height: 38px;
		}
	}

	.el-input-number,
	input.el-input__inner {
		font-size: 0.9em;
		line-height: 28px;
		height: 28px;
	}
	.el-input-number {
		padding: 0 10px;
	}

	.el-input--prefix .el-input__inner {
		padding: 0 28px;
	}

	.el-input__prefix {
		left: 2px;
		top: 1px;
	}

	.el-select.add-option .el-input .el-select__caret {
		color: #fff;
	}
}

.parameter-content {
	font-size: 0.9em;
	margin-right: -15px;
	margin-left: -15px;
	input {
		width: calc(100% - 35px);
		padding: 5px;
	}
	select {
		width: calc(100% - 20px);
		padding: 5px;
	}

	&:before {
		display: table;
		content: " ";
		position: relative;
		box-sizing: border-box;
		clear: both;
	}
}

.parameter-wrapper {
	line-height: 2.7em;
	padding: 0 1em;
}
.parameter-name {
	line-height: 2.7em;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.color-reset-button-wrapper {
	position: relative;

}
.color-reset-button {
	position: absolute;
	right: 7px;
	top: -25px;
}

.parameter-value {
	input.expression {
		border-style: dashed;
		border-color: #ff9600;
		display: inline-block;
		position: relative;
		width: 100%;
		box-sizing:border-box;
		background-color: #793300;
	}
}

</style>
