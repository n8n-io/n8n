<script lang="ts" setup>
import { computed } from 'vue';
import type { INodeUi } from '@/Interface';
import RunDataSchemaItem from '@/components/RunDataSchemaItem.vue';
import RunDataSchemaHeader from '@/components/RunDataSchemaHeader.vue';
import { N8nText } from 'n8n-design-system';
import Draggable from '@/components/Draggable.vue';
import { useNDVStore } from '@/stores/ndv.store';
import { telemetry } from '@/plugins/telemetry';
import { NodeConnectionType, type IConnectedNode, type IDataObject } from 'n8n-workflow';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { i18n } from '@/plugins/i18n';
import MappingPill from './MappingPill.vue';
import { useDataSchema, useFlattenSchema, type SchemaNode } from '@/composables/useDataSchema';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { executionDataToJson } from '@/utils/nodeTypesUtils';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

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
	context?: 'ndv' | 'modal';
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
	context: 'ndv',
});

const ndvStore = useNDVStore();
const nodeTypesStore = useNodeTypesStore();
const workflowsStore = useWorkflowsStore();
const { getSchemaForExecutionData, filterSchema } = useDataSchema();
const { closedNodes, flattSchema, flattMultipleSchema, toggleNode } = useFlattenSchema();
const { getNodeInputData } = useNodeHelpers();

const emit = defineEmits<{
	'clear:search': [];
}>();

const getNodeSchema = (fullNode: INodeUi, connectedNode: IConnectedNode) => {
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

	return {
		schema: getSchemaForExecutionData(data),
		connectedOutputIndexes,
		itemsCount: data.length,
	};
};

const nodeSchema = computed(() =>
	filterSchema(getSchemaForExecutionData(props.data), props.search),
);

const nodesSchemas = computed<SchemaNode[]>(() => {
	return props.nodes.reduce<SchemaNode[]>((acc, node) => {
		const fullNode = workflowsStore.getNodeByName(node.name);
		if (!fullNode) return acc;

		const nodeType = nodeTypesStore.getNodeType(fullNode.type, fullNode.typeVersion);
		if (!nodeType) return acc;

		const { schema, connectedOutputIndexes, itemsCount } = getNodeSchema(fullNode, node);

		const filteredSchema = filterSchema(schema, props.search);

		if (!filteredSchema) return acc;

		acc.push({
			node: fullNode,
			connectedOutputIndexes,
			depth: node.depth,
			itemsCount,
			nodeType,
			schema: filteredSchema,
		});
		return acc;
	}, []);
});

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

const flattenedNodes = computed(() => flattMultipleSchema(nodesSchemas.value, nodeAdditionalInfo));

const flattenNodeSchema = computed(() =>
	nodeSchema.value ? flattSchema({ schema: nodeSchema.value, depth: 0, level: -1 }) : [],
);

const items = computed(() =>
	props.paneType === 'input' ? flattenedNodes.value : flattenNodeSchema.value,
);

const noSearchResults = computed(() => {
	return Boolean(props.search.trim()) && !Boolean(items.value.length);
});

const onDragStart = () => {
	ndvStore.resetMappingTelemetry();
};

const onDragEnd = (el: HTMLElement) => {
	setTimeout(() => {
		const mappingTelemetry = ndvStore.mappingTelemetry;
		const telemetryPayload = {
			src_node_type: el.dataset.nodeType,
			src_field_name: el.dataset.name ?? '',
			src_nodes_back: el.dataset.depth,
			src_run_index: props.runIndex,
			src_runs_total: props.totalRuns,
			src_field_nest_level: el.dataset.level ?? 0,
			src_view: 'schema',
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
			<N8nText tag="h3" size="large">{{
				$locale.baseText('ndv.search.noNodeMatch.title')
			}}</N8nText>
			<N8nText>
				<i18n-t keypath="ndv.search.noMatch.description" tag="span">
					<template #link>
						<a href="#" @click="emit('clear:search')">
							{{ $locale.baseText('ndv.search.noMatch.description.link') }}
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

			<DynamicScroller :items="items" :min-item-size="38" class="full-height scroller">
				<template #default="{ item, index, active }">
					<RunDataSchemaHeader
						v-if="item.type === 'header'"
						v-bind="item"
						:collapsed="closedNodes.has(item.id)"
						@click="toggleNode(item.id)"
					/>
					<DynamicScrollerItem
						v-else
						:item="item"
						:active="active"
						:size-dependencies="[item.value]"
						:data-index="index"
					>
						<RunDataSchemaItem
							v-bind="item"
							:search="search"
							:draggable="mappingEnabled"
							:collapsed="closedNodes.has(item.id)"
							:highlight="ndvStore.highlightDraggables"
							@click="toggleNode(item.id)"
						>
						</RunDataSchemaItem>
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
}

.no-results {
	text-align: center;
	padding: var(--spacing-s) var(--spacing-s) var(--spacing-xl) var(--spacing-s);
}
</style>
