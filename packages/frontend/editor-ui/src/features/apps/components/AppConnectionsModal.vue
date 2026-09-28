<script setup lang="ts">
import type {
	AgentPermission,
	AppBinding,
	DataTablePermission,
	DescribedAgentBinding,
	DescribedDataTableBinding,
	DescribedWorkflowBinding,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { computed, onMounted, ref } from 'vue';

import { useUIStore } from '@/app/stores/ui.store';
import { useAgentToolCatalog } from '@/features/agents/composables/useAgentToolCatalog';
import { useProjectAgentsList } from '@/features/agents/composables/useProjectAgentsList';
import type { AgentResource } from '@/features/agents/types';
import { useAppsStore } from '@/features/apps/apps.store';
import { deriveBindingKey } from '@/features/apps/bindingKey';
import AppBindingDetailBody from '@/features/apps/components/AppBindingDetailBody.vue';
import { useAppDeletion } from '@/features/apps/useAppDeletion';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import type { DataTable } from '@/features/core/dataTable/dataTable.types';
import ToolsConnectionModal from '@/features/shared/toolsConnection/ToolsConnectionModal.vue';
import type {
	AgentConnectionItem,
	DataStoreConnectionItem,
	ServiceConnectionItem,
	ToolCategoryKey,
	ToolConnectionItem,
} from '@/features/shared/toolsConnection/types';
import type { IWorkflowDb } from '@/Interface';
import type { IconName } from '@n8n/design-system';

// DynamicModalLoader passes `open`/`active`/`mode`/`activeId` alongside the
// props we declare. Keep them off the root so they never reach a dialog: an
// inherited `open` (always true while mounted) would pin the picker open.
defineOptions({ inheritAttrs: false });

const props = defineProps<{
	modalName: string;
	data: { projectId: string; appId: string };
}>();

const i18n = useI18n();
const toast = useToast();
const uiStore = useUIStore();
const appsStore = useAppsStore();
const dataTableStore = useDataTableStore();
const { confirmAndDeleteBinding } = useAppDeletion();
const { availableWorkflows, loadWorkflows } = useAgentToolCatalog();
// The agent list is cached per project; a fresh fetch shows agents published since.
const { list: agents, refresh: loadAgents } = useProjectAgentsList(
	computed(() => props.data.projectId),
);

const CATEGORIES: ToolCategoryKey[] = ['workflows', 'data', 'agents'];
const CATEGORY_ICONS: Partial<Record<ToolCategoryKey, IconName>> = {
	workflows: 'workflow',
	data: 'table',
	agents: 'robot',
};
const DATA_TABLE_PERMISSION_OPTIONS: Array<{ value: DataTablePermission; label: string }> = [
	{ value: 'read', label: i18n.baseText('apps.connections.access.read') },
	{ value: 'write', label: i18n.baseText('apps.connections.access.write') },
];
const AGENT_PERMISSION_OPTIONS: Array<{ value: AgentPermission; label: string }> = [
	{ value: 'chat', label: i18n.baseText('apps.connections.access.chat') },
	{ value: 'history', label: i18n.baseText('apps.connections.access.history') },
];
type BindingPermission = DataTablePermission | AgentPermission;

const isOpen = computed({
	get: () => uiStore.modalsById[props.modalName]?.open === true,
	set: (value: boolean) => {
		if (!value) uiStore.closeModal(props.modalName);
	},
});

onMounted(() => {
	void loadWorkflows(props.data.projectId);
	void dataTableStore
		.fetchDataTables(props.data.projectId, 1, 250)
		.catch((error) =>
			toast.showError(error, i18n.baseText('apps.connections.picker.dataTables.error')),
		);
	void loadAgents().catch((error) =>
		toast.showError(error, i18n.baseText('apps.connections.picker.agents.error')),
	);
});

type PresentBinding = DescribedWorkflowBinding | DescribedDataTableBinding | DescribedAgentBinding;

const bindingByWorkflowId = computed(() => {
	const map = new Map<string, DescribedWorkflowBinding>();
	for (const binding of appsStore.bindings) {
		if (binding.kind === 'workflow' && !binding.missing) map.set(binding.workflowId, binding);
	}
	return map;
});

const bindingByDataTableId = computed(() => {
	const map = new Map<string, DescribedDataTableBinding>();
	for (const binding of appsStore.bindings) {
		if (binding.kind === 'dataTable' && !binding.missing) map.set(binding.dataTableId, binding);
	}
	return map;
});

const bindingByAgentId = computed(() => {
	const map = new Map<string, DescribedAgentBinding>();
	for (const binding of appsStore.bindings) {
		if (binding.kind === 'agent' && !binding.missing) map.set(binding.agentId, binding);
	}
	return map;
});

// A generic `service` item, not a `workflow` one: ToolRow gives workflows a bare
// primary-coloured icon, while every other kind gets the same grey circle as the
// table rows. `serviceId` carries the workflow id.
function workflowItem(workflow: IWorkflowDb): ServiceConnectionItem {
	return {
		id: `workflow:${workflow.id}`,
		kind: 'service',
		category: 'workflows',
		serviceId: workflow.id,
		title: workflow.name,
		description: workflow.description ?? undefined,
		iconSource: { type: 'icon', name: 'workflow' },
		status: bindingByWorkflowId.value.has(workflow.id) ? 'connected' : 'none',
	};
}

function dataTableItem(dataTable: DataTable): DataStoreConnectionItem {
	return {
		id: `data-table:${dataTable.id}`,
		kind: 'data-store',
		dataStoreId: dataTable.id,
		title: dataTable.name,
		iconSource: { type: 'icon', name: 'table' },
		status: bindingByDataTableId.value.has(dataTable.id) ? 'connected' : 'none',
	};
}

function agentItem(agent: AgentResource): AgentConnectionItem {
	return {
		id: `agent:${agent.id}`,
		kind: 'agent',
		agentId: agent.id,
		title: agent.name,
		iconSource: { type: 'icon', name: 'robot' },
		status: bindingByAgentId.value.has(agent.id) ? 'connected' : 'none',
	};
}

// Only resources the app can call today: compatible (`availableWorkflows`) and
// published workflows, and published agents.
const items = computed<ToolConnectionItem[]>(() => [
	...availableWorkflows.value
		.filter((workflow) => workflow.activeVersionId !== null)
		.map(workflowItem),
	// The store is shared with the data table views, which load other projects
	// into it; keep only this project's tables until our fetch lands.
	...dataTableStore.dataTables
		.filter((dataTable) => dataTable.projectId === props.data.projectId)
		.map(dataTableItem),
	...(agents.value ?? [])
		.filter((agent) => agent.projectId === props.data.projectId && agent.activeVersionId !== null)
		.map(agentItem),
]);

// Resolved from the id on every render so the detail view follows the
// connection state instead of holding a stale copy of the item.
const activeItemId = ref<string | null>(null);
const detailItem = computed<ToolConnectionItem | null>(
	() => items.value.find((item) => item.id === activeItemId.value) ?? null,
);

function bindingFor(item: ToolConnectionItem): PresentBinding | null {
	if (item.kind === 'service') return bindingByWorkflowId.value.get(item.serviceId) ?? null;
	if (item.kind === 'data-store') return bindingByDataTableId.value.get(item.dataStoreId) ?? null;
	if (item.kind === 'agent') return bindingByAgentId.value.get(item.agentId) ?? null;
	return null;
}

function permissionsOf(binding: PresentBinding | null): BindingPermission[] {
	return binding?.kind === 'dataTable' || binding?.kind === 'agent' ? binding.permissions : [];
}

function permissionOptionsFor(item: ToolConnectionItem) {
	if (item.kind === 'data-store') return DATA_TABLE_PERMISSION_OPTIONS;
	if (item.kind === 'agent') return AGENT_PERMISSION_OPTIONS;
	return [];
}

function bindingKeyFor(title: string): string {
	return deriveBindingKey(
		title,
		appsStore.bindings.map((binding) => binding.key),
	);
}

// The detail body emits the union type; the option list of the kind narrows it.
function pick<P extends BindingPermission>(
	options: Array<{ value: P }>,
	permissions: BindingPermission[],
): P[] {
	return options.map((option) => option.value).filter((value) => permissions.includes(value));
}

function newBinding(item: ToolConnectionItem, permissions: BindingPermission[]): AppBinding | null {
	const key = bindingKeyFor(item.title);
	if (item.kind === 'service') return { key, kind: 'workflow', workflowId: item.serviceId };
	if (item.kind === 'data-store') {
		return {
			key,
			kind: 'dataTable',
			dataTableId: item.dataStoreId,
			permissions: pick(DATA_TABLE_PERMISSION_OPTIONS, permissions),
		};
	}
	if (item.kind === 'agent') {
		return {
			key,
			kind: 'agent',
			agentId: item.agentId,
			permissions: pick(AGENT_PERMISSION_OPTIONS, permissions),
		};
	}
	return null;
}

async function connect(item: ToolConnectionItem, permissions: BindingPermission[]) {
	const binding = newBinding(item, permissions);
	if (!binding) return;
	try {
		await appsStore.addBinding(props.data.projectId, props.data.appId, binding);
		toast.showMessage({
			title: i18n.baseText('apps.connections.picker.connected', {
				interpolate: { name: item.title },
			}),
			type: 'success',
		});
		activeItemId.value = null;
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.connections.picker.error'));
	}
}

async function save(item: ToolConnectionItem, permissions: BindingPermission[]) {
	const binding = bindingFor(item);
	if (!binding) return;
	try {
		await appsStore.updateBinding(props.data.projectId, props.data.appId, binding.key, {
			permissions,
		});
		toast.showMessage({
			title: i18n.baseText('apps.connections.picker.updated', {
				interpolate: { name: item.title },
			}),
			type: 'success',
		});
		activeItemId.value = null;
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.connections.picker.updateError'));
	}
}

async function disconnect(item: ToolConnectionItem) {
	const binding = bindingFor(item);
	if (!binding) return;
	const deleted = await confirmAndDeleteBinding(props.data.projectId, props.data.appId, binding);
	if (!deleted) return;
	toast.showMessage({
		title: i18n.baseText('apps.connections.picker.disconnected', {
			interpolate: { name: item.title },
		}),
		type: 'success',
	});
	activeItemId.value = null;
}
</script>

<template>
	<ToolsConnectionModal
		v-model:open="isOpen"
		:items="items"
		:categories="CATEGORIES"
		:category-icons="CATEGORY_ICONS"
		:title="i18n.baseText('apps.connections.picker.title')"
		:search-placeholder="i18n.baseText('apps.connections.picker.search')"
		:detail-item="detailItem"
		@update:detail-item="activeItemId = $event?.id ?? null"
	>
		<template #detail-body="{ item }">
			<AppBindingDetailBody
				:item="item"
				:connected="bindingFor(item) !== null"
				:permissions="permissionsOf(bindingFor(item))"
				:permission-options="permissionOptionsFor(item)"
				:note="
					i18n.baseText(
						item.kind === 'agent'
							? 'apps.connections.access.agentNote'
							: 'apps.connections.access.note',
					)
				"
				@connect="connect(item, $event)"
				@save="save(item, $event)"
				@disconnect="disconnect(item)"
			/>
		</template>
	</ToolsConnectionModal>
</template>
