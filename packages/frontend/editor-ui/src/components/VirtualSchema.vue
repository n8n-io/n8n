<script lang="ts" setup>
import type { INodeUi } from '@/Interface';
import Draggable from '@/components/Draggable.vue';
import VirtualSchemaHeader from '@/components/VirtualSchemaHeader.vue';
import VirtualSchemaItem from '@/components/VirtualSchemaItem.vue';
import {
	type RenderHeader,
	type RenderNotice,
	type Renders,
	useDataSchema,
	useFlattenSchema,
	type SchemaNode,
} from '@/composables/useDataSchema';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useI18n } from '@/composables/useI18n';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useTelemetry } from '@/composables/useTelemetry';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { executionDataToJson } from '@/utils/nodeTypesUtils';
import { N8nText } from '@n8n/design-system';
import {
	createResultError,
	IWorkflowDataProxyAdditionalKeys,
	NodeConnectionType,
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

import { resolveParameter } from '@/composables/useWorkflowHelpers';
import { EnterpriseEditionFeature, SCHEMA_PREVIEW_EXPERIMENT } from '@/constants';
import useEnvironmentsStore from '@/stores/environments.ee.store';
import { usePostHog } from '@/stores/posthog.store';
import { useSchemaPreviewStore } from '@/stores/schemaPreview.store';
import { useSettingsStore } from '@/stores/settings.store';
import { asyncComputed } from '@vueuse/core';
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
const environmentsStore = useEnvironmentsStore();
const settingsStore = useSettingsStore();
const posthogStore = usePostHog();
const { getSchemaForExecutionData, getSchemaForJsonSchema, getSchema, filterSchema } =
	useDataSchema();
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
	posthogStore.isFeatureEnabled(SCHEMA_PREVIEW_EXPERIMENT),
);

const isVariablesEnabled = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Variables],
);

const contextSchema = computed(() => {
	const $vars = environmentsStore.variablesAsObject;
	const $execution = {
		...resolveParameter<IWorkflowDataProxyAdditionalKeys['$execution']>('={{$execution}}'),
		resumeUrl: i18n.baseText('dataMapping.schemaView.execution.resumeUrl'),
	};

	delete $execution.resumeFormUrl;
	const schemaSource: Record<string, unknown> = {
		$now: resolveParameter('={{$now.toISO()}}'),
		$today: resolveParameter('={{$today.toISO()}}'),
		$vars,
		$execution,
		$workflow: resolveParameter('={{$workflow}}'),
	};

	return getSchema(schemaSource);
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

	const fields: Renders[] = flattenSchema({
		schema: contextSchema.value,
		depth: 1,
	}).flatMap((renderItem) => {
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
	if (props.data.length === 0 && isSchemaPreviewEnabled.value) {
		const previewSchema = await getSchemaPreview(props.node);
		if (previewSchema.ok) {
			return filterSchema(getSchemaForJsonSchema(previewSchema.result), props.search);
		}
	}

	return filterSchema(getSchemaForExecutionData(props.data), props.search);
});

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

	for (const node of props.nodes) {
		const fullNode = workflowsStore.getNodeByName(node.name);
		if (!fullNode) continue;

		const nodeType = nodeTypesStore.getNodeType(fullNode.type, fullNode.typeVersion);
		if (!nodeType) continue;

		const { schema, connectedOutputIndexes, itemsCount, preview } = await getNodeSchema(
			fullNode,
			node,
		);

		const filteredSchema = filterSchema(schema, props.search);

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

	return flattenedNodes.value.concat(contextItems.value);
});

const noSearchResults = computed(() => {
	return Boolean(props.search.trim()) && !Boolean(items.value.length);
});

watch(
	() => props.search,
	(newSearch) => {
		if (!newSearch) return;
		closedNodes.value.clear();
	},
);

// Variables & context items should be collapsed by default
watch(
	contextItems,
	(currentContextItems) => {
		currentContextItems
			.filter((item) => item.type === 'header')
			.forEach((item) => {
				closedNodes.value.add(item.id);
			});
	},
	{ once: true, immediate: true },
);

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
			<N8nText tag="h3" size="large">{{ i18n.baseText('ndv.search.noNodeMatch.title') }}</N8nText>
			<N8nText>
				<i18n-t keypath="ndv.search.noMatch.description" tag="span">
					<template #link>
						<a href="#" @click="emit('clear:search')">
							{{ i18n.baseText('ndv.search.noMatch.description.link') }}
						</a>
					</template>
				</i18n-t>
			</N8nText>

			<N8nText v-if="paneType === 'output'">
				{{ i18n.baseText('ndv.search.noMatchSchema.description') }}
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

						<div
							v-else-if="item.type === 'notice'"
							v-n8n-html="item.message"
							class="notice"
							:style="{ marginLeft: `calc(var(--spacing-l) + var(--spacing-l) * ${item.level})` }"
						/>
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
	text-align: center;
	padding: var(--spacing-s) var(--spacing-s) var(--spacing-xl) var(--spacing-s);
}

.icon {
	display: inline-flex;
	margin-left: var(--spacing-xl);
	color: var(--color-text-light);
	margin-bottom: var(--spacing-s);
}

.notice {
	padding-bottom: var(--spacing-xs);
	color: var(--color-text-base);
	font-size: var(--font-size-2xs);
	line-height: var(--font-line-height-loose);
}
</style>
