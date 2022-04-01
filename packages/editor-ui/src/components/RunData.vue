<template>
	<div :class="$style.container">
		<BinaryDataDisplay :windowVisible="binaryDataDisplayVisible" :displayData="binaryDataDisplayData" @close="closeBinaryDataDisplay"/>

		<div :class="$style.header">
			<slot></slot>
			<div v-if="!hasRunError" @click.stop>
				<n8n-radio-buttons
					v-model="displayMode"
					:options="buttons"
				/>
			</div>
		</div>

		<div :class="$style.runSelector" v-if="maxRunIndex > 0" >
			<n8n-select size="small" :value="runIndex" @input="onRunIndexChange" @click.stop>
				<template slot="prepend">{{ $locale.baseText('node.output.run') }}</template>
				<n8n-option v-for="option in (maxRunIndex + 1)" :label="getRunLabel(option)" :value="option - 1" :key="option"></n8n-option>
			</n8n-select>
		</div>

		<n8n-tabs v-model="currentOutputIndex" v-if="maxOutputIndex > 0 && overrideOutputIndex === undefined" :options="branches" />
		<div v-else-if="hasNodeRun && dataCount > 0 && maxRunIndex === 0" :class="$style.itemsCount">
			<n8n-text>
				{{ dataCount }} {{ $locale.baseText(dataCount === 1 ? 'node.output.item' : 'node.output.items') }}
			</n8n-text>
		</div>

		<div :class="$style.dataContainer">
			<div v-if="hasNodeRun && !hasRunError && displayMode === 'json' && state.path !== deselectedPlaceholder" :class="$style.copyButton">
				<el-dropdown trigger="click" @command="handleCopyClick">
					<span class="el-dropdown-link">
						<n8n-icon-button :title="$locale.baseText('runData.copyToClipboard')" icon="copy" />
					</span>
					<el-dropdown-menu slot="dropdown">
						<el-dropdown-item :command="{command: 'itemPath'}">
							{{ $locale.baseText('runData.copyItemPath') }}
						</el-dropdown-item>
						<el-dropdown-item :command="{command: 'parameterPath'}">
							{{ $locale.baseText('runData.copyParameterPath') }}
						</el-dropdown-item>
						<el-dropdown-item :command="{command: 'value'}">
							{{ $locale.baseText('runData.copyValue') }}
						</el-dropdown-item>
					</el-dropdown-menu>
				</el-dropdown>
			</div>

			<div v-if="!hasNodeRun" :class="$style.center">
				<div v-if="workflowRunning">
					<div :class="$style.spinner"><n8n-spinner /></div>
					<n8n-text>{{ $locale.baseText('node.output.executing') }}</n8n-text>
				</div>
				<n8n-text v-else>{{ $locale.baseText('node.output.runNodeHint') }}</n8n-text>
			</div>

			<div v-else-if="hasNodeRun && hasRunError" :class="$style.dataDisplay">
				<NodeErrorView :error="workflowRunData[node.name][runIndex].error" />
			</div>

			<div v-else-if="hasNodeRun && jsonData && jsonData.length === 0" :class="$style.center">
				<n8n-text :bold="true" color="text-dark">{{ $locale.baseText('node.output.noOutputData.title') }}</n8n-text>
				<n8n-text>
					{{ $locale.baseText('node.output.noOutputData.message') }}
					<a @click="openSettings">{{ $locale.baseText('node.output.noOutputData.message.settings') }}</a>
					{{ $locale.baseText('node.output.noOutputData.message.settingsOption') }}
				</n8n-text>
			</div>

			<div v-else-if="hasNodeRun && !showData" :class="$style.center">
				<n8n-text :bold="true" color="text-dark">{{ $locale.baseText('node.output.tooMuchData.title') }}</n8n-text>
				<n8n-text align="center" tag="div"><span v-html="$locale.baseText('node.output.tooMuchData.message', { interpolate: {size: dataSizeInMB }})"></span></n8n-text>

				<n8n-button
					type="outline"
					:label="$locale.baseText('node.output.tooMuchData.showDataAnyway')"
					@click="showData = true"
				/>
			</div>

			<div v-else-if="hasNodeRun && displayMode === 'table' && tableData && tableData.columns && tableData.columns.length === 0" :class="$style.dataDisplay">
				<table :class="$style.table">
					<tr>
						<th :class="$style.emptyCell"></th>
					</tr>
					<tr v-for="(row, index1) in tableData.data" :key="index1">
						<td>
							<n8n-text>{{ $locale.baseText('node.output.emptyOutput') }}</n8n-text>
						</td>
					</tr>
				</table>
			</div>

			<div v-else-if="hasNodeRun && displayMode === 'table' && tableData" :class="$style.dataDisplay">
				<table :class="$style.table">
					<tr>
						<th v-for="column in (tableData.columns || [])" :key="column">{{column}}</th>
					</tr>
					<tr v-for="(row, index1) in tableData.data" :key="index1">
						<td v-for="(data, index2) in row" :key="index2">{{ [null, undefined].includes(data) ? '&nbsp;' : data }}</td>
					</tr>
				</table>
			</div>

			<div v-else-if="hasNodeRun && displayMode === 'json'" :class="$style.jsonDisplay">
				<vue-json-pretty
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

			<div v-else-if="displayMode === 'binary' && binaryData.length === 0" :class="$style.center">
				<n8n-text align="center" tag="div">{{ $locale.baseText('runData.noBinaryDataFound') }}</n8n-text>
			</div>

			<div v-else-if="displayMode === 'binary'" :class="$style.dataDisplay">
				<div v-for="(binaryDataEntry, index) in binaryData" :key="index">
					<div :class="$style.binaryIndex" v-if="binaryData.length > 1">
						<div>
							{{index + 1}}
						</div>
					</div>

					<div :class="$style.binaryRow">
						<div :class="$style.binaryCell" v-for="(binaryData, key) in binaryDataEntry" :key="index + '_' + key">
							<div>
								<div :class="$style.binaryHeader">
									{{key}}
								</div>
								<div v-if="binaryData.fileName">
									<div><n8n-text size="small" :bold="true">{{ $locale.baseText('runData.fileName') }}: </n8n-text></div>
									<div :class="$style.binaryValue">{{binaryData.fileName}}</div>
								</div>
								<div v-if="binaryData.directory">
									<div><n8n-text size="small" :bold="true">{{ $locale.baseText('runData.directory') }}: </n8n-text></div>
									<div :class="$style.binaryValue">{{binaryData.directory}}</div>
								</div>
								<div v-if="binaryData.fileExtension">
									<div><n8n-text size="small" :bold="true">{{ $locale.baseText('runData.fileExtension') }}:</n8n-text></div>
									<div :class="$style.binaryValue">{{binaryData.fileExtension}}</div>
								</div>
								<div v-if="binaryData.mimeType">
									<div><n8n-text size="small" :bold="true">{{ $locale.baseText('runData.mimeType') }}: </n8n-text></div>
									<div :class="$style.binaryValue">{{binaryData.mimeType}}</div>
								</div>

								<div :class="$style.binaryButtonContainer">
									<n8n-button size="small" :label="$locale.baseText('runData.showBinaryData')" class="binary-data-show-data-button" @click="displayBinaryData(index, key)" />
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div :class="$style.pagination">
			<el-pagination
				background
				:hide-on-single-page="true"
				:current-page.sync="currentPage"
				:small="true"
				:pager-count="5"
				:page-size="pageSize"
				layout="prev, pager, next"
				:class="$style.pagination"
				:total="dataCount">
			</el-pagination>
		</div>

	</div>
</template>

<script lang="ts">
//@ts-ignore
import VueJsonPretty from 'vue-json-pretty';
import {
	GenericValue,
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	INodeTypeDescription,
	IRunData,
	IRunExecutionData,
	ITaskData,
} from 'n8n-workflow';

import {
	IBinaryDisplayData,
	IExecutionResponse,
	INodeUi,
	ITab,
	ITableData,
} from '@/Interface';

import {
	MAX_DISPLAY_DATA_SIZE,
	MAX_DISPLAY_ITEMS_AUTO_ALL,
} from '@/constants';

import BinaryDataDisplay from '@/components/BinaryDataDisplay.vue';
import WarningTooltip from '@/components/WarningTooltip.vue';
import NodeErrorView from '@/components/Error/NodeErrorView.vue';

import { copyPaste } from '@/components/mixins/copyPaste';
import { externalHooks } from "@/components/mixins/externalHooks";
import { genericHelpers } from '@/components/mixins/genericHelpers';
import { nodeHelpers } from '@/components/mixins/nodeHelpers';

import mixins from 'vue-typed-mixins';

// A path that does not exist so that nothing is selected by default
const deselectedPlaceholder = '_!^&*';

export default mixins(
	copyPaste,
	externalHooks,
	genericHelpers,
	nodeHelpers,
)
	.extend({
		name: 'RunData',
		components: {
			BinaryDataDisplay,
			NodeErrorView,
			VueJsonPretty,
			WarningTooltip,
		},
		props: {
			nodeUi: {
			}, // INodeUi | null
			runIndex: {
				type: Number,
			},
			overrideOutputIndex: {
				type: Number,
			},
		},
		data () {
			return {
				binaryDataPreviewActive: false,
				dataSize: 0,
				deselectedPlaceholder,
				displayMode: 'table',
				state: {
					value: '' as object | number | string,
					path: deselectedPlaceholder,
				},
				showData: false,
				currentOutputIndex: 0,
				binaryDataDisplayVisible: false,
				binaryDataDisplayData: null as IBinaryDisplayData | null,

				MAX_DISPLAY_DATA_SIZE,
				MAX_DISPLAY_ITEMS_AUTO_ALL,
				currentPage: 1,
				pageSize: 10,
			};
		},
		mounted() {
			this.init();
		},
		computed: {
			outputIndex(): number {
				return this.overrideOutputIndex !== undefined ? this.overrideOutputIndex : this.currentOutputIndex;
			},
			node(): INodeUi | null {
				return (this.nodeUi as INodeUi | null) || null;
			},
			buttons(): Array<{label: string, value: string}> {
				const defaults = [
					{ label: this.$locale.baseText('runData.json'), value: 'json'},
					{ label: this.$locale.baseText('runData.table'), value: 'table'},
				];
				if (this.binaryData.length) {
					return [ ...defaults,
						{ label: this.$locale.baseText('runData.binary'), value: 'binary'},
					];
				}

				return defaults;
			},
			hasNodeRun(): boolean {
				return Boolean(this.node && this.workflowRunData && this.workflowRunData.hasOwnProperty(this.node.name));
			},
			hasRunError(): boolean {
				return Boolean(this.node && this.workflowRunData && this.workflowRunData[this.node.name] && this.workflowRunData[this.node.name][this.runIndex] && this.workflowRunData[this.node.name][this.runIndex].error);
			},
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
			dataCount (): number {
				return this.getDataCount(this.runIndex, this.outputIndex);
			},
			dataSizeInMB(): string {
				return (this.dataSize / 1024 / 1000).toLocaleString();
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
			inputData (): INodeExecutionData[] {
				let inputData = this.getNodeInputData(this.node, this.runIndex, this.outputIndex);
				if (inputData.length === 0 || !Array.isArray(inputData)) {
					return [];
				}

				const offset = this.pageSize * (this.currentPage - 1);
				inputData = inputData.slice(offset, offset + this.pageSize);

				return inputData;
			},
			jsonData (): IDataObject[] {
				return this.convertToJson(this.inputData);
			},
			tableData (): ITableData | undefined {
				return this.convertToTable(this.inputData);
			},
			binaryData (): IBinaryKeyData[] {
				if (!this.node) {
					return [];
				}

				return this.getBinaryData(this.workflowRunData, this.node.name, this.runIndex, this.outputIndex);
			},
			branches (): ITab[] {
				function capitalize(name: string) {
					return name.charAt(0).toLocaleUpperCase() + name.slice(1);
				}
				const branches: ITab[] = [];
				for (let i = 0; i <= this.maxOutputIndex; i++) {
					const itemsCount = this.getDataCount(this.runIndex, i);
					const items = this.$locale.baseText(itemsCount === 1 ? 'node.output.item': 'node.output.items');
					let outputName = this.getOutputName(i);
					if (`${outputName}` === `${i}`) {
						outputName = `${this.$locale.baseText('node.output')} ${outputName}`;
					}
					else {
						outputName = capitalize(`${this.getOutputName(i)} ${this.$locale.baseText('node.output.branch')}`);
					}
					branches.push({
						label: itemsCount ? `${outputName} (${itemsCount} ${items})` : outputName,
						value: i,
					});
				}
				return branches;
			},
		},
		methods: {
			getRunLabel(option: number) {
				let itemsCount = 0;
				for (let i = 0; i <= this.maxOutputIndex; i++) {
					itemsCount += this.getDataCount(option - 1, i);
				}
				const items = this.$locale.baseText(itemsCount === 1 ? 'node.output.item': 'node.output.items');
				const itemsLabel = itemsCount > 0 ? ` (${itemsCount} ${items})` : '';
				return option + this.$locale.baseText('node.output.of') + (this.maxRunIndex+1) + itemsLabel;
			},
			getDataCount(runIndex: number, outputIndex: number) {
				if (this.node === null) {
					return 0;
				}

				const runData: IRunData | null = this.workflowRunData;

				if (runData === null || !runData.hasOwnProperty(this.node.name)) {
					return 0;
				}

				if (runData[this.node.name].length <= runIndex) {
					return 0;
				}

				if (runData[this.node.name][runIndex].hasOwnProperty('error')) {
					return 1;
				}

				if (!runData[this.node.name][runIndex].hasOwnProperty('data') ||
					runData[this.node.name][runIndex].data === undefined
				) {
					return 0;
				}

				const inputData = this.getMainInputData(runData[this.node.name][runIndex].data!, outputIndex);

				return inputData.length;
			},
			openSettings() {
				this.$emit('openSettings');
			},
			init() {
				// Reset the selected output index every time another node gets selected
				this.currentOutputIndex = 0;
				this.refreshDataSize();
				if (this.displayMode === 'binary') {
					this.closeBinaryDataDisplay();
					if (this.binaryData.length === 0) {
						this.displayMode = 'table';
					}
				}
			},
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

				const nodeType = this.$store.getters.nodeType(this.node.type, this.node.typeVersion) as INodeTypeDescription | null;
				if (!nodeType || !nodeType.outputNames || nodeType.outputNames.length <= outputIndex) {
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

				const offset = this.pageSize * (this.currentPage - 1);
				const jsonItems = inputData.slice(offset, offset + this.pageSize).map(item => item.json);

				this.dataSize = JSON.stringify(jsonItems).length;

				if (this.dataSize < this.MAX_DISPLAY_DATA_SIZE) {
					// Data is reasonable small (< 200kb) so display it directly
					this.showData = true;
				}
			},
			onRunIndexChange(run: number) {
				this.$emit('runChange', run);
			},
		},
		watch: {
			node() {
				this.init();
			},
			jsonData () {
				this.refreshDataSize();
			},
			displayMode (newValue, oldValue) {
				this.closeBinaryDataDisplay();
				this.$externalHooks().run('runData.displayModeChanged', { newValue, oldValue });
				if(this.node) {
					const nodeType = this.node ? this.node.type : '';
					this.$telemetry.track('User changed node output view mode', { old_mode: oldValue, new_mode: newValue, node_type: nodeType, workflow_id: this.$store.getters.workflowId });
				}
			},
		},
	});
</script>

<style lang="scss" module>
.infoIcon {
	color: var(--color-foreground-dark);
}

.center {
	display: flex;
	height: 80%;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: var(--spacing-s);

	> * {
		max-width: 316px;
		margin-bottom: var(--spacing-2xs);
	}
}

.spinner {
	* {
		color: var(--color-primary);
		min-height: 40px;
		min-width: 40px;
	}

	display: flex;
	justify-content: center;
	margin-bottom: var(--spacing-s);
}

.container {
	position: relative;
	width: 100%;
	height: 100%;
	background-color: var(--color-background-light);
	display: flex;
	flex-direction: column;
}

.header {
	display: flex;
	align-items: center;
	margin-bottom: var(--spacing-s);
	padding: var(--spacing-s) var(--spacing-s) 0 var(--spacing-s);

	> *:first-child {
		flex-grow: 1;
	}
}

.dataContainer {
	position: relative;
	height: 100%;
}

.dataDisplay {
	position: absolute;
	top: 0;
	left: 0;
	padding-left: var(--spacing-s);
	padding-top: var(--spacing-s);
	right: 0;
	overflow-y: auto;
	line-height: 1.5;
	word-break: normal;
	height: 100%;
}

.jsonDisplay {
	composes: dataDisplay;
	background-color: var(--color-background-base);
}

.table {
	border-collapse: collapse;
	text-align: left;
	width: calc(100% - 1px);
	border: var(--border-base);
	font-size: var(--font-size-2xs);

	th {
		padding: var(--spacing-2xs);
		background-color: var(--color-background-base);
		border: var(--border-base);
	}

	td {
		padding: var(--spacing-2xs);
		border: var(--border-base);
	}
}

.emptyCell {
	height: 32px;
}

.itemsCount {
	margin-left: var(--spacing-s);
}

.runSelector {
	max-width: 200px;
	margin-left: var(--spacing-s);
	margin-bottom: var(--spacing-s);
}

.copyButton {
	height: 30px;
	top: 12px;
	right: 24px;
	position: absolute;
	z-index: 10;
}

.pagination {
	position: absolute;
	width: 100%;
	display: flex;
	justify-content: center;
	bottom: 0;
	padding: 5px;
}

.binaryIndex {
	display: block;
	padding: var(--spacing-2xs);
	font-size: var(--font-size-2xs);

	> * {
		display: inline-block;
		width: 30px;
		height: 30px;
		line-height: 30px;
		border-radius: var(--border-radius-base);
		text-align: center;
		background-color: var(--color-foreground-xdark);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-xlight);
	}
}

.binaryRow {
	display: inline-flex;
	font-size: var(--font-size-2xs);
}


.binaryCell {
	display: inline-block;
	width: 300px;
	overflow: hidden;
	background-color: #fff;
	margin-right: var(--spacing-s);
	margin-bottom: var(--spacing-s);
	border-radius: var(--border-radius-base);
	border: var(--border-base);
	padding: var(--spacing-s);
}

.binaryHeader {
	color: $--color-primary;
	font-weight: 600;
	font-size: 1.2em;
	padding-bottom: 0.5em;
	margin-bottom: 0.5em;
	border-bottom: 1px solid #ccc;
}

.binaryButtonContainer {
	margin-top: 1.5em;
	text-align: center;
}

.binaryValue {
	white-space: initial;
	word-wrap: break-word;
}

</style>

<style lang="scss">
.vjs-tree {
	color: #5045A1; // todo
}

.vjs-tree.is-highlight-selected {
	background-color: #EBEDF3;
}

.vjs-tree .vjs-value__null {
	color: var(--color-danger);
}

.vjs-tree .vjs-value__boolean,
.vjs-tree .vjs-value__number {
	color: #1d8ce0; // todo
}

.vjs-tree .vjs-value__string {
	color: #5045A1; // todo
}

.vjs-tree .vjs-key, .vjs-tree__brackets {
	color: var(--color-text-dark);
}
</style>
