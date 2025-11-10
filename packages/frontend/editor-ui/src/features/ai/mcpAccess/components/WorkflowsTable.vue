<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { WorkflowListItem, UserAction } from '@/Interface';
import { type TableHeader } from '@n8n/design-system/components/N8nDataTableServer';
import {
	N8nActionBox,
	N8nActionToggle,
	N8nButton,
	N8nDataTableServer,
	N8nHeading,
	N8nIcon,
	N8nLink,
	N8nLoading,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import { VIEWS } from '@/app/constants';
import router from '@/router';
import { isIconOrEmoji, type IconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';

type Props = {
	workflows: WorkflowListItem[];
	loading: boolean;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	removeMcpAccess: [workflow: WorkflowListItem];
	refresh: [];
}>();

const i18n = useI18n();

const tableHeaders = ref<Array<TableHeader<WorkflowListItem>>>([
	{
		title: i18n.baseText('generic.project'),
		key: 'homeProject',
		width: 150,
		disableSort: true,
		value() {
			return;
		},
	},
	{
		title: i18n.baseText('settings.mcp.workflowsTable.workflow'),
		key: 'workflow',
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

const tableActions = ref<Array<UserAction<WorkflowListItem>>>([
	{
		label: i18n.baseText('settings.mcp.workflows.table.action.removeMCPAccess'),
		value: 'removeFromMCP',
	},
]);

const getProjectIcon = (workflow: WorkflowListItem): IconOrEmoji => {
	if (workflow.homeProject?.type === 'personal') {
		return { type: 'icon', value: 'user' };
	} else if (workflow.homeProject?.name) {
		return isIconOrEmoji(workflow.homeProject.icon)
			? workflow.homeProject.icon
			: { type: 'icon', value: 'layers' };
	} else {
		return { type: 'icon', value: 'house' };
	}
};

const getProjectName = (workflow: WorkflowListItem): string => {
	if (workflow.homeProject?.type === 'personal') {
		return i18n.baseText('projects.menu.personal');
	}
	return workflow.homeProject?.name ?? '';
};

const onWorkflowAction = (action: string, workflow: WorkflowListItem) => {
	switch (action) {
		case 'removeFromMCP':
			emit('removeMcpAccess', workflow);
			break;
		default:
			break;
	}
};
</script>

<template>
	<div :class="$style['workflow-table-container']">
		<div v-if="props.loading">
			<N8nLoading :loading="props.loading" variant="h1" class="mb-l" />
			<N8nLoading :loading="props.loading" variant="p" :rows="5" :shrink-last="false" />
		</div>
		<div v-else class="mt-s mb-xl">
			<div :class="[$style.header, 'mb-s']">
				<N8nHeading size="medium" :bold="true">
					{{ i18n.baseText('settings.mcp.available.workflows.heading') }} ({{
						props.workflows.length
					}})
				</N8nHeading>
				<N8nTooltip :content="i18n.baseText('settings.mcp.refresh.tooltip')">
					<N8nButton
						data-test-id="mcp-workflows-refresh-button"
						size="small"
						type="tertiary"
						icon="refresh-cw"
						:square="true"
						@click="$emit('refresh')"
					/>
				</N8nTooltip>
			</div>
			<N8nActionBox
				v-if="props.workflows.length === 0"
				data-test-id="empty-workflow-list-box"
				:heading="i18n.baseText('settings.mcp.empty.title')"
				:description="i18n.baseText('settings.mcp.empty.description')"
			/>
			<N8nDataTableServer
				v-else
				:class="$style['workflow-table']"
				data-test-id="mcp-workflow-table"
				:headers="tableHeaders"
				:items="props.workflows"
				:items-length="props.workflows.length"
			>
				<template #[`item.workflow`]="{ item }">
					<div :class="$style['workflow-cell']" data-test-id="mcp-workflow-cell">
						<span
							v-if="item.parentFolder?.parentFolderId"
							:class="$style['parent-folder']"
							data-test-id="mcp-workflow-grandparent-folder"
						>
							<span :class="$style.ellipsis">...</span>
							<span :class="$style.separator" data-test-id="mcp-workflow-ellipsis-separator"
								>/</span
							>
						</span>
						<span v-if="item.parentFolder" :class="$style['parent-folder']">
							<N8nLink
								v-if="item.homeProject"
								data-test-id="mcp-workflow-folder-link"
								:to="`/projects/${item.homeProject.id}/folders/${item.parentFolder.id}/workflows`"
								:theme="'text'"
								:class="$style['table-link']"
								:new-window="true"
							>
								<N8nText data-test-id="mcp-workflow-folder-name">
									{{ item.parentFolder.name }}
								</N8nText>
							</N8nLink>
							<span v-else>
								<N8nIcon v-if="item.parentFolder" icon="folder" :size="16" color="text-light" />
								<N8nText data-test-id="mcp-workflow-folder-name">
									{{ item.parentFolder.name }}
								</N8nText>
							</span>
						</span>
						<span
							v-if="item.parentFolder"
							:class="$style['separator']"
							data-test-id="mcp-workflow-folder-separator"
							>/</span
						>
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
							:class="$style['table-link']"
						>
							<N8nText data-test-id="mcp-workflow-name">{{ item.name }}</N8nText>
						</N8nLink>
					</div>
				</template>
				<template #[`item.description`]="{ item }">
					<N8nTooltip
						:content="item.description"
						:disabled="!item.description"
						:popper-class="$style['description-popper']"
					>
						<div :class="$style['description-cell']">
							<N8nText data-test-id="mcp-workflow-description">
								{{ item.description || '' }}
							</N8nText>
						</div>
					</N8nTooltip>
				</template>
				<template #[`item.homeProject`]="{ item }">
					<span v-if="item.homeProject">
						<N8nLink
							data-test-id="mcp-workflow-project-link"
							:to="
								router.resolve({
									name: VIEWS.PROJECTS_WORKFLOWS,
									params: { projectId: item.homeProject.id },
								}).fullPath
							"
							:theme="'text'"
							:class="[$style['table-link'], $style['project-link']]"
							:new-window="true"
						>
							<ProjectIcon
								v-if="item.homeProject"
								:icon="getProjectIcon(item)"
								:border-less="true"
							/>
							<N8nText data-test-id="mcp-workflow-project-name">
								{{ getProjectName(item) }}
							</N8nText>
							<N8nIcon
								icon="external-link"
								:class="$style['link-icon']"
								color="text-light"
							></N8nIcon>
						</N8nLink>
					</span>
					<N8nText v-else data-test-id="mcp-workflow-no-project">-</N8nText>
				</template>
				<template #[`item.actions`]="{ item }">
					<N8nActionToggle
						data-test-id="mcp-workflow-action-toggle"
						placement="bottom"
						:actions="tableActions"
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

.workflow-cell,
.parent-folder {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);

	.separator,
	.ellipsis {
		padding-bottom: 1px;
		color: var(--color--text--tint-1);
	}
}

.description-cell {
	display: -webkit-inline-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 3;
	line-clamp: 3;
	overflow: hidden;
	font-style: italic;
}

.description-popper {
	min-width: 300px;
}

.table-link {
	color: var(--color--text);

	:global(.n8n-text) {
		display: flex;
		align-items: center;
		gap: var(--spacing--3xs);

		.link-icon {
			display: none;
		}

		&:hover {
			.link-icon {
				display: inline-flex;
			}
		}
	}

	&.project-link {
		:global(.n8n-text) {
			gap: 0;
		}
		.link-icon {
			margin-left: var(--spacing--3xs);
		}
	}
}
</style>
