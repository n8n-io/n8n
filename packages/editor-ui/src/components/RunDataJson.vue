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
import { N8nIconButton } from 'n8n-design-system';
import { useExecutionHelpers } from '@/composables/useExecutionHelpers';
import { useI18n } from '@/composables/useI18n';

import _ from 'lodash-es';

const i18n = useI18n();

const { openRelatedExecution } = useExecutionHelpers();

const LazyRunDataJsonActions = defineAsyncComponent(
	async () => await import('@/components/RunDataJsonActions.vue'),
);

const SUBWORKLOW_BUTTON_MARKER = 'o12u312o03u123u138u1239812u31983u12938u12893u1_BUTTON_MARKER';

const props = withDefaults(
	defineProps<{
		editMode: { enabled?: boolean; value?: string };
		pushRef: string;
		paneType: string;
		node: INodeUi;
		inputData: INodeExecutionData[];
		mappingEnabled?: boolean;
		distanceFromActive: number;
		runIndex: number | undefined;
		totalRuns: number | undefined;
		search: string | undefined;
	}>(),
	{
		editMode: () => ({}),
	},
);

const ndvStore = useNDVStore();

const externalHooks = useExternalHooks();
const telemetry = useTelemetry();

const selectedJsonPath = ref(nonExistingJsonPath);
const draggingPath = ref<null | string>(null);
const displayMode = ref('json');
const jsonDataContainer = ref(null);

const { height } = useElementSize(jsonDataContainer);

const jsonData = computed(() => {
	const x = executionDataToJson(props.inputData).map((x, i) =>
		_.isEmpty(x)
			? props.inputData[i].metadata
				? {
						[SUBWORKLOW_BUTTON_MARKER]: '',
					}
				: {}
			: x,
	);
	console.log(x);
	return x;
});

const firstKey = computed(() => {
	const keys = Object.keys(jsonData.value[0]);
	return `"${keys?.[0]}"`;
});

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

const onDragStart = (el: HTMLElement) => {
	if (el?.dataset.path) {
		draggingPath.value = el.dataset.path;
	}

	ndvStore.resetMappingTelemetry();
};

const onDragEnd = (el: HTMLElement) => {
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
		...mappingTelemetry,
	};

	setTimeout(() => {
		void externalHooks.run('runDataJson.onDragEnd', telemetryPayload);
		telemetry.track('User dragged data for mapping', telemetryPayload, {
			withPostHog: true,
		});
	}, 1000); // ensure dest data gets set if drop
};

const getContent = (value: unknown) => {
	return isString(value) ? `"${value}"` : JSON.stringify(value);
};

const getListItemName = (path: string) => {
	return path.replace(/^(\["?\d"?]\.?)/g, '');
};

function isMarkerNode(node: any, inputData: any) {
	return (
		node.key === SUBWORKLOW_BUTTON_MARKER &&
		!isNaN(node.path[1]) &&
		inputData[Number(node.path[1])].metadata
	);
}
</script>

<template>
	<div ref="jsonDataContainer" :class="[$style.jsonDisplay, { [$style.highlight]: highlight }]">
		<Suspense>
			<LazyRunDataJsonActions
				v-if="!editMode.enabled"
				:node="node"
				:push-ref="pushRef"
				:display-mode="displayMode"
				:distance-from-active="distanceFromActive"
				:selected-json-path="selectedJsonPath"
				:json-data="jsonData"
				:pane-type="paneType"
			/>
		</Suspense>
		<Draggable
			type="mapping"
			target-data-key="mappable"
			:disabled="!mappingEnabled"
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
				<template #renderNodeKey="{ node, defaultKey }">
					<div v-if="isMarkerNode(node, inputData)" :class="$style.emptyElement">
						<N8nIconButton
							type="secondary"
							icon="external-link-alt"
							data-test-id="debug-sub-execution"
							size="mini"
							@click="openRelatedExecution(inputData[Number(node.path[1])].metadata!, 'json')"
						/>
					</div>
					<div v-else-if="node.key !== SUBWORKLOW_BUTTON_MARKER">
						<div v-if="firstKey === defaultKey" :class="$style.goToButton">
							<!--
						node = {"content":"3af3a3cc-ff5c-4775-af8c-88b37b0836aa","level":2,"key":"uid","path":"[0].uid","showComma":true,"length":1,"type":"content","id":2}
						-->
							<N8nIconButton
								v-if="!isNaN(node.path[1]) && inputData[Number(node.path[1])].metadata"
								type="secondary"
								icon="external-link-alt"
								data-test-id="debug-sub-execution"
								size="mini"
								@click="openRelatedExecution(inputData[Number(node.path[1])].metadata!, 'json')"
							/>
							<!-- ^--- may want to stop event propagation so the row in the json component doesn't end up selected-->
						</div>
						<TextWithHighlights
							:content="getContent(node.key)"
							:search="search"
							data-target="mappable"
							:data-value="getJsonParameterPath(node.path)"
							:data-name="node.key"
							:data-path="node.path"
							:data-depth="node.level"
							:class="{
								[$style.mappable]: mappingEnabled,
								[$style.dragged]: draggingPath === node.path,
								[$style.offset]: !isNaN(node.path[1]) && inputData[Number(node.path[1])].metadata,
							}"
						/>
					</div>
				</template>
				<template #renderNodeValue="{ node }">
					<div v-if="node.key === SUBWORKLOW_BUTTON_MARKER" :class="$style.emptyElement">
						<N8nInfoTip>{{ i18n.baseText('runData.emptyItemHint') }}</N8nInfoTip>
					</div>
					<div v-else-if="node.key !== SUBWORKLOW_BUTTON_MARKER">
						<TextWithHighlights
							v-if="isNaN(node.index)"
							:content="getContent(node.content)"
							:search="search"
						/>
						<TextWithHighlights
							:content="getContent(node.content)"
							:search="search"
							data-target="mappable"
							:data-value="getJsonParameterPath(node.path)"
							:data-name="getListItemName(node.path)"
							:data-path="node.path"
							:data-depth="node.level"
							:class="{
								[$style.mappable]: mappingEnabled,
								[$style.dragged]: draggingPath === node.path,
								[$style.offset]: !isNaN(node.path[1]) && inputData[Number(node.path[1])].metadata,
							}"
							class="ph-no-capture"
						/>
					</div>
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
	padding-left: var(--spacing-s);
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
			background-color: var(--color-primary-tint-2);
			color: var(--color-primary);
		}
	}
}

.goToButton {
	position: absolute;

	// above
	// top: -22px;
	// left: 30px;

	// left
	left: 20px;
	top: 3px;

	// right
	// right: 18px; // probably small button rather than mini?
}

.offset {
	// left
	margin-left: 18px;
}

// trouble here is that the Tree holds all rows as direct children, so we either show hover on first
// `"key": "value"` pair only or for the whole tree, so all would be visible at once
// Alternatively we could place a button for each row with matching offsets so that they all overlap each other perfectly... yuck
*:not(:hover) > * > .parentHoverShow {
	// display: none;
}

.emptyElement {
	display: inline-flex;
}
</style>

<style lang="scss">
.vjs-tree {
	color: var(--color-json-default);
	--color-line-break: var(--color-code-line-break);
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
		color: var(--color-text-dark);
		line-height: 1.7;
		border-radius: var(--border-radius-base);
	}
}

.vjs-value {
	> span {
		padding: 0 var(--spacing-5xs) 0 var(--spacing-5xs);
		margin-left: var(--spacing-5xs);
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
	padding-bottom: var(--spacing-3xl);
}
</style>
