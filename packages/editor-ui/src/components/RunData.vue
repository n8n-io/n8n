<template>
	<div class="run-data-view" v-loading="workflowRunning">
		<BinaryDataDisplay :windowVisible="binaryDataDisplayVisible" :displayData="binaryDataDisplayData" @close="closeBinaryDataDisplay"/>

		<el-button
			v-if="node && !isReadOnly"
			:disabled="workflowRunning"
			@click.stop="runWorkflow(node.name)"
			class="execute-node-button"
			:title="`Executes this ${node.name} node after executing any previous nodes that have not yet returned data`"
		>
			<div class="run-icon-button">
				<font-awesome-icon v-if="!workflowRunning" icon="play-circle"/>
				<font-awesome-icon v-else icon="spinner" spin />
			</div>

			Execute Node
		</el-button>

		<div class="header">
			<div class="title-text">
				<strong v-if="dataCount < maxDisplayItems">
					Results: {{ dataCount }}
				</strong>
				<strong v-else>Results:
					<el-select v-model="maxDisplayItems" @click.stop>
						<el-option v-for="option in maxDisplayItemsOptions" :label="option" :value="option" :key="option" />
					</el-select>&nbsp;/
					{{ dataCount }}
				</strong>
				&nbsp;
				<el-popover
					v-if="runMetadata"
					placement="right"
					width="400"
					trigger="hover"
				>
					<strong>Start Time:</strong> {{runMetadata.startTime}}<br/>
					<strong>Execution Time:</strong> {{runMetadata.executionTime}} ms
					<font-awesome-icon icon="info-circle" class="primary-color" slot="reference" />
				</el-popover>
				<span v-if="maxOutputIndex > 0">
					| Output:
					<el-select v-model="outputIndex" @click.stop>
						<el-option v-for="option in (maxOutputIndex + 1)" :label="getOutputName(option-1)" :value="option -1" :key="option">
						</el-option>
					</el-select>
				</span>
				<span v-if="maxRunIndex > 0">
					| Data of Execution:
					<el-select v-model="runIndex" @click.stop>
						<el-option v-for="option in (maxRunIndex + 1)" :label="option + '/' + (maxRunIndex+1)" :value="option-1" :key="option">
						</el-option>
					</el-select>

				</span>
			</div>
			<div v-if="node && workflowRunData !== null && workflowRunData.hasOwnProperty(node.name) && !workflowRunData[node.name][runIndex].error" class="title-data-display-selector" @click.stop>
				<el-radio-group v-model="displayMode" size="mini">
					<el-radio-button label="JSON" :disabled="showData === false"></el-radio-button>
					<el-radio-button label="Table"></el-radio-button>
					<el-radio-button label="Binary" v-if="binaryData.length !== 0"></el-radio-button>
				</el-radio-group>
			</div>
			<div class="select-button" v-if="displayMode === 'JSON' && state.path !== deselectedPlaceholder">
				<el-dropdown trigger="click" @command="handleCopyClick">
					<span class="el-dropdown-link">
						<el-button class="retry-button" circle type="text" size="small" title="Copy">
							<font-awesome-icon icon="copy" />
						</el-button>
					</span>
					<el-dropdown-menu slot="dropdown">
						<el-dropdown-item :command="{command: 'itemPath'}">Copy Item Path</el-dropdown-item>
						<el-dropdown-item :command="{command: 'parameterPath'}">Copy Parameter Path</el-dropdown-item>
						<el-dropdown-item :command="{command: 'value'}">Copy Value</el-dropdown-item>
					</el-dropdown-menu>
				</el-dropdown>

			</div>
		</div>
		<div class="data-display-content">
			<span v-if="node && workflowRunData !== null && workflowRunData.hasOwnProperty(node.name)">
				<div v-if="workflowRunData[node.name][runIndex].error" class="error-display">
					<div class="error-message">ERROR: {{workflowRunData[node.name][runIndex].error.message}}</div>
					<pre><code>{{workflowRunData[node.name][runIndex].error.stack}}</code></pre>
				</div>
				<span v-else>
					<div v-if="showData === false" class="to-much-data">
						<h3>
							Node returned a large amount of data
						</h3>

						<div class="text">
							The node contains {{parseInt(dataSize/1024).toLocaleString()}} KB of data.<br />
							Displaying it could cause problems!<br />
							<br />
							If you do decide to display it, avoid the JSON view!
						</div>

						<el-button size="small" @click="displayMode = 'Table';showData = true;">
							<font-awesome-icon icon="eye"/>
							Display Data Anyway
						</el-button>
					</div>
					<div v-else-if="['JSON', 'Table'].includes(displayMode)">
						<div v-if="jsonData.length === 0" class="no-data">
							No text data found
						</div>
						<div v-else-if="displayMode === 'Table'">
							<div v-if="tableData !== null && tableData.columns.length === 0" class="no-data">
								Entries exist but they do not contain any JSON data.
							</div>
							<table v-else-if="tableData !== null">
								<tr>
									<th v-for="column in tableData.columns" :key="column">{{column}}</th>
								</tr>
								<tr v-for="(row, index1) in tableData.data" :key="index1">
									<td v-for="(data, index2) in row" :key="index2">{{ [null, undefined].includes(data) ? '&nbsp;' : data }}</td>
								</tr>
							</table>
						</div>
						<vue-json-pretty
							v-else-if="displayMode === 'JSON'"
							:data="jsonData"
							:deep="10"
							v-model="state.path"
							:showLine="true"
							:showLength="true"
							selectableType="single"
							path=""
							:highlightSelectedNode="true"
							:selectOnClickNode="true"
							@click="dataItemClicked"
							class="json-data"
						/>
					</div>
					<div v-else-if="displayMode === 'Binary'">
						<div v-if="binaryData.length === 0" class="no-data">
							No binary data found
						</div>

						<div v-else>
							<div v-for="(binaryDataEntry, index) in binaryData" :key="index">
								<div class="binary-data-row-index">
									<div class="binary-data-cell-index">
										{{index + 1}}
									</div>
								</div>

								<div class="binary-data-row">
									<div class="binary-data-cell" v-for="(binaryData, key) in binaryDataEntry" :key="index + '_' + key">
										<div class="binary-data-information">
											<div class="binary-data-cell-name">
												{{key}}
											</div>
											<div v-if="binaryData.fileName">
												<div class="label">File Name: </div>
												<div class="value">{{binaryData.fileName}}</div>
											</div>
											<div v-if="binaryData.fileExtension">
												<div class="label">File Extension:</div>
												<div class="value">{{binaryData.fileExtension}}</div>
											</div>
											<div v-if="binaryData.mimeType">
												<div class="label">Mime Type: </div>
												<div class="value">{{binaryData.mimeType}}</div>
											</div>

											<!-- <el-button @click="displayBinaryData(binaryData)"> -->
											<div class="binary-data-show-data-button-wrapper">
												<el-button size="mini" class="binary-data-show-data-button" @click="displayBinaryData(index, key)">
													Show Binary Data
												</el-button>
											</div>

										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</span>
			</span>
			<div v-else class="message">
				<div>
					<strong>No data</strong><br />
					<br />
					Data returned by this node will display here<br />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
//@ts-ignore
import VueJsonPretty from 'vue-json-pretty';
import {
	GenericValue,
	IBinaryData,
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	IRun,
	IRunData,
	IRunExecutionData,
	ITaskData,
	ITaskDataConnections,
} from 'n8n-workflow';

import {
	IBinaryDisplayData,
	IExecutionResponse,
	INodeUi,
	ITableData,
} from '@/Interface';

import {
	MAX_DISPLAY_DATA_SIZE,
	MAX_DISPLAY_ITEMS_AUTO_ALL,
} from '@/constants';

import BinaryDataDisplay from '@/components/BinaryDataDisplay.vue';

import { copyPaste } from '@/components/mixins/copyPaste';
import { genericHelpers } from '@/components/mixins/genericHelpers';
import { nodeHelpers } from '@/components/mixins/nodeHelpers';
import { workflowRun } from '@/components/mixins/workflowRun';

import mixins from 'vue-typed-mixins';

// A path that does not exist so that nothing is selected by default
const deselectedPlaceholder = '_!^&*';

export default mixins(
	copyPaste,
	genericHelpers,
	nodeHelpers,
	workflowRun,
)
	.extend({
		name: 'RunData',
		components: {
			BinaryDataDisplay,
			VueJsonPretty,
		},
		data () {
			return {
				binaryDataPreviewActive: false,
				dataSize: 0,
				deselectedPlaceholder,
				displayMode: 'Table',
				state: {
					value: '' as object | number | string,
					path: deselectedPlaceholder,
				},
				runIndex: 0,
				showData: false,
				outputIndex: 0,
				maxDisplayItems: 25 as number | null,
				binaryDataDisplayVisible: false,
				binaryDataDisplayData: null as IBinaryDisplayData | null,

				MAX_DISPLAY_DATA_SIZE,
				MAX_DISPLAY_ITEMS_AUTO_ALL,
			};
		},
		computed: {
			workflowRunning (): boolean {
				return this.$store.getters.isActionActive('workflowRunning');
			},
			workflowExecution (): IExecutionResponse | null {
				return this.$store.getters.getWorkflowExecution;
			},
			workflowRunData (): IRunData | null {
				if (this.workflowExecution === null) {
					return null;
				}
				const executionData: IRunExecutionData = this.workflowExecution.data;
				return executionData.resultData.runData;
			},
			maxDisplayItemsOptions (): number[] {
				const options = [25, 50, 100, 250, 500, 1000].filter(option => option <= this.dataCount);
				if (!options.includes(this.dataCount)) {
					options.push(this.dataCount);
				}
				return options;
			},
			node (): INodeUi | null {
				return this.$store.getters.activeNode;
			},
			runMetadata () {
				if (!this.node || this.workflowExecution === null) {
					return null;
				}

				const runData = this.workflowRunData;

				if (runData === null || !runData.hasOwnProperty(this.node.name)) {
					return null;
				}

				if (runData[this.node.name].length <= this.runIndex) {
					return null;
				}

				const taskData: ITaskData = runData[this.node.name][this.runIndex];
				return {
					executionTime: taskData.executionTime,
					startTime: new Date(taskData.startTime).toLocaleString(),
				};
			},
			dataCount (): number {
				if (this.node === null) {
					return 0;
				}

				const runData: IRunData | null = this.workflowRunData;

				if (runData === null || !runData.hasOwnProperty(this.node.name)) {
					return 0;
				}

				if (runData[this.node.name].length <= this.runIndex) {
					return 0;
				}

				if (runData[this.node.name][this.runIndex].hasOwnProperty('error')) {
					return 1;
				}

				if (!runData[this.node.name][this.runIndex].hasOwnProperty('data') ||
					runData[this.node.name][this.runIndex].data === undefined
				) {
					return 0;
				}

				const inputData = this.getMainInputData(runData[this.node.name][this.runIndex].data!, this.outputIndex);

				return inputData.length;
			},
			maxOutputIndex (): number {
				if (this.node === null) {
					return 0;
				}

				const runData: IRunData | null = this.workflowRunData;

				if (runData === null || !runData.hasOwnProperty(this.node.name)) {
					return 0;
				}

				if (runData[this.node.name].length < this.runIndex) {
					return 0;
				}

				if (runData[this.node.name][this.runIndex].data === undefined ||
					runData[this.node.name][this.runIndex].data!.main === undefined
				) {
					return 0;
				}

				return runData[this.node.name][this.runIndex].data!.main.length - 1;
			},
			maxRunIndex (): number {
				if (this.node === null) {
					return 0;
				}

				const runData: IRunData | null = this.workflowRunData;

				if (runData === null || !runData.hasOwnProperty(this.node.name)) {
					return 0;
				}

				if (runData[this.node.name].length) {
					return runData[this.node.name].length - 1;
				}

				return 0;
			},
			jsonData (): IDataObject[] {
				let inputData = this.getNodeInputData(this.node, this.runIndex, this.outputIndex);
				if (inputData.length === 0 || !Array.isArray(inputData)) {
					return [];
				}

				if (this.maxDisplayItems !== null) {
					inputData = inputData.slice(0, this.maxDisplayItems);
				}

				return this.convertToJson(inputData);
			},
			tableData (): ITableData | undefined {
				let inputData = this.getNodeInputData(this.node, this.runIndex, this.outputIndex);
				if (inputData.length === 0) {
					return undefined;
				}

				if (this.maxDisplayItems !== null) {
					inputData = inputData.slice(0,this.maxDisplayItems);
				}

				return this.convertToTable(inputData);
			},
			binaryData (): IBinaryKeyData[] {
				if (this.node === null) {
					return [];
				}

				return this.getBinaryData(this.workflowRunData, this.node.name, this.runIndex, this.outputIndex);
			},
		},
		methods: {
			closeBinaryDataDisplay () {
				this.binaryDataDisplayVisible = false;
				this.binaryDataDisplayData = null;
			},
			convertToJson (inputData: INodeExecutionData[]): IDataObject[] {
				const returnData: IDataObject[] = [];
				inputData.forEach((data) => {
					if (!data.hasOwnProperty('json')) {
						return;
					}
					returnData.push(data.json);
				});

				return returnData;
			},
			convertToTable (inputData: INodeExecutionData[]): ITableData | undefined {
				const tableData: GenericValue[][] = [];
				const tableColumns: string[] = [];
				let leftEntryColumns: string[], entryRows: GenericValue[];
				// Go over all entries
				let entry: IDataObject;
				inputData.forEach((data) => {
					if (!data.hasOwnProperty('json')) {
						return;
					}
					entry = data.json;

					// Go over all keys of entry
					entryRows = [];
					leftEntryColumns = Object.keys(entry);

					// Go over all the already existing column-keys
					tableColumns.forEach((key) => {
						if (entry.hasOwnProperty(key)) {
							// Entry does have key so add its value
							entryRows.push(entry[key]);
							// Remove key so that we know that it got added
							leftEntryColumns.splice(leftEntryColumns.indexOf(key), 1);
						} else {
							// Entry does not have key so add null
							entryRows.push(null);
						}
					});

					// Go over all the columns the entry has but did not exist yet
					leftEntryColumns.forEach((key) => {
						// Add the key for all runs in the future
						tableColumns.push(key);
						// Add the value
						entryRows.push(entry[key]);
					});

					// Add the data of the entry
					tableData.push(entryRows);
				});

				// Make sure that all entry-rows have the same length
				tableData.forEach((entryRows) => {
					if (tableColumns.length > entryRows.length) {
						// Has to less entries so add the missing ones
						entryRows.push.apply(entryRows, new Array(tableColumns.length - entryRows.length));
					}
				});

				return {
					columns: tableColumns,
					data: tableData,
				};
			},
			clearExecutionData () {
				this.$store.commit('setWorkflowExecutionData', null);
				this.updateNodesExecutionIssues();
			},
			dataItemClicked (path: string, data: object | number | string) {
				this.state.value = data;
			},
			displayBinaryData (index: number, key: string) {
				this.binaryDataDisplayVisible = true;

				this.binaryDataDisplayData = {
					node: this.node!.name,
					runIndex: this.runIndex,
					outputIndex: this.outputIndex,
					index,
					key,
				};
			},
			getOutputName (outputIndex: number) {
				if (this.node === null) {
					return outputIndex + 1;
				}

				const nodeType = this.$store.getters.nodeType(this.node.type);
				if (!nodeType.hasOwnProperty('outputNames') || nodeType.outputNames.length <= outputIndex) {
					return outputIndex + 1;
				}

				return nodeType.outputNames[outputIndex];
			},
			convertPath (path: string): string {
				// TODO: That can for sure be done fancier but for now it works
				const placeholder = '*___~#^#~___*';
				let inBrackets = path.match(/\[(.*?)\]/g);

				if (inBrackets === null) {
					inBrackets = [];
				} else {
					inBrackets = inBrackets.map(item => item.slice(1, -1)).map(item => {
						if (item.startsWith('"') && item.endsWith('"')) {
							return item.slice(1, -1);
						}
						return item;
					});
				}
				const withoutBrackets = path.replace(/\[(.*?)\]/g, placeholder);
				const pathParts = withoutBrackets.split('.');
				const allParts = [] as string[];
				pathParts.forEach(part => {
					let index = part.indexOf(placeholder);
					while(index !== -1) {
						if (index === 0) {
							allParts.push(inBrackets!.shift() as string);
							part = part.substr(placeholder.length);
						} else {
							allParts.push(part.substr(0, index));
							part = part.substr(index);
						}
						index = part.indexOf(placeholder);
					}
					if (part !== '') {
						allParts.push(part);
					}
				});

				return '["' + allParts.join('"]["') + '"]';
			},
			handleCopyClick (commandData: { command: string }) {
				const newPath = this.convertPath(this.state.path);

				let value: string;
				if (commandData.command === 'value') {
					if (typeof this.state.value === 'object') {
						value = JSON.stringify(this.state.value, null, 2);
					} else {
						value = this.state.value.toString();
					}
				} else {
					let startPath = '';
					let path = '';
					if (commandData.command === 'itemPath') {
						const pathParts = newPath.split(']');
						const index = pathParts[0].slice(1);
						path = pathParts.slice(1).join(']');
						startPath = `$item(${index}).$node["${this.node!.name}"].json`;
					} else if (commandData.command === 'parameterPath') {
						path = newPath.split(']').slice(1).join(']');
						startPath = `$node["${this.node!.name}"].json`;
					}
					if (!path.startsWith('[') && !path.startsWith('.') && path) {
						path += '.';
					}
					value = `{{ ${startPath + path} }}`;
				}

				this.copyToClipboard(value);
			},
			refreshDataSize () {
				// Hide by default the data from being displayed
				this.showData = false;

				// Check how much data there is to display
				const inputData = this.getNodeInputData(this.node, this.runIndex, this.outputIndex);

				const jsonItems = inputData.slice(0, this.maxDisplayItems || inputData.length).map(item => item.json);

				this.dataSize = JSON.stringify(jsonItems).length;

				if (this.dataSize < this.MAX_DISPLAY_DATA_SIZE) {
					// Data is reasonable small (< 200kb) so display it directly
					this.showData = true;
				}
			},
		},
		watch: {
			node (newNode, oldNode) {
				// Reset the selected output index every time another node gets selected
				this.outputIndex = 0;
				this.maxDisplayItems = 25;
				this.refreshDataSize();
				if (this.displayMode === 'Binary') {
					this.closeBinaryDataDisplay();
					if (this.binaryData.length === 0) {
						this.displayMode = 'Table';
					}
				}
			},
			jsonData () {
				this.refreshDataSize();
			},
			displayMode () {
				this.closeBinaryDataDisplay();
			},
			maxRunIndex () {
				this.runIndex = Math.min(this.runIndex, this.maxRunIndex);
			},
		},
		mounted () {
		},
	});
</script>

<style lang="scss">

.run-data-view {
	position: relative;
	bottom: 0;
	left: 0;
	margin-left: 350px;
	width: calc(100% - 350px);
	height: 100%;
	z-index: 100;
	color: #555;
	font-size: 14px;
	background-color: #f9f9f9;

	.data-display-content {
		position: absolute;
		bottom: 0;
		top: 50px;
		left: 0;
		right: 0;
		overflow-y: auto;

		.binary-data-row {
			display: inline-flex;
			padding: 0.5em 1em;

			.binary-data-cell {
				display: inline-block;
				width: 300px;
				overflow: hidden;
				background-color: #fff;
				margin-right: 1em;
				border-radius: 3px;
				-webkit-box-shadow: 0px 0px 12px 0px rgba(0,0,0,0.05);
				-moz-box-shadow: 0px 0px 12px 0px rgba(0,0,0,0.05);
				box-shadow: 0px 0px 12px 0px rgba(0,0,0,0.05);

				.binary-data-information {
					margin: 1em;

					.binary-data-cell-name {
						color: $--color-primary;
						font-weight: 600;
						font-size: 1.2em;
						padding-bottom: 0.5em;
						margin-bottom: 0.5em;
						border-bottom: 1px solid #ccc;
					}

					.binary-data-show-data-button-wrapper {
						margin-top: 1.5em;
						text-align: center;
						width: 100%;

						.binary-data-show-data-button {
							width: 130px;
						}
					}

					.label {
						padding-top: 0.5em;
						font-weight: bold;
					}
					.value {
						white-space: initial;
						word-wrap: break-word;
					}
				}
			}
		}

		.binary-data-row-index {
			display: block;
			padding: 1em 1em 0.25em 1em;

			.binary-data-cell-index {
				display: inline-block;
				width: 30px;
				height: 30px;
				line-height: 30px;
				border-radius: 5px;
				text-align: center;
				padding: 0 0.1em;
				background-color: $--custom-header-background;
				font-weight: 600;
				color: #fff;
			}
		}

		.json-data {
			&.vjs-tree {
				color: $--custom-input-font;
			}
		}

		.error-display,
		.json-data,
		.message,
		.no-data {
			margin: 1em;
		}

		.to-much-data  {
			margin: 1em;
			text-align: center;

			.text {
				margin-bottom: 1em;
			}
		}

		.error-display {
			.error-message {
				color: #ff0000;
				font-weight: bold;
			}
		}

		table {
			border-collapse: collapse;
			text-align: left;
			width: calc(100% - 1px);
			border-left: 25px solid #00000000;
			border-right: 25px solid #00000000;

			th {
				background-color: $--custom-table-background-main;
				color: #fff;
				padding: 12px;
			}
			td {
				padding: 12px;
			}
			tr:nth-child(even) {
				background: #fff;;
			}
			tr:nth-child(odd) {
				background: $--custom-table-background-alternative;
			}
		}
	}

	.execute-node-button {
		position: absolute;
		top: 10px;
		right: 10px;
		height: 30px;
		width: 140px;
		padding: 7px;
		border-radius: 13px;
		color: $--color-primary;
		border: 1px solid $--color-primary;
		background-color: #fff;
	}
	.execute-node-button:hover {
		transform: scale(1.05);
	}

	.run-icon-button {
		display: inline-block;
		width: 20px;
	}

	.header {
		padding-top: 10px;
		padding-left: 10px;

		.select-button {
			height: 30px;
			top: 50px;
			right: 30px;
			position: absolute;
			text-align: right;
			width: 200px;
			z-index: 10;
		}

		.title-text {
			display: inline-block;
			line-height: 30px;
		}

		.title-data-display-selector {
			position: absolute;
			left: calc(50% - 105px);
			width: 210px;
			display: inline-block;
			line-height: 30px;
			text-align: center;

			.entry.active {
				font-weight: bold;
			}
		}

		.el-select {
			width: 80px;
			z-index: 1;

			.el-input__suffix-inner {
				// TODO: Not sure why I have to do that. Invesigate when I have some time
				position: absolute;
				top: -5px;
				right: 0;
			}

			input.el-input__inner {
				border: 1px solid $--color-primary;
				height: 25px;
				line-height: 25px;
			}
		}
	}
}

</style>
