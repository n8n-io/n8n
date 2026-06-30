<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { WorkflowListItem, UserAction } from '@/Interface';
import type { TableHeader, TableOptions } from '@n8n/design-system/components/N8nDataTableServer';
import {
	N8nActionToggle,
	N8nButton,
	N8nDataTableServer,
	N8nIcon,
	N8nLink,
	N8nLoading,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { VIEWS } from '@/app/constants';
import WorkflowLocation from '@/features/ai/mcpAccess/components/WorkflowLocation.vue';
import { MCP_TOOLTIP_DELAY } from '@/features/ai/mcpAccess/mcp.constants';
import router from '@/app/router';
import { getResourcePermissions } from '@n8n/permissions';

type Props = {
	workflows: WorkflowListItem[];
	totalCount?: number;
	loading: boolean;
};

const props = defineProps<Props>();

const tableOptions = defineModel<TableOptions>('tableOptions', {
	default: () => ({
		page: 0,
		itemsPerPage: 10,
		sortBy: [],
	}),
});

const tablePage = computed({
	get: () => tableOptions.value.page,
	set: (page: number) => {
		tableOptions.value = { ...tableOptions.value, page };
	},
});

const tableItemsPerPage = computed({
	get: () => tableOptions.value.itemsPerPage,
	set: (itemsPerPage: number) => {
		tableOptions.value = { ...tableOptions.value, itemsPerPage };
	},
});

const tableSortBy = computed({
	get: () => tableOptions.value.sortBy,
	set: (sortBy: TableOptions['sortBy']) => {
		tableOptions.value = { ...tableOptions.value, sortBy };
	},
});

const emit = defineEmits<{
	removeMcpAccess: [workflow: WorkflowListItem];
	connectWorkflows: [];
	updateDescription: [workflow: WorkflowListItem];
	'update:options': [payload: TableOptions];
}>();

const i18n = useI18n();

const itemsLength = computed(() => props.totalCount ?? props.workflows.length);

const tableHeaders = ref<Array<TableHeader<WorkflowListItem>>>([
	{
		title: i18n.baseText('settings.mcp.workflows.table.column.name'),
		key: 'workflow',
		width: 150,
		disableSort: true,
		value() {
			return;
		},
	},
	{
		title: i18n.baseText('settings.mcp.workflows.table.column.location'),
		key: 'location',
		width: 200,
		disableSort: true,
		value() {
			return;
		},
	},
	{
		title: i18n.baseText('generic.description'),
		key: 'description',
		width: 350,
		disableSort: true,
		value() {
			return;
		},
	},
	{
		title: '',
		key: 'actions',
		align: 'end',
		width: 50,
		disableSort: true,
		value() {
			return;
		},
	},
]);

const getAvailableActions = (workflow: WorkflowListItem): Array<UserAction<WorkflowListItem>> => {
	const permissions = getResourcePermissions(workflow.scopes);

	return [
		{
			label: i18n.baseText('settings.mcp.workflows.table.action.removeMCPAccess'),
			value: 'removeFromMCP',
			disabled: !permissions.workflow.update,
		},
		{
			label: i18n.baseText('settings.mcp.workflows.table.action.updateDescription'),
			value: 'updateDescription',
			disabled: !permissions.workflow.update,
		},
	];
};

const onWorkflowAction = (action: string, workflow: WorkflowListItem) => {
	switch (action) {
		case 'removeFromMCP':
			emit('removeMcpAccess', workflow);
			break;
		case 'updateDescription':
			emit('updateDescription', workflow);
			break;
		default:
			break;
	}
};

const onConnectClick = () => {
	emit('connectWorkflows');
};
</script>

<template>
	<div>
		<div v-if="props.loading">
			<N8nLoading :loading="props.loading" variant="h1" class="mb-l" />
			<N8nLoading :loading="props.loading" variant="p" :rows="5" :shrink-last="false" />
		</div>
		<div v-else class="mt-s mb-xl">
			<N8nDataTableServer
				v-model:sort-by="tableSortBy"
				v-model:page="tablePage"
				v-model:items-per-page="tableItemsPerPage"
				:class="$style['workflow-table']"
				data-test-id="mcp-workflow-table"
				:headers="tableHeaders"
				:items="props.workflows"
				:items-length="itemsLength"
				:page-sizes="[10, 25, 50]"
				@update:options="emit('update:options', $event)"
			>
				<template v-if="itemsLength === 0" #cover>
					<div :class="$style['empty-state']">
						<N8nText data-test-id="mcp-workflow-table-empty-state" size="large" color="text-base">
							{{ i18n.baseText('settings.mcp.workflows.table.empty.title') }}
						</N8nText>
						<N8nText
							data-test-id="mcp-workflow-table-empty-state-description"
							size="small"
							color="text-base"
						>
							{{ i18n.baseText('settings.mcp.workflows.table.empty.description') }}
						</N8nText>
						<N8nButton
							variant="solid"
							data-test-id="mcp-workflow-table-empty-state-button"
							:label="i18n.baseText('settings.mcp.connectWorkflows')"
							@click="onConnectClick"
						/>
					</div>
				</template>
				<template #[`item.workflow`]="{ item }">
					<div :class="$style['workflow-cell']" data-test-id="mcp-workflow-cell">
						<N8nLink
							data-test-id="mcp-workflow-name-link"
							:new-window="true"
							:to="
								router.resolve({
									name: VIEWS.WORKFLOW,
									params: { workflowId: item.id },
								}).fullPath
							"
							:theme="'text'"
							:class="[$style['table-link'], $style.truncate]"
						>
							<N8nText :class="$style.truncate" data-test-id="mcp-workflow-name">{{
								item.name
							}}</N8nText>
						</N8nLink>
					</div>
				</template>
				<template #[`item.location`]="{ item }">
					<div :class="$style['location-cell']" data-test-id="mcp-workflow-location-cell">
						<WorkflowLocation
							:workflow-id="item.id"
							:home-project="item.homeProject"
							:parent-folder="item.parentFolder"
							:as-links="true"
						/>
					</div>
				</template>
				<template #[`item.description`]="{ item }">
					<!-- as-child anchors the tooltip to the cell content itself, keeping it
						above the cell instead of positioning against an inline wrapper span -->
					<N8nTooltip
						:content="
							item.description
								? i18n.baseText('settings.mcp.workflows.table.column.description.editTooltip')
								: i18n.baseText('settings.mcp.workflows.table.column.description.emptyTooltip')
						"
						:show-after="MCP_TOOLTIP_DELAY"
						as-child
					>
						<div
							data-test-id="mcp-workflow-description-cell"
							:class="$style['description-cell']"
							@click="emit('updateDescription', item)"
						>
							<N8nText
								v-if="item.description"
								:class="$style['description-text']"
								data-test-id="mcp-workflow-description"
							>
								{{ item.description }}
							</N8nText>
							<span v-else :class="$style['empty-description']">
								<N8nIcon icon="triangle-alert" :size="14" color="warning" class="mr-2xs" />
								<N8nText data-test-id="mcp-workflow-description-empty">
									{{
										i18n.baseText('settings.mcp.workflows.table.column.description.emptyContent')
									}}
								</N8nText>
							</span>
						</div>
					</N8nTooltip>
				</template>
				<template #[`item.actions`]="{ item }">
					<N8nActionToggle
						:class="$style['action-toggle']"
						data-test-id="mcp-workflow-action-toggle"
						placement="bottom"
						:actions="getAvailableActions(item)"
						theme="dark"
						@action="onWorkflowAction($event, item)"
					/>
				</template>
			</N8nDataTableServer>
		</div>
	</div>
</template>

<style module lang="scss">
.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.workflow-table {
	margin-bottom: var(--spacing--sm);

	:global(.table-scroll) {
		overflow-y: hidden;
	}

	tr:last-child {
		border-bottom: none !important;
	}
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--lg) 0;
	min-height: 250px;
}

.workflow-cell {
	display: flex;
	padding: var(--spacing--2xs) 0;
	min-width: 0;
	overflow: hidden;
}

.location-cell {
	padding: var(--spacing--2xs) 0;
}

.description-cell {
	// Shrink to the text so the tooltip is anchored near it, not centered on the column
	display: inline-block;
	max-width: 100%;
	color: var(--color--text);
	padding: var(--spacing--2xs) 0;
	cursor: pointer;

	&:hover span {
		color: var(--color--text--shade-1);
	}
}

// Line clamping only works on inline content, so it has to live on the
// text element itself rather than on a wrapper with non-inline children
.description-text {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 3;
	line-clamp: 3;
	overflow: hidden;
	word-break: break-word;
}

.empty-description {
	display: flex;
	align-items: center;
}

.table-link {
	color: var(--color--text);
}

.truncate {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}
</style>
