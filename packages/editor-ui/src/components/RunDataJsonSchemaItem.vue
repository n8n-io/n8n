<template>
	<div :class="$style.item" :style="{ paddingLeft }">
		<div v-if="level > 0 || (level === 0 && !isSchemaValueArray && schema.type !== 'list')" :class="$style.pill">
			<span :class="$style.label">
				<font-awesome-icon :icon="getIconBySchemaType(schema.type)" />
				<span v-if="schema.key">{{ schema.key }}</span>
				<span v-else>{{ schema.type }}</span>
			</span>
			<span v-if="!isSchemaValueArray && schema.type === 'list'" :class="$style.labelAlt">
				<font-awesome-icon :icon="getIconBySchemaType(schema.value)" />
				<span>{{ schema.value }}</span>
			</span>
		</div>
		<div v-if="isSchemaValueArray" :class="$style.value">
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
const paddingLeft = computed((): string => (props.level > 0 ? props.level * 12 : 0) + 'px');
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
.item {
	display: block;
	padding-top: var(--spacing-xs);
}

.value {
	display: block;
}

.pill {
	display: inline-flex;
	height: 24px;
	padding: 0 var(--spacing-3xs);
	border: 1px solid #DBDFE7;
	border-radius: 4px;
	cursor: grab;
	background: #fff;
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-2xs);

	&:hover {
		box-shadow: 0 2px 6px rgba(68, 28, 23, 0.2);
		background-color: var(--color-foreground-light);
	}

	span {
		display: flex;
		height: 100%;
		align-items: center;

		& > {

		}
	}
}

.label {
	> span {
		margin-left: var(--spacing-3xs);
		padding-left: var(--spacing-3xs);
		border-left: 1px solid #DBDFE7;
	}
}

.labelAlt {
	> span {
		margin-left: var(--spacing-3xs);
		padding-left: var(--spacing-3xs);
		border-left: 1px solid #DBDFE7;
	}
}
</style>
