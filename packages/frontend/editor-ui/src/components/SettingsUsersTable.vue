<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { UsersList } from '@n8n/api-types';
import N8nDataTableServer, {
	type TableHeader,
} from '@n8n/design-system/components/N8nDataTableServer/N8nDataTableServer.vue';

type Item = UsersList['data'][number];

const props = defineProps<{
	data: UsersList;
	loading?: boolean;
}>();

const emit = defineEmits<{
	'update:options': [
		payload: {
			page: number;
			itemsPerPage: number;
			sortBy: Array<{ id: string; desc: boolean }>;
		},
	];
}>();

const sortBy = ref<Array<{ id: string; desc: boolean }>>([]);
const currentPage = ref(0);
const itemsPerPage = ref(25);

const rows = computed(() => props.data.data);
const headers = ref<Array<TableHeader<Item>>>([]);
</script>

<template>
	<div>
		<N8nDataTableServer
			v-model:sort-by="sortBy"
			v-model:page="currentPage"
			v-model:items-per-page="itemsPerPage"
			:items="rows"
			:headers="headers"
			:items-length="data.count"
			@update:options="emit('update:options', $event)"
		/>
	</div>
</template>

<style lang="scss" module></style>
