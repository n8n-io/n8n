<script lang="ts" setup>
import type { INodeUi } from '@/Interface';
import Draggable from '@/components/Draggable.vue';
import VirtualSchemaHeader from '@/components/VirtualSchemaHeader.vue';
import VirtualSchemaItem from '@/components/VirtualSchemaItem.vue';
import {
	useDataSchema,
	useFlattenSchema,
	type RenderHeader,
	type RenderNotice,
	type Renders,
	type SchemaNode,
} from '@/composables/useDataSchema';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useI18n } from '@n8n/i18n';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useTelemetry } from '@/composables/useTelemetry';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { executionDataToJson } from '@/utils/nodeTypesUtils';
import { N8nText } from '@n8n/design-system';
import {
	createResultError,
	type NodeConnectionType,
	NodeConnectionTypes,
	type IConnectedNode,
	type IDataObject,
} from 'n8n-workflow';
import { computed, ref, watch } from 'vue';
import {
	DynamicScroller,
	DynamicScrollerItem,
	type RecycleScrollerInstance,
} from 'vue-virtual-scroller';
import MappingPill from './MappingPill.vue';

import { EnterpriseEditionFeature, PLACEHOLDER_FILLED_AT_EXECUTION_TIME } from '@/constants';
import useEnvironmentsStore from '@/stores/environments.ee.store';
import { useSchemaPreviewStore } from '@/stores/schemaPreview.store';
import { useSettingsStore } from '@/stores/settings.store';
import { isEmpty } from '@/utils/typesUtils';
import { asyncComputed } from '@vueuse/core';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import pick from 'lodash/pick';
import { DateTime } from 'luxon';
import NodeExecuteButton from './NodeExecuteButton.vue';
import { I18nT } from 'vue-i18n';
import { useTelemetryContext } from '@/composables/useTelemetryContext';
import NDVEmptyState from '@/components/NDVEmptyState.vue';

type Props = {
	nodes?: IConnectedNode[];
	node?: INodeUi | null;
	data?: IDataObject[];
	mappingEnabled?: boolean;
	paneType: 'input' | 'output';
	connectionType?: NodeConnectionType;
	search?: string;
	compact?: boolean;
	outputIndex?: number;
};

const props = withDefaults(defineProps<Props>(), {
	nodes: () => [],
	distanceFromActive: 1,
	node: null,
	data: () => [],
	connectionType: NodeConnectionTypes.Main,
	search: '',
	mappingEnabled: false,
	compact: false,
	outputIndex: undefined,
});

const telemetry = useTelemetry();
const telemetryContext = useTelemetryContext();
const i18n = useI18n();
const ndvStore = useNDVStore();
const nodeTypesStore = useNodeTypesStore();
const workflowsStore = useWorkflowsStore();
const schemaPreviewStore = useSchemaPreviewStore();
const environmentsStore = useEnvironmentsStore();
const settingsStore = useSettingsStore();

const { getSchemaForExecutionData, getSchemaForJsonSchema, getSchema, filterSchema } =
	useDataSchema();
const { closedNodes, flattenSchema, flattenMultipleSchemas, toggleNode } = useFlattenSchema();
const { getNodeInputData, getLastRunIndexWithData, hasNodeExecuted } = useNodeHelpers();

const emit = defineEmits<{
	'clear:search': [];
}>();

const scroller = ref<RecycleScrollerInstance>();
const closedNodesBeforeSearch = ref(new Set<string>());

const canDraggableDrop = computed(() => ndvStore.canDraggableDrop);
const draggableStickyPosition = computed(() => ndvStore.draggableStickyPos);

const toggleNodeExclusiveAndScrollTop = (id: string) => {
	const isClosed = closedNodes.value.has(id);
	if (isClosed) {
		closedNodes.value = new Set(items.value.map((item) => item.id));
	}
	toggleNode(id);
	scroller.value?.scrollToItem(0);
};

const getNodeSchema = async (fullNode: INodeUi, connectedNode: IConnectedNode) => {
	const pinData = workflowsStore.pinDataByNodeName(connectedNode.name);
	const hasPinnedData = pinData ? pinData.length > 0 : false;
	const isNodeExecuted = hasPinnedData || hasNodeExecuted(connectedNode.name);

	const connectedOutputIndexes = connectedNode.indicies.length > 0 ? connectedNode.indicies : [0];
	const connectedOutputsWithData = connectedOutputIndexes
		.map((outputIndex) => ({
			outputIndex,
			runIndex: getLastRunIndexWithData(fullNode.name, outputIndex, props.connectionType),
		}))
		.filter(({ runIndex }) => runIndex !== -1);

	// For connected nodes with multiple outputs that connect to the current node,
	// filter by outputIndex if it's specified and matches one of the connected outputs
	// This ensures we show the correct branch when viewing multi-output nodes like SplitInBatches
	let filteredOutputsWithData = connectedOutputsWithData;

	// Only apply outputIndex filtering if:
	// 1. outputIndex is specified
	// 2. The node has multiple connected outputs
	// 3. The specified outputIndex is one of the connected outputs
	if (
		props.outputIndex !== undefined &&
		connectedOutputIndexes.length > 1 &&
		connectedOutputIndexes.includes(props.outputIndex)
	) {
		filteredOutputsWithData = connectedOutputsWithData.filter(
			({ outputIndex }) => outputIndex === props.outputIndex,
		);
	}

	const nodeData = filteredOutputsWithData
		.map(({ outputIndex, runIndex }) =>
			getNodeInputData(fullNode, runIndex, outputIndex, props.paneType, props.connectionType),
		)
		.flat();
	const hasBinary = nodeData.some((data) => !isEmpty(data.binary));
	const data = pinData ?? executionDataToJson(nodeData);
	const isDataEmpty = data.length === 0;

	let schema = getSchemaForExecutionData(data);
	let preview = false;

	if (data.length === 0) {
		const previewSchema = await getSchemaPreview(fullNode);
		if (previewSchema.ok) {
			schema = getSchemaForJsonSchema(previewSchema.result);
			preview = true;
		}
	}

	return {
		schema,
		connectedOutputIndexes,
		itemsCount: data.length,
		runIndex: connectedOutputsWithData[0]?.runIndex ?? 0,
		preview,
		hasBinary,
		isNodeExecuted,
		isDataEmpty,
	};
};

const isVariablesEnabled = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Variables],
);

const contextSchema = computed(() => {
	const $vars = environmentsStore.variablesAsObject;

	const schemaSource: Record<string, unknown> = {
		$now: DateTime.now().toISO(),
		$today: DateTime.now().set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).toISO(),
		$vars,
		$execution: {
			id: PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
			mode: 'test',
			resumeUrl: i18n.baseText('dataMapping.schemaView.execution.resumeUrl'),
		},
		$workflow: pick(workflowsStore.workflow, ['id', 'name', 'active']),
	};

	return filterSchema(getSchema(schemaSource), props.search);
});

const contextItems = computed(() => {
	const header: RenderHeader = {
		id: 'variables',
		type: 'header',
		title: i18n.baseText('dataMapping.schemaView.variablesContextTitle'),
		collapsable: true,
		itemCount: null,
	};

	if (closedNodes.value.has(header.id)) return [header];

	const schema = contextSchema.value;

	if (!schema) {
		return [];
	}

	const flatSchema = flattenSchema({ schema, depth: 1, isDataEmpty: false });
	const fields: Renders[] = flatSchema.flatMap((renderItem) => {
		const isVars =
			renderItem.type === 'item' && renderItem.depth === 1 && renderItem.title === '$vars';

		if (isVars) {
			const isVarsOpen = !closedNodes.value.has(renderItem.id);

			if (!isVariablesEnabled.value) {
				renderItem.collapsable = false;
				renderItem.locked = true;
				renderItem.lockedTooltip = i18n.baseText('dataMapping.schemaView.variablesUpgrade');

				return renderItem;
			}

			if (isVarsOpen && environmentsStore.variables.length === 0) {
				const variablesEmptyNotice: RenderNotice = {
					type: 'notice',
					id: 'notice-variablesEmpty',
					level: renderItem.level ?? 0,
					message: i18n.baseText('dataMapping.schemaView.variablesEmpty'),
				};
				return [renderItem, variablesEmptyNotice];
			}
		}

		return renderItem;
	});

	return [header as Renders].concat(fields);
});

const nodeSchema = asyncComputed(async () => {
	const search = props.search;
	if (props.data.length === 0) {
		const previewSchema = await getSchemaPreview(props.node);
		if (previewSchema.ok) {
			return filterSchema(getSchemaForJsonSchema(previewSchema.result), search);
		}
	}

	return filterSchema(getSchemaForExecutionData(props.data), search);
}, null);

async function getSchemaPreview(node: INodeUi | null) {
	if (!node) return createResultError(new Error());
	const {
		type,
		typeVersion,
		parameters: { resource, operation },
	} = node;

	return await schemaPreviewStore.getSchemaPreview({
		nodeType: type,
		version: typeVersion,
		resource: resource as string,
		operation: operation as string,
	});
}

const nodesSchemas = asyncComputed<SchemaNode[]>(async () => {
	const result: SchemaNode[] = [];
	const search = props.search;

	for (const node of props.nodes) {
		const fullNode = workflowsStore.getNodeByName(node.name);
		if (!fullNode) continue;

		const nodeType = nodeTypesStore.getNodeType(fullNode.type, fullNode.typeVersion);
		if (!nodeType) continue;

		const {
			schema,
			connectedOutputIndexes,
			itemsCount,
			preview,
			hasBinary,
			isNodeExecuted,
			isDataEmpty,
			runIndex,
		} = await getNodeSchema(fullNode, node);

		const filteredSchema = filterSchema(schema, search);

		if (!filteredSchema) continue;

		result.push({
			node: fullNode,
			connectedOutputIndexes,
			depth: node.depth,
			itemsCount,
			nodeType,
			schema: filteredSchema,
			preview,
			hasBinary,
			isNodeExecuted,
			isDataEmpty,
			runIndex,
		});
	}

	return result;
}, []);

const nodeAdditionalInfo = (node: INodeUi) => {
	const returnData: string[] = [];
	if (node.disabled) {
		returnData.push(i18n.baseText('node.disabled'));
	}

	const connections = ndvStore.ndvNodeInputNumber[node.name];
	if (connections) {
		if (connections.length === 1) {
			returnData.push(`Input ${connections}`);
		} else {
			returnData.push(`Inputs ${connections.join(', ')}`);
		}
	}

	return returnData.length ? `(${returnData.join(' | ')})` : '';
};

const flattenedNodes = computed(() =>
	flattenMultipleSchemas(nodesSchemas.value, nodeAdditionalInfo),
);

const flattenNodeSchema = computed(() =>
	nodeSchema.value
		? flattenSchema({
				schema: nodeSchema.value,
				depth: 0,
				level: -1,
				isDataEmpty: props.data.length === 0,
			})
		: [],
);

/**
 * In debug mode nodes are empty
 */
const isDebugging = computed(() => !props.nodes.length);

const items = computed(() => {
	if (isDebugging.value || props.paneType === 'output') {
		return flattenNodeSchema.value;
	}

	return flattenedNodes.value.concat(contextItems.value);
});

const noSearchResults = computed(() => {
	return Boolean(props.search.trim()) && !items.value.length;
});

watch(
	() => Boolean(props.search),
	(hasSearch) => {
		if (hasSearch) {
			closedNodesBeforeSearch.value = new Set(closedNodes.value);
			closedNodes.value.clear();
		} else if (closedNodes.value.size === 0) {
			closedNodes.value = closedNodesBeforeSearch.value;
		}
	},
);

// Collapse all nodes except the first
const unwatchItems = watch(items, (newItems) => {
	if (newItems.length < 2) return;
	closedNodes.value = new Set(
		newItems
			.filter((item) => item.type === 'header')
			.slice(1)
			.map((item) => item.id),
	);
	unwatchItems();
});

const onDragStart = (el: HTMLElement, data?: string) => {
	ndvStore.draggableStartDragging({
		type: 'mapping',
		data: data ?? '',
		dimensions: el?.getBoundingClientRect() ?? null,
	});
	ndvStore.resetMappingTelemetry();
};

const onDragEnd = (el: HTMLElement) => {
	ndvStore.draggableStopDragging();
	setTimeout(() => {
		const mappingTelemetry = ndvStore.mappingTelemetry;
		const parentNode = nodesSchemas.value.find(({ node }) => node.name === el.dataset.nodeName);

		const isPreview = parentNode?.preview ?? false;
		const hasCredential = !isEmpty(parentNode?.node.credentials);
		const runIndex = Number(el.dataset.runIndex);

		const telemetryPayload = {
			src_node_type: el.dataset.nodeType,
			src_field_name: el.dataset.name ?? '',
			src_nodes_back: el.dataset.depth,
			src_run_index: runIndex,
			src_runs_total: runIndex,
			src_field_nest_level: el.dataset.level ?? 0,
			src_view: isPreview ? 'schema_preview' : 'schema',
			src_has_credential: hasCredential,
			src_element: el,
			success: false,
			view_shown: telemetryContext.view_shown,
			...mappingTelemetry,
		};

		void useExternalHooks().run('runDataJson.onDragEnd', telemetryPayload);

		telemetry.track('User dragged data for mapping', telemetryPayload);
	}, 250); // ensure dest data gets set if drop
};
</script>

<template>
	<div
		:class="[
			'run-data-schema',
			'full-height',
			{ compact: props.compact, 'no-search-results': noSearchResults },
		]"
	>
		<NDVEmptyState v-if="noSearchResults" :title="i18n.baseText('ndv.search.noNodeMatch.title')">
			<template #description>
				<I18nT keypath="ndv.search.noMatchSchema.description" tag="span" scope="global">
					<template #link>
						<a href="#" @click="emit('clear:search')">
							{{ i18n.baseText('ndv.search.noMatchSchema.description.link') }}
						</a>
					</template>
				</I18nT>
			</template>
		</NDVEmptyState>

		<Draggable
			v-if="items.length"
			class="full-height"
			type="mapping"
			target-data-key="mappable"
			:disabled="!mappingEnabled"
			:can-drop="canDraggableDrop"
			:sticky-position="draggableStickyPosition"
			@dragstart="onDragStart"
			@dragend="onDragEnd"
		>
			<template #preview="{ canDrop, el }">
				<MappingPill v-if="el" :html="el.outerHTML" :can-drop="canDrop" />
			</template>
			<DynamicScroller
				ref="scroller"
				:items="items"
				:min-item-size="38"
				class="full-height scroller"
			>
				<template #default="{ item, index, active }">
					<DynamicScrollerItem
						:item="item"
						:active="active"
						:size-dependencies="[item]"
						:data-index="index"
					>
						<VirtualSchemaHeader
							v-if="item.type === 'header'"
							v-bind="item"
							:collapsed="closedNodes.has(item.id)"
							@click:toggle="toggleNode(item.id)"
							@click="toggleNodeExclusiveAndScrollTop(item.id)"
						/>
						<VirtualSchemaItem
							v-else-if="item.type === 'item'"
							v-bind="item"
							:search="search"
							:draggable="mappingEnabled"
							:collapsed="closedNodes.has(item.id)"
							:highlight="ndvStore.highlightDraggables"
							@click="toggleNode(item.id)"
						>
						</VirtualSchemaItem>

						<N8nTooltip v-else-if="item.type === 'icon'" :content="item.tooltip" placement="top">
							<N8nIcon size="small" :icon="item.icon" class="icon" />
						</N8nTooltip>

						<div
							v-else-if="item.type === 'notice'"
							v-n8n-html="item.message"
							class="notice"
							:style="{ '--schema-level': item.level }"
						/>
						<div
							v-else-if="item.type === 'empty'"
							class="empty-schema"
							:style="{ '--schema-level': item.level }"
						>
							<N8nText tag="div" size="small">
								<I18nT
									v-if="item.key === 'executeSchema'"
									tag="span"
									keypath="dataMapping.schemaView.executeSchema"
									scope="global"
								>
									<template #link>
										<NodeExecuteButton
											v-if="ndvStore.activeNodeName"
											:node-name="ndvStore.activeNodeName"
											:label="i18n.baseText('ndv.input.noOutputData.executePrevious')"
											text
											telemetry-source="inputs"
											hide-icon
											size="small"
											:class="$style.executeButton"
										/>
									</template>
								</I18nT>
								<I18nT
									v-else
									tag="span"
									:keypath="`dataMapping.schemaView.${item.key}`"
									scope="global"
								/>
							</N8nText>
						</div>
					</DynamicScrollerItem>
				</template>
			</DynamicScroller>
		</Draggable>
	</div>
</template>

<style lang="css" module>
.executeButton {
	padding: 0;
}
</style>

<style lang="css" scoped>
.full-height {
	height: 100%;
}

.run-data-schema {
	padding: 0;

	&.no-search-results {
		display: flex;
		justify-content: center;
		padding: var(--spacing-l) 0;
	}
}

.scroller {
	padding: 0 var(--ndv-spacing);
	padding-bottom: var(--spacing-2xl);

	.compact & {
		padding: 0 var(--spacing-2xs);
	}
}

.icon {
	display: inline-flex;
	margin-left: var(--spacing-xl);
	color: var(--color-text-light);
	margin-bottom: var(--ndv-spacing);
}

.notice {
	padding-bottom: var(--spacing-xs);
	color: var(--color-text-base);
	font-size: var(--font-size-2xs);
	line-height: var(--font-line-height-loose);
	margin-left: calc(var(--spacing-l) * var(--schema-level));
}

.empty-schema {
	padding-bottom: var(--spacing-xs);
	margin-left: calc((var(--spacing-xl) * var(--schema-level)));
}
</style>
