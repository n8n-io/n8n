<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { snakeCase } from 'lodash-es';
import type { INodeUi, Schema } from '@/Interface';
import RunDataSchemaItem from '@/components/RunDataSchemaItem.vue';
import NodeIcon from '@/components/NodeIcon.vue';
import Draggable from '@/components/Draggable.vue';
import { useNDVStore } from '@/stores/ndv.store';
import { telemetry } from '@/plugins/telemetry';
import {
	NodeConnectionType,
	type IConnectedNode,
	type IDataObject,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { i18n } from '@/plugins/i18n';
import MappingPill from './MappingPill.vue';
import { useDataSchema } from '@/composables/useDataSchema';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { executionDataToJson } from '@/utils/nodeTypesUtils';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useDebounce } from '@/composables/useDebounce';

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

const draggingPath = ref<string>('');
const nodesOpen = ref<Partial<Record<string, boolean>>>({});
const nodesData = ref<Partial<Record<string, { schema: Schema; itemsCount: number }>>>({});
const nodesLoading = ref<Partial<Record<string, boolean>>>({});
const disableScrollInView = ref(false);

const ndvStore = useNDVStore();
const nodeTypesStore = useNodeTypesStore();
const workflowsStore = useWorkflowsStore();
const { getSchemaForExecutionData, filterSchema } = useDataSchema();
const { getNodeInputData } = useNodeHelpers();
const { debounce } = useDebounce();

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
	nodes.value.filter((node) => !props.search || !isDataEmpty(node.schema)),
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

const onTransitionStart = debounce(
	(event: TransitionEvent, nodeName: string) => {
		if (
			nodesOpen.value[nodeName] &&
			event.target instanceof HTMLElement &&
			!disableScrollInView.value
		) {
			event.target.scrollIntoView({
				behavior: 'smooth',
				block: 'nearest',
				inline: 'nearest',
			});
		}
	},
	{ debounceTime: 100, trailing: true },
);

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
			<n8n-text tag="h3" size="large">{{ i18n.baseText('ndv.search.noNodeMatch.title') }}</n8n-text>
			<n8n-text>
				<i18n-t keypath="ndv.search.noMatch.description" tag="span">
					<template #link>
						<a href="#" @click="emit('clear:search')">
							{{ i18n.baseText('ndv.search.noMatch.description.link') }}
						</a>
					</template>
				</i18n-t>
			</n8n-text>
		</div>

		<div
			v-for="currentNode in filteredNodes"
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
			>
				<div :class="$style.expand" @click="toggleOpenNode(currentNode)">
					<font-awesome-icon icon="angle-right" :class="$style.expandIcon" />
				</div>

				<div
					:class="$style.titleContainer"
					data-test-id="run-data-schema-node-name"
					@click="toggleOpenNode(currentNode, true)"
				>
					<div :class="$style.nodeIcon">
						<NodeIcon :node-type="currentNode.nodeType" :size="12" />
					</div>

					<div :class="$style.title">
						{{ currentNode.node.name }}
						<span v-if="nodeAdditionalInfo(currentNode.node)" :class="$style.subtitle">{{
							nodeAdditionalInfo(currentNode.node)
						}}</span>
					</div>
					<font-awesome-icon
						v-if="currentNode.nodeType.group.includes('trigger')"
						:class="$style.triggerIcon"
						icon="bolt"
						size="xs"
					/>
				</div>

				<Transition name="items">
					<div
						v-if="currentNode.itemsCount && currentNode.open"
						:class="$style.items"
						data-test-id="run-data-schema-node-item-count"
					>
						{{
							i18n.baseText('ndv.output.items', {
								interpolate: { count: currentNode.itemsCount },
							})
						}}
					</div>
				</Transition>
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
						@transitionstart="(event) => onTransitionStart(event, currentNode.node.name)"
					>
						<div :class="$style.innerSchema" @transitionstart.stop>
							<div
								v-if="currentNode.node.disabled"
								:class="$style.notice"
								data-test-id="run-data-schema-disabled"
							>
								{{ i18n.baseText('dataMapping.schemaView.disabled') }}
							</div>

							<div
								v-else-if="isDataEmpty(currentNode.schema)"
								:class="$style.notice"
								data-test-id="run-data-schema-empty"
							>
								{{ i18n.baseText('dataMapping.schemaView.emptyData') }}
							</div>

							<RunDataSchemaItem
								v-else-if="currentNode.schema"
								:schema="currentNode.schema"
								:level="0"
								:parent="null"
								:pane-type="paneType"
								:sub-key="`${props.context}_${snakeCase(currentNode.node.name)}`"
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
		<div v-if="isDataEmpty(nodeSchema) && search" :class="$style.noMatch">
			<n8n-text tag="h3" size="large">{{ i18n.baseText('ndv.search.noNodeMatch.title') }}</n8n-text>
			<n8n-text>
				<i18n-t keypath="ndv.search.noMatch.description" tag="span">
					<template #link>
						<a href="#" @click="emit('clear:search')">
							{{ i18n.baseText('ndv.search.noMatch.description.link') }}
						</a>
					</template>
				</i18n-t>
			</n8n-text>
			<n8n-text>{{ i18n.baseText('ndv.search.noMatchSchema.description') }}</n8n-text>
		</div>

		<div v-else :class="$style.schema" data-test-id="run-data-schema-node-schema">
			<n8n-info-tip
				v-if="isDataEmpty(nodeSchema)"
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

.node {
	.schema {
		padding-left: var(--title-spacing-left);
		scroll-margin-top: var(--header-height);
	}

	.notice {
		padding-left: var(--spacing-l);
	}
}

.schema {
	display: grid;
	grid-template-rows: 1fr;

	&.animated {
		grid-template-rows: 0fr;
		transform: translateX(-8px);
		opacity: 0;

		transition:
			grid-template-rows 0.2s $ease-out-expo,
			opacity 0.2s $ease-out-expo 0s,
			transform 0.2s $ease-out-expo 0s;
	}
}

.notice {
	font-size: var(--font-size-2xs);
	color: var(--color-text-light);
}

.innerSchema {
	min-height: 0;
	min-width: 0;

	> div {
		margin-bottom: var(--spacing-xs);
	}
}

.titleContainer {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
	flex-basis: 100%;
	cursor: pointer;
}

.subtitle {
	margin-left: auto;
	padding-left: var(--spacing-2xs);
	color: var(--color-text-light);
	font-weight: var(--font-weight-regular);
}

.header {
	display: flex;
	align-items: center;
	position: sticky;
	top: 0;
	z-index: 1;
	padding-bottom: var(--spacing-2xs);
	background: var(--color-run-data-background);
}

.expand {
	--expand-toggle-size: 30px;
	width: var(--expand-toggle-size);
	height: var(--expand-toggle-size);
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;

	&:hover,
	&:active {
		color: var(--color-text-dark);
	}
}

.expandIcon {
	transition: transform 0.2s $ease-out-expo;
}

.open {
	.expandIcon {
		transform: rotate(90deg);
	}

	.schema {
		transition:
			grid-template-rows 0.2s $ease-out-expo,
			opacity 0.2s $ease-out-expo,
			transform 0.2s $ease-out-expo;
		grid-template-rows: 1fr;
		opacity: 1;
		transform: translateX(0);
	}
}

.nodeIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing-3xs);
	border: 1px solid var(--color-foreground-light);
	border-radius: var(--border-radius-base);
	background-color: var(--color-background-xlight);
}

.noMatch {
	display: flex;
	flex-grow: 1;
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

.title {
	font-size: var(--font-size-2xs);
	color: var(--color-text-dark);
}

.items {
	flex-shrink: 0;
	font-size: var(--font-size-2xs);
	color: var(--color-text-light);
	margin-left: var(--spacing-2xs);

	transition:
		opacity 0.2s $ease-out-expo,
		transform 0.2s $ease-out-expo;
}

.triggerIcon {
	margin-left: var(--spacing-2xs);
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
