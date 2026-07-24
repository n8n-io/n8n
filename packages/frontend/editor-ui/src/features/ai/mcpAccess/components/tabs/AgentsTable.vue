<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { UserAction } from '@/Interface';
import type { Agent } from '@/features/agents/agent.types';
import type { TableHeader, TableOptions } from '@n8n/design-system/components/N8nDataTableServer';
import {
	N8nActionToggle,
	N8nButton,
	N8nDataTableServer,
	N8nLink,
	N8nLoading,
	N8nText,
} from '@n8n/design-system';
import SelectedItemsInfo from '@/app/components/common/SelectedItemsInfo.vue';
import { AGENT_VIEW, PROJECT_AGENTS } from '@/features/agents/constants';
import router from '@/app/router';

type Props = {
	agents: Agent[];
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
	removeMcpAccess: [agent: Agent];
	bulkRemoveMcpAccess: [agentIds: string[]];
	connectAgents: [];
	'update:options': [payload: TableOptions];
}>();

const i18n = useI18n();

const itemsLength = computed(() => props.totalCount ?? props.agents.length);

const selectedAgentIds = ref<string[]>([]);

// Selection references loaded rows, so any data reload invalidates it
watch(
	() => props.agents,
	() => {
		selectedAgentIds.value = [];
	},
);

const clearSelection = () => {
	selectedAgentIds.value = [];
};

const onBulkRemoveMcpAccess = () => {
	emit('bulkRemoveMcpAccess', selectedAgentIds.value);
};

const tableHeaders = ref<Array<TableHeader<Agent>>>([
	{
		title: i18n.baseText('settings.mcp.agents.table.column.name'),
		key: 'agent',
		width: 300,
		disableSort: true,
		value() {
			return;
		},
	},
	{
		title: i18n.baseText('settings.mcp.agents.table.column.location'),
		key: 'location',
		width: 300,
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

const availableActions: Array<UserAction<Agent>> = [
	{
		label: i18n.baseText('settings.mcp.agents.table.action.removeMCPAccess'),
		value: 'removeFromMCP',
	},
];

const onAgentAction = (action: string, agent: Agent) => {
	if (action === 'removeFromMCP') {
		emit('removeMcpAccess', agent);
	}
};

const onConnectClick = () => {
	emit('connectAgents');
};

const agentLink = (agent: Agent) =>
	router.resolve({
		name: AGENT_VIEW,
		params: { projectId: agent.projectId, agentId: agent.id },
	}).fullPath;

const projectName = (agent: Agent) =>
	agent.project?.type === 'personal'
		? i18n.baseText('projects.menu.personal')
		: (agent.project?.name ?? '');

const projectLink = (agent: Agent) =>
	router.resolve({
		name: PROJECT_AGENTS,
		params: { projectId: agent.projectId },
	}).fullPath;
</script>

<template>
	<div>
		<div v-if="props.loading">
			<N8nLoading :loading="props.loading" variant="h1" class="mb-l" />
			<N8nLoading :loading="props.loading" variant="p" :rows="5" :shrink-last="false" />
		</div>
		<div v-else class="mt-s mb-xl" :class="$style['table-container']">
			<N8nDataTableServer
				v-model:sort-by="tableSortBy"
				v-model:page="tablePage"
				v-model:items-per-page="tableItemsPerPage"
				v-model:selection="selectedAgentIds"
				:class="$style['agent-table']"
				data-test-id="mcp-agent-table"
				:headers="tableHeaders"
				:items="props.agents"
				:items-length="itemsLength"
				:page-sizes="[10, 25, 50]"
				:show-select="itemsLength > 0"
				@update:options="emit('update:options', $event)"
			>
				<template v-if="itemsLength === 0" #cover>
					<div :class="$style['empty-state']">
						<N8nText data-test-id="mcp-agent-table-empty-state" size="large" color="text-base">
							{{ i18n.baseText('settings.mcp.agents.table.empty.title') }}
						</N8nText>
						<N8nText
							data-test-id="mcp-agent-table-empty-state-description"
							size="small"
							color="text-base"
						>
							{{ i18n.baseText('settings.mcp.agents.table.empty.description') }}
						</N8nText>
						<N8nButton
							variant="solid"
							data-test-id="mcp-agent-table-empty-state-button"
							:label="i18n.baseText('settings.mcp.connectAgents')"
							@click="onConnectClick"
						/>
					</div>
				</template>
				<template #[`item.agent`]="{ item }">
					<div :class="$style['agent-cell']" data-test-id="mcp-agent-cell">
						<N8nLink
							data-test-id="mcp-agent-name-link"
							:new-window="true"
							:to="agentLink(item)"
							:theme="'text'"
							:class="[$style['table-link'], $style.truncate]"
						>
							<N8nText :class="$style.truncate" data-test-id="mcp-agent-name">{{
								item.name
							}}</N8nText>
						</N8nLink>
					</div>
				</template>
				<template #[`item.location`]="{ item }">
					<div :class="$style['location-cell']" data-test-id="mcp-agent-location-cell">
						<N8nLink
							data-test-id="mcp-agent-project-link"
							:new-window="true"
							:to="projectLink(item)"
							:theme="'text'"
							:class="[$style['table-link'], $style.truncate]"
						>
							<N8nText :class="$style.truncate" data-test-id="mcp-agent-project-name">{{
								projectName(item)
							}}</N8nText>
						</N8nLink>
					</div>
				</template>
				<template #[`item.actions`]="{ item }">
					<N8nActionToggle
						:class="$style['action-toggle']"
						data-test-id="mcp-agent-action-toggle"
						placement="bottom"
						:actions="availableActions"
						theme="dark"
						@action="onAgentAction($event, item)"
					/>
				</template>
			</N8nDataTableServer>
			<SelectedItemsInfo
				:class="$style['selection-bar']"
				:selected-count="selectedAgentIds.length"
				@clear-selection="clearSelection"
			>
				<template #actions>
					<N8nButton
						variant="subtle"
						data-test-id="mcp-bulk-remove-agent-access-button"
						:label="i18n.baseText('settings.mcp.agents.table.action.removeMCPAccess')"
						@click="onBulkRemoveMcpAccess"
					/>
				</template>
			</SelectedItemsInfo>
		</div>
	</div>
</template>

<style module lang="scss">
// The selection bar's default absolute positioning assumes a tall anchor
// container and overlaps the header when the table is short. Sticky keeps
// it below the table, floating at the viewport bottom only while a long
// table extends past it.
.table-container .selection-bar {
	position: sticky;
	bottom: var(--spacing--3xl);
	left: auto;
	transform: none;
	width: fit-content;
	margin: 0 auto;
}

.agent-table {
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

.agent-cell {
	display: flex;
	padding: var(--spacing--2xs) 0;
	min-width: 0;
	overflow: hidden;
}

.location-cell {
	display: flex;
	padding: var(--spacing--2xs) 0;
	min-width: 0;
	overflow: hidden;
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
