<script lang="ts" setup>
import { computed, watch, ref } from 'vue';
import type { INodeUi } from '@/Interface';
import VirtualSchemaItem from '@/components/VirtualSchemaItem.vue';
import VirtualSchemaHeader from '@/components/VirtualSchemaHeader.vue';
import { N8nText } from '@n8n/design-system';
import Draggable from '@/components/Draggable.vue';
import { useNDVStore } from '@/stores/ndv.store';
import { useTelemetry } from '@/composables/useTelemetry';
import {
	createResultError,
	NodeConnectionType,
	type IConnectedNode,
	type IDataObject,
} from 'n8n-workflow';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useI18n } from '@/composables/useI18n';
import MappingPill from './MappingPill.vue';
import { useDataSchema, useFlattenSchema, type SchemaNode } from '@/composables/useDataSchema';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { executionDataToJson } from '@/utils/nodeTypesUtils';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import {
	DynamicScroller,
	DynamicScrollerItem,
	type RecycleScrollerInstance,
} from 'vue-virtual-scroller';

import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import { useSchemaPreviewStore } from '@/stores/schemaPreview.store';
import { asyncComputed } from '@vueuse/core';
import { usePostHog } from '@/stores/posthog.store';
import { SCHEMA_PREVIEW_EXPERIMENT } from '@/constants';
import { isEmpty } from '@/utils/typesUtils';

type Props = {
	nodes?: IConnectedNode[];
	node?: INodeUi | null;
	data?: IDataObject[];
	mappingEnabled?: boolean;
	runIndex?: number;
	outputIndex?: number;
	totalRuns?: number;
	paneType: 'input' | 'output';
	connectionType?: NodeConnectionType;
	search?: string;
};

const props = withDefaults(defineProps<Props>(), {
	nodes: () => [],
	distanceFromActive: 1,
	node: null,
	data: () => [],
	runIndex: 0,
	outputIndex: 0,
	totalRuns: 1,
	connectionType: NodeConnectionType.Main,
	search: '',
	mappingEnabled: false,
});

const telemetry = useTelemetry();
const i18n = useI18n();
const ndvStore = useNDVStore();
const nodeTypesStore = useNodeTypesStore();
const workflowsStore = useWorkflowsStore();
const schemaPreviewStore = useSchemaPreviewStore();
const posthogStore = usePostHog();
const { getSchemaForExecutionData, getSchemaForJsonSchema, filterSchema } = useDataSchema();
const { closedNodes, flattenSchema, flattenMultipleSchemas, toggleLeaf, toggleNode } =
	useFlattenSchema();
const { getNodeInputData } = useNodeHelpers();

const emit = defineEmits<{
	'clear:search': [];
}>();

const scroller = ref<RecycleScrollerInstance>();

const toggleNodeAndScrollTop = (id: string) => {
	toggleNode(id);
	scroller.value?.scrollToItem(0);
};

watch(
	() => props.search,
	(newSearch) => {
		if (!newSearch) return;
		closedNodes.value.clear();
	},
);

const getNodeSchema = async (fullNode: INodeUi, connectedNode: IConnectedNode) => {
	const pinData = workflowsStore.pinDataByNodeName(connectedNode.name);
	const connectedOutputIndexes = connectedNode.indicies.length > 0 ? connectedNode.indicies : [0];
	const data =
		pinData ??
		connectedOutputIndexes
			.map((outputIndex) =>
				executionDataToJson(
					getNodeInputData(
						fullNode,
						props.runIndex,
						outputIndex,
						props.paneType,
						props.connectionType,
					),
				),
			)
			.flat();

	let schema = getSchemaForExecutionData(data);
	let preview = false;

	if (data.length === 0 && isSchemaPreviewEnabled.value) {
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
		preview,
	};
};

const isSchemaPreviewEnabled = computed(() =>
	posthogStore.isVariantEnabled(SCHEMA_PREVIEW_EXPERIMENT.name, SCHEMA_PREVIEW_EXPERIMENT.variant),
);

const nodeSchema = asyncComputed(async () => {
	const search = props.search;
	if (props.data.length === 0 && isSchemaPreviewEnabled.value) {
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

		const { schema, connectedOutputIndexes, itemsCount, preview } = await getNodeSchema(
			fullNode,
			node,
		);

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
	nodeSchema.value ? flattenSchema({ schema: nodeSchema.value, depth: 0, level: -1 }) : [],
);

/**
 * In debug mode nodes are empty
 */
const isDebugging = computed(() => !props.nodes.length);

const items = computed(() => {
	if (isDebugging.value || props.paneType === 'output') {
		return flattenNodeSchema.value;
	}

	return flattenedNodes.value;
});

const noSearchResults = computed(() => {
	return Boolean(props.search.trim()) && !Boolean(items.value.length);
});

const onDragStart = () => {
	ndvStore.resetMappingTelemetry();
};

const onDragEnd = (el: HTMLElement) => {
	setTimeout(() => {
		const mappingTelemetry = ndvStore.mappingTelemetry;
		const parentNode = nodesSchemas.value.find(({ node }) => node.name === el.dataset.nodeName);

		const isPreview = parentNode?.preview ?? false;
		const hasCredential = !isEmpty(parentNode?.node.credentials);

		const telemetryPayload = {
			src_node_type: el.dataset.nodeType,
			src_field_name: el.dataset.name ?? '',
			src_nodes_back: el.dataset.depth,
			src_run_index: props.runIndex,
			src_runs_total: props.totalRuns,
			src_field_nest_level: el.dataset.level ?? 0,
			src_view: isPreview ? 'schema_preview' : 'schema',
			src_has_credential: hasCredential,
			src_element: el,
			success: false,
			...mappingTelemetry,
		};

		void useExternalHooks().run('runDataJson.onDragEnd', telemetryPayload);

		telemetry.track('User dragged data for mapping', telemetryPayload, { withPostHog: true });
	}, 250); // ensure dest data gets set if drop
};
</script>

<template>
	<div class="run-data-schema full-height">
		<div v-if="noSearchResults" class="no-results">
			<N8nText tag="h3" size="large">{{ i18n.baseText('ndv.search.noNodeMatch.title') }}</N8nText>
			<N8nText>
				<i18n-t keypath="ndv.search.noMatchSchema.description" tag="span">
					<template #link>
						<a href="#" @click="emit('clear:search')">
							{{ i18n.baseText('ndv.search.noMatchSchema.description.link') }}
						</a>
					</template>
				</i18n-t>
			</N8nText>
		</div>

		<Draggable
			v-if="items.length"
			class="full-height"
			type="mapping"
			target-data-key="mappable"
			:disabled="!mappingEnabled"
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
							@click:toggle="toggleLeaf(item.id)"
							@click="toggleNodeAndScrollTop(item.id)"
						/>
						<VirtualSchemaItem
							v-else-if="item.type === 'item'"
							v-bind="item"
							:search="search"
							:draggable="mappingEnabled"
							:collapsed="closedNodes.has(item.id)"
							:highlight="ndvStore.highlightDraggables"
							@click="toggleLeaf(item.id)"
						>
						</VirtualSchemaItem>

						<N8nTooltip v-else-if="item.type === 'icon'" :content="item.tooltip" placement="top">
							<N8nIcon :size="14" :icon="item.icon" class="icon" />
						</N8nTooltip>
					</DynamicScrollerItem>
				</template>
			</DynamicScroller>
		</Draggable>
	</div>
</template>

<style lang="css" scoped>
.full-height {
	height: 100%;
}

.run-data-schema {
	padding: 0;
}

.scroller {
	padding: 0 var(--spacing-s);
	padding-bottom: var(--spacing-2xl);
}

.no-results {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
	height: 100%;
	gap: var(--spacing-2xs);
	padding: var(--spacing-s) var(--spacing-s) var(--spacing-xl) var(--spacing-s);
}

.icon {
	display: inline-flex;
	margin-left: var(--spacing-xl);
	color: var(--color-text-light);
	margin-bottom: var(--spacing-s);
}
</style>
