<template>
	<div :class="$style.jsonSchema">
		<draggable
			type="mapping"
			targetDataKey="mappable"
			:disabled="!mappingEnabled"
			@dragstart="onDragStart"
			@dragend="onDragEnd"
		>
		  <run-data-json-schema-item :schema="schema" :level="0" :parent="null" :sub-key="`${schema.type}-0-0`" />
		</draggable>
	</div>
</template>
<script lang="ts" setup>
import { JsonSchema } from "@/Interface";
import RunDataJsonSchemaItem from "@/components/RunDataJsonSchemaItem.vue";
import Draggable from '@/components/Draggable.vue';

type Props = {
	schema: JsonSchema
	mappingEnabled: boolean
}

const props = defineProps<Props>();

const onDragStart = (el: HTMLElement) =>{};
const onDragEnd = (el: HTMLElement) =>{};

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
</style>
