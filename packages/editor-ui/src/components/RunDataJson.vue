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
			ref="draggable"
		>
			<template #preview="{ canDrop, el }">
				<div :class="[$style.dragPill, canDrop ? $style.droppablePill : $style.defaultPill]">
					{{ $locale.baseText('dataMapping.mapKeyToField', { interpolate: { name: getShortKey(el) } }) }}
				</div>
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
					>"{{ node.key }}"</span>
					</template>
					<template #nodeValue="{ node }">
						<span>{{ getContent(node.content) }}</span>
					</template>
				</vue-json-pretty>
			</template>
		</draggable>
	</div>
</template>

<script lang="ts">
import { PropType } from "vue";
import mixins from "vue-typed-mixins";
import VueJsonPretty from 'vue-json-pretty';
import { LOCAL_STORAGE_MAPPING_FLAG } from '@/constants';
import { IDataObject, INodeExecutionData } from "n8n-workflow";
import Draggable from '@/components/Draggable.vue';
import { convertPath, executionDataToJson, isString, isStringNumber } from "@/components/helpers";
import { INodeUi } from "@/Interface";
import { shorten } from './helpers';
import { externalHooks } from "@/components/mixins/externalHooks";

const runDataJsonActions = () => import('@/components/RunDataJsonActions.vue');

export default mixins(externalHooks).extend({
	name: 'run-data-json',
	components: {
		VueJsonPretty,
		Draggable,
		runDataJsonActions,
	},
	props: {
		editMode: {
			type: Object as () => { enabled?: boolean; value?: string; },
		},
		currentOutputIndex: {
			type: Number,
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
		showMappingHint: {
			type: Boolean,
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
			mappingHintVisible: false,
			showHintWithDelay: false,
			draggingPath: null as null | string,
			displayMode: 'json',
		};
	},
	mounted() {
		if (this.showMappingHint) {
			this.mappingHintVisible = true;

			setTimeout(() => {
				this.mappingHintVisible = false;
			}, 6000);
		}

		if (this.showMappingHint && this.showHint) {
			setTimeout(() => {
				this.showHintWithDelay = this.showHint;
				this.$telemetry.track('User viewed JSON mapping tooltip', { type: 'param focus' });
			}, 500);
		}
	},
	computed: {
		jsonData(): IDataObject[] {
			return executionDataToJson(this.inputData as INodeExecutionData[]);
		},
		showHint(): boolean {
			return (
				!this.draggingPath &&
				((this.showMappingHint && this.mappingHintVisible) ||
					window.localStorage.getItem(LOCAL_STORAGE_MAPPING_FLAG) !== 'true')
			);
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
			const convertedPath = convertPath(path);
			return `{{ ${ convertedPath.replace(/^(\["?\d"?])/, this.distanceFromActive === 1 ? '$json' : `$node["${ this.node!.name }"].json`) } }}`;
		},
		onDragStart(el: HTMLElement) {
			if (el && el.dataset.path) {
				this.draggingPath = el.dataset.path;
			}

			this.$store.commit('ui/resetMappingTelemetry');
		},
		onDragEnd(el: HTMLElement) {
			this.draggingPath = null;

			setTimeout(() => {
				const mappingTelemetry = this.$store.getters['ui/mappingTelemetry'];
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
		getContent(value: string): string {
			return isString(value) && !isStringNumber(value) ? `"${ value }"` : value;
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
	padding-top: var(--spacing-s);

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
	&, span {
		color: var(--color-json-null);
	}
}

.vjs-tree .vjs-value-boolean {
	&, span {
		color: var(--color-json-boolean);
	}
}

.vjs-tree .vjs-value-number {
	&, span {
		color: var(--color-json-number);
	}
}

.vjs-tree .vjs-value-string {
	&, span {
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
