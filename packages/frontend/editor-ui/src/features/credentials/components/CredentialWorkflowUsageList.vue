<script setup lang="ts">
import type { CredentialUsageWorkflow } from '../credentials.types';
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '@/app/constants';
import TimeAgo from '@/app/components/TimeAgo.vue';
import type { TableHeader } from '@n8n/design-system/components/N8nDataTableServer';
import { N8nBadge, N8nDataTableServer, N8nTooltip } from '@n8n/design-system';
import { RouterLink } from 'vue-router';

type UsageRow = CredentialUsageWorkflow & {
	statusKey: 'archived' | 'active' | 'inactive';
	projectLabel: string;
};

const props = defineProps<{
	workflows: CredentialUsageWorkflow[];
}>();

const i18n = useI18n();

const rows = computed<UsageRow[]>(() =>
	props.workflows.map((workflow) => ({
		...workflow,
		statusKey: workflow.isArchived ? 'archived' : workflow.active ? 'active' : 'inactive',
		projectLabel:
			workflow.homeProject?.name ?? i18n.baseText('credentialUsage.table.projectFallback'),
	})),
);

const headers = computed<Array<TableHeader<UsageRow>>>(() => [
	{
		title: i18n.baseText('credentialUsage.table.columns.workflow'),
		key: 'name',
		width: 220,
	},
	{
		title: i18n.baseText('credentialUsage.table.columns.project'),
		key: 'projectLabel',
		width: 180,
	},
	{
		title: i18n.baseText('credentialUsage.table.columns.status'),
		key: 'statusKey',
		width: 120,
	},
	{
		title: i18n.baseText('credentialUsage.table.columns.updated'),
		key: 'updatedAt',
		width: 150,
	},
	{
		title: i18n.baseText('credentialUsage.table.columns.access'),
		key: 'currentUserHasAccess',
		width: 160,
	},
]);

const getWorkflowRoute = (workflowId: string) => ({
	name: VIEWS.WORKFLOW,
	params: { name: workflowId },
});

const statusTheme = {
	active: 'success',
	inactive: 'warning',
	archived: 'tertiary',
} as const;

const getStatusLabel = (status: UsageRow['statusKey']) => {
	if (status === 'archived') {
		return i18n.baseText('credentialUsage.table.status.archived');
	}
	if (status === 'active') {
		return i18n.baseText('credentialUsage.table.status.active');
	}
	return i18n.baseText('credentialUsage.table.status.inactive');
};
</script>

<template>
	<div>
		<N8nDataTableServer
			v-if="rows.length"
			:headers="headers"
			:items="rows"
			:items-length="rows.length"
			:page-sizes="[rows.length]"
			:rows-per-page="rows.length"
			:hide-pagination="true"
			stripe
			class="usage-table"
		>
			<template #[`item.name`]="{ item }">
				<RouterLink
					v-if="item.currentUserHasAccess"
					:to="getWorkflowRoute(item.id)"
					class="usage-link"
				>
					{{ item.name }}
				</RouterLink>
				<span v-else class="usage-link usage-link--disabled">{{ item.name }}</span>
			</template>
			<template #[`item.projectLabel`]="{ item }">
				<span v-n8n-truncate:28>{{ item.projectLabel }}</span>
			</template>
			<template #[`item.statusKey`]="{ item }">
				<N8nBadge size="small" :theme="statusTheme[item.statusKey]" class="status-badge">
					{{ getStatusLabel(item.statusKey) }}
				</N8nBadge>
			</template>
			<template #[`item.updatedAt`]="{ item }">
				<TimeAgo :date="item.updatedAt" :capitalize="true" />
			</template>
			<template #[`item.currentUserHasAccess`]="{ item }">
				<N8nTooltip
					v-if="!item.currentUserHasAccess"
					placement="top"
					:content="i18n.baseText('credentialUsage.table.access.denied.tooltip')"
				>
					<N8nBadge size="small" theme="warning">
						{{ i18n.baseText('credentialUsage.table.access.denied') }}
					</N8nBadge>
				</N8nTooltip>
				<N8nBadge v-else size="small" theme="success">
					{{ i18n.baseText('credentialUsage.table.access.allowed') }}
				</N8nBadge>
			</template>
		</N8nDataTableServer>
	</div>
</template>

<style scoped lang="scss">
.usage-table {
	margin-top: var(--spacing--md);

	:deep(.n8n-data-table-server-wrapper .table-scroll) {
		max-height: 320px;
		overflow-y: auto;
	}
}

.usage-link {
	color: var(--color--text);
	text-decoration: underline;

	&--disabled {
		cursor: default;
		text-decoration: none;
		color: var(--color--text--shade-1);
	}
}

.status-badge {
	text-transform: capitalize;
}
</style>
