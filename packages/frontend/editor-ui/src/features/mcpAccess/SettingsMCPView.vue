<script setup lang="ts">
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useToast } from '@/composables/useToast';
import type { UserAction, WorkflowListItem } from '@/Interface';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { type TableHeader } from '@n8n/design-system/components/N8nDataTableServer';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref } from 'vue';
import { useClipboard } from '@vueuse/core';
import { VIEWS } from '@/constants';
import router from '@/router';
import { isIconOrEmoji, type IconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';
import { useMCPStore } from '@/features/mcpAccess/mcp.store';
import { useUsersStore } from '@/stores/users.store';

const i18n = useI18n();
const toast = useToast();
const documentTitle = useDocumentTitle();

const { copy, copied, isSupported } = useClipboard();

const workflowsStore = useWorkflowsStore();
const mcpStore = useMCPStore();
const usersStore = useUsersStore();
const isOwner = computed(() => usersStore.isInstanceOwner);
const rootStore = useRootStore();

const workflowsLoading = ref(false);

const availableWorkflows = ref<WorkflowListItem[]>([]);

const tableHeaders = ref<Array<TableHeader<WorkflowListItem>>>([
	{
		title: i18n.baseText('_reusableBaseText.name'),
		key: 'name',
		width: 200,
		disableSort: true,
		value() {
			return;
		},
	},
	{
		title: i18n.baseText('generic.folder'),
		key: 'parentFolder',
		width: 200,
		disableSort: true,
		value() {
			return;
		},
	},
	{
		title: i18n.baseText('generic.project'),
		key: 'homeProject',
		width: 200,
		disableSort: true,
		value() {
			return;
		},
	},
	{
		title: i18n.baseText('workflowDetails.active'),
		key: 'active',
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

const connectionString = ref(`
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "supergateway",
        "--streamableHttp",
        "${rootStore.urlBaseEditor}rest/mcp-control/mcp",
        "--header",
        "authorization:<YOUR_N8N_API_KEY>",
      ]
    }
  }
}
`);

const connectionCode = computed(() => {
	return `\`\`\`json${connectionString.value}\`\`\``;
});

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

const fetchAvailableWorkflows = async () => {
	workflowsLoading.value = true;
	try {
		const workflows = await mcpStore.fetchWorkflowsAvailableForMCP(1, 200);
		availableWorkflows.value = workflows;
	} catch (error) {
		toast.showError(error, 'Error fetching workflows');
	} finally {
		workflowsLoading.value = false;
	}
};

const onUpdateMCPEnabled = async (value: boolean) => {
	const updated = await mcpStore.setMcpAccessEnabled(value);
	if (updated) {
		await fetchAvailableWorkflows();
	} else {
		workflowsLoading.value = false;
	}
};

const onWorkflowAction = async (action: string, workflow: WorkflowListItem) => {
	switch (action) {
		case 'removeFromMCP':
			try {
				await workflowsStore.updateWorkflowSetting(workflow.id, 'availableInMCP', false);
				await fetchAvailableWorkflows();
			} catch (error) {
				toast.showError(error, i18n.baseText('workflowSettings.toggleMCP.error.title'));
			}
			break;
		default:
			break;
	}
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.mcp'));
	if (mcpStore.mcpAccessEnabled) await fetchAvailableWorkflows();
});
</script>
<template>
	<div :class="$style.container">
		<div :class="$style.headingContainer">
			<n8n-heading size="2xlarge">{{ i18n.baseText('settings.mcp') }}</n8n-heading>
		</div>
		<div :class="$style.mainToggleContainer">
			<div :class="$style.mainToggleInfo">
				<n8n-text :bold="true">{{ i18n.baseText('settings.mcp.toggle.label') }}</n8n-text>
				<n8n-text size="small" color="text-light">
					{{ i18n.baseText('settings.mcp.toggle.description') }}
				</n8n-text>
			</div>
			<div :class="$style.mainTooggle">
				<N8nTooltip :disabled="isOwner" placement="top">
					<template #content>
						<span>{{ i18n.baseText('settings.mcp.toggle.disabled.tooltip') }}</span>
					</template>
					<div>
						<el-switch
							:model-value="mcpStore.mcpAccessEnabled"
							size="large"
							data-test-id="enable-n8n-mcp"
							:disabled="!isOwner"
							@update:model-value="onUpdateMCPEnabled"
						/>
					</div>
				</N8nTooltip>
			</div>
		</div>
		<div v-if="mcpStore.mcpAccessEnabled" :class="$style.connectionStringContainer">
			<div :class="$style.connectionStringLabel">
				<n8n-text
					v-n8n-html="
						i18n.baseText('settings.mcp.how.to.connect', {
							interpolate: {
								docsURL: 'https://docs.n8n.io/',
							},
						})
					"
				>
				</n8n-text>
			</div>
			<div :class="[$style.settingsContainer, $style.connectionString]">
				<n8n-markdown :content="connectionCode"></n8n-markdown>
				<n8n-button
					v-if="isSupported"
					type="tertiary"
					:icon="copied ? 'check' : 'copy'"
					:square="true"
					:class="$style['copy-button']"
					@click="copy(connectionString)"
				/>
			</div>
		</div>
		<div v-if="mcpStore.mcpAccessEnabled" :class="$style['workflow-list-container']">
			<div v-if="workflowsLoading">
				<n8n-loading
					v-if="workflowsLoading"
					:loading="workflowsLoading"
					variant="h1"
					class="mb-l"
				/>
				<n8n-loading
					v-if="workflowsLoading"
					:loading="workflowsLoading"
					variant="p"
					:rows="5"
					:shrink-last="false"
				/>
			</div>
			<div v-else class="mt-s mb-xl">
				<div :class="[$style.header, 'mb-s']">
					<n8n-heading size="medium" :bold="true">
						{{ i18n.baseText('settings.mcp.available.workflows.heading') }}
					</n8n-heading>
				</div>
				<n8n-action-box
					v-if="availableWorkflows.length === 0"
					data-test-id="empty-shared-action-box"
					:heading="i18n.baseText('settings.mcp.empty.title')"
					:description="i18n.baseText('settings.mcp.empty.description')"
				/>
				<N8nDataTableServer
					v-else
					:headers="tableHeaders"
					:items="availableWorkflows"
					:items-length="availableWorkflows.length"
				>
					<template #[`item.name`]="{ item }">
						<n8n-link
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
							{{ item.name }}
							<n8n-icon
								icon="external-link"
								:class="$style['link-icon']"
								color="text-light"
							></n8n-icon>
						</n8n-link>
					</template>
					<template #[`item.parentFolder`]="{ item }">
						<span v-if="item.parentFolder" :class="$style['folder-cell']">
							<n8n-link
								v-if="item.homeProject"
								:to="`/projects/${item.homeProject.id}/folders/${item.parentFolder.id}/workflows`"
								:theme="'text'"
								:class="$style['table-link']"
								:new-window="true"
							>
								{{ item.parentFolder.name }}
								<n8n-icon
									icon="external-link"
									:class="$style['link-icon']"
									color="text-light"
								></n8n-icon>
							</n8n-link>
							<span v-else>
								<n8n-icon v-if="item.parentFolder" icon="folder" :size="16" color="text-light" />
								{{ item.parentFolder.name }}
							</span>
						</span>
						<span v-else>-</span>
					</template>
					<template #[`item.homeProject`]="{ item }">
						<span v-if="item.homeProject" :class="$style['folder-cell']">
							<n8n-link
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
								{{ getProjectName(item) }}
								<n8n-icon
									icon="external-link"
									:class="$style['link-icon']"
									color="text-light"
								></n8n-icon>
							</n8n-link>
						</span>
						<span v-else>-</span>
					</template>
					<template #[`item.active`]="{ item }">
						<n8n-icon
							:icon="item.active ? 'check' : 'x'"
							:size="16"
							:color="item.active ? 'success' : 'danger'"
						/>
					</template>
					<template #[`item.actions`]="{ item }">
						<N8nActionToggle
							placement="bottom"
							:actions="tableActions"
							theme="dark"
							@action="onWorkflowAction($event, item)"
						/>
					</template>
				</N8nDataTableServer>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-l);

	:global(.table-pagination) {
		display: none;
	}
}

.headingContainer {
	margin-bottom: var(--spacing-xs);
}

.mainToggleContainer {
	display: flex;
	align-items: center;
	padding: var(--spacing-s);
	justify-content: space-between;
	flex-shrink: 0;

	border-radius: var(--border-radius-base);
	border: var(--border-base);
}

.mainToggleInfo {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: flex-start;
}

.mainTooggle {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	flex-shrink: 0;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.connectionStringLabel {
	code {
		background: var(--color-background-medium);
		border-radius: var(--border-radius-base);
		padding: 0 var(--spacing-4xs);
		font-size: var(--font-size-xs);
	}
}

.connectionString {
	flex-grow: 1;
	position: relative;
	padding-bottom: 0;

	:global(.n8n-markdown) {
		width: 100%;
	}
	code {
		font-size: var(--font-size-2xs);
	}

	&:hover {
		.copy-button {
			display: flex;
		}
	}
}

.copy-button {
	position: absolute;
	top: var(--spacing-l);
	right: var(--spacing-l);
	display: none;
}

.table-link {
	color: var(--color-text-base);

	:global(.n8n-text) {
		display: flex;
		align-items: center;
		gap: var(--spacing-3xs);

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
			margin-left: var(--spacing-3xs);
		}
	}
}

.folder-cell {
	display: flex;
	align-items: center;
	gap: var(--spacing-4xs);
}
</style>
