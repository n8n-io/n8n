<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue';
import VueJsonPretty from 'vue-json-pretty';
import type { INodeExecutionData } from 'n8n-workflow';
import Draggable from '@/components/Draggable.vue';
import { executionDataToJson } from '@/utils/nodeTypesUtils';
import { isString } from '@/utils/typeGuards';
import { shorten } from '@/utils/typesUtils';
import type { INodeUi } from '@/Interface';
import { useNDVStore } from '@/stores/ndv.store';
import MappingPill from './MappingPill.vue';
import { getMappedExpression } from '@/utils/mappingUtils';
import { nonExistingJsonPath } from '@/constants';
import { useExternalHooks } from '@/composables/useExternalHooks';
import TextWithHighlights from './TextWithHighlights.vue';
import { useTelemetry } from '@/composables/useTelemetry';
import { useElementSize } from '@vueuse/core';
import { useTelemetryContext } from '@/composables/useTelemetryContext';

const LazyRunDataJsonActions = defineAsyncComponent(
	async () => await import('@/components/RunDataJsonActions.vue'),
);

const props = withDefaults(
	defineProps<{
		editMode: { enabled?: boolean; value?: string };
		pushRef?: string;
		paneType: string;
		node: INodeUi;
		inputData: INodeExecutionData[];
		mappingEnabled?: boolean;
		distanceFromActive: number;
		outputIndex: number | undefined;
		runIndex: number | undefined;
		totalRuns: number | undefined;
		search: string | undefined;
		compact?: boolean;
	}>(),
	{
		editMode: () => ({}),
	},
);

const ndvStore = useNDVStore();

const externalHooks = useExternalHooks();
const telemetry = useTelemetry();
const telemetryContext = useTelemetryContext();

const selectedJsonPath = ref(nonExistingJsonPath);
const draggingPath = ref<null | string>(null);
const jsonDataContainer = ref(null);

const { height } = useElementSize(jsonDataContainer);

const jsonData = computed(() => executionDataToJson(props.inputData));

const highlight = computed(() => ndvStore.highlightDraggables);

const getShortKey = (el: HTMLElement) => {
	if (!el) {
		return '';
	}

	return shorten(el.dataset.name ?? '', 16, 2);
};

const getJsonParameterPath = (path: string) => {
	const subPath = path.replace(/^(\["?\d"?])/, ''); // remove item position

	return getMappedExpression({
		nodeName: props.node.name,
		distanceFromActive: props.distanceFromActive,
		path: subPath,
	});
};

const canDraggableDrop = computed(() => ndvStore.canDraggableDrop);
const draggableStickyPosition = computed(() => ndvStore.draggableStickyPos);

const onDragStart = (el: HTMLElement, data?: string) => {
	if (el?.dataset.path) {
		draggingPath.value = el.dataset.path;
	}

	ndvStore.draggableStartDragging({
		type: 'mapping',
		data: data ?? '',
		dimensions: el?.getBoundingClientRect() ?? null,
	});
	ndvStore.resetMappingTelemetry();
};

const onDragEnd = (el: HTMLElement) => {
	ndvStore.draggableStopDragging();
	draggingPath.value = null;
	const mappingTelemetry = ndvStore.mappingTelemetry;
	const telemetryPayload = {
		src_node_type: props.node.type,
		src_field_name: el.dataset.name ?? '',
		src_nodes_back: props.distanceFromActive,
		src_run_index: props.runIndex,
		src_runs_total: props.totalRuns,
		src_field_nest_level: el.dataset.depth ?? 0,
		src_view: 'json',
		src_element: el,
		success: false,
		view_shown: telemetryContext.view_shown,
		...mappingTelemetry,
	};

	setTimeout(() => {
		void externalHooks.run('runDataJson.onDragEnd', telemetryPayload);
		telemetry.track('User dragged data for mapping', telemetryPayload);
	}, 1000); // ensure dest data gets set if drop
};

const formatKey = (value: unknown) => {
	return isString(value) ? `"${value}"` : JSON.stringify(value);
};

const formatValue = (value: unknown) => {
	return JSON.stringify(value);
};

const getListItemName = (path: string) => {
	return path.replace(/^(\["?\d"?]\.?)/g, '');
};
</script>

<template>
	<div
		ref="jsonDataContainer"
		:class="[
			$style.jsonDisplay,
			{ [$style.highlight]: highlight, [$style.compact]: props.compact },
		]"
	>
		<Suspense>
			<LazyRunDataJsonActions
				v-if="!editMode.enabled"
				:node="node"
				:pane-type="paneType"
				:push-ref="pushRef"
				:distance-from-active="distanceFromActive"
				:selected-json-path="selectedJsonPath"
				:json-data="jsonData"
				:output-index="outputIndex"
				:run-index="runIndex"
			/>
		</Suspense>
		<Draggable
			type="mapping"
			target-data-key="mappable"
			:disabled="!mappingEnabled"
			:can-drop="canDraggableDrop"
			:sticky-position="draggableStickyPosition"
			@dragstart="onDragStart"
			@dragend="onDragEnd"
		>
			<template #preview="{ canDrop, el }">
				<MappingPill v-if="el" :html="getShortKey(el)" :can-drop="canDrop" />
			</template>
			<VueJsonPretty
				:data="jsonData"
				:deep="10"
				:show-length="true"
				:selected-value="selectedJsonPath"
				root-path=""
				selectable-type="single"
				class="json-data"
				:virtual="true"
				:height="height"
				@update:selected-value="selectedJsonPath = $event"
			>
				<template #renderNodeKey="{ node }">
					<TextWithHighlights
						:content="formatKey(node.key)"
						:search="search"
						data-target="mappable"
						:data-value="getJsonParameterPath(node.path)"
						:data-name="node.key"
						:data-path="node.path"
						:data-depth="node.level"
						:class="{
							[$style.mappable]: mappingEnabled,
							[$style.dragged]: draggingPath === node.path,
						}"
					/>
				</template>
				<template #renderNodeValue="{ node }">
					<TextWithHighlights
						:content="formatValue(node.content)"
						:search="search"
						data-target="mappable"
						:data-value="getJsonParameterPath(node.path)"
						:data-name="getListItemName(node.path)"
						:data-path="node.path"
						:data-depth="node.level"
						:class="{
							[$style.mappable]: mappingEnabled,
							[$style.dragged]: draggingPath === node.path,
						}"
						class="ph-no-capture"
					/>
				</template>
			</VueJsonPretty>
		</Draggable>
	</div>
</template>

<style lang="scss" module>
.jsonDisplay {
	position: absolute;
	top: 0;
	left: 0;
	padding-left: var(--spacing--sm);
	right: 0;
	overflow-y: hidden;
	line-height: 1.5;
	word-break: normal;
	height: 100%;

	&:hover {
		/* Shows .actionsGroup element from <run-data-json-actions /> child component */
		> div:first-child {
			opacity: 1;
		}
	}

	.mappable {
		cursor: grab;

		&:hover {
			background-color: var(--color-json-highlight);
		}
	}

	&.highlight .mappable,
	.dragged {
		&,
		&:hover {
			background-color: var(--color--primary--tint-2);
			color: var(--color--primary);
		}
	}

	&.compact {
		padding-left: var(--spacing--2xs);
	}
}
</style>

<style lang="scss">
.vjs-tree {
	color: var(--color-json-default);
	--color-line-break: var(--color-code-line-break);
	font-size: var(--font-size--2xs);
}

.vjs-tree-node {
	&:hover {
		background-color: transparent;
	}

	&.is-highlight {
		background-color: var(--color-json-highlight);
	}
}

.vjs-key,
.vjs-value {
	> span {
		color: var(--color--text--shade-1);
		line-height: 1.7;
		border-radius: var(--radius);
	}
}

.vjs-value {
	> span {
		padding: 0 var(--spacing--5xs) 0 var(--spacing--5xs);
		margin-left: var(--spacing--5xs);
		white-space: pre-wrap;
	}
}

.vjs-tree .vjs-value-null {
	&,
	span {
		color: var(--color-json-null);
	}
}

.vjs-tree .vjs-value-boolean {
	&,
	span {
		color: var(--color-json-boolean);
	}
}

.vjs-tree .vjs-value-number {
	&,
	span {
		color: var(--color-json-number);
	}
}

.vjs-tree .vjs-value-string {
	&,
	span {
		color: var(--color-json-string);
	}
}

.vjs-tree .vjs-key {
	color: var(--color-json-key);
}

.vjs-tree .vjs-tree__brackets {
	color: var(--color-json-brackets);
}

.vjs-tree .vjs-tree__brackets:hover {
	color: var(--color-json-brackets-hover);
}

.vjs-tree .vjs-tree__content.has-line {
	border-left: 1px dotted var(--color-json-line);
}

.vjs-tree .vjs-tree-list-holder-inner {
	padding-bottom: var(--spacing--3xl);
}
</style>
