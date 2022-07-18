<template>
	<div :class="$style.container">
		<BinaryDataDisplay :windowVisible="binaryDataDisplayVisible" :displayData="binaryDataDisplayData" @close="closeBinaryDataDisplay"/>

		<div :class="$style.header">
			<slot name="header"></slot>

			<div v-show="!hasRunError && hasNodeRun && ((jsonData && jsonData.length > 0) || (binaryData && binaryData.length > 0))" @click.stop :class="$style.displayModes">
				<n8n-radio-buttons
					:value="displayMode"
					:options="buttons"
					@input="onDisplayModeChange"
				/>
			</div>
		</div>

		<div :class="$style.runSelector" v-if="maxRunIndex > 0" >
			<n8n-select size="small" :value="runIndex" @input="onRunIndexChange" @click.stop>
				<template slot="prepend">{{ $locale.baseText('ndv.output.run') }}</template>
				<n8n-option v-for="option in (maxRunIndex + 1)" :label="getRunLabel(option)" :value="option - 1" :key="option"></n8n-option>
			</n8n-select>


			<n8n-tooltip placement="right" v-if="canLinkRuns" :content="$locale.baseText(linkedRuns ? 'runData.unlinking.hint': 'runData.linking.hint')">
				<n8n-icon-button v-if="linkedRuns" icon="unlink" type="text" size="small" @click="unlinkRun" />
				<n8n-icon-button v-else icon="link" type="text" size="small" @click="linkRun" />
			</n8n-tooltip>

			<slot name="run-info"></slot>
		</div>

		<div v-if="maxOutputIndex > 0" :class="{[$style.tabs]: displayMode === 'table'}">
			<n8n-tabs :value="currentOutputIndex" @input="onBranchChange" :options="branches" />
		</div>

		<div v-else-if="hasNodeRun && dataCount > 0 && maxRunIndex === 0" :class="$style.itemsCount">
			<n8n-text>
				{{ dataCount }} {{ $locale.baseText('ndv.output.items', {adjustToNumber: dataCount}) }}
			</n8n-text>
		</div>

		<div :class="$style.dataContainer" ref="dataContainer">
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

			<div v-if="isExecuting" :class="$style.center">
				<div :class="$style.spinner"><n8n-spinner type="ring" /></div>
				<n8n-text>{{ executingMessage }}</n8n-text>
			</div>

			<div v-else-if="!hasNodeRun" :class="$style.center">
				<slot name="node-not-run"></slot>
			</div>

			<div v-else-if="hasNodeRun && hasRunError" :class="$style.errorDisplay">
				<NodeErrorView :error="workflowRunData[node.name][runIndex].error" />
			</div>

			<div v-else-if="hasNodeRun && jsonData && jsonData.length === 0 && branches.length > 1" :class="$style.center">
				<n8n-text>
					{{ noDataInBranchMessage }}
				</n8n-text>
			</div>

			<div v-else-if="hasNodeRun && jsonData && jsonData.length === 0" :class="$style.center">
				<slot name="no-output-data"></slot>
			</div>

			<div v-else-if="hasNodeRun && !showData" :class="$style.center">
				<n8n-text :bold="true" color="text-dark" size="large">{{ tooMuchDataTitle }}</n8n-text>
				<n8n-text align="center" tag="div"><span v-html="$locale.baseText('ndv.output.tooMuchData.message', { interpolate: {size: dataSizeInMB }})"></span></n8n-text>

				<n8n-button
					type="outline"
					:label="$locale.baseText('ndv.output.tooMuchData.showDataAnyway')"
					@click="showTooMuchData"
				/>
			</div>

			<div v-else-if="hasNodeRun && displayMode === 'table' && tableData && tableData.columns && tableData.columns.length === 0 && binaryData.length > 0" :class="$style.center">
				<n8n-text>
					{{ $locale.baseText('runData.switchToBinary.info') }}
					<a @click="switchToBinary">
						{{ $locale.baseText('runData.switchToBinary.binary') }}
					</a>
				</n8n-text>
			</div>

			<div v-else-if="hasNodeRun && displayMode === 'table' && tableData" :class="$style.dataDisplay">
				<RunDataTable :node="node" :tableData="tableData" :mappingEnabled="mappingEnabled" :distanceFromActive="distanceFromActive" :showMappingHint="showMappingHint" :runIndex="runIndex" :totalRuns="maxRunIndex" />
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
									<n8n-button v-if="isDownloadable(index, key)" size="small" type="outline" :label="$locale.baseText('runData.downloadBinaryData')" class="binary-data-show-data-button" @click="downloadBinaryData(index, key)" />
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div :class="$style.pagination" v-if="hasNodeRun && !hasRunError && dataCount > pageSize">
			<el-pagination
				background
				:hide-on-single-page="true"
				:current-page.sync="currentPage"
				:pager-count="5"
				:page-size="pageSize"
				layout="prev, pager, next"
				@current-change="onCurrentPageChange"
				:total="dataCount">
			</el-pagination>

			<div :class="$style.pageSizeSelector">
				<n8n-select size="mini" :value="pageSize" @input="onPageSizeChange">
					<template slot="prepend">{{ $locale.baseText('ndv.output.pageSize') }}</template>
					<n8n-option
						v-for="size in pageSizes"
						:key="size"
						:label="size"
						:value="size">
					</n8n-option>
					<n8n-option
						:label="$locale.baseText('ndv.output.all')"
						:value="dataCount"
					>
					</n8n-option>
				</n8n-select>
			</div>
		</div>

	</div>
</template>

<script lang="ts">
//@ts-ignore
import VueJsonPretty from 'vue-json-pretty';
import {
	GenericValue,
	IBinaryData,
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
	IRunDataDisplayMode,
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

import { saveAs } from 'file-saver';
import RunDataTable from './RunDataTable.vue';

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
			RunDataTable,
		},
		props: {
			nodeUi: {
			}, // INodeUi | null
			runIndex: {
				type: Number,
			},
			linkedRuns: {
				type: Boolean,
			},
			canLinkRuns: {
				type: Boolean,
			},
			tooMuchDataTitle: {
				type: String,
			},
			noDataInBranchMessage: {
				type: String,
			},
			isExecuting: {
				type: Boolean,
			},
			executingMessage: {
				type: String,
			},
			sessionId: {
				type: String,
			},
			paneType: {
				type: String,
			},
			overrideOutputs: {
				type: Array,
			},
			mappingEnabled: {
				type: Boolean,
			},
			distanceFromActive: {
				type: Number,
			},
			showMappingHint: {
				type: Boolean,
			},
		},
		data () {
			return {
				binaryDataPreviewActive: false,
				dataSize: 0,
				deselectedPlaceholder,
				state: {
					value: '' as object | number | string,
					path: deselectedPlaceholder,
				},
				showData: false,
				outputIndex: 0,
				binaryDataDisplayVisible: false,
				binaryDataDisplayData: null as IBinaryDisplayData | null,

				MAX_DISPLAY_DATA_SIZE,
				MAX_DISPLAY_ITEMS_AUTO_ALL,
				currentPage: 1,
				pageSize: 10,
				pageSizes: [10, 25, 50, 100],
			};
		},
		mounted() {
			this.init();
		},
		computed: {
			activeNode(): INodeUi {
				return this.$store.getters.activeNode;
			},
			displayMode(): IRunDataDisplayMode {
				return this.$store.getters['ui/getPanelDisplayMode'](this.paneType);
			},
			node(): INodeUi | null {
				return (this.nodeUi as INodeUi | null) || null;
			},
			nodeType (): INodeTypeDescription | null {
				if (this.node) {
					return this.$store.getters.nodeType(this.node.type, this.node.typeVersion);
				}
				return null;
			},
			buttons(): Array<{label: string, value: string}> {
				const defaults = [
					{ label: this.$locale.baseText('runData.table'), value: 'table'},
					{ label: this.$locale.baseText('runData.json'), value: 'json'},
				];
				if (this.binaryData.length) {
					return [ ...defaults,
						{ label: this.$locale.baseText('runData.binary'), value: 'binary'},
					];
				}

				return defaults;
			},
			hasNodeRun(): boolean {
				return Boolean(!this.isExecuting && this.node && this.workflowRunData && this.workflowRunData.hasOwnProperty(this.node.name));
			},
			hasRunError(): boolean {
				return Boolean(this.node && this.workflowRunData && this.workflowRunData[this.node.name] && this.workflowRunData[this.node.name][this.runIndex] && this.workflowRunData[this.node.name][this.runIndex].error);
			},
			workflowExecution (): IExecutionResponse | null {
				return this.$store.getters.getWorkflowExecution;
			},
			workflowRunData (): IRunData | null {
				if (this.workflowExecution === null) {
					return null;
				}
				const executionData: IRunExecutionData = this.workflowExecution.data;
				if (executionData && executionData.resultData) {
					return executionData.resultData.runData;
				}
				return null;
			},
			dataCount (): number {
				return this.getDataCount(this.runIndex, this.currentOutputIndex);
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

				if (runData[this.node.name][this.runIndex]) {
					const taskData = runData[this.node.name][this.runIndex].data;
					if (taskData && taskData.main) {
						return taskData.main.length - 1;
					}
				}

				return 0;
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
				let inputData = this.getNodeInputData(this.node, this.runIndex, this.currentOutputIndex);
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

				const binaryData = this.getBinaryData(this.workflowRunData, this.node.name, this.runIndex, this.currentOutputIndex);
				return binaryData.filter((data) => Boolean(data && Object.keys(data).length));
			},
			currentOutputIndex(): number {
				if (this.overrideOutputs && this.overrideOutputs.length && !this.overrideOutputs.includes(this.outputIndex)) {
					return this.overrideOutputs[0] as number;
				}

				return this.outputIndex;
			},
			branches (): ITab[] {
				function capitalize(name: string) {
					return name.charAt(0).toLocaleUpperCase() + name.slice(1);
				}
				const branches: ITab[] = [];
				for (let i = 0; i <= this.maxOutputIndex; i++) {
					if (this.overrideOutputs && !this.overrideOutputs.includes(i)) {
						continue;
					}
					const itemsCount = this.getDataCount(this.runIndex, i);
					const items = this.$locale.baseText('ndv.output.items', {adjustToNumber: itemsCount});
					let outputName = this.getOutputName(i);
					if (`${outputName}` === `${i}`) {
						outputName = `${this.$locale.baseText('ndv.output')} ${outputName}`;
					}
					else {
						outputName = capitalize(`${this.getOutputName(i)} ${this.$locale.baseText('ndv.output.branch')}`);
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
			switchToBinary() {
				this.onDisplayModeChange('binary');
			},
			onBranchChange(value: number) {
				this.outputIndex = value;

				this.$telemetry.track('User changed ndv branch', {
					session_id: this.sessionId,
					branch_index: value,
					node_type: this.activeNode.type,
					node_type_input_selection: this.nodeType? this.nodeType.name: '',
					pane: this.paneType,
				});
			},
			showTooMuchData() {
				this.showData = true;
				this.$telemetry.track('User clicked ndv button', {
					node_type: this.activeNode.type,
					workflow_id: this.$store.getters.workflowId,
					session_id: this.sessionId,
					pane: this.paneType,
					type: 'showTooMuchData',
				});
			},
			linkRun() {
				this.$emit('linkRun');
			},
			unlinkRun() {
				this.$emit('unlinkRun');
			},
			onCurrentPageChange() {
				this.$telemetry.track('User changed ndv page', {
					node_type: this.activeNode.type,
					workflow_id: this.$store.getters.workflowId,
					session_id: this.sessionId,
					pane: this.paneType,
					page_selected: this.currentPage,
					page_size: this.pageSize,
					items_total: this.dataCount,
				});
			},
			onPageSizeChange(pageSize: number) {
				this.pageSize = pageSize;
				const maxPage = Math.ceil(this.dataCount / this.pageSize);
				if (maxPage < this.currentPage) {
					this.currentPage = maxPage;
				}

				this.$telemetry.track('User changed ndv page size', {
					node_type: this.activeNode.type,
					workflow_id: this.$store.getters.workflowId,
					session_id: this.sessionId,
					pane: this.paneType,
					page_selected: this.currentPage,
					page_size: this.pageSize,
					items_total: this.dataCount,
				});
			},
			onDisplayModeChange(displayMode: IRunDataDisplayMode) {
				const previous = this.displayMode;
				this.$store.commit('ui/setPanelDisplayMode', {pane: this.paneType, mode: displayMode});

				const dataContainer = this.$refs.dataContainer;
				if (dataContainer) {
					const dataDisplay = (dataContainer as Element).children[0];

					if (dataDisplay){
						dataDisplay.scrollTo(0, 0);
					}
				}

				this.closeBinaryDataDisplay();
				this.$externalHooks().run('runData.displayModeChanged', { newValue: displayMode, oldValue: previous });
				if(this.activeNode) {
					this.$telemetry.track('User changed ndv item view', {
						previous_view: previous,
						new_view: displayMode,
						node_type: this.activeNode.type,
						workflow_id: this.$store.getters.workflowId,
						session_id: this.sessionId,
						pane: this.paneType,
					});
				}
			},
			getRunLabel(option: number) {
				let itemsCount = 0;
				for (let i = 0; i <= this.maxOutputIndex; i++) {
					itemsCount += this.getDataCount(option - 1, i);
				}
				const items = this.$locale.baseText('ndv.output.items', {adjustToNumber: itemsCount});
				const itemsLabel = itemsCount > 0 ? ` (${itemsCount} ${items})` : '';
				return option + this.$locale.baseText('ndv.output.of') + (this.maxRunIndex+1) + itemsLabel;
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
			init() {
				// Reset the selected output index every time another node gets selected
				this.outputIndex = 0;
				this.refreshDataSize();
				this.closeBinaryDataDisplay();
				if (this.binaryData.length > 0) {
					this.$store.commit('ui/setPanelDisplayMode', {pane: this.paneType, mode: 'binary'});
				}
				else if (this.displayMode === 'binary') {
					this.$store.commit('ui/setPanelDisplayMode', {pane: this.paneType, mode: 'table'});
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
			isDownloadable (index: number, key: string): boolean {
				const binaryDataItem: IBinaryData = this.binaryData[index][key];
				return !!(binaryDataItem.mimeType && binaryDataItem.fileName);
			},
			async downloadBinaryData (index: number, key: string) {
				const binaryDataItem: IBinaryData = this.binaryData[index][key];

				let bufferString = 'data:' + binaryDataItem.mimeType + ';base64,';
				if(binaryDataItem.id) {
					bufferString += await this.restApi().getBinaryBufferString(binaryDataItem.id);
				} else {
					bufferString += binaryDataItem.data;
				}

				const data = await fetch(bufferString);
				const blob = await data.blob();
				saveAs(blob, binaryDataItem.fileName);
			},
			displayBinaryData (index: number, key: string) {
				this.binaryDataDisplayVisible = true;

				this.binaryDataDisplayData = {
					node: this.node!.name,
					runIndex: this.runIndex,
					outputIndex: this.currentOutputIndex,
					index,
					key,
				};
			},
			getOutputName (outputIndex: number) {
				if (this.node === null) {
					return outputIndex + 1;
				}

				const nodeType = this.nodeType;
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
				const inputData = this.getNodeInputData(this.node, this.runIndex, this.currentOutputIndex);

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
			binaryData (newData: IBinaryKeyData[], prevData: IBinaryKeyData[]) {
				if (newData.length && !prevData.length && this.displayMode !== 'binary') {
					this.switchToBinary();
				}
				else if (!newData.length && this.displayMode === 'binary') {
					this.onDisplayModeChange('table');
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
	height: 100%;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: var(--spacing-s) var(--spacing-s) var(--spacing-xl) var(--spacing-s);
	text-align: center;

	> * {
		max-width: 316px;
		margin-bottom: var(--spacing-2xs);
	}
}

.container {
	position: relative;
	width: 100%;
	height: 100%;
	background-color: var(--color-background-base);
	display: flex;
	flex-direction: column;
}

.header {
	display: flex;
	align-items: center;
	margin-bottom: var(--spacing-s);
	padding: var(--spacing-s) var(--spacing-s) 0 var(--spacing-s);
	position: relative;
	height: 30px;

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
	right: 0;
	overflow-y: auto;
	line-height: 1.5;
	word-break: normal;
	height: 100%;
	padding-bottom: var(--spacing-3xl);
}

.errorDisplay {
	composes: dataDisplay;
	padding-right: var(--spacing-s);
}

.jsonDisplay {
	composes: dataDisplay;
	background-color: var(--color-background-base);
	padding-top: var(--spacing-s);
}

.tabs {
	margin-bottom: var(--spacing-s);
}

.itemsCount {
	margin-left: var(--spacing-s);
	margin-bottom: var(--spacing-s);
}

.runSelector {
	max-width: 200px;
	margin-left: var(--spacing-s);
	margin-bottom: var(--spacing-s);
	display: flex;

	> * {
		margin-right: var(--spacing-4xs);
	}
}

.copyButton {
	height: 30px;
	top: 12px;
	right: 24px;
	position: absolute;
	z-index: 10;
}

.pagination {
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
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
	display: flex;
	flex-direction: row;
	justify-content: center;

	> * {
		flex-grow: 0;
		margin-right: var(--spacing-3xs);
	}
}

.binaryValue {
	white-space: initial;
	word-wrap: break-word;
}

.pageSizeSelector {
	text-transform: capitalize;
	max-width: 150px;
}

.displayModes {
	display: flex;
	justify-content: flex-end;
	flex-grow: 1;
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

</style>

<style lang="scss">
.vjs-tree {
	color: var(--color-json-default);
}

.vjs-tree.is-highlight-selected {
	background-color: var(--color-json-highlight);
}

.vjs-tree .vjs-value__null {
	color: var(--color-json-null);
}

.vjs-tree .vjs-value__boolean {
	color: var(--color-json-boolean);
}

.vjs-tree .vjs-value__number {
	color: var(--color-json-number);
}

.vjs-tree .vjs-value__string {
	color: var(--color-json-string);
}

.vjs-tree .vjs-key {
	color: var(--color-json-key);
}

.vjs-tree .vjs-tree__brackets {
	color: var(--color-json-brackets);
}

.vjs-tree .vjs-tree__brackets:hover {
	color: var(--color-json-brackets-hover);
}

.vjs-tree .vjs-tree__content.has-line {
	border-left: 1px dotted var(--color-json-line);
}

</style>
