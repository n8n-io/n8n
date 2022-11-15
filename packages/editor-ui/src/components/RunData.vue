<template>
	<div :class="$style.container">
		<n8n-callout
			v-if="canPinData && hasPinData && !editMode.enabled && !isProductionExecutionPreview"
			theme="secondary"
			icon="thumbtack"
			:class="$style['pinned-data-callout']"
		>
			{{ $locale.baseText('runData.pindata.thisDataIsPinned') }}
			<span class="ml-4xs" v-if="!isReadOnly">
				<n8n-link
					theme="secondary"
					size="small"
					underline
					bold
					@click="onTogglePinData({ source: 'banner-link' })"
				>
					{{ $locale.baseText('runData.pindata.unpin') }}
				</n8n-link>
			</span>
			<template #trailingContent>
				<n8n-link
					:to="dataPinningDocsUrl"
					size="small"
					theme="secondary"
					bold
					underline
					@click="onClickDataPinningDocsLink"
				>
					{{ $locale.baseText('runData.pindata.learnMore') }}
				</n8n-link>
			</template>
		</n8n-callout>

		<BinaryDataDisplay :windowVisible="binaryDataDisplayVisible" :displayData="binaryDataDisplayData" @close="closeBinaryDataDisplay"/>

		<div :class="$style.header">
			<slot name="header"></slot>

			<div v-show="!hasRunError" @click.stop :class="$style.displayModes">
				<n8n-radio-buttons
					v-show="hasNodeRun && ((jsonData && jsonData.length > 0) || (binaryData && binaryData.length > 0)) && !editMode.enabled"
					:value="displayMode"
					:options="buttons"
					@input="onDisplayModeChange"
				/>
				<n8n-icon-button
					v-if="canPinData && !isReadOnly"
					v-show="!editMode.enabled"
					:title="$locale.baseText('runData.editOutput')"
					:circle="false"
					:disabled="node.disabled"
					class="ml-2xs"
					icon="pencil-alt"
					type="tertiary"
					@click="enterEditMode({ origin: 'editIconButton' })"
				/>
				<n8n-tooltip
					placement="bottom-end"
					v-if="canPinData && (jsonData && jsonData.length > 0)"
					v-show="!editMode.enabled"
					:value="pinDataDiscoveryTooltipVisible"
					:manual="isControlledPinDataTooltip"
				>
					<template #content v-if="!isControlledPinDataTooltip">
						<div :class="$style['tooltip-container']">
							<strong>{{ $locale.baseText('ndv.pinData.pin.title') }}</strong>
							<n8n-text size="small" tag="p">
								{{ $locale.baseText('ndv.pinData.pin.description') }}

								<n8n-link :to="dataPinningDocsUrl" size="small">
									{{ $locale.baseText('ndv.pinData.pin.link') }}
								</n8n-link>
							</n8n-text>
						</div>
					</template>
					<template #content v-else>
						<div :class="$style['tooltip-container']">
							{{ $locale.baseText('node.discovery.pinData.ndv') }}
						</div>
					</template>
					<n8n-icon-button
						:class="['ml-2xs', $style['pin-data-button']]"
						type="tertiary"
						:active="hasPinData"
						icon="thumbtack"
						:disabled="editMode.enabled || (inputData.length === 0 && !hasPinData) || isReadOnly"
						@click="onTogglePinData({ source: 'pin-icon-click' })"
					/>
				</n8n-tooltip>

				<div :class="$style['edit-mode-actions']" v-show="editMode.enabled">
					<n8n-button
						type="tertiary"
						:label="$locale.baseText('runData.editor.cancel')"
						@click="onClickCancelEdit"
					/>
					<n8n-button
						class="ml-2xs"
						type="primary"
						:label="$locale.baseText('runData.editor.save')"
						@click="onClickSaveEdit"
					/>
				</div>
			</div>
		</div>

		<div :class="$style.runSelector" v-if="maxRunIndex > 0" v-show="!editMode.enabled">
			<n8n-select size="small" :value="runIndex" @input="onRunIndexChange" @click.stop popper-append-to-body>
				<template slot="prepend">{{ $locale.baseText('ndv.output.run') }}</template>
				<n8n-option v-for="option in (maxRunIndex + 1)" :label="getRunLabel(option)" :value="option - 1" :key="option"></n8n-option>
			</n8n-select>


			<n8n-tooltip placement="right" v-if="canLinkRuns" :content="$locale.baseText(linkedRuns ? 'runData.unlinking.hint': 'runData.linking.hint')">
				<n8n-icon-button v-if="linkedRuns" icon="unlink" text type="tertiary" size="small" @click="unlinkRun" />
				<n8n-icon-button v-else icon="link" text type="tertiary" size="small" @click="linkRun" />
			</n8n-tooltip>

			<slot name="run-info"></slot>
		</div>

		<div v-if="maxOutputIndex > 0 && branches.length > 1" :class="{[$style.tabs]: displayMode === 'table'}">
			<n8n-tabs :value="currentOutputIndex" @input="onBranchChange" :options="branches" />
		</div>

		<div v-else-if="hasNodeRun && dataCount > 0 && maxRunIndex === 0" v-show="!editMode.enabled" :class="$style.itemsCount">
			<n8n-text>
				{{ dataCount }} {{ $locale.baseText('ndv.output.items', {adjustToNumber: dataCount}) }}
			</n8n-text>
		</div>

		<div
			:class="$style['data-container']"
			ref="dataContainer"
		>
			<div v-if="isExecuting" :class="$style.center">
				<div :class="$style.spinner"><n8n-spinner type="ring" /></div>
				<n8n-text>{{ executingMessage }}</n8n-text>
			</div>

			<div v-else-if="editMode.enabled" :class="$style['edit-mode']">
				<div :class="[$style['edit-mode-body'], 'ignore-key-press']">
					<code-editor
						:value="editMode.value"
						:options="{ scrollBeyondLastLine: false }"
						type="json"
						@input="ndvStore.setOutputPanelEditModeValue($event)"
					/>
				</div>
				<div :class="$style['edit-mode-footer']">
					<n8n-info-tip :bold="false" :class="$style['edit-mode-footer-infotip']">
						{{ $locale.baseText('runData.editor.copyDataInfo') }}
						<n8n-link :to="dataEditingDocsUrl" size="small">
							{{ $locale.baseText('generic.learnMore') }}
						</n8n-link>
					</n8n-info-tip>
				</div>
			</div>

			<div v-else-if="paneType === 'output' && hasSubworkflowExecutionError" :class="$style.stretchVertically">
				<NodeErrorView :error="subworkflowExecutionError" :class="$style.errorDisplay" />
			</div>

			<div v-else-if="!hasNodeRun" :class="$style.center">
				<slot name="node-not-run"></slot>
			</div>

			<div v-else-if="paneType === 'input' && node.disabled" :class="$style.center">
				<n8n-text>
					{{ $locale.baseText('ndv.input.disabled', { interpolate: { nodeName: node.name } }) }}
					<n8n-link @click="enableNode">
						{{ $locale.baseText('ndv.input.disabled.cta') }}
					</n8n-link>
				</n8n-text>
			</div>

			<div v-else-if="hasNodeRun && hasRunError" :class="$style.stretchVertically">
				<n8n-text v-if="isPaneTypeInput" :class="$style.center" size="large" tag="p" bold>
					{{ $locale.baseText('nodeErrorView.inputPanel.previousNodeError.title', { interpolate: { nodeName: node.name } }) }}
					<n8n-link @click="goToErroredNode">
						{{ $locale.baseText('nodeErrorView.inputPanel.previousNodeError.text') }}
					</n8n-link>
				</n8n-text>
				<NodeErrorView v-else :error="workflowRunData[node.name][runIndex].error" :class="$style.dataDisplay" />
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
					outline
					:label="$locale.baseText('ndv.output.tooMuchData.showDataAnyway')"
					@click="showTooMuchData"
				/>
			</div>

			<div v-else-if="hasNodeRun && displayMode === 'table' && binaryData.length > 0 && jsonData.length === 1 && Object.keys(jsonData[0] || {}).length === 0" :class="$style.center">
				<n8n-text>
					{{ $locale.baseText('runData.switchToBinary.info') }}
					<a @click="switchToBinary">
						{{ $locale.baseText('runData.switchToBinary.binary') }}
					</a>
				</n8n-text>
			</div>

			<run-data-table
				v-else-if="hasNodeRun && displayMode === 'table'"
				class="ph-no-capture"
				:node="node"
				:inputData="inputData"
				:mappingEnabled="mappingEnabled"
				:distanceFromActive="distanceFromActive"
				:showMappingHint="showMappingHint"
				:runIndex="runIndex"
				:pageOffset="currentPageOffset"
				:totalRuns="maxRunIndex"
				:hasDefaultHoverState="paneType === 'input'"
				@mounted="$emit('tableMounted', $event)"
				@activeRowChanged="onItemHover"
				@displayModeChange="onDisplayModeChange"
			/>

			<run-data-json
				v-else-if="hasNodeRun && displayMode === 'json'"
				class="ph-no-capture"
				:paneType="paneType"
				:editMode="editMode"
				:currentOutputIndex="currentOutputIndex"
				:sessioId="sessionId"
				:node="node"
				:inputData="inputData"
				:mappingEnabled="mappingEnabled"
				:distanceFromActive="distanceFromActive"
				:showMappingHint="showMappingHint"
				:runIndex="runIndex"
				:totalRuns="maxRunIndex"
			/>

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
									<n8n-button v-if="isDownloadable(index, key)" size="small" type="secondary" :label="$locale.baseText('runData.downloadBinaryData')" class="binary-data-show-data-button" @click="downloadBinaryData(index, key)" />
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div :class="$style.pagination" v-if="hasNodeRun && !hasRunError && dataCount > pageSize" v-show="!editMode.enabled">
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
				<n8n-select size="mini" :value="pageSize" @input="onPageSizeChange" popper-append-to-body>
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
		<n8n-block-ui :show="blockUI" :class="$style.uiBlocker" />
	</div>
</template>

<script lang="ts">
import { PropType } from "vue";
import mixins from 'vue-typed-mixins';
import { saveAs } from 'file-saver';
import {
	IBinaryData,
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	INodeTypeDescription,
	IRunData,
	IRunExecutionData,
} from 'n8n-workflow';

import {
	IBinaryDisplayData,
	IExecutionResponse,
	INodeUi,
	INodeUpdatePropertiesInformation,
	IRunDataDisplayMode,
	ITab,
} from '@/Interface';

import {
	DATA_PINNING_DOCS_URL,
	DATA_EDITING_DOCS_URL,
	LOCAL_STORAGE_PIN_DATA_DISCOVERY_NDV_FLAG,
	LOCAL_STORAGE_PIN_DATA_DISCOVERY_CANVAS_FLAG,
	MAX_DISPLAY_DATA_SIZE,
	MAX_DISPLAY_ITEMS_AUTO_ALL,
	TEST_PIN_DATA,
} from '@/constants';

import BinaryDataDisplay from '@/components/BinaryDataDisplay.vue';
import WarningTooltip from '@/components/WarningTooltip.vue';
import NodeErrorView from '@/components/Error/NodeErrorView.vue';

import { copyPaste } from '@/components/mixins/copyPaste';
import { externalHooks } from "@/components/mixins/externalHooks";
import { genericHelpers } from '@/components/mixins/genericHelpers';
import { nodeHelpers } from '@/components/mixins/nodeHelpers';
import { pinData } from '@/components/mixins/pinData';
import { CodeEditor } from "@/components/forms";
import { dataPinningEventBus } from '@/event-bus/data-pinning-event-bus';
import { clearJsonKey, executionDataToJson, stringSizeInBytes } from './helpers';
import { isEmpty } from '@/utils';
import { useWorkflowsStore } from "@/stores/workflows";
import { mapStores } from "pinia";
import { useNDVStore } from "@/stores/ndv";
import { useNodeTypesStore } from "@/stores/nodeTypes";

const RunDataTable = () => import('@/components/RunDataTable.vue');
const RunDataJson = () => import('@/components/RunDataJson.vue');

export type EnterEditModeArgs = {
	origin: 'editIconButton' | 'insertTestDataLink',
};

export default mixins(
	copyPaste,
	externalHooks,
	genericHelpers,
	nodeHelpers,
	pinData,
)
	.extend({
		name: 'RunData',
		components: {
			BinaryDataDisplay,
			NodeErrorView,
			WarningTooltip,
			CodeEditor,
			RunDataTable,
			RunDataJson,
		},
		props: {
			nodeUi: {
				type: Object as PropType<INodeUi>,
			},
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
				type: Array as PropType<number[]>,
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
			blockUI: {
				type: Boolean,
				default: false,
			},
			isProductionExecutionPreview: {
				type: Boolean,
				default: false,
			},
		},
		data () {
			return {
				binaryDataPreviewActive: false,
				dataSize: 0,
				showData: false,
				outputIndex: 0,
				binaryDataDisplayVisible: false,
				binaryDataDisplayData: null as IBinaryDisplayData | null,

				MAX_DISPLAY_DATA_SIZE,
				MAX_DISPLAY_ITEMS_AUTO_ALL,
				currentPage: 1,
				pageSize: 10,
				pageSizes: [10, 25, 50, 100],
				eventBus: dataPinningEventBus,

				pinDataDiscoveryTooltipVisible: false,
				isControlledPinDataTooltip: false,
			};
		},
		mounted() {
			this.init();

			if (!this.isPaneTypeInput) {
				this.eventBus.$on('data-pinning-error', this.onDataPinningError);
				this.eventBus.$on('data-unpinning', this.onDataUnpinning);

				const hasSeenPinDataTooltip = localStorage.getItem(LOCAL_STORAGE_PIN_DATA_DISCOVERY_NDV_FLAG);
				if (!hasSeenPinDataTooltip) {
					this.showPinDataDiscoveryTooltip(this.jsonData);
				}
			}
			this.ndvStore.setNDVBranchIndex({
				pane: this.paneType as "input" | "output",
				branchIndex: this.currentOutputIndex,
			});
		},
		destroyed() {
			this.hidePinDataDiscoveryTooltip();
			this.eventBus.$off('data-pinning-error', this.onDataPinningError);
			this.eventBus.$off('data-unpinning', this.onDataUnpinning);
		},
		computed: {
			...mapStores(
				useNodeTypesStore,
				useNDVStore,
				useWorkflowsStore,
			),
			activeNode(): INodeUi | null {
				return this.ndvStore.activeNode;
			},
			dataPinningDocsUrl(): string {
				return DATA_PINNING_DOCS_URL;
			},
			dataEditingDocsUrl(): string{
				return DATA_EDITING_DOCS_URL;
			},
			displayMode(): IRunDataDisplayMode {
				return this.ndvStore.getPanelDisplayMode(this.paneType as "input" | "output");
			},
			node(): INodeUi | null {
				return (this.nodeUi as INodeUi | null) || null;
			},
			nodeType (): INodeTypeDescription | null {
				if (this.node) {
					return this.nodeTypesStore.getNodeType(this.node.type, this.node.typeVersion);
				}
				return null;
			},
			isTriggerNode (): boolean {
				return this.nodeTypesStore.isTriggerNode(this.node.type);
			},
			canPinData (): boolean {
				return !this.isPaneTypeInput &&
					this.isPinDataNodeType &&
					!(this.binaryData && this.binaryData.length > 0);
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
				return Boolean(!this.isExecuting && this.node && (this.workflowRunData && this.workflowRunData.hasOwnProperty(this.node.name) || this.hasPinData));
			},
			subworkflowExecutionError(): Error | null {
				return this.workflowsStore.subWorkflowExecutionError;
			},
			hasSubworkflowExecutionError(): boolean {
				return Boolean(this.subworkflowExecutionError);
			},
			hasRunError(): boolean {
				return Boolean(this.node && this.workflowRunData && this.workflowRunData[this.node.name] && this.workflowRunData[this.node.name][this.runIndex] && this.workflowRunData[this.node.name][this.runIndex].error);
			},
			workflowExecution (): IExecutionResponse | null {
				return this.workflowsStore.getWorkflowExecution;
			},
			workflowRunData (): IRunData | null {
				if (this.workflowExecution === null) {
					return null;
				}
				const executionData: IRunExecutionData | undefined = this.workflowExecution.data;
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
			currentPageOffset(): number {
				return this.pageSize * (this.currentPage - 1);
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
			rawInputData (): INodeExecutionData[] {
				let inputData: INodeExecutionData[] = [];

				if (this.node) {
					inputData = this.getNodeInputData(this.node, this.runIndex, this.currentOutputIndex);
				}

				if (inputData.length === 0 || !Array.isArray(inputData)) {
					return [];
				}

				return inputData;
			},
			inputData (): INodeExecutionData[] {
				let inputData = this.rawInputData;

				if (this.node && this.pinData && !this.isProductionExecutionPreview) {
					inputData = Array.isArray(this.pinData)
						? this.pinData.map((value) => ({
							json: value,
						}))
						: [{
							json: this.pinData,
						}];
				}

				const offset = this.pageSize * (this.currentPage - 1);
				inputData = inputData.slice(offset, offset + this.pageSize);

				return inputData;
			},
			jsonData (): IDataObject[] {
				return executionDataToJson(this.inputData);
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
			editMode(): { enabled: boolean; value: string; } {
				return this.isPaneTypeInput
					? { enabled: false, value: '' }
					: this.ndvStore.outputPanelEditMode;
			},
			isPaneTypeInput(): boolean {
				return this.paneType === 'input';
			},
		},
		methods: {
			onItemHover(itemIndex: number | null) {
				if (itemIndex === null) {
					this.$emit('itemHover', null);

					return;
				}
				this.$emit('itemHover', {
					outputIndex: this.currentOutputIndex,
					itemIndex,
				});
			},
			onClickDataPinningDocsLink() {
				this.$telemetry.track('User clicked ndv link', {
					workflow_id: this.workflowsStore.workflowId,
					session_id: this.sessionId,
					node_type: this.activeNode?.type,
					pane: 'output',
					type: 'data-pinning-docs',
				});
			},
			showPinDataDiscoveryTooltip(value: IDataObject[]) {
				if (!this.isTriggerNode) {
					return;
				}

				if (value && value.length > 0) {
					this.pinDataDiscoveryComplete();

					setTimeout(() => {
						this.isControlledPinDataTooltip = true;
						this.pinDataDiscoveryTooltipVisible = true;
						this.eventBus.$emit('data-pinning-discovery', { isTooltipVisible: true });
					}, 500); // Wait for NDV to open
				}
			},
			hidePinDataDiscoveryTooltip() {
				if (this.pinDataDiscoveryTooltipVisible) {
					this.isControlledPinDataTooltip = false;
					this.pinDataDiscoveryTooltipVisible = false;
					this.eventBus.$emit('data-pinning-discovery', { isTooltipVisible: false });
				}
			},
			pinDataDiscoveryComplete() {
				localStorage.setItem(LOCAL_STORAGE_PIN_DATA_DISCOVERY_NDV_FLAG, 'true');
				localStorage.setItem(LOCAL_STORAGE_PIN_DATA_DISCOVERY_CANVAS_FLAG, 'true');
			},
			enterEditMode({ origin }: EnterEditModeArgs) {
				const inputData = this.pinData
					? clearJsonKey(this.pinData)
					: executionDataToJson(this.rawInputData);

				const data = inputData.length > 0
					? inputData
					: TEST_PIN_DATA;

				this.ndvStore.setOutputPanelEditModeEnabled(true);
				this.ndvStore.setOutputPanelEditModeValue(JSON.stringify(data, null, 2));

				this.$telemetry.track('User opened ndv edit state', {
					node_type: this.activeNode?.type,
					click_type: origin === 'editIconButton' ? 'button' : 'link',
					session_id: this.sessionId,
					run_index: this.runIndex,
					is_output_present: this.hasNodeRun || this.hasPinData,
					view: !this.hasNodeRun && !this.hasPinData ? 'undefined' : this.displayMode,
					is_data_pinned: this.hasPinData,
				});
			},
			onClickCancelEdit() {
				this.ndvStore.setOutputPanelEditModeEnabled(false);
				this.ndvStore.setOutputPanelEditModeValue('');
				this.onExitEditMode({ type: 'cancel' });
			},
			onClickSaveEdit() {
				const { value } = this.editMode;

				this.clearAllStickyNotifications();

				if (!this.isValidPinDataSize(value)) {
					this.onDataPinningError({ errorType: 'data-too-large', source: 'save-edit' });
					return;
				}

				if (!this.isValidPinDataJSON(value)) {
					this.onDataPinningError({ errorType: 'invalid-json', source: 'save-edit' });
					return;
				}

				this.ndvStore.setOutputPanelEditModeEnabled(false);
				this.workflowsStore.pinData({ node: this.node, data: clearJsonKey(value) as INodeExecutionData[] });

				this.onDataPinningSuccess({ source: 'save-edit' });

				this.onExitEditMode({ type: 'save' });
			},
			onExitEditMode({ type }: { type: 'save' | 'cancel' }) {
				this.$telemetry.track('User closed ndv edit state', {
					node_type: this.activeNode?.type,
					session_id: this.sessionId,
					run_index: this.runIndex,
					view: this.displayMode,
					type,
				});
			},
			onDataUnpinning(
				{ source }: { source: 'banner-link' | 'pin-icon-click' | 'unpin-and-execute-modal' },
			) {
				this.$telemetry.track('User unpinned ndv data', {
					node_type: this.activeNode?.type,
					session_id: this.sessionId,
					run_index: this.runIndex,
					source,
					data_size: stringSizeInBytes(this.pinData),
				});
			},
			onDataPinningSuccess({ source }: { source: 'pin-icon-click' | 'save-edit' }) {
				const telemetryPayload = {
					pinning_source: source,
					node_type: this.activeNode.type,
					session_id: this.sessionId,
					data_size: stringSizeInBytes(this.pinData),
					view: this.displayMode,
					run_index: this.runIndex,
				};
				this.$externalHooks().run('runData.onDataPinningSuccess', telemetryPayload);
				this.$telemetry.track('Ndv data pinning success', telemetryPayload);
			},
			onDataPinningError(
				{ errorType, source }: {
					errorType: 'data-too-large' | 'invalid-json',
					source: 'on-ndv-close-modal' | 'pin-icon-click' | 'save-edit'
				},
			) {
				this.$telemetry.track('Ndv data pinning failure', {
					pinning_source: source,
					node_type: this.activeNode.type,
					session_id: this.sessionId,
					data_size: stringSizeInBytes(this.pinData),
					view: this.displayMode,
					run_index: this.runIndex,
					error_type: errorType,
				});
			},
			async onTogglePinData(
				{ source }: { source: 'banner-link' | 'pin-icon-click' | 'unpin-and-execute-modal' },
			) {
				if (source === 'pin-icon-click') {
					const telemetryPayload = {
						node_type: this.activeNode.type,
						session_id: this.sessionId,
						run_index: this.runIndex,
						view: !this.hasNodeRun && !this.hasPinData ? 'none' : this.displayMode,
					};

					this.$externalHooks().run('runData.onTogglePinData', telemetryPayload);
					this.$telemetry.track('User clicked pin data icon', telemetryPayload);
				}

				this.updateNodeParameterIssues(this.node);

				if (this.hasPinData) {
					this.onDataUnpinning({ source });
					this.workflowsStore.unpinData({ node: this.node });
					return;
				}

				const data = executionDataToJson(this.rawInputData) as INodeExecutionData[];

				if (!this.isValidPinDataSize(data)) {
					this.onDataPinningError({ errorType: 'data-too-large', source: 'pin-icon-click' });
					return;
				}

				this.onDataPinningSuccess({ source: 'pin-icon-click' });

				this.workflowsStore.pinData({ node: this.node, data });

				if (this.maxRunIndex > 0) {
					this.$showToast({
						title: this.$locale.baseText('ndv.pinData.pin.multipleRuns.title', {
							interpolate: {
								index: `${this.runIndex}`,
							},
						}),
						message: this.$locale.baseText('ndv.pinData.pin.multipleRuns.description'),
						type: 'success',
						duration: 2000,
					});
				}

				this.hidePinDataDiscoveryTooltip();
				this.pinDataDiscoveryComplete();
			},
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
					workflow_id: this.workflowsStore.workflowId,
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
					node_type: this.activeNode?.type,
					workflow_id: this.workflowsStore.workflowId,
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
					node_type: this.activeNode?.type,
					workflow_id: this.workflowsStore.workflowId,
					session_id: this.sessionId,
					pane: this.paneType,
					page_selected: this.currentPage,
					page_size: this.pageSize,
					items_total: this.dataCount,
				});
			},
			onDisplayModeChange(displayMode: IRunDataDisplayMode) {
				const previous = this.displayMode;
				this.ndvStore.setPanelDisplayMode({pane: this.paneType as "input" | "output", mode: displayMode});

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
						workflow_id: this.workflowsStore.workflowId,
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
				if (this.pinData) {
					return this.pinData.length;
				}

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
					this.ndvStore.setPanelDisplayMode({pane: this.paneType as "input" | "output", mode: 'binary'});
				}
				else if (this.displayMode === 'binary') {
					this.ndvStore.setPanelDisplayMode({pane: this.paneType as "input" | "output", mode: 'table'});
				}
			},
			closeBinaryDataDisplay () {
				this.binaryDataDisplayVisible = false;
				this.binaryDataDisplayData = null;
			},
			clearExecutionData () {
				this.workflowsStore.setWorkflowExecutionData(null);
				this.updateNodesExecutionIssues();
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
			enableNode() {
				if (this.node) {
					const updateInformation = {
						name: this.node.name,
						properties: {
							disabled: !this.node.disabled,
						} as IDataObject,
					} as INodeUpdatePropertiesInformation;

					this.workflowsStore.updateNodeProperties(updateInformation);
				}
			},
			goToErroredNode() {
				if (this.node) {
					this.ndvStore.activeNodeName = this.node.name;
				}
			},
		},
		watch: {
			node() {
				this.init();
			},
			inputData:{
				handler(data: INodeExecutionData[]) {
					if(this.paneType && data){
						this.ndvStore.setNDVPanelDataIsEmpty({ panel: this.paneType as "input" | "output", isEmpty: data.every(item => isEmpty(item.json)) });
					}
				},
				immediate: true,
				deep: true,
			},
			jsonData (value: IDataObject[]) {
				this.refreshDataSize();

				const hasSeenPinDataTooltip = localStorage.getItem(LOCAL_STORAGE_PIN_DATA_DISCOVERY_NDV_FLAG);
				if (!hasSeenPinDataTooltip) {
					this.showPinDataDiscoveryTooltip(value);
				}
			},
			binaryData (newData: IBinaryKeyData[], prevData: IBinaryKeyData[]) {
				if (newData.length && !prevData.length && this.displayMode !== 'binary') {
					this.switchToBinary();
				}
				else if (!newData.length && this.displayMode === 'binary') {
					this.onDisplayModeChange('table');
				}
			},
			currentOutputIndex(branchIndex: number) {
				this.ndvStore.setNDVBranchIndex({
					pane: this.paneType as "input" | "output",
					branchIndex,
				});
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

.pinned-data-callout {
	border-radius: inherit;
	border-bottom-right-radius: 0;
	border-top: 0;
	border-left: 0;
	border-right: 0;
}

.header {
	display: flex;
	align-items: center;
	margin-bottom: var(--spacing-s);
	padding: var(--spacing-s) var(--spacing-s) 0 var(--spacing-s);
	position: relative;
	overflow-x: auto;
	overflow-y: hidden;
	min-height: calc(30px + var(--spacing-s));

	> *:first-child {
		flex-grow: 1;
	}
}

.data-container {
	position: relative;
	height: 100%;

	&:hover{
		.actions-group {
			opacity: 1;
		}
	}
}

.dataDisplay {
	position: absolute;
	top: 0;
	left: 0;
	padding: 0 var(--spacing-s) var(--spacing-3xl) var(--spacing-s);
	right: 0;
	overflow-y: auto;
	line-height: 1.5;
	word-break: normal;
	height: 100%;
}

.tabs {
	margin-bottom: var(--spacing-s);
}

.itemsCount {
	margin-left: var(--spacing-s);
	margin-bottom: var(--spacing-s);
}

.runSelector {
	max-width: 210px;
	margin-left: var(--spacing-s);
	margin-bottom: var(--spacing-s);
	display: flex;
	align-items: center;

	> * {
		margin-right: var(--spacing-4xs);
	}
}

.pagination {
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	bottom: 0;
	padding: 5px;
	overflow: auto;
}

.pageSizeSelector {
	text-transform: capitalize;
	max-width: 150px;
	flex: 0 1 auto;
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
	background-color: var(--color-foreground-xlight);
	margin-right: var(--spacing-s);
	margin-bottom: var(--spacing-s);
	border-radius: var(--border-radius-base);
	border: var(--border-base);
	padding: var(--spacing-s);
}

.binaryHeader {
	color: $color-primary;
	font-weight: 600;
	font-size: 1.2em;
	padding-bottom: 0.5em;
	margin-bottom: 0.5em;
	border-bottom: 1px solid var(--color-text-light);
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

.displayModes {
	display: flex;
	justify-content: flex-end;
	flex-grow: 1;
}

.tooltip-container {
	max-width: 240px;
}

.pin-data-button {
	svg {
		transition: transform 0.3s ease;
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

.edit-mode {
	height: calc(100% - var(--spacing-s));
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	align-items: flex-end;
	padding-left: var(--spacing-s);
	padding-right: var(--spacing-s);
}

.edit-mode-body {
	flex: 1 1 auto;
	width: 100%;
	height: 100%;
	overflow: hidden;
}

.edit-mode-footer {
	display: flex;
	width: 100%;
	justify-content: space-between;
	align-items: center;
	padding-top: var(--spacing-s);
}

.edit-mode-footer-infotip {
	display: flex;
	flex: 1;
	width: 100%;
}

.edit-mode-actions {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	margin-left: var(--spacing-s);
}

.stretchVertically {
	height: 100%;
}

.uiBlocker {
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
}

</style>
