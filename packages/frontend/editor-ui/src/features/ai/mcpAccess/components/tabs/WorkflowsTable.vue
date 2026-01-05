<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { WorkflowListItem, UserAction } from '@/Interface';
import { type TableHeader } from '@n8n/design-system/components/N8nDataTableServer';
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
	loading: boolean;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	removeMcpAccess: [workflow: WorkflowListItem];
	connectWorkflows: [];
	updateDescription: [workflow: WorkflowListItem];
}>();

const i18n = useI18n();

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
	<div :class="$style['workflow-table-container']">
		<div v-if="props.loading">
			<N8nLoading :loading="props.loading" variant="h1" class="mb-l" />
			<N8nLoading :loading="props.loading" variant="p" :rows="5" :shrink-last="false" />
		</div>
		<div v-else class="mt-s mb-xl">
			<N8nDataTableServer
				:class="$style['workflow-table']"
				data-test-id="mcp-workflow-table"
				:headers="tableHeaders"
				:items="props.workflows"
				:items-length="props.workflows.length"
			>
				<template v-if="props.workflows.length === 0" #cover>
					<div :class="$style['empty-state']">
						<N8nText data-test-id="mcp-workflow-table-empty-state" size="large" color="text-base">
							{{ i18n.baseText('settings.mcp.workflows.table.empty.title') }}
						</N8nText>
						<N8nButton
							data-test-id="mcp-workflow-table-empty-state-button"
							type="primary"
							:label="i18n.baseText('settings.mcp.workflows.table.empty.button.label')"
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
									params: { name: item.id },
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
							:workflow-name="item.name"
							:home-project="item.homeProject"
							:parent-folder="item.parentFolder"
							:as-links="true"
						/>
					</div>
				</template>
				<template #[`item.description`]="{ item }">
					<N8nTooltip
						:content="
							item.description ||
							i18n.baseText('settings.mcp.workflows.table.column.description.emptyTooltip')
						"
						:show-after="MCP_TOOLTIP_DELAY"
						:popper-class="$style['description-popper']"
					>
						<div
							data-test-id="mcp-workflow-description-cell"
							:class="$style['description-cell']"
							@click="emit('updateDescription', item)"
						>
							<span v-if="item.description">
								<N8nText data-test-id="mcp-workflow-description">
									{{ item.description }}
								</N8nText>
							</span>
							<span v-else>
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
.workflow-table-container {
	:global(.table-pagination) {
		display: none;
	}
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.workflow-table {
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
	display: -webkit-inline-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 3;
	line-clamp: 3;
	overflow: hidden;
	color: var(--color--text);
	padding: var(--spacing--2xs) 0;
	cursor: pointer;

	&:hover span {
		color: var(--color--text--shade-1);
	}

	span {
		display: flex;
		align-items: center;
	}
}

.description-popper {
	min-width: 300px;
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
