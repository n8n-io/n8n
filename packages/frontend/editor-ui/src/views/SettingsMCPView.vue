<script setup lang="ts">
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useToast } from '@/composables/useToast';
import type { UserAction, WorkflowResource } from '@/Interface';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { type TableHeader } from '@n8n/design-system/components/N8nDataTableServer';
import { useI18n } from '@n8n/i18n';
import { onMounted, ref } from 'vue';

const i18n = useI18n();
const toast = useToast();
const documentTitle = useDocumentTitle();

const workflowsStore = useWorkflowsStore();

const isMCPEnabled = ref(true);
const workflowsLoading = ref(false);

const availableWorkflows = ref<WorkflowResource[]>([]);

const tableHeaders = ref<Array<TableHeader<WorkflowResource>>>([
	{
		title: 'Id',
		key: 'id',
		width: 150,
		value: (row) => row.id,
	},
	{
		title: 'Name',
		key: 'name',
		width: 300,
		value: (row) => row.name,
	},
	{
		title: 'Active',
		key: 'active',
		value: (row) => (row.active ? i18n.baseText('generic.yes') : i18n.baseText('generic.no')),
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

const tableActions = ref<Array<UserAction<WorkflowResource>>>([
	{
		label: i18n.baseText('settings.mcp.workflows.table.action.removeMCPAccess'),
		value: 'removeFromMCP',
	},
]);

const connectionString = ref(`
\`\`\`
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "supergateway",
        "--streamableHttp",
        "${window.location.protocol}://${window.location.hostname}:${window.location.port}/rest/mcp-control/mcp",
        "--header",
        "x-n8n-api-key:<YOUR_N8N_API_KEY>",
      ]
    }
  }
}
\`\`\`
`);

// TODO: Only owners can toggle this
const onUpdateMCPEnabled = async (value: boolean) => {
	isMCPEnabled.value = value;
	if (value) {
		await fetchAvailableWorkflows();
	} else {
		workflowsLoading.value = false;
	}
};

const fetchAvailableWorkflows = async () => {
	workflowsLoading.value = true;
	try {
		const workflows = await workflowsStore.fetchWorkflowsAvailableForMCP(1, 200);
		availableWorkflows.value = workflows;
		// TODO: Add empty state if no workflows are available
	} catch (error) {
		toast.showError(error, 'Error fetching workflows');
	} finally {
		workflowsLoading.value = false;
	}
};

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.mcp.heading'));
	fetchAvailableWorkflows();
});
</script>
<template>
	<div :class="$style.container">
		<div :class="$style.headingContainer">
			<n8n-heading size="2xlarge">{{ i18n.baseText('settings.mcp.heading') }}</n8n-heading>
		</div>
		<div :class="$style.settingsContainer">
			<div :class="$style.settingsContainerInfo">
				<n8n-text :bold="true">{{ i18n.baseText('settings.mcp.toggle.label') }}</n8n-text>
				<n8n-text size="small" color="text-light">{{
					i18n.baseText('settings.mcp.toggle.description')
				}}</n8n-text>
			</div>
			<div :class="$style.settingsContainerAction">
				<el-switch
					:model-value="isMCPEnabled"
					size="large"
					data-test-id="enable-n8n-mcp"
					@update:model-value="onUpdateMCPEnabled"
				/>
			</div>
		</div>
		<div v-if="isMCPEnabled" :class="$style.connectionStringContainer">
			<div :class="$style.connectionStringLabel">
				<n8n-text
					v-n8n-html="
						i18n.baseText('settings.mcp.how.to.connect', {
							interpolate: {
								docsURL: 'https://docs.n8n.io/',
							},
						})
					"
				></n8n-text>
			</div>
			<div :class="$style.settingsContainer">
				<div :class="[$style.connectionString]">
					<n8n-markdown :content="connectionString"></n8n-markdown>
				</div>
			</div>
		</div>
		<div v-if="isMCPEnabled" :class="$style['workflow-list-container']">
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
				<div class="mb-s">
					<n8n-heading size="medium" :bold="true">
						{{ i18n.baseText('settings.mcp.available.workflows.heading') }}
					</n8n-heading>
				</div>
				<N8nDataTableServer
					:headers="tableHeaders"
					:items="availableWorkflows"
					:items-length="availableWorkflows.length"
				>
					<template #[`item.actions`]="{ item }">
						<N8nActionToggle placement="bottom" :actions="tableActions" theme="dark" />
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
}

.headingContainer {
	margin-bottom: var(--spacing-xs);
}

.settingsContainer {
	display: flex;
	align-items: center;
	padding: var(--spacing-xs);
	justify-content: space-between;
	flex-shrink: 0;

	border-radius: 4px;
	border: 1px solid var(--Colors-Foreground---color-foreground-base, #d9dee8);
}

.settingsContainerInfo {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: flex-start;
	gap: 1px;
}

.settingsContainerAction {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	flex-shrink: 0;
}

.connectionStringLabel {
	code {
		background: var(--color-background-medium);
		border-radius: 4px;
		padding: 0 4px;
		font-size: var(--font-size-xs);
	}
}

.connectionString {
	flex-grow: 1;

	:global(.n8n-markdown) {
		width: 100%;
	}
	code {
		font-size: var(--font-size-2xs);
	}
}
</style>
