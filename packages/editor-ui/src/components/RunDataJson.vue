<template>
	<div :class="$style.jsonDisplay">
		<run-data-json-actions
			v-if="!editMode.enabled"
			:node="node"
			:sessioId="sessionId"
			:displayMode="displayMode"
			:distanceFromActive="distanceFromActive"
			:selectedJsonPath="selectedJsonPath"
			:jsonData="jsonData"
			:paneType="paneType"
		/>
		<draggable
			type="mapping"
			targetDataKey="mappable"
			:disabled="!mappingEnabled"
			@dragstart="onDragStart"
			@dragend="onDragEnd"
		>
			<template #preview="{ canDrop, el }">
				<MappingPill v-if="el" :html="getShortKey(el)" :can-drop="canDrop" />
			</template>
			<template>
				<vue-json-pretty
					:data="jsonData"
					:deep="10"
					:showLength="true"
					:selected-value.sync="selectedJsonPath"
					rootPath=""
					selectableType="single"
					class="json-data"
				>
					<template #nodeKey="{ node }">
						<span
							data-target="mappable"
							:data-value="getJsonParameterPath(node.path)"
							:data-name="node.key"
							:data-path="node.path"
							:data-depth="node.level"
							:class="{
								[$style.mappable]: mappingEnabled,
								[$style.dragged]: draggingPath === node.path,
							}"
							>"{{ node.key }}"</span
						>
					</template>
					<template #nodeValue="{ node }">
						<span v-if="isNaN(node.index)">{{ getContent(node.content) }}</span>
						<span
							v-else
							data-target="mappable"
							:data-value="getJsonParameterPath(node.path)"
							:data-name="getListItemName(node.path)"
							:data-path="node.path"
							:data-depth="node.level"
							:class="{
								[$style.mappable]: mappingEnabled,
								[$style.dragged]: draggingPath === node.path,
							}"
							>{{ getContent(node.content) }}</span
						>
					</template>
				</vue-json-pretty>
			</template>
		</draggable>
	</div>
</template>

<script lang="ts">
import { PropType } from 'vue';
import mixins from 'vue-typed-mixins';
import VueJsonPretty from 'vue-json-pretty';
import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import Draggable from '@/components/Draggable.vue';
import { executionDataToJson, isString, shorten } from '@/utils';
import { INodeUi } from '@/Interface';
import { externalHooks } from '@/mixins/externalHooks';
import { mapStores } from 'pinia';
import { useNDVStore } from '@/stores/ndv';
import MappingPill from './MappingPill.vue';
import { getMappedExpression } from '@/utils/mappingUtils';
import { useWorkflowsStore } from '@/stores/workflows';

const runDataJsonActions = () => import('@/components/RunDataJsonActions.vue');

export default mixins(externalHooks).extend({
	name: 'run-data-json',
	components: {
		VueJsonPretty,
		Draggable,
		runDataJsonActions,
		MappingPill,
	},
	props: {
		editMode: {
			type: Object as () => { enabled?: boolean; value?: string },
		},
		sessionId: {
			type: String,
		},
		paneType: {
			type: String,
		},
		node: {
			type: Object as PropType<INodeUi>,
		},
		inputData: {
			type: Array as PropType<INodeExecutionData[]>,
		},
		mappingEnabled: {
			type: Boolean,
		},
		distanceFromActive: {
			type: Number,
		},
		runIndex: {
			type: Number,
		},
		totalRuns: {
			type: Number,
		},
	},
	data() {
		return {
			selectedJsonPath: null as null | string,
			draggingPath: null as null | string,
			displayMode: 'json',
		};
	},
	computed: {
		...mapStores(useNDVStore, useWorkflowsStore),
		jsonData(): IDataObject[] {
			return executionDataToJson(this.inputData);
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
			if (el && el.dataset.path) {
				this.draggingPath = el.dataset.path;
			}

			this.ndvStore.resetMappingTelemetry();
		},
		onDragEnd(el: HTMLElement) {
			this.draggingPath = null;

			setTimeout(() => {
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

				this.$externalHooks().run('runDataJson.onDragEnd', telemetryPayload);

				this.$telemetry.track('User dragged data for mapping', telemetryPayload);
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
	background-color: var(--color-background-base);

	&:hover {
		/* Shows .actionsGroup element from <run-data-json-actions /> child component */
		> div:first-child {
			opacity: 1;
		}
	}
}

.mappable {
	cursor: grab;

	&:hover {
		background-color: var(--color-json-highlight);
	}
}

.dragged {
	&,
	&:hover {
		background-color: var(--color-primary-tint-2);
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
