<template>
	<div :class="$style.jsonSchemaItem" :style="{ paddingLeft }">
		<div v-if="level > 0 || (level === 0 && !isSchemaValueArray && schema.type !== 'list')">
			<span>
				<font-awesome-icon :icon="getIconBySchemaType(schema.type)" />
				<span v-if="schema.key">{{ schema.key }}</span>
			</span>
			<font-awesome-icon v-if="!isSchemaValueArray && schema.type === 'list'" :icon="getIconBySchemaType(schema.value)" />
		</div>
		<div v-if="isSchemaValueArray">
			<run-data-json-schema-item v-for="(s, i) in schema.value"
				:key="`${s.type}-${level}-${i}`"
				:schema="s"
				:level="level + 1"
			/>
		</div>
	</div>
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import { JsonSchema } from "@/Interface";
import { checkExhaustive } from "@/utils";

type Props = {
	schema: JsonSchema
	level: number
}

const props = defineProps<Props>();
const isSchemaValueArray = computed(() => Array.isArray(props.schema.value));
const paddingLeft = computed((): string => (props.level > 0 ? props.level * 16 : 0) + 'px');
const getIconBySchemaType = (type: JsonSchema['type']): string => {
	switch (type) {
		case 'object':
			return 'cube';
		case 'list':
			return 'list';
		case 'string':
		case 'null':
			return 'font';
		case 'number':
			return 'hashtag';
		case 'boolean':
			return 'check-square';
		case 'date':
			return 'calendar';
		case 'function':
			return 'code';
		case 'bigint':
			return 'calculator';
		case 'symbol':
			return 'sun';
		case 'undefined':
			return 'ban';
	}

	checkExhaustive(type);
};

</script>

<style lang="scss" module>
.jsonSchemaItem {
	display: block
}
</style>
