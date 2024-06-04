<template>
	<div :class="[$style.jsonDisplay, { [$style.highlight]: highlight }]">
		<Suspense>
			<RunDataJsonActions
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
				@update:selected-value="selectedJsonPath = $event"
			>
				<template #renderNodeKey="{ node }">
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
						}"
					/>
				</template>
				<template #renderNodeValue="{ node }">
					<TextWithHighlights
						v-if="isNaN(node.index)"
						:content="getContent(node.content)"
						:search="search"
					/>
					<TextWithHighlights
						v-else
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
						}"
						class="ph-no-capture"
					/>
				</template>
			</VueJsonPretty>
		</Draggable>
	</div>
</template>

<script lang="ts">
import { defineAsyncComponent, defineComponent, ref } from 'vue';
import type { PropType } from 'vue';
import VueJsonPretty from 'vue-json-pretty';
import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import Draggable from '@/components/Draggable.vue';
import { executionDataToJson } from '@/utils/nodeTypesUtils';
import { isString } from '@/utils/typeGuards';
import { shorten } from '@/utils/typesUtils';
import type { INodeUi } from '@/Interface';
import { mapStores } from 'pinia';
import { useNDVStore } from '@/stores/ndv.store';
import MappingPill from './MappingPill.vue';
import { getMappedExpression } from '@/utils/mappingUtils';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { nonExistingJsonPath } from '@/constants';
import { useExternalHooks } from '@/composables/useExternalHooks';
import TextWithHighlights from './TextWithHighlights.vue';

const RunDataJsonActions = defineAsyncComponent(
	async () => await import('@/components/RunDataJsonActions.vue'),
);

export default defineComponent({
	name: 'RunDataJson',
	components: {
		VueJsonPretty,
		Draggable,
		RunDataJsonActions,
		MappingPill,
		TextWithHighlights,
	},
	props: {
		editMode: {
			type: Object as PropType<{ enabled?: boolean; value?: string }>,
			default: () => ({}),
		},
		pushRef: {
			type: String,
		},
		paneType: {
			type: String,
		},
		node: {
			type: Object as PropType<INodeUi>,
			required: true,
		},
		inputData: {
			type: Array as PropType<INodeExecutionData[]>,
			required: true,
		},
		mappingEnabled: {
			type: Boolean,
		},
		distanceFromActive: {
			type: Number,
			required: true,
		},
		runIndex: {
			type: Number,
		},
		totalRuns: {
			type: Number,
		},
		search: {
			type: String,
		},
	},
	setup() {
		const externalHooks = useExternalHooks();

		const selectedJsonPath = ref(nonExistingJsonPath);
		const draggingPath = ref<null | string>(null);
		const displayMode = ref('json');

		return {
			externalHooks,
			selectedJsonPath,
			draggingPath,
			displayMode,
		};
	},
	computed: {
		...mapStores(useNDVStore, useWorkflowsStore),
		jsonData(): IDataObject[] {
			return executionDataToJson(this.inputData);
		},
		highlight(): boolean {
			return this.ndvStore.highlightDraggables;
		},
	},
	methods: {
		getShortKey(el: HTMLElement): string {
			if (!el) {
				return '';
			}

			return shorten(el.dataset.name || '', 16, 2);
		},
		getJsonParameterPath(path: string): string {
			const subPath = path.replace(/^(\["?\d"?])/, ''); // remove item position

			return getMappedExpression({
				nodeName: this.node.name,
				distanceFromActive: this.distanceFromActive,
				path: subPath,
			});
		},
		onDragStart(el: HTMLElement) {
			if (el?.dataset.path) {
				this.draggingPath = el.dataset.path;
			}

			this.ndvStore.resetMappingTelemetry();
		},
		onDragEnd(el: HTMLElement) {
			this.draggingPath = null;
			const mappingTelemetry = this.ndvStore.mappingTelemetry;
			const telemetryPayload = {
				src_node_type: this.node.type,
				src_field_name: el.dataset.name || '',
				src_nodes_back: this.distanceFromActive,
				src_run_index: this.runIndex,
				src_runs_total: this.totalRuns,
				src_field_nest_level: el.dataset.depth || 0,
				src_view: 'json',
				src_element: el,
				success: false,
				...mappingTelemetry,
			};

			setTimeout(() => {
				void this.externalHooks.run('runDataJson.onDragEnd', telemetryPayload);
				this.$telemetry.track('User dragged data for mapping', telemetryPayload, {
					withPostHog: true,
				});
			}, 1000); // ensure dest data gets set if drop
		},
		getContent(value: unknown): string {
			return isString(value) ? `"${value}"` : JSON.stringify(value);
		},
		getListItemName(path: string): string {
			return path.replace(/^(\["?\d"?]\.?)/g, '');
		},
	},
});
</script>

<style lang="scss" module>
.jsonDisplay {
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
</style>

<style lang="scss">
.vjs-tree {
	color: var(--color-json-default);
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
</style>
