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
				<div v-if="el" :class="[$style.dragPill, canDrop ? $style.droppablePill : $style.defaultPill]" v-html="el.outerHTML" />
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
import { ref } from 'vue';
import { INodeUi, JsonSchema } from "@/Interface";
import RunDataJsonSchemaItem from "@/components/RunDataJsonSchemaItem.vue";
import Draggable from '@/components/Draggable.vue';

type Props = {
	schema: JsonSchema
	mappingEnabled: boolean
	distanceFromActive: number
	node: INodeUi | null
}

const props = withDefaults(defineProps<Props>(), {
	distanceFromActive: 0,
});

const draggingPath = ref<string>('');

const onDragStart = (el: HTMLElement) => {
	if (el && el.dataset?.path) {
		draggingPath.value = el.dataset.path;
	}
};
const onDragEnd = (el: HTMLElement) => {
	draggingPath.value = '';
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
	display: inline-flex;
	height: 24px;
	padding: 0 var(--spacing-3xs);
	border: 1px solid var(--color-foreground-light);
	border-radius: 4px;
	background: var(--color-background-xlight);
	font-size: var(--font-size-2xs);
	color: var(--color-text-base);
	white-space: nowrap;
	align-items: center;

	span {
		display: flex;
		height: 100%;
		align-items: center;
	}
}

.droppablePill {
	&,
	span span {
		color: var(--color-success);
		border-color: var(--color-success-light);
		background: var(--color-success-tint-3);
	}
}

.defaultPill {
	transform: translate(-50%, -100%);
	box-shadow: 0 2px 6px rgba(68, 28, 23, 0.2);

	&,
	span span {
		color: var(--color-primary);
		border-color: var(--color-primary-tint-1);
		background: var(--color-primary-tint-3);
	}
}
</style>
