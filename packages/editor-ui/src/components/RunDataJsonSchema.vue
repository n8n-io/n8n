<template>
	<div :class="$style.jsonSchema">
		<draggable
			type="mapping"
			targetDataKey="mappable"
			:disabled="!mappingEnabled"
			@dragstart="onDragStart"
			@dragend="onDragEnd"
		>
			<template #preview="{ canDrop, el }">
				<div :class="[$style.dragPill, canDrop ? $style.droppablePill : $style.defaultPill]">
					{{ $locale.baseText('dataMapping.mapKeyToField', { interpolate: { name: getShortKey(el) } }) }}
				</div>
			</template>
			<template>
				<run-data-json-schema-item
					:schema="schema"
					:level="0"
					:parent="null"
					:sub-key="`${schema.type}-0-0`"
					:mapping-enabled="mappingEnabled"
					:dragging-path="draggingPath"
					:distance-from-active="distanceFromActive"
					:node="node"
				/>
			</template>
		</draggable>
	</div>
</template>
<script lang="ts" setup>
import { ref, getCurrentInstance } from 'vue';
import { INodeUi, JsonSchema } from "@/Interface";
import RunDataJsonSchemaItem from "@/components/RunDataJsonSchemaItem.vue";
import Draggable from '@/components/Draggable.vue';
import { shorten } from "@/components/helpers";
import { useNDVStore } from "@/stores/ndv";
import { useWebhooksStore } from "@/stores/webhooks";
import { runExternalHook } from "@/components/mixins/externalHooks";
import { telemetry } from "@/plugins/telemetry";

type Props = {
	schema: JsonSchema
	mappingEnabled: boolean
	distanceFromActive: number
	runIndex: number
	totalRuns: number
	node: INodeUi | null
}

const props = withDefaults(defineProps<Props>(), {
	distanceFromActive: 0,
});

const vueInstance = getCurrentInstance();

const draggingPath = ref<string>('');
const ndvStore = useNDVStore();
const webhooksStore = useWebhooksStore();

const onDragStart = (el: HTMLElement) => {
	if (el && el.dataset.path) {
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
			src_view: 'json-schema',
			src_element: el,
			success: false,
			...mappingTelemetry,
		};

		runExternalHook('runDataJson.onDragEnd', webhooksStore, telemetryPayload);

		telemetry.track('User dragged data for mapping', telemetryPayload);
	}, 1000); // ensure dest data gets set if drop
};

const getShortKey = (el: HTMLElement): string => {
	if (!el) {
		return '';
	}

	return shorten(el.dataset.name || '', 16, 2);
};

</script>

<style lang="scss" module>
.jsonSchema {
	position: absolute;
	top: 0;
	left: 0;
	padding-left: var(--spacing-s);
	right: 0;
	overflow-y: auto;
	line-height: 1.5;
	word-break: normal;
	height: 100%;
	padding-bottom: var(--spacing-3xl);
	background-color: var(--color-background-base);
	padding-top: var(--spacing-s);
}

.dragPill {
	padding: var(--spacing-4xs) var(--spacing-4xs) var(--spacing-3xs) var(--spacing-4xs);
	color: var(--color-text-xlight);
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-2xs);
	border-radius: var(--border-radius-base);
	white-space: nowrap;
}

.droppablePill {
	background-color: var(--color-success);
}

.defaultPill {
	background-color: var(--color-primary);
	transform: translate(-50%, -100%);
	box-shadow: 0 2px 6px rgba(68, 28, 23, 0.2);
}
</style>
