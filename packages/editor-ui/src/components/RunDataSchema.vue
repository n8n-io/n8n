<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { INodeUi } from '@/Interface';
import RunDataSchemaItem from '@/components/RunDataSchemaItem.vue';
import Draggable from '@/components/Draggable.vue';
import { useNDVStore } from '@/stores/ndv.store';
import { telemetry } from '@/plugins/telemetry';
import type { IDataObject } from 'n8n-workflow';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { i18n } from '@/plugins/i18n';
import MappingPill from './MappingPill.vue';
import { useDataSchema } from '@/composables/useDataSchema';

type Props = {
	data: IDataObject[];
	mappingEnabled: boolean;
	distanceFromActive: number;
	runIndex: number;
	totalRuns: number;
	paneType: 'input' | 'output';
	node: INodeUi | null;
	search: string;
};

const props = withDefaults(defineProps<Props>(), {
	distanceFromActive: 0,
});

const draggingPath = ref<string>('');
const ndvStore = useNDVStore();
const { getSchemaForExecutionData } = useDataSchema();

const schema = computed(() => getSchemaForExecutionData(props.data));

const isDataEmpty = computed(() => {
	// Utilize the generated schema instead of looping over the entire data again
	// The schema for empty data is { type: 'object' | 'array', value: [] }
	const isObjectOrArray = schema.value.type === 'object' || schema.value.type === 'array';
	const isEmpty = Array.isArray(schema.value.value) && schema.value.value.length === 0;

	return isObjectOrArray && isEmpty;
});

const highlight = computed(() => ndvStore.highlightDraggables);

const onDragStart = (el: HTMLElement) => {
	if (el?.dataset?.path) {
		draggingPath.value = el.dataset.path;
	}

	ndvStore.resetMappingTelemetry();
};
const onDragEnd = (el: HTMLElement) => {
	draggingPath.value = '';

	setTimeout(() => {
		const mappingTelemetry = ndvStore.mappingTelemetry;
		const telemetryPayload = {
			src_node_type: props.node?.type,
			src_field_name: el.dataset.name ?? '',
			src_nodes_back: props.distanceFromActive,
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
</script>

<template>
	<div :class="[$style.schemaWrapper, { highlightSchema: highlight }]">
		<n8n-info-tip v-if="isDataEmpty">{{
			i18n.baseText('dataMapping.schemaView.emptyData')
		}}</n8n-info-tip>
		<Draggable
			v-else
			type="mapping"
			target-data-key="mappable"
			:disabled="!mappingEnabled"
			@dragstart="onDragStart"
			@dragend="onDragEnd"
		>
			<template #preview="{ canDrop, el }">
				<MappingPill v-if="el" :html="el.outerHTML" :can-drop="canDrop" />
			</template>
			<div :class="$style.schema">
				<RunDataSchemaItem
					:schema="schema"
					:level="0"
					:parent="null"
					:pane-type="paneType"
					:sub-key="`${schema.type}-0-0`"
					:mapping-enabled="mappingEnabled"
					:dragging-path="draggingPath"
					:distance-from-active="distanceFromActive"
					:node="node"
					:search="search"
				/>
			</div>
		</Draggable>
	</div>
</template>

<style lang="scss" module>
.schemaWrapper {
	position: absolute;
	top: 0;
	left: 0;
	bottom: 0;
	right: 0;
	overflow: auto;
	line-height: 1.5;
	word-break: normal;
	height: 100%;
	width: 100%;

	> div[class*='info'] {
		padding: 0 var(--spacing-s);
	}
}

.schema {
	display: inline-block;
	padding: 0 var(--spacing-s) var(--spacing-s);
}
</style>
