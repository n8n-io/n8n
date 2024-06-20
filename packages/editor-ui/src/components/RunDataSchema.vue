<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { snakeCase } from 'lodash-es';
import type { INodeUi, Schema } from '@/Interface';
import RunDataSchemaItem from '@/components/RunDataSchemaItem.vue';
import NodeIcon from '@/components/NodeIcon.vue';
import Draggable from '@/components/Draggable.vue';
import { useNDVStore } from '@/stores/ndv.store';
import { telemetry } from '@/plugins/telemetry';
import type {
	ConnectionTypes,
	IConnectedNode,
	IDataObject,
	INodeTypeDescription,
} from 'n8n-workflow';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { i18n } from '@/plugins/i18n';
import MappingPill from './MappingPill.vue';
import { useDataSchema } from '@/composables/useDataSchema';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { executionDataToJson } from '@/utils/nodeTypesUtils';
import { useNodeHelpers } from '@/composables/useNodeHelpers';

type Props = {
	nodes?: IConnectedNode[];
	node?: INodeUi | null;
	data?: IDataObject[];
	mappingEnabled: boolean;
	runIndex: number;
	outputIndex: number;
	totalRuns: number;
	paneType: 'input' | 'output';
	connectionType: ConnectionTypes;
	search: string;
};

type SchemaNode = {
	node: INodeUi;
	nodeType: INodeTypeDescription;
	depth: number;
	loading: boolean;
	open: boolean;
	itemsCount: number | null;
	schema: Schema | null;
};

const props = withDefaults(defineProps<Props>(), {
	nodes: () => [],
	distanceFromActive: 1,
	node: null,
	data: undefined,
});

const draggingPath = ref<string>('');
const nodesOpen = ref<Partial<Record<string, boolean>>>({});
const nodesData = ref<Partial<Record<string, { schema: Schema; itemsCount: number }>>>({});
const nodesLoading = ref<Partial<Record<string, boolean>>>({});

const ndvStore = useNDVStore();
const nodeTypesStore = useNodeTypesStore();
const workflowsStore = useWorkflowsStore();
const { getSchemaForExecutionData, filterSchema } = useDataSchema();
const { getNodeInputData } = useNodeHelpers();

const nodeSchema = computed(() => getSchemaForExecutionData(props.data ?? []));
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

const isDataEmpty = (schema: Schema | null) => {
	if (!schema) return true;
	// Utilize the generated schema instead of looping over the entire data again
	// The schema for empty data is { type: 'object' | 'array', value: [] }
	const isObjectOrArray = schema.type === 'object' || schema.type === 'array';
	const isEmpty = Array.isArray(schema.value) && schema.value.length === 0;

	return isObjectOrArray && isEmpty;
};

const highlight = computed(() => ndvStore.highlightDraggables);
const allNodesOpen = computed(() => nodes.value.every((node) => node.open));
const noNodesOpen = computed(() => nodes.value.every((node) => !node.open));

const loadNodeData = async (node: INodeUi) => {
	const pinData = workflowsStore.pinDataByNodeName(node.name);
	const data =
		pinData ??
		executionDataToJson(getNodeInputData(node, 0, 0, props.paneType, props.connectionType) ?? []);

	nodesData.value[node.name] = {
		schema: getSchemaForExecutionData(data),
		itemsCount: data.length,
	};
};

const toggleOpenNode = async ({ node, schema, open }: SchemaNode) => {
	if (open) {
		nodesOpen.value[node.name] = false;
		return;
	}

	if (!schema) {
		nodesLoading.value[node.name] = true;
		await loadNodeData(node);
		nodesLoading.value[node.name] = false;
	}

	nodesOpen.value[node.name] = true;
};

const openAllNodes = async () => {
	const nodesToLoad = nodes.value.filter((node) => !node.schema).map(({ node }) => node);
	await Promise.all(nodesToLoad.map(async (node) => await loadNodeData(node)));
	nodesOpen.value = Object.fromEntries(nodes.value.map(({ node }) => [node.name, true]));
};

const onDragStart = (el: HTMLElement) => {
	if (el?.dataset?.path) {
		draggingPath.value = el.dataset.path;
	}

	ndvStore.resetMappingTelemetry();
};

const onDragEnd = (el: HTMLElement, node: INodeUi, depth: number) => {
	draggingPath.value = '';

	setTimeout(() => {
		const mappingTelemetry = ndvStore.mappingTelemetry;
		const telemetryPayload = {
			src_node_type: node.type,
			src_field_name: el.dataset.name ?? '',
			src_nodes_back: depth,
			src_run_index: props.runIndex,
			src_runs_total: props.totalRuns,
			src_field_nest_level: el.dataset.depth ?? 0,
			src_view: 'schema',
			src_element: el,
			success: false,
			...mappingTelemetry,
		};

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
		if (!prevSearch.trim() && search.trim() && !allNodesOpen.value) {
			void openAllNodes();
		}
	},
);
</script>

<template>
	<div v-if="paneType === 'input'" :class="[$style.schemaWrapper, { highlightSchema: highlight }]">
		<div
			v-for="currentNode in nodes"
			:key="currentNode.node.id"
			data-test-id="run-data-schema-node"
			:class="[$style.node, { [$style.open]: currentNode.open }]"
		>
			<div
				:class="[
					$style.header,
					{
						[$style.trigger]: currentNode.nodeType.group.includes('trigger'),
					},
				]"
				data-test-id="run-data-schema-node-header"
				@click="toggleOpenNode(currentNode)"
			>
				<font-awesome-icon :class="$style.expand" icon="angle-right" />
				<div :class="$style.nodeIcon">
					<NodeIcon :node-type="currentNode.nodeType" :size="12" />
				</div>

				<div :class="$style.title">
					{{ currentNode.node.name }}
				</div>
				<font-awesome-icon
					v-if="currentNode.nodeType.group.includes('trigger')"
					:class="$style.triggerIcon"
					icon="bolt"
					size="xs"
				/>
				<Transition name="items">
					<div v-if="currentNode.itemsCount && currentNode.open" :class="$style.items">
						{{
							i18n.baseText('ndv.output.items', {
								interpolate: { count: currentNode.itemsCount },
							})
						}}
					</div>
				</Transition>
				<div :class="$style.depth">
					{{
						i18n.baseText('ndv.input.nodeDistance', { interpolate: { count: currentNode.depth } })
					}}
				</div>
			</div>

			<Draggable
				type="mapping"
				target-data-key="mappable"
				:disabled="!mappingEnabled"
				@dragstart="onDragStart"
				@dragend="(el: HTMLElement) => onDragEnd(el, currentNode.node, currentNode.depth)"
			>
				<template #preview="{ canDrop, el }">
					<MappingPill v-if="el" :html="el.outerHTML" :can-drop="canDrop" />
				</template>
				<Transition name="schema">
					<div
						v-if="currentNode.schema || search"
						:class="[$style.schema, $style.animated]"
						data-test-id="run-data-schema-node-schema"
					>
						<div :class="$style.innerSchema">
							<n8n-info-tip v-if="isDataEmpty(currentNode.schema) && search" :class="$style.tip">
								{{ i18n.baseText('dataMapping.schemaView.noMatches', { interpolate: { search } }) }}
							</n8n-info-tip>

							<n8n-info-tip
								v-else-if="isDataEmpty(currentNode.schema)"
								:class="$style.tip"
								data-test-id="run-data-schema-empty"
							>
								{{ i18n.baseText('dataMapping.schemaView.emptyData') }}
							</n8n-info-tip>

							<RunDataSchemaItem
								v-else-if="currentNode.schema"
								:schema="currentNode.schema"
								:level="0"
								:parent="null"
								:pane-type="paneType"
								:sub-key="snakeCase(currentNode.node.name)"
								:mapping-enabled="mappingEnabled"
								:dragging-path="draggingPath"
								:distance-from-active="currentNode.depth"
								:node="currentNode.node"
								:search="search"
							/>
						</div>
					</div>
				</Transition>
			</Draggable>
		</div>
	</div>
	<div v-else :class="[$style.schemaWrapper, { highlightSchema: highlight }]">
		<div :class="$style.schema" data-test-id="run-data-schema-node-schema">
			<n8n-info-tip v-if="isDataEmpty(nodeSchema) && search" :class="$style.tip">
				{{ i18n.baseText('dataMapping.schemaView.noMatches', { interpolate: { search } }) }}
			</n8n-info-tip>

			<n8n-info-tip
				v-else-if="isDataEmpty(nodeSchema)"
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
				:sub-key="`output_${nodeSchema.type}-0-0`"
				:mapping-enabled="mappingEnabled"
				:dragging-path="draggingPath"
				:node="node"
				:search="search"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
@import '@/styles/variables';

.schemaWrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-4xs);
	padding: 0 0 var(--spacing-s) var(--spacing-s);
	container: schema / inline-size;

	&.animating {
		overflow: hidden;
		height: 100%;
	}
}

.node .schema {
	padding-left: var(--spacing-xl);
}

.schema {
	display: grid;
	grid-template-rows: 1fr;
	overflow: hidden;

	&.animated {
		grid-template-rows: 0fr;
		transform: translateX(-8px);
		opacity: 0;

		transition:
			grid-template-rows 0.3s $ease-out-expo 0.1s,
			opacity 0.3s $ease-out-expo 0s,
			transform 0.3s $ease-out-expo 0s;
	}
}

.innerSchema {
	min-height: 0;

	> div {
		margin-bottom: var(--spacing-s);
	}
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
	position: sticky;
	top: 0;
	z-index: 1;
	padding: var(--spacing-4xs) 0;
	padding-left: var(--spacing-4xs);
	padding-right: var(--spacing-s);
	background: var(--color-run-data-background);
	cursor: pointer;

	&:hover,
	&:active {
		.title {
			color: var(--color-primary);
		}
	}
}

.expand {
	transition: transform 0.3s $ease-out-expo;
}

.open {
	.expand {
		transform: rotate(90deg);
	}

	.schema {
		transition:
			grid-template-rows 0.3s $ease-out-expo 0s,
			opacity 0.3s $ease-out-expo 0.1s,
			transform 0.3s $ease-out-expo 0.1s;
		grid-template-rows: 1fr;
		opacity: 1;
		transform: translateX(0);
	}
}

.nodeIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing-2xs);
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	background-color: var(--color-background-light);
}

.title {
	font-size: var(--font-size-xs);
	color: var(--color-text-dark);
}

.tip {
	padding-left: var(--spacing-l);
}

.items,
.depth {
	flex-shrink: 0;
	font-size: var(--font-size-xs);
	color: var(--color-text-light);

	transition:
		opacity 0.3s $ease-out-expo,
		transform 0.3s $ease-out-expo;
}

.depth {
	margin-left: auto;
}

.triggerIcon {
	color: var(--color-primary);
}

.trigger {
	.nodeIcon {
		border-radius: 16px 4px 4px 16px;
	}
}

@container schema (max-width: 24em) {
	.depth {
		display: none;
	}
}
</style>

<style lang="scss" scoped>
@import '@/styles/variables';

.items-enter-from,
.items-leave-to {
	transform: translateX(-4px);
	opacity: 0;
}

.items-enter-to,
.items-leave-from {
	transform: translateX(0);
	opacity: 1;
}

.schema-enter-from,
.schema-leave-to {
	grid-template-rows: 0fr;
	transform: translateX(-8px);
	opacity: 0;
}

.schema-enter-to,
.schema-leave-from {
	transform: translateX(0);
	grid-template-rows: 1fr;
	opacity: 1;
}
</style>
