<script lang="ts" setup>
import { ref, computed } from 'vue';
import type { TableHeader } from '@n8n/design-system/components/N8nDataTableServer';
import type { RouteLocationRaw } from 'vue-router';
import { VIEWS } from '@/constants';
import type { WorkflowResource } from '@/Interface';
import ProjectCardBadge from '@/features/projects/components/ProjectCardBadge.vue';
import { useI18n } from '@n8n/i18n';
import { ResourceType } from '@/features/projects/projects.utils';
import { useProjectsStore } from '@/features/projects/projects.store';

import { N8nDataTableServer, N8nText } from '@n8n/design-system';
type WorkflowData = WorkflowResource[];

type WorkflowDataItem = WorkflowData[number];

type WorkflowDataKeys = keyof WorkflowDataItem;

const props = defineProps<{
	data: WorkflowData;
}>();

const sortBy = defineModel<Array<{ id: WorkflowDataKeys; desc: boolean }>>('sortBy');

const i18n = useI18n();
const projectsStore = useProjectsStore();

const headers = ref<Array<TableHeader<WorkflowDataItem>>>([
	{
		title: 'Workflow',
		key: 'name',
		width: 250,
	},
	{
		title: 'Owner',
		key: 'homeProject.name',
		width: 100,
	},
	{
		title: 'Status',
		key: 'active',
		width: 30,
	},
]);

const sortedItems = computed(() => {
	if (!sortBy?.value?.length) return props.data;

	const [{ id, desc }] = sortBy.value;

	return [...props.data].sort((a, b) => {
		if (!a[id] || !b[id]) return 0;
		if (a[id] < b[id]) return desc ? 1 : -1;
		if (a[id] > b[id]) return desc ? -1 : 1;
		return 0;
	});
});

const getWorkflowLink = (workflowId: string): RouteLocationRaw => ({
	name: VIEWS.WORKFLOW,
	params: {
		name: workflowId,
	},
});
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
				<RouterLink :to="getWorkflowLink(item.id)" target="_blank">
					<N8nText class="ellipsis" style="color: var(--color--text)">{{ item.name }}</N8nText>
				</RouterLink>
			</template>
			<template #[`item.homeProject.name`]="{ item }">
				<div>
					<ProjectCardBadge
						class="cardBadge"
						:resource="item"
						:resource-type="ResourceType.Workflow"
						:resource-type-label="i18n.baseText('generic.workflow').toLowerCase()"
						:personal-project="projectsStore.personalProject"
						:show-badge-border="false"
					/>
				</div>
			</template>
			<template #[`item.active`]="{ item }">
				<span v-if="item.active" class="status active">Active</span>
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
	border-width: var(--border-width);
	padding: var(--spacing--4xs);
	border-radius: var(--radius);
}

.active {
	color: var(--color--primary);
}

.inactive {
	color: var(--color--text--tint-1);
}

.ellipsis {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: 1.2;
	width: fit-content;
	max-width: 100%;
}

.cardBadge {
	margin-right: auto;
	width: fit-content;
}
</style>
