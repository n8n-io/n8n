<script lang="ts" setup>
import { computed, ref } from 'vue';
import { INodeUi, Schema } from '@/Interface';
import RunDataSchemaItem from '@/components/RunDataSchemaItem.vue';
import Draggable from '@/components/Draggable.vue';
import { useNDVStore } from '@/stores/ndv';
import { useWebhooksStore } from '@/stores/webhooks';
import { runExternalHook } from '@/mixins/externalHooks';
import { telemetry } from '@/plugins/telemetry';
import { IDataObject } from 'n8n-workflow';
import { getSchema, isEmpty, mergeDeep } from '@/utils';
import { i18n } from '@/plugins/i18n';
import MappingPill from './MappingPill.vue';

type Props = {
	data: IDataObject[];
	mappingEnabled: boolean;
	distanceFromActive: number;
	runIndex: number;
	totalRuns: number;
	paneType: 'input' | 'output';
	node: INodeUi | null;
};

const props = withDefaults(defineProps<Props>(), {
	distanceFromActive: 0,
});

const draggingPath = ref<string>('');
const ndvStore = useNDVStore();
const webhooksStore = useWebhooksStore();

const schema = computed<Schema>(() => {
	const [head, ...tail] = props.data;
	return getSchema(mergeDeep([head, ...tail, head]));
});

const isDataEmpty = computed(() => {
	return isEmpty(props.data);
});

const onDragStart = (el: HTMLElement) => {
	if (el && el.dataset?.path) {
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
			src_field_name: el.dataset.name || '',
			src_nodes_back: props.distanceFromActive,
			src_run_index: props.runIndex,
			src_runs_total: props.totalRuns,
			src_field_nest_level: el.dataset.depth || 0,
			src_view: 'schema',
			src_element: el,
			success: false,
			...mappingTelemetry,
		};

		runExternalHook('runDataJson.onDragEnd', webhooksStore, telemetryPayload);

		telemetry.track('User dragged data for mapping', telemetryPayload);
	}, 1000); // ensure dest data gets set if drop
};
</script>

<template>
	<div :class="$style.schemaWrapper">
		<n8n-info-tip v-if="isDataEmpty">{{
			i18n.baseText('dataMapping.schemaView.emptyData')
		}}</n8n-info-tip>
		<draggable
			v-else
			type="mapping"
			targetDataKey="mappable"
			:disabled="!mappingEnabled"
			@dragstart="onDragStart"
			@dragend="onDragEnd"
		>
			<template #preview="{ canDrop, el }">
				<MappingPill v-if="el" :html="el.outerHTML" :can-drop="canDrop" />
			</template>
			<template>
				<div :class="$style.schema">
					<run-data-schema-item
						:schema="schema"
						:level="0"
						:parent="null"
						:paneType="paneType"
						:subKey="`${schema.type}-0-0`"
						:mappingEnabled="mappingEnabled"
						:draggingPath="draggingPath"
						:distanceFromActive="distanceFromActive"
						:node="node"
					/>
				</div>
			</template>
		</draggable>
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
	background-color: var(--color-background-base);

	> div[class*='info'] {
		padding: 0 var(--spacing-s);
	}
}

.schema {
	display: inline-block;
	padding: 0 var(--spacing-s) var(--spacing-s);
}
</style>
