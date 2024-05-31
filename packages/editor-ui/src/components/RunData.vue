<template>
	<div :class="['run-data', $style.container]" @mouseover="activatePane">
		<n8n-callout
			v-if="
				canPinData && pinnedData.hasData.value && !editMode.enabled && !isProductionExecutionPreview
			"
			theme="secondary"
			icon="thumbtack"
			:class="$style.pinnedDataCallout"
		>
			{{ $locale.baseText('runData.pindata.thisDataIsPinned') }}
			<span v-if="!isReadOnlyRoute && !readOnlyEnv" class="ml-4xs">
				<n8n-link
					theme="secondary"
					size="small"
					underline
					bold
					@click.stop="onTogglePinData({ source: 'banner-link' })"
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

		<BinaryDataDisplay
			:window-visible="binaryDataDisplayVisible"
			:display-data="binaryDataDisplayData"
			@close="closeBinaryDataDisplay"
		/>

		<div :class="$style.header">
			<slot name="header"></slot>

			<div
				v-show="!hasRunError"
				:class="$style.displayModes"
				data-test-id="run-data-pane-header"
				@click.stop
			>
				<n8n-radio-buttons
					v-show="
						hasNodeRun && (inputData.length || binaryData.length || search) && !editMode.enabled
					"
					:model-value="displayMode"
					:options="buttons"
					data-test-id="ndv-run-data-display-mode"
					@update:model-value="onDisplayModeChange"
				/>

				<n8n-icon-button
					v-if="canPinData && !isReadOnlyRoute && !readOnlyEnv"
					v-show="!editMode.enabled"
					:title="$locale.baseText('runData.editOutput')"
					:circle="false"
					:disabled="node?.disabled"
					class="ml-2xs"
					icon="pencil-alt"
					type="tertiary"
					data-test-id="ndv-edit-pinned-data"
					@click="enterEditMode({ origin: 'editIconButton' })"
				/>

				<RunDataPinButton
					v-if="(canPinData || !!binaryData?.length) && rawInputData.length && !editMode.enabled"
					:disabled="
						(!rawInputData.length && !pinnedData.hasData.value) ||
						isReadOnlyRoute ||
						readOnlyEnv ||
						!!binaryData?.length
					"
					:tooltip-contents-visibility="{
						binaryDataTooltipContent: !!binaryData?.length,
						pinDataDiscoveryTooltipContent:
							isControlledPinDataTooltip && pinDataDiscoveryTooltipVisible,
					}"
					:data-pinning-docs-url="dataPinningDocsUrl"
					:pinned-data="pinnedData"
					@toggle-pin-data="onTogglePinData({ source: 'pin-icon-click' })"
				/>

				<div v-show="editMode.enabled" :class="$style.editModeActions">
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

		<div v-if="extraControlsLocation === 'header'" :class="$style.inputSelect">
			<slot name="input-select"></slot>
		</div>

		<div v-if="maxRunIndex > 0" v-show="!editMode.enabled" :class="$style.runSelector">
			<slot v-if="extraControlsLocation === 'runs'" name="input-select"></slot>

			<n8n-select
				:model-value="runIndex"
				:class="$style.runSelectorInner"
				size="small"
				teleported
				data-test-id="run-selector"
				@update:model-value="onRunIndexChange"
				@click.stop
			>
				<template #prepend>{{ $locale.baseText('ndv.output.run') }}</template>
				<n8n-option
					v-for="option in maxRunIndex + 1"
					:key="option"
					:label="getRunLabel(option)"
					:value="option - 1"
				></n8n-option>
			</n8n-select>

			<n8n-tooltip v-if="canLinkRuns" placement="right">
				<template #content>
					{{ $locale.baseText(linkedRuns ? 'runData.unlinking.hint' : 'runData.linking.hint') }}
				</template>
				<n8n-icon-button
					:icon="linkedRuns ? 'unlink' : 'link'"
					class="linkRun"
					text
					type="tertiary"
					size="small"
					data-test-id="link-run"
					@click="toggleLinkRuns"
				/>
			</n8n-tooltip>

			<slot name="run-info"></slot>

			<RunDataSearch
				v-if="showIOSearch && extraControlsLocation === 'runs'"
				v-model="search"
				:class="$style.search"
				:pane-type="paneType"
				:is-area-active="isPaneActive"
				@focus="activatePane"
			/>
		</div>

		<slot name="before-data" />

		<n8n-callout
			v-for="hint in getNodeHints()"
			:key="hint.message"
			:class="$style.hintCallout"
			:theme="hint.type || 'info'"
		>
			<n8n-text size="small" v-html="hint.message"></n8n-text>
		</n8n-callout>

		<div
			v-if="maxOutputIndex > 0 && branches.length > 1"
			:class="$style.outputs"
			data-test-id="branches"
		>
			<slot v-if="extraControlsLocation === 'outputs'" name="input-select"></slot>

			<div :class="$style.tabs">
				<n8n-tabs
					:model-value="currentOutputIndex"
					:options="branches"
					@update:model-value="onBranchChange"
				/>

				<RunDataSearch
					v-if="showIOSearch && extraControlsLocation === 'outputs'"
					v-model="search"
					:pane-type="paneType"
					:is-area-active="isPaneActive"
					@focus="activatePane"
				/>
			</div>
		</div>

		<div
			v-else-if="
				!hasRunError &&
				hasNodeRun &&
				((dataCount > 0 && maxRunIndex === 0) || search) &&
				!isArtificialRecoveredEventItem
			"
			v-show="!editMode.enabled && !hasRunError"
			:class="[$style.itemsCount, { [$style.muted]: paneType === 'input' && maxRunIndex === 0 }]"
			data-test-id="ndv-items-count"
		>
			<slot v-if="extraControlsLocation === 'items'" name="input-select"></slot>

			<n8n-text v-if="search" :class="$style.itemsText">
				{{
					$locale.baseText('ndv.search.items', {
						adjustToNumber: unfilteredDataCount,
						interpolate: { matched: dataCount, total: unfilteredDataCount },
					})
				}}
			</n8n-text>
			<n8n-text v-else :class="$style.itemsText">
				{{
					$locale.baseText('ndv.output.items', {
						adjustToNumber: dataCount,
						interpolate: { count: dataCount },
					})
				}}
			</n8n-text>

			<RunDataSearch
				v-if="showIOSearch && extraControlsLocation === 'items'"
				v-model="search"
				:class="$style.search"
				:pane-type="paneType"
				:is-area-active="isPaneActive"
				@focus="activatePane"
			/>
		</div>

		<div ref="dataContainer" :class="$style.dataContainer" data-test-id="ndv-data-container">
			<div v-if="isExecuting" :class="$style.center" data-test-id="ndv-executing">
				<div :class="$style.spinner"><n8n-spinner type="ring" /></div>
				<n8n-text>{{ executingMessage }}</n8n-text>
			</div>

			<div v-else-if="editMode.enabled" :class="$style.editMode">
				<div :class="[$style.editModeBody, 'ignore-key-press']">
					<JsonEditor
						:model-value="editMode.value"
						:fill-parent="true"
						@update:model-value="ndvStore.setOutputPanelEditModeValue($event)"
					/>
				</div>
				<div :class="$style.editModeFooter">
					<n8n-info-tip :bold="false" :class="$style.editModeFooterInfotip">
						{{ $locale.baseText('runData.editor.copyDataInfo') }}
						<n8n-link :to="dataEditingDocsUrl" size="small">
							{{ $locale.baseText('generic.learnMore') }}
						</n8n-link>
					</n8n-info-tip>
				</div>
			</div>

			<div
				v-else-if="paneType === 'output' && hasSubworkflowExecutionError"
				:class="$style.stretchVertically"
			>
				<NodeErrorView :error="subworkflowExecutionError" :class="$style.errorDisplay" />
			</div>

			<div v-else-if="!hasNodeRun" :class="$style.center">
				<slot name="node-not-run"></slot>
			</div>

			<div v-else-if="paneType === 'input' && node?.disabled" :class="$style.center">
				<n8n-text>
					{{ $locale.baseText('ndv.input.disabled', { interpolate: { nodeName: node.name } }) }}
					<n8n-link @click="enableNode">
						{{ $locale.baseText('ndv.input.disabled.cta') }}
					</n8n-link>
				</n8n-text>
			</div>

			<div v-else-if="hasNodeRun && isArtificialRecoveredEventItem" :class="$style.center">
				<slot name="recovered-artificial-output-data"></slot>
			</div>

			<div v-else-if="hasNodeRun && hasRunError" :class="$style.stretchVertically">
				<n8n-text v-if="isPaneTypeInput" :class="$style.center" size="large" tag="p" bold>
					{{
						$locale.baseText('nodeErrorView.inputPanel.previousNodeError.title', {
							interpolate: { nodeName: node?.name ?? '' },
						})
					}}
				</n8n-text>
				<slot v-else-if="$slots['content']" name="content"></slot>
				<NodeErrorView
					v-else-if="workflowRunErrorAsNodeError"
					:error="workflowRunErrorAsNodeError"
					:class="$style.dataDisplay"
				/>
			</div>

			<div
				v-else-if="
					hasNodeRun && (!unfilteredDataCount || (search && !dataCount)) && branches.length > 1
				"
				:class="$style.center"
			>
				<div v-if="search">
					<n8n-text tag="h3" size="large">{{
						$locale.baseText('ndv.search.noMatch.title')
					}}</n8n-text>
					<n8n-text>
						<i18n-t keypath="ndv.search.noMatch.description" tag="span">
							<template #link>
								<a href="#" @click="onSearchClear">
									{{ $locale.baseText('ndv.search.noMatch.description.link') }}
								</a>
							</template>
						</i18n-t>
					</n8n-text>
				</div>
				<n8n-text v-else>
					{{ noDataInBranchMessage }}
				</n8n-text>
			</div>

			<div v-else-if="hasNodeRun && !inputData.length && !search" :class="$style.center">
				<slot name="no-output-data">xxx</slot>
			</div>

			<div v-else-if="hasNodeRun && !showData" :class="$style.center">
				<n8n-text :bold="true" color="text-dark" size="large">{{ tooMuchDataTitle }}</n8n-text>
				<n8n-text align="center" tag="div"
					><span
						v-html="
							$locale.baseText('ndv.output.tooMuchData.message', {
								interpolate: { size: dataSizeInMB },
							})
						"
					></span
				></n8n-text>

				<n8n-button
					outline
					:label="$locale.baseText('ndv.output.tooMuchData.showDataAnyway')"
					@click="showTooMuchData"
				/>

				<n8n-button
					size="small"
					:label="$locale.baseText('runData.downloadBinaryData')"
					@click="downloadJsonData()"
				/>
			</div>

			<!-- V-else slot named content which only renders if $slots.content is passed and hasNodeRun -->
			<slot v-else-if="hasNodeRun && $slots['content']" name="content"></slot>

			<div
				v-else-if="
					hasNodeRun &&
					displayMode === 'table' &&
					binaryData.length > 0 &&
					inputData.length === 1 &&
					Object.keys(jsonData[0] || {}).length === 0
				"
				:class="$style.center"
			>
				<n8n-text>
					{{ $locale.baseText('runData.switchToBinary.info') }}
					<a @click="switchToBinary">
						{{ $locale.baseText('runData.switchToBinary.binary') }}
					</a>
				</n8n-text>
			</div>

			<div v-else-if="showIoSearchNoMatchContent" :class="$style.center">
				<n8n-text tag="h3" size="large">{{
					$locale.baseText('ndv.search.noMatch.title')
				}}</n8n-text>
				<n8n-text>
					<i18n-t keypath="ndv.search.noMatch.description" tag="span">
						<template #link>
							<a href="#" @click="onSearchClear">
								{{ $locale.baseText('ndv.search.noMatch.description.link') }}
							</a>
						</template>
					</i18n-t>
				</n8n-text>
			</div>

			<Suspense v-else-if="hasNodeRun && displayMode === 'table' && node">
				<RunDataTable
					:node="node"
					:input-data="inputDataPage"
					:mapping-enabled="mappingEnabled"
					:distance-from-active="distanceFromActive"
					:run-index="runIndex"
					:page-offset="currentPageOffset"
					:total-runs="maxRunIndex"
					:has-default-hover-state="paneType === 'input' && !search"
					:search="search"
					@mounted="$emit('tableMounted', $event)"
					@active-row-changed="onItemHover"
					@display-mode-change="onDisplayModeChange"
				/>
			</Suspense>

			<Suspense v-else-if="hasNodeRun && displayMode === 'json' && node">
				<RunDataJson
					:pane-type="paneType"
					:edit-mode="editMode"
					:push-ref="pushRef"
					:node="node"
					:input-data="inputDataPage"
					:mapping-enabled="mappingEnabled"
					:distance-from-active="distanceFromActive"
					:run-index="runIndex"
					:total-runs="maxRunIndex"
					:search="search"
				/>
			</Suspense>

			<Suspense v-else-if="hasNodeRun && isPaneTypeOutput && displayMode === 'html'">
				<RunDataHtml :input-html="inputHtml" />
			</Suspense>

			<Suspense v-else-if="hasNodeRun && isSchemaView">
				<RunDataSchema
					:data="jsonData"
					:mapping-enabled="mappingEnabled"
					:distance-from-active="distanceFromActive"
					:node="node"
					:pane-type="paneType"
					:run-index="runIndex"
					:total-runs="maxRunIndex"
					:search="search"
				/>
			</Suspense>

			<div v-else-if="displayMode === 'binary' && binaryData.length === 0" :class="$style.center">
				<n8n-text align="center" tag="div">{{
					$locale.baseText('runData.noBinaryDataFound')
				}}</n8n-text>
			</div>

			<div v-else-if="displayMode === 'binary'" :class="$style.dataDisplay">
				<div v-for="(binaryDataEntry, index) in binaryData" :key="index">
					<div v-if="binaryData.length > 1" :class="$style.binaryIndex">
						<div>
							{{ index + 1 }}
						</div>
					</div>

					<div :class="$style.binaryRow">
						<div
							v-for="(binaryData, key) in binaryDataEntry"
							:key="index + '_' + key"
							:class="$style.binaryCell"
						>
							<div :data-test-id="'ndv-binary-data_' + index">
								<div :class="$style.binaryHeader">
									{{ key }}
								</div>
								<div v-if="binaryData.fileName">
									<div>
										<n8n-text size="small" :bold="true"
											>{{ $locale.baseText('runData.fileName') }}:
										</n8n-text>
									</div>
									<div :class="$style.binaryValue">{{ binaryData.fileName }}</div>
								</div>
								<div v-if="binaryData.directory">
									<div>
										<n8n-text size="small" :bold="true"
											>{{ $locale.baseText('runData.directory') }}:
										</n8n-text>
									</div>
									<div :class="$style.binaryValue">{{ binaryData.directory }}</div>
								</div>
								<div v-if="binaryData.fileExtension">
									<div>
										<n8n-text size="small" :bold="true"
											>{{ $locale.baseText('runData.fileExtension') }}:</n8n-text
										>
									</div>
									<div :class="$style.binaryValue">{{ binaryData.fileExtension }}</div>
								</div>
								<div v-if="binaryData.mimeType">
									<div>
										<n8n-text size="small" :bold="true"
											>{{ $locale.baseText('runData.mimeType') }}:
										</n8n-text>
									</div>
									<div :class="$style.binaryValue">{{ binaryData.mimeType }}</div>
								</div>
								<div v-if="binaryData.fileSize">
									<div>
										<n8n-text size="small" :bold="true"
											>{{ $locale.baseText('runData.fileSize') }}:
										</n8n-text>
									</div>
									<div :class="$style.binaryValue">{{ binaryData.fileSize }}</div>
								</div>

								<div :class="$style.binaryButtonContainer">
									<n8n-button
										v-if="isViewable(index, key)"
										size="small"
										:label="$locale.baseText('runData.showBinaryData')"
										data-test-id="ndv-view-binary-data"
										@click="displayBinaryData(index, key)"
									/>
									<n8n-button
										v-if="isDownloadable(index, key)"
										size="small"
										type="secondary"
										:label="$locale.baseText('runData.downloadBinaryData')"
										data-test-id="ndv-download-binary-data"
										@click="downloadBinaryData(index, key)"
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div
			v-if="
				hasNodeRun &&
				!hasRunError &&
				binaryData.length === 0 &&
				dataCount > pageSize &&
				!isSchemaView &&
				!isArtificialRecoveredEventItem
			"
			v-show="!editMode.enabled"
			:class="$style.pagination"
			data-test-id="ndv-data-pagination"
		>
			<el-pagination
				background
				:hide-on-single-page="true"
				:current-page="currentPage"
				:pager-count="5"
				:page-size="pageSize"
				layout="prev, pager, next"
				:total="dataCount"
				@update:current-page="onCurrentPageChange"
			>
			</el-pagination>

			<div :class="$style.pageSizeSelector">
				<n8n-select
					size="mini"
					:model-value="pageSize"
					teleported
					@update:model-value="onPageSizeChange"
				>
					<template #prepend>{{ $locale.baseText('ndv.output.pageSize') }}</template>
					<n8n-option v-for="size in pageSizes" :key="size" :label="size" :value="size">
					</n8n-option>
					<n8n-option :label="$locale.baseText('ndv.output.all')" :value="dataCount"> </n8n-option>
				</n8n-select>
			</div>
		</div>
		<n8n-block-ui :show="blockUI" :class="$style.uiBlocker" />
	</div>
</template>

<script lang="ts">
import { defineAsyncComponent, defineComponent, toRef } from 'vue';
import type { PropType } from 'vue';
import { mapStores } from 'pinia';
import { useStorage } from '@/composables/useStorage';
import { saveAs } from 'file-saver';
import type {
	ConnectionTypes,
	IBinaryData,
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	INodeOutputConfiguration,
	INodeTypeDescription,
	IRunData,
	IRunExecutionData,
	NodeHint,
	NodeError,
	Workflow,
} from 'n8n-workflow';
import { NodeHelpers, NodeConnectionType } from 'n8n-workflow';

import type {
	IExecutionResponse,
	INodeUi,
	INodeUpdatePropertiesInformation,
	IRunDataDisplayMode,
	ITab,
	NodePanelType,
} from '@/Interface';

import {
	DATA_PINNING_DOCS_URL,
	DATA_EDITING_DOCS_URL,
	NODE_TYPES_EXCLUDED_FROM_OUTPUT_NAME_APPEND,
	LOCAL_STORAGE_PIN_DATA_DISCOVERY_NDV_FLAG,
	LOCAL_STORAGE_PIN_DATA_DISCOVERY_CANVAS_FLAG,
	MAX_DISPLAY_DATA_SIZE,
	MAX_DISPLAY_ITEMS_AUTO_ALL,
	TEST_PIN_DATA,
	HTML_NODE_TYPE,
} from '@/constants';

import BinaryDataDisplay from '@/components/BinaryDataDisplay.vue';
import NodeErrorView from '@/components/Error/NodeErrorView.vue';
import JsonEditor from '@/components/JsonEditor/JsonEditor.vue';

import type { PinDataSource, UnpinDataSource } from '@/composables/usePinnedData';
import { usePinnedData } from '@/composables/usePinnedData';
import { dataPinningEventBus } from '@/event-bus';
import { clearJsonKey, isEmpty } from '@/utils/typesUtils';
import { executionDataToJson } from '@/utils/nodeTypesUtils';
import { searchInObject } from '@/utils/objectUtils';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useToast } from '@/composables/useToast';
import { isEqual, isObject } from 'lodash-es';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useRootStore } from '@/stores/n8nRoot.store';
import RunDataPinButton from '@/components/RunDataPinButton.vue';

const RunDataTable = defineAsyncComponent(
	async () => await import('@/components/RunDataTable.vue'),
);
const RunDataJson = defineAsyncComponent(async () => await import('@/components/RunDataJson.vue'));
const RunDataSchema = defineAsyncComponent(
	async () => await import('@/components/RunDataSchema.vue'),
);
const RunDataHtml = defineAsyncComponent(async () => await import('@/components/RunDataHtml.vue'));
const RunDataSearch = defineAsyncComponent(
	async () => await import('@/components/RunDataSearch.vue'),
);

export type EnterEditModeArgs = {
	origin: 'editIconButton' | 'insertTestDataLink';
};

export default defineComponent({
	name: 'RunData',
	components: {
		BinaryDataDisplay,
		NodeErrorView,
		JsonEditor,
		RunDataTable,
		RunDataJson,
		RunDataSchema,
		RunDataHtml,
		RunDataSearch,
		RunDataPinButton,
	},
	props: {
		node: {
			type: Object as PropType<INodeUi | null>,
			default: null,
		},
		workflow: {
			type: Object as PropType<Workflow>,
			required: true,
		},
		runIndex: {
			type: Number,
			required: true,
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
		pushRef: {
			type: String,
		},
		paneType: {
			type: String as PropType<NodePanelType>,
			required: true,
		},
		overrideOutputs: {
			type: Array as PropType<number[]>,
		},
		mappingEnabled: {
			type: Boolean,
		},
		distanceFromActive: {
			type: Number,
			default: 0,
		},
		blockUI: {
			type: Boolean,
			default: false,
		},
		isProductionExecutionPreview: {
			type: Boolean,
			default: false,
		},
		isPaneActive: {
			type: Boolean,
			default: false,
		},
	},
	setup(props) {
		const ndvStore = useNDVStore();
		const nodeHelpers = useNodeHelpers();
		const externalHooks = useExternalHooks();
		const node = toRef(props, 'node');
		const pinnedData = usePinnedData(node, {
			runIndex: props.runIndex,
			displayMode: ndvStore.getPanelDisplayMode(props.paneType),
		});

		return {
			...useToast(),
			externalHooks,
			nodeHelpers,
			pinnedData,
		};
	},
	data() {
		return {
			connectionType: NodeConnectionType.Main as ConnectionTypes,
			binaryDataPreviewActive: false,
			dataSize: 0,
			showData: false,
			outputIndex: 0,
			binaryDataDisplayVisible: false,
			binaryDataDisplayData: null as IBinaryData | null,

			MAX_DISPLAY_DATA_SIZE,
			MAX_DISPLAY_ITEMS_AUTO_ALL,
			currentPage: 1,
			pageSize: 10,
			pageSizes: [10, 25, 50, 100],

			pinDataDiscoveryTooltipVisible: false,
			isControlledPinDataTooltip: false,
			search: '',
		};
	},
	computed: {
		...mapStores(
			useNodeTypesStore,
			useNDVStore,
			useWorkflowsStore,
			useSourceControlStore,
			useRootStore,
		),
		isReadOnlyRoute() {
			return this.$route?.meta?.readOnlyCanvas === true;
		},
		activeNode(): INodeUi | null {
			return this.ndvStore.activeNode;
		},
		dataPinningDocsUrl(): string {
			return DATA_PINNING_DOCS_URL;
		},
		dataEditingDocsUrl(): string {
			return DATA_EDITING_DOCS_URL;
		},
		displayMode(): IRunDataDisplayMode {
			return this.ndvStore.getPanelDisplayMode(this.paneType);
		},
		nodeType(): INodeTypeDescription | null {
			if (this.node) {
				return this.nodeTypesStore.getNodeType(this.node.type, this.node.typeVersion);
			}
			return null;
		},
		isSchemaView(): boolean {
			return this.displayMode === 'schema';
		},
		isTriggerNode(): boolean {
			if (this.node === null) {
				return false;
			}
			return this.nodeTypesStore.isTriggerNode(this.node.type);
		},
		canPinData(): boolean {
			if (this.node === null) {
				return false;
			}

			const canPinNode = usePinnedData(this.node).canPinNode(false);

			return (
				canPinNode &&
				!this.isPaneTypeInput &&
				this.pinnedData.isValidNodeType.value &&
				!(this.binaryData && this.binaryData.length > 0)
			);
		},
		buttons(): Array<{ label: string; value: string }> {
			const defaults = [
				{ label: this.$locale.baseText('runData.table'), value: 'table' },
				{ label: this.$locale.baseText('runData.json'), value: 'json' },
			];

			if (this.binaryData.length) {
				defaults.push({ label: this.$locale.baseText('runData.binary'), value: 'binary' });
			}

			const schemaView = { label: this.$locale.baseText('runData.schema'), value: 'schema' };
			if (this.isPaneTypeInput) {
				defaults.unshift(schemaView);
			} else {
				defaults.push(schemaView);
			}

			if (
				this.isPaneTypeOutput &&
				this.activeNode?.type === HTML_NODE_TYPE &&
				this.activeNode.parameters.operation === 'generateHtmlTemplate'
			) {
				defaults.unshift({ label: 'HTML', value: 'html' });
			}

			return defaults;
		},
		hasNodeRun(): boolean {
			return Boolean(
				!this.isExecuting &&
					this.node &&
					((this.workflowRunData && this.workflowRunData.hasOwnProperty(this.node.name)) ||
						this.pinnedData.hasData.value),
			);
		},
		isArtificialRecoveredEventItem(): boolean {
			return !!this.rawInputData?.[0]?.json?.isArtificialRecoveredEventItem;
		},
		subworkflowExecutionError(): NodeError {
			return {
				node: this.node,
				messages: [this.workflowsStore.subWorkflowExecutionError?.message ?? ''],
			} as NodeError;
		},
		hasSubworkflowExecutionError(): boolean {
			return Boolean(this.workflowsStore.subWorkflowExecutionError);
		},
		workflowRunErrorAsNodeError(): NodeError | null {
			if (!this.node) {
				return null;
			}
			return this.workflowRunData?.[this.node?.name]?.[this.runIndex]?.error as NodeError;
		},
		hasRunError(): boolean {
			return Boolean(this.node && this.workflowRunErrorAsNodeError);
		},
		executionHints(): NodeHint[] {
			if (this.hasNodeRun) {
				const hints = this.node && this.workflowRunData?.[this.node.name]?.[this.runIndex]?.hints;

				if (hints) return hints;
			}

			return [];
		},
		workflowExecution(): IExecutionResponse | null {
			return this.workflowsStore.getWorkflowExecution;
		},
		workflowRunData(): IRunData | null {
			if (this.workflowExecution === null) {
				return null;
			}
			const executionData: IRunExecutionData | undefined = this.workflowExecution.data;
			if (executionData?.resultData) {
				return executionData.resultData.runData;
			}
			return null;
		},
		dataCount(): number {
			return this.getDataCount(this.runIndex, this.currentOutputIndex);
		},
		unfilteredDataCount(): number {
			return this.pinnedData.data.value
				? this.pinnedData.data.value.length
				: this.rawInputData.length;
		},
		dataSizeInMB(): string {
			return (this.dataSize / 1024 / 1000).toLocaleString();
		},
		maxOutputIndex(): number {
			if (this.node === null || this.runIndex === undefined) {
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
				if (taskData?.main) {
					return taskData.main.length - 1;
				}
			}

			return 0;
		},
		currentPageOffset(): number {
			return this.pageSize * (this.currentPage - 1);
		},
		maxRunIndex(): number {
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
		rawInputData(): INodeExecutionData[] {
			return this.getRawInputData(this.runIndex, this.currentOutputIndex, this.connectionType);
		},
		unfilteredInputData(): INodeExecutionData[] {
			return this.getPinDataOrLiveData(this.rawInputData);
		},
		inputData(): INodeExecutionData[] {
			return this.getFilteredData(this.unfilteredInputData);
		},
		inputDataPage(): INodeExecutionData[] {
			const offset = this.pageSize * (this.currentPage - 1);
			return this.inputData.slice(offset, offset + this.pageSize);
		},
		jsonData(): IDataObject[] {
			return executionDataToJson(this.inputData);
		},
		binaryData(): IBinaryKeyData[] {
			if (!this.node) {
				return [];
			}

			const binaryData = this.nodeHelpers.getBinaryData(
				this.workflowRunData,
				this.node.name,
				this.runIndex,
				this.currentOutputIndex,
			);
			return binaryData.filter((data) => Boolean(data && Object.keys(data).length));
		},
		inputHtml(): string {
			return String(this.inputData[0]?.json?.html ?? '');
		},
		currentOutputIndex(): number {
			if (this.overrideOutputs?.length && !this.overrideOutputs.includes(this.outputIndex)) {
				return this.overrideOutputs[0];
			}

			return this.outputIndex;
		},
		branches(): ITab[] {
			const capitalize = (name: string) => name.charAt(0).toLocaleUpperCase() + name.slice(1);

			const branches: ITab[] = [];

			for (let i = 0; i <= this.maxOutputIndex; i++) {
				if (this.overrideOutputs && !this.overrideOutputs.includes(i)) {
					continue;
				}
				const totalItemsCount = this.getRawInputData(this.runIndex, i).length;
				const itemsCount = this.getDataCount(this.runIndex, i);
				const items = this.search
					? this.$locale.baseText('ndv.search.items', {
							adjustToNumber: totalItemsCount,
							interpolate: { matched: itemsCount, total: totalItemsCount },
						})
					: this.$locale.baseText('ndv.output.items', {
							adjustToNumber: itemsCount,
							interpolate: { count: itemsCount },
						});
				let outputName = this.getOutputName(i);

				if (`${outputName}` === `${i}`) {
					outputName = `${this.$locale.baseText('ndv.output')} ${outputName}`;
				} else {
					const appendBranchWord = NODE_TYPES_EXCLUDED_FROM_OUTPUT_NAME_APPEND.includes(
						this.node?.type ?? '',
					)
						? ''
						: ` ${this.$locale.baseText('ndv.output.branch')}`;
					outputName = capitalize(`${this.getOutputName(i)}${appendBranchWord}`);
				}
				branches.push({
					label:
						(this.search && itemsCount) || totalItemsCount
							? `${outputName} (${items})`
							: outputName,
					value: i,
				});
			}
			return branches;
		},
		editMode(): { enabled: boolean; value: string } {
			return this.isPaneTypeInput
				? { enabled: false, value: '' }
				: this.ndvStore.outputPanelEditMode;
		},
		isPaneTypeInput(): boolean {
			return this.paneType === 'input';
		},
		isPaneTypeOutput(): boolean {
			return this.paneType === 'output';
		},
		readOnlyEnv(): boolean {
			return this.sourceControlStore.preferences.branchReadOnly;
		},
		showIOSearch(): boolean {
			return this.hasNodeRun && !this.hasRunError && this.unfilteredInputData.length > 0;
		},
		extraControlsLocation() {
			if (!this.hasNodeRun) return 'header';
			if (this.maxRunIndex > 0) return 'runs';
			if (this.maxOutputIndex > 0 && this.branches.length > 1) {
				return 'outputs';
			}

			return 'items';
		},
		showIoSearchNoMatchContent(): boolean {
			return this.hasNodeRun && !this.inputData.length && !!this.search;
		},
		parentNodeOutputData(): INodeExecutionData[] {
			const parentNode = this.workflow.getParentNodesByDepth(this.node?.name ?? '')[0];
			let parentNodeData: INodeExecutionData[] = [];

			if (parentNode?.name) {
				parentNodeData = this.nodeHelpers.getNodeInputData(
					this.workflow.getNode(parentNode?.name),
					this.runIndex,
					this.outputIndex,
					'input',
					this.connectionType,
				);
			}

			return parentNodeData;
		},
	},
	watch: {
		node(newNode: INodeUi, prevNode: INodeUi) {
			if (newNode.id === prevNode.id) return;
			this.init();
		},
		hasNodeRun() {
			if (this.paneType === 'output') this.setDisplayMode();
		},
		inputDataPage: {
			handler(data: INodeExecutionData[]) {
				if (this.paneType && data) {
					this.ndvStore.setNDVPanelDataIsEmpty({
						panel: this.paneType as 'input' | 'output',
						isEmpty: data.every((item) => isEmpty(item.json)),
					});
				}
			},
			immediate: true,
			deep: true,
		},
		jsonData(data: IDataObject[], prevData: IDataObject[]) {
			if (isEqual(data, prevData)) return;
			this.refreshDataSize();
			this.showPinDataDiscoveryTooltip(data);
		},
		binaryData(newData: IBinaryKeyData[], prevData: IBinaryKeyData[]) {
			if (newData.length && !prevData.length && this.displayMode !== 'binary') {
				this.switchToBinary();
			} else if (!newData.length && this.displayMode === 'binary') {
				this.onDisplayModeChange('table');
			}
		},
		currentOutputIndex(branchIndex: number) {
			this.ndvStore.setNDVBranchIndex({
				pane: this.paneType as 'input' | 'output',
				branchIndex,
			});
		},
		search(newSearch: string) {
			this.$emit('search', newSearch);
		},
	},
	mounted() {
		this.init();

		if (!this.isPaneTypeInput) {
			this.showPinDataDiscoveryTooltip(this.jsonData);
		}
		this.ndvStore.setNDVBranchIndex({
			pane: this.paneType as 'input' | 'output',
			branchIndex: this.currentOutputIndex,
		});

		if (this.paneType === 'output') {
			this.setDisplayMode();
			this.activatePane();
		}

		if (this.hasRunError && this.node) {
			const error = this.workflowRunData?.[this.node.name]?.[this.runIndex]?.error;
			const errorsToTrack = ['unknown error'];

			if (error && errorsToTrack.some((e) => error.message.toLowerCase().includes(e))) {
				this.$telemetry.track(
					`User encountered an error: "${error.message}"`,
					{
						node: this.node.type,
						errorMessage: error.message,
						nodeVersion: this.node.typeVersion,
						n8nVersion: this.rootStore.versionCli,
					},
					{
						withPostHog: true,
					},
				);
			}
		}
	},
	beforeUnmount() {
		this.hidePinDataDiscoveryTooltip();
	},
	methods: {
		getResolvedNodeOutputs() {
			if (this.node && this.nodeType) {
				const workflowNode = this.workflow.getNode(this.node.name);

				if (workflowNode) {
					const outputs = NodeHelpers.getNodeOutputs(this.workflow, workflowNode, this.nodeType);
					return outputs;
				}
			}
			return [];
		},
		shouldHintBeDisplayed(hint: NodeHint): boolean {
			const { location, whenToDisplay } = hint;

			if (location) {
				if (location === 'ndv' && !['input', 'output'].includes(this.paneType)) {
					return false;
				}
				if (location === 'inputPane' && this.paneType !== 'input') {
					return false;
				}

				if (location === 'outputPane' && this.paneType !== 'output') {
					return false;
				}
			}

			if (whenToDisplay === 'afterExecution' && !this.hasNodeRun) {
				return false;
			}

			if (whenToDisplay === 'beforeExecution' && this.hasNodeRun) {
				return false;
			}

			return true;
		},
		getNodeHints(): NodeHint[] {
			if (this.node && this.nodeType) {
				const workflowNode = this.workflow.getNode(this.node.name);

				if (workflowNode) {
					const executionHints = this.executionHints;
					const nodeHints = NodeHelpers.getNodeHints(this.workflow, workflowNode, this.nodeType, {
						runExecutionData: this.workflowExecution?.data ?? null,
						runIndex: this.runIndex,
						connectionInputData: this.parentNodeOutputData,
					});

					return executionHints.concat(nodeHints).filter(this.shouldHintBeDisplayed);
				}
			}
			return [];
		},
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
				push_ref: this.pushRef,
				node_type: this.activeNode?.type,
				pane: 'output',
				type: 'data-pinning-docs',
			});
		},
		showPinDataDiscoveryTooltip(value: IDataObject[]) {
			if (!this.isTriggerNode) {
				return;
			}

			const pinDataDiscoveryFlag = useStorage(LOCAL_STORAGE_PIN_DATA_DISCOVERY_NDV_FLAG).value;

			if (value && value.length > 0 && !this.isReadOnlyRoute && !pinDataDiscoveryFlag) {
				this.pinDataDiscoveryComplete();

				setTimeout(() => {
					this.isControlledPinDataTooltip = true;
					this.pinDataDiscoveryTooltipVisible = true;
					dataPinningEventBus.emit('data-pinning-discovery', { isTooltipVisible: true });
				}, 500); // Wait for NDV to open
			}
		},
		hidePinDataDiscoveryTooltip() {
			if (this.pinDataDiscoveryTooltipVisible) {
				this.isControlledPinDataTooltip = false;
				this.pinDataDiscoveryTooltipVisible = false;
				dataPinningEventBus.emit('data-pinning-discovery', { isTooltipVisible: false });
			}
		},
		pinDataDiscoveryComplete() {
			useStorage(LOCAL_STORAGE_PIN_DATA_DISCOVERY_NDV_FLAG).value = 'true';
			useStorage(LOCAL_STORAGE_PIN_DATA_DISCOVERY_CANVAS_FLAG).value = 'true';
		},
		enterEditMode({ origin }: EnterEditModeArgs) {
			const inputData = this.pinnedData.data.value
				? clearJsonKey(this.pinnedData.data.value)
				: executionDataToJson(this.rawInputData);

			const inputDataLength = Array.isArray(inputData)
				? inputData.length
				: Object.keys(inputData ?? {}).length;

			const data = inputDataLength > 0 ? inputData : TEST_PIN_DATA;

			this.ndvStore.setOutputPanelEditModeEnabled(true);
			this.ndvStore.setOutputPanelEditModeValue(JSON.stringify(data, null, 2));

			this.$telemetry.track('User opened ndv edit state', {
				node_type: this.activeNode?.type,
				click_type: origin === 'editIconButton' ? 'button' : 'link',
				push_ref: this.pushRef,
				run_index: this.runIndex,
				is_output_present: this.hasNodeRun || this.pinnedData.hasData.value,
				view: !this.hasNodeRun && !this.pinnedData.hasData.value ? 'undefined' : this.displayMode,
				is_data_pinned: this.pinnedData.hasData.value,
			});
		},
		onClickCancelEdit() {
			this.ndvStore.setOutputPanelEditModeEnabled(false);
			this.ndvStore.setOutputPanelEditModeValue('');
			this.onExitEditMode({ type: 'cancel' });
		},
		onClickSaveEdit() {
			if (!this.node) {
				return;
			}

			const { value } = this.editMode;

			this.clearAllStickyNotifications();

			try {
				this.pinnedData.setData(clearJsonKey(value) as INodeExecutionData[], 'save-edit');
			} catch (error) {
				console.error(error);
				return;
			}

			this.ndvStore.setOutputPanelEditModeEnabled(false);

			this.onExitEditMode({ type: 'save' });
		},
		onExitEditMode({ type }: { type: 'save' | 'cancel' }) {
			this.$telemetry.track('User closed ndv edit state', {
				node_type: this.activeNode?.type,
				push_ref: this.pushRef,
				run_index: this.runIndex,
				view: this.displayMode,
				type,
			});
		},
		async onTogglePinData({ source }: { source: PinDataSource | UnpinDataSource }) {
			if (!this.node) {
				return;
			}

			if (source === 'pin-icon-click') {
				const telemetryPayload = {
					node_type: this.activeNode?.type,
					push_ref: this.pushRef,
					run_index: this.runIndex,
					view: !this.hasNodeRun && !this.pinnedData.hasData.value ? 'none' : this.displayMode,
				};

				void this.externalHooks.run('runData.onTogglePinData', telemetryPayload);
				this.$telemetry.track('User clicked pin data icon', telemetryPayload);
			}

			this.nodeHelpers.updateNodeParameterIssues(this.node);

			if (this.pinnedData.hasData.value) {
				this.pinnedData.unsetData(source);
				return;
			}

			try {
				this.pinnedData.setData(this.rawInputData, 'pin-icon-click');
			} catch (error) {
				console.error(error);
				return;
			}

			if (this.maxRunIndex > 0) {
				this.showToast({
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
				push_ref: this.pushRef,
				branch_index: value,
				node_type: this.activeNode?.type,
				node_type_input_selection: this.nodeType ? this.nodeType.name : '',
				pane: this.paneType,
			});
		},
		showTooMuchData() {
			this.showData = true;
			this.$telemetry.track('User clicked ndv button', {
				node_type: this.activeNode?.type,
				workflow_id: this.workflowsStore.workflowId,
				push_ref: this.pushRef,
				pane: this.paneType,
				type: 'showTooMuchData',
			});
		},
		toggleLinkRuns() {
			this.linkedRuns ? this.unlinkRun() : this.linkRun();
		},
		linkRun() {
			this.$emit('linkRun');
		},
		unlinkRun() {
			this.$emit('unlinkRun');
		},
		onCurrentPageChange(value: number) {
			this.currentPage = value;
			this.$telemetry.track('User changed ndv page', {
				node_type: this.activeNode?.type,
				workflow_id: this.workflowsStore.workflowId,
				push_ref: this.pushRef,
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
				push_ref: this.pushRef,
				pane: this.paneType,
				page_selected: this.currentPage,
				page_size: this.pageSize,
				items_total: this.dataCount,
			});
		},
		onDisplayModeChange(displayMode: IRunDataDisplayMode) {
			const previous = this.displayMode;
			this.ndvStore.setPanelDisplayMode({ pane: this.paneType, mode: displayMode });

			const dataContainerRef = this.$refs.dataContainer as Element | undefined;
			if (dataContainerRef) {
				const dataDisplay = dataContainerRef.children[0];

				if (dataDisplay) {
					dataDisplay.scrollTo(0, 0);
				}
			}

			this.closeBinaryDataDisplay();
			void this.externalHooks.run('runData.displayModeChanged', {
				newValue: displayMode,
				oldValue: previous,
			});
			if (this.activeNode) {
				this.$telemetry.track('User changed ndv item view', {
					previous_view: previous,
					new_view: displayMode,
					node_type: this.activeNode.type,
					workflow_id: this.workflowsStore.workflowId,
					push_ref: this.pushRef,
					pane: this.paneType,
				});
			}
		},
		getRunLabel(option: number) {
			let itemsCount = 0;
			for (let i = 0; i <= this.maxOutputIndex; i++) {
				itemsCount += this.getPinDataOrLiveData(this.getRawInputData(option - 1, i)).length;
			}
			const items = this.$locale.baseText('ndv.output.items', {
				adjustToNumber: itemsCount,
				interpolate: { count: itemsCount },
			});
			const itemsLabel = itemsCount > 0 ? ` (${items})` : '';
			return option + this.$locale.baseText('ndv.output.of') + (this.maxRunIndex + 1) + itemsLabel;
		},
		getRawInputData(
			runIndex: number,
			outputIndex: number,
			connectionType: ConnectionTypes = NodeConnectionType.Main,
		): INodeExecutionData[] {
			let inputData: INodeExecutionData[] = [];

			if (this.node) {
				inputData = this.nodeHelpers.getNodeInputData(
					this.node,
					runIndex,
					outputIndex,
					this.paneType,
					connectionType,
				);
			}

			if (inputData.length === 0 || !Array.isArray(inputData)) {
				return [];
			}

			return inputData;
		},
		getPinDataOrLiveData(inputData: INodeExecutionData[]): INodeExecutionData[] {
			if (this.pinnedData.data.value && !this.isProductionExecutionPreview) {
				return Array.isArray(this.pinnedData.data.value)
					? this.pinnedData.data.value.map((value) => ({
							json: value,
						}))
					: [
							{
								json: this.pinnedData.data.value,
							},
						];
			}
			return inputData;
		},
		getFilteredData(inputData: INodeExecutionData[]): INodeExecutionData[] {
			if (!this.search) {
				return inputData;
			}

			this.currentPage = 1;
			return inputData.filter(({ json }) => searchInObject(json, this.search));
		},
		getDataCount(
			runIndex: number,
			outputIndex: number,
			connectionType: ConnectionTypes = NodeConnectionType.Main,
		) {
			if (!this.node) {
				return 0;
			}

			if (this.workflowRunData?.[this.node.name]?.[runIndex]?.hasOwnProperty('error')) {
				return 1;
			}

			const rawInputData = this.getRawInputData(runIndex, outputIndex, connectionType);
			const pinOrLiveData = this.getPinDataOrLiveData(rawInputData);
			return this.getFilteredData(pinOrLiveData).length;
		},
		init() {
			// Reset the selected output index every time another node gets selected
			this.outputIndex = 0;
			this.refreshDataSize();
			this.closeBinaryDataDisplay();
			let outputTypes: ConnectionTypes[] = [];
			if (this.nodeType !== null && this.node !== null) {
				const outputs = this.getResolvedNodeOutputs();
				outputTypes = NodeHelpers.getConnectionTypes(outputs);
			}
			this.connectionType = outputTypes.length === 0 ? NodeConnectionType.Main : outputTypes[0];
			if (this.binaryData.length > 0) {
				this.ndvStore.setPanelDisplayMode({
					pane: this.paneType as 'input' | 'output',
					mode: 'binary',
				});
			} else if (this.displayMode === 'binary') {
				this.ndvStore.setPanelDisplayMode({
					pane: this.paneType as 'input' | 'output',
					mode: 'table',
				});
			}
		},
		closeBinaryDataDisplay() {
			this.binaryDataDisplayVisible = false;
			this.binaryDataDisplayData = null;
		},
		clearExecutionData() {
			this.workflowsStore.setWorkflowExecutionData(null);
			this.nodeHelpers.updateNodesExecutionIssues();
		},
		isViewable(index: number, key: string | number): boolean {
			const { fileType } = this.binaryData[index][key];
			return (
				!!fileType && ['image', 'audio', 'video', 'text', 'json', 'pdf', 'html'].includes(fileType)
			);
		},
		isDownloadable(index: number, key: string | number): boolean {
			const { mimeType, fileName } = this.binaryData[index][key];
			return !!(mimeType && fileName);
		},
		async downloadBinaryData(index: number, key: string | number) {
			const { id, data, fileName, fileExtension, mimeType } = this.binaryData[index][key];

			if (id) {
				const url = this.workflowsStore.getBinaryUrl(id, 'download', fileName ?? '', mimeType);
				saveAs(url, [fileName, fileExtension].join('.'));
				return;
			} else {
				const bufferString = 'data:' + mimeType + ';base64,' + data;
				const blob = await fetch(bufferString).then(async (d) => await d.blob());
				saveAs(blob, fileName);
			}
		},
		async downloadJsonData() {
			const fileName = (this.node?.name ?? '').replace(/[^\w\d]/g, '_');
			const blob = new Blob([JSON.stringify(this.rawInputData, null, 2)], {
				type: 'application/json',
			});

			saveAs(blob, `${fileName}.json`);
		},
		displayBinaryData(index: number, key: string | number) {
			const { data, mimeType } = this.binaryData[index][key];
			this.binaryDataDisplayVisible = true;

			this.binaryDataDisplayData = {
				node: this.node?.name,
				runIndex: this.runIndex,
				outputIndex: this.currentOutputIndex,
				index,
				key,
				data,
				mimeType,
			};
		},
		getOutputName(outputIndex: number) {
			if (this.node === null) {
				return outputIndex + 1;
			}

			const nodeType = this.nodeType;
			const outputs = this.getResolvedNodeOutputs();
			const outputConfiguration = outputs?.[outputIndex] as INodeOutputConfiguration;

			if (outputConfiguration && isObject(outputConfiguration)) {
				return outputConfiguration?.displayName;
			}
			if (!nodeType?.outputNames || nodeType.outputNames.length <= outputIndex) {
				return outputIndex + 1;
			}

			return nodeType.outputNames[outputIndex];
		},
		refreshDataSize() {
			// Hide by default the data from being displayed
			this.showData = false;
			const jsonItems = this.inputDataPage.map((item) => item.json);
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
		setDisplayMode() {
			if (!this.activeNode) return;

			const shouldDisplayHtml =
				this.activeNode.type === HTML_NODE_TYPE &&
				this.activeNode.parameters.operation === 'generateHtmlTemplate';

			if (shouldDisplayHtml) {
				this.ndvStore.setPanelDisplayMode({
					pane: 'output',
					mode: 'html',
				});
			}
		},
		activatePane() {
			this.$emit('activatePane');
		},
		onSearchClear() {
			this.search = '';
			document.dispatchEvent(new KeyboardEvent('keyup', { key: '/' }));
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
	background-color: var(--color-run-data-background);
	display: flex;
	flex-direction: column;
}

.pinnedDataCallout {
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

.dataContainer {
	position: relative;
	overflow-y: auto;
	height: 100%;

	&:hover {
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
	line-height: var(--font-line-height-xloose);
	word-break: normal;
	height: 100%;
}

.outputs {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-s);
	padding-left: var(--spacing-s);
	padding-right: var(--spacing-s);
	padding-bottom: var(--spacing-s);
}

.tabs {
	display: flex;
	justify-content: space-between;
	align-items: center;
	min-height: 30px;
}

.itemsCount {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
	padding-left: var(--spacing-s);
	padding-right: var(--spacing-s);
	padding-bottom: var(--spacing-s);

	.itemsText {
		flex-shrink: 0;
		overflow-x: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	&.muted .itemsText {
		color: var(--color-text-light);
		font-size: var(--font-size-2xs);
	}
}

.inputSelect {
	padding-left: var(--spacing-s);
	padding-right: var(--spacing-s);
	padding-bottom: var(--spacing-s);
}

.runSelector {
	padding-left: var(--spacing-s);
	padding-right: var(--spacing-s);
	padding-bottom: var(--spacing-s);
	display: flex;
	gap: var(--spacing-4xs);
	align-items: center;

	:global(.el-input--suffix .el-input__inner) {
		padding-right: var(--spacing-l);
	}
}

.search {
	margin-left: auto;
}

.runSelectorInner {
	max-width: 172px;
}

.pagination {
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	bottom: 0;
	padding: 5px;
	overflow-y: hidden;
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
	font-weight: var(--font-weight-bold);
	font-size: 1.2em;
	padding-bottom: var(--spacing-2xs);
	margin-bottom: var(--spacing-2xs);
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
.tooltipContain {
	max-width: 240px;
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

.editMode {
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: stretch;
	padding-left: var(--spacing-s);
	padding-right: var(--spacing-s);
}

.editModeBody {
	flex: 1 1 auto;
	max-height: 100%;
	width: 100%;
	overflow: auto;
}

.editModeFooter {
	flex: 0 1 auto;
	display: flex;
	width: 100%;
	justify-content: space-between;
	align-items: center;
	padding-top: var(--spacing-s);
	padding-bottom: var(--spacing-s);
}

.editModeFooterInfotip {
	display: flex;
	flex: 1;
	width: 100%;
}

.editModeActions {
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

.hintCallout {
	margin-bottom: var(--spacing-xs);
	margin-left: var(--spacing-s);
	margin-right: var(--spacing-s);
}
</style>

<style lang="scss" scoped>
.run-data {
	.code-node-editor {
		height: 100%;
	}
}
</style>

<style lang="scss" scoped>
:deep(.highlight) {
	background-color: #f7dc55;
	color: black;
	border-radius: var(--border-radius-base);
	padding: 0 1px;
	font-weight: normal;
	font-style: normal;
}
</style>
