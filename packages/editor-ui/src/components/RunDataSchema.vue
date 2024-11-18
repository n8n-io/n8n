<script lang="ts" setup>
import type { INodeUi, Schema } from '@/Interface';
import RunDataSchemaItem from '@/components/RunDataSchemaItem.vue';
import { useDataSchema } from '@/composables/useDataSchema';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useTelemetry } from '@/composables/useTelemetry';
import { resolveParameter } from '@/composables/useWorkflowHelpers';
import { i18n } from '@/plugins/i18n';
import useEnvironmentsStore from '@/stores/environments.ee.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { escapeMappingString, generatePath } from '@/utils/mappingUtils';
import { executionDataToJson } from '@/utils/nodeTypesUtils';
import {
	type ITelemetryTrackProperties,
	NodeConnectionType,
	type IConnectedNode,
	type IDataObject,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { computed, ref, watch } from 'vue';

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

type SchemaNode = {
	node: INodeUi;
	subtitle: string;
	baseExpression: string;
	nodeType: INodeTypeDescription;
	depth: number;
	loading: boolean;
	open: boolean;
	connectedOutputIndexes: number[];
	itemsCount: number | null;
	schema: Schema | null;
};

const props = withDefaults(defineProps<Props>(), {
	nodes: () => [],
	distanceFromActive: 1,
	node: null,
	data: undefined,
	runIndex: 0,
	outputIndex: 0,
	totalRuns: 1,
	connectionType: NodeConnectionType.Main,
	search: '',
	mappingEnabled: false,
	context: 'ndv',
});

const nodesOpen = ref<Partial<Record<string, boolean>>>({});
const nodesData = ref<Partial<Record<string, { schema: Schema; itemsCount: number }>>>({});
const nodesLoading = ref<Partial<Record<string, boolean>>>({});
const disableScrollInView = ref(false);

const ndvStore = useNDVStore();
const nodeTypesStore = useNodeTypesStore();
const workflowsStore = useWorkflowsStore();
const settingsStore = useSettingsStore();
const environmentsStore = useEnvironmentsStore();

const { getSchemaForExecutionData, getSchema, filterSchema, isSchemaEmpty } = useDataSchema();
const { getNodeInputData } = useNodeHelpers();
const telemetry = useTelemetry();

const emit = defineEmits<{
	'clear:search': [];
}>();

const nodeSchema = computed(() =>
	filterSchema(getSchemaForExecutionData(props.data ?? []), props.search),
);
const nodes = computed(() => {
	return props.nodes
		.map((node) => {
			const fullNode = workflowsStore.getNodeByName(node.name);

			if (!fullNode) return null;

			const nodeType = nodeTypesStore.getNodeType(fullNode.type, fullNode.typeVersion);
			const { itemsCount, schema } = nodesData.value[node.name] ?? {
				itemsCount: null,
				schema: null,
			};

			return {
				node: fullNode,
				subtitle: nodeAdditionalInfo(fullNode),
				baseExpression:
					node.depth === 1
						? '$json'
						: generatePath(`$('${escapeMappingString(node.name)}')`, ['item', 'json']),
				connectedOutputIndexes: node.indicies.length > 0 ? node.indicies : [0],
				depth: node.depth,
				itemsCount,
				nodeType,
				schema: schema ? filterSchema(schema, props.search) : null,
				loading: nodesLoading.value[node.name],
				open: nodesOpen.value[node.name],
			};
		})
		.filter((node): node is SchemaNode => !!(node?.node && node.nodeType));
});

const filteredNodes = computed(() =>
	nodes.value.filter((node) => !props.search || !isSchemaEmpty(node.schema)),
);

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

const highlight = computed(() => ndvStore.highlightDraggables);
const allNodesOpen = computed(() => nodes.value.every((node) => node.open));
const noNodesOpen = computed(() => nodes.value.every((node) => !node.open));
const variablesSchema = computed<Schema>(() => {
	const schema = getSchema({
		$now: resolveParameter('={{$now.toISO()}}'),
		$today: resolveParameter('={{$today.toISO()}}'),
		$vars: environmentsStore.variablesAsObject,
		$execution: resolveParameter('={{$execution}}'),
		$workflow: resolveParameter('={{$workflow}}'),
	});

	return schema;
});

const loadNodeData = async ({ node, connectedOutputIndexes }: SchemaNode) => {
	const pinData = workflowsStore.pinDataByNodeName(node.name);
	const data =
		pinData ??
		connectedOutputIndexes
			.map((outputIndex) =>
				executionDataToJson(
					getNodeInputData(node, props.runIndex, outputIndex, props.paneType, props.connectionType),
				),
			)
			.flat();

	nodesData.value[node.name] = {
		schema: getSchemaForExecutionData(data),
		itemsCount: data.length,
	};
};

const toggleOpenNode = async (schemaNode: SchemaNode, exclusive = false) => {
	const { node, schema, open } = schemaNode;
	disableScrollInView.value = false;
	if (open) {
		nodesOpen.value[node.name] = false;
		return;
	}

	if (!schema) {
		nodesLoading.value[node.name] = true;
		await loadNodeData(schemaNode);
		nodesLoading.value[node.name] = false;
	}

	if (exclusive) {
		nodesOpen.value = { [node.name]: true };
	} else {
		nodesOpen.value[node.name] = true;
	}
};

const openAllNodes = async () => {
	const nodesToLoad = nodes.value.filter((node) => !node.schema);
	await Promise.all(nodesToLoad.map(loadNodeData));
	nodesOpen.value = Object.fromEntries(nodes.value.map(({ node }) => [node.name, true]));
};

const onDragStart = () => {
	ndvStore.resetMappingTelemetry();
};

const onDragEnd = (el: HTMLElement, node?: SchemaNode) => {
	setTimeout(() => {
		const mappingTelemetry = ndvStore.mappingTelemetry;
		const telemetryPayload: ITelemetryTrackProperties = {
			src_field_name: el.dataset.name ?? '',
			src_run_index: props.runIndex,
			src_runs_total: props.totalRuns,
			src_field_nest_level: el.dataset.depth ?? 0,
			src_view: 'schema',
			src_element: el,
			success: false,
			...mappingTelemetry,
		};

		if (node) {
			telemetryPayload.src_node_type = node.node.type;
			telemetryPayload.src_nodes_back = node.depth;
		}

		void useExternalHooks().run('runDataJson.onDragEnd', telemetryPayload);

		telemetry.track('User dragged data for mapping', telemetryPayload, { withPostHog: true });
	}, 1000); // ensure dest data gets set if drop
};

watch(
	() => props.nodes,
	() => {
		if (noNodesOpen.value && nodes.value.length > 0) {
			void toggleOpenNode(nodes.value[0]);
		}
	},
	{ immediate: true },
);

watch(
	() => props.search,
	(search, prevSearch) => {
		if (!prevSearch?.trim() && search.trim() && !allNodesOpen.value) {
			disableScrollInView.value = true;
			void openAllNodes();
		}

		if (prevSearch?.trim() && !search.trim() && allNodesOpen.value && nodes.value.length > 0) {
			nodesOpen.value = { [nodes.value[0].node.name]: true };
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div
		v-if="paneType === 'input' && nodes.length > 0"
		:class="[$style.schemaWrapper, { highlightSchema: highlight }]"
	>
		<div v-if="search && nodes.length > 0 && filteredNodes.length === 0" :class="$style.noMatch">
			<n8n-text tag="h3" size="large">{{
				$locale.baseText('ndv.search.noNodeMatch.title')
			}}</n8n-text>
			<n8n-text>
				<i18n-t keypath="ndv.search.noMatch.description" tag="span">
					<template #link>
						<a href="#" @click="emit('clear:search')">
							{{ $locale.baseText('ndv.search.noMatch.description.link') }}
						</a>
					</template>
				</i18n-t>
			</n8n-text>
		</div>

		<RunDataSchemaNode
			v-for="currentNode in filteredNodes"
			:key="currentNode.node.id"
			:schema="currentNode.schema"
			:title="currentNode.node.name"
			:subtitle="currentNode.subtitle"
			:items-count="currentNode.itemsCount"
			:base-expression="currentNode.baseExpression"
			:mapping-enabled="mappingEnabled"
			:open="currentNode.open"
			:context="context"
			:search="search"
			:disabled="currentNode.node.disabled"
			:is-trigger="currentNode.nodeType.group.includes('trigger')"
			:disable-scroll-in-view="disableScrollInView"
			@drag-start="onDragStart"
			@drag-end="(el) => onDragEnd(el, currentNode)"
			@toggle-open="(exclusive) => toggleOpenNode(currentNode, exclusive)"
		>
			<template #icon>
				<NodeIcon :node-type="currentNode.nodeType" :size="12" />
			</template>
		</RunDataSchemaNode>

		<RunDataSchemaNode
			v-if="filteredNodes.length > 0 && !search"
			:schema="variablesSchema"
			:title="i18n.baseText('dataMapping.schemaView.variables')"
			:mapping-enabled="mappingEnabled"
			:context="context"
			:search="search"
			:disable-scroll-in-view="disableScrollInView"
			@drag-start="onDragStart"
			@drag-end="onDragEnd"
		>
		</RunDataSchemaNode>
	</div>

	<div v-else :class="[$style.schemaWrapper, { highlightSchema: highlight }]">
		<div v-if="isSchemaEmpty(nodeSchema) && search" :class="$style.noMatch">
			<n8n-text tag="h3" size="large">{{
				$locale.baseText('ndv.search.noNodeMatch.title')
			}}</n8n-text>
			<n8n-text>
				<i18n-t keypath="ndv.search.noMatch.description" tag="span">
					<template #link>
						<a href="#" @click="emit('clear:search')">
							{{ $locale.baseText('ndv.search.noMatch.description.link') }}
						</a>
					</template>
				</i18n-t>
			</n8n-text>
			<n8n-text>{{ $locale.baseText('ndv.search.noMatchSchema.description') }}</n8n-text>
		</div>

		<div v-else :class="$style.schema" data-test-id="run-data-schema-node-schema">
			<n8n-info-tip
				v-if="isSchemaEmpty(nodeSchema)"
				:class="$style.tip"
				data-test-id="run-data-schema-empty"
			>
				{{ i18n.baseText('dataMapping.schemaView.emptyData') }}
			</n8n-info-tip>

			<RunDataSchemaItem
				v-else-if="nodeSchema"
				:schema="nodeSchema"
				:level="0"
				:parent="null"
				:pane-type="paneType"
				:sub-key="`${props.context}_output_${nodeSchema.type}-0-0`"
				:mapping-enabled="mappingEnabled"
				:node="node"
				:search="search"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.schemaWrapper {
	--header-height: 38px;
	--title-spacing-left: 38px;
	display: flex;
	flex-direction: column;
	container: schema / inline-size;

	&.animating {
		overflow: hidden;
		height: 100%;
	}
}
</style>
