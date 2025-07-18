<script lang="ts" setup>
import { ref, computed } from 'vue';

import type { TableHeader } from '@n8n/design-system/components/N8nDataTableServer';

type WorkflowData = Array<{
	name: string;
	owner: string[];
	status: string;
}>;

const props = defineProps<{
	data: WorkflowData;
}>();

const sortBy = defineModel<Array<{ id: 'name' | 'owner' | 'status'; desc: boolean }>>('sortBy');

const sortedItems = computed(() => {
	if (!sortBy?.value?.length) return props.data;

	const [{ id, desc }] = sortBy.value;

	return [...props.data].sort((a, b) => {
		if (a[id] < b[id]) return desc ? 1 : -1;
		if (a[id] > b[id]) return desc ? -1 : 1;
		return 0;
	});
});

const headers = ref<Array<TableHeader<{ name: string; owner: string[]; status: string }>>>([
	{
		title: 'Workflow',
		key: 'name',
		width: 250,
	},
	{
		title: 'Owner',
		key: 'owner',
		width: 100,
	},
	{
		title: 'Status',
		key: 'status',
		width: 30,
	},
]);
</script>

<template>
	<div>
		<N8nDataTableServer
			v-if="sortedItems?.length"
			v-model:sort-by="sortBy"
			:headers="headers"
			:items="sortedItems"
			:items-length="sortedItems.length"
			:page-sizes="[sortedItems.length + 1]"
		>
			<template #[`item.name`]="{ item }">
				<N8nText>{{ item.name }}</N8nText>
			</template>
			<template #[`item.owner`]="{ item }">
				<N8nText>{{ item.owner.join(', ') }}</N8nText>
			</template>
			<template #[`item.status`]="{ item }">
				<span v-if="item.status === 'Active'" class="status active">Active</span>
				<span v-else class="status inactive">Inactive</span>
			</template>
		</N8nDataTableServer>
	</div>
</template>

<style scoped>
/* Use deep selector to access internal scroll container in N8nDataTableServer */
:deep(.n8n-data-table-server-wrapper .table-scroll) {
	max-height: 275px;
	overflow-y: auto;
	overflow-x: hidden;
}

.status {
	border-style: solid;
	border-width: var(--border-width-base);
	padding: var(--spacing-4xs);
	border-radius: var(--border-radius-base);
}

.active {
	color: var(--color-primary);
}

.inactive {
	color: var(--color-text-light);
}
</style>
