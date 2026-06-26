<script setup lang="ts">
import { computed } from 'vue';
import { N8nOption, N8nSelect } from '@n8n/design-system';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { LogEntry } from '@/features/execution/logs/logs.types';

const props = defineProps<{
	entries: LogEntry[];
	modelValue: number;
	ariaLabel?: string;
}>();

const emit = defineEmits<{
	'update:model-value': [value: number];
}>();

const nodeTypesStore = useNodeTypesStore();

const options = computed(() =>
	props.entries.map((entry, index) => ({
		index,
		name: entry.node.name,
		type: nodeTypesStore.getNodeType(entry.node.type, entry.node.typeVersion),
	})),
);

const selectedType = computed(() => options.value[props.modelValue]?.type ?? null);

function onChange(value: unknown) {
	emit('update:model-value', Number(value));
}
</script>

<template>
	<N8nSelect
		:model-value="modelValue"
		:aria-label="ariaLabel"
		:class="$style.select"
		size="small"
		teleported
		data-test-id="logs-group-port-select"
		@update:model-value="onChange"
	>
		<template #prefix>
			<NodeIcon :node-type="selectedType" :size="14" :shrink="false" />
		</template>
		<N8nOption
			v-for="option of options"
			:key="option.index"
			:value="option.index"
			:label="option.name"
			:class="$style.option"
			data-test-id="logs-group-port-option"
		>
			<NodeIcon :node-type="option.type" :size="14" :shrink="false" :class="$style.icon" />
			<span :class="$style.title">{{ option.name }}</span>
		</N8nOption>
	</N8nSelect>
</template>

<style lang="scss" module>
.select {
	max-width: 224px;

	:global(.el-input--suffix .el-input__inner) {
		padding-left: calc(var(--spacing--lg) + var(--spacing--4xs));
	}
}

.option {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
}

.icon {
	padding-right: var(--spacing--4xs);
}

.title {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	color: var(--color--text--shade-1);
}
</style>
