<script setup lang="ts">
import type {
	AppBinding,
	DataTablePermission,
	DescribedDataTableBinding,
	DescribedWorkflowBinding,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { computed, onMounted, ref } from 'vue';

import { useUIStore } from '@/app/stores/ui.store';
import { useAgentToolCatalog } from '@/features/agents/composables/useAgentToolCatalog';
import { useAppsStore } from '@/features/apps/apps.store';
import { deriveBindingKey } from '@/features/apps/bindingKey';
import AppDataTableAccessDialog from '@/features/apps/components/AppDataTableAccessDialog.vue';
import { useAppDeletion } from '@/features/apps/useAppDeletion';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import type { DataTable } from '@/features/core/dataTable/dataTable.types';
import ToolsConnectionModal from '@/features/shared/toolsConnection/ToolsConnectionModal.vue';
import type {
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

const CATEGORIES: ToolCategoryKey[] = ['workflows', 'data'];
const CATEGORY_ICONS: Partial<Record<ToolCategoryKey, IconName>> = {
	workflows: 'workflow',
	data: 'table',
};

// The access dialog and the picker are sequential, not stacked: the picker
// steps aside while the dialog is open and comes back with its state intact.
const pendingDataTable = ref<DataStoreConnectionItem | null>(null);

const isOpen = computed({
	get: () => uiStore.modalsById[props.modalName]?.open === true && pendingDataTable.value === null,
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
});

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

// Only workflows the app can call today: compatible (`availableWorkflows`) and published.
const items = computed<ToolConnectionItem[]>(() => [
	...availableWorkflows.value
		.filter((workflow) => workflow.activeVersionId !== null)
		.map(workflowItem),
	// The store is shared with the data table views, which load other projects
	// into it; keep only this project's tables until our fetch lands.
	...dataTableStore.dataTables
		.filter((dataTable) => dataTable.projectId === props.data.projectId)
		.map(dataTableItem),
]);

function bindingKeyFor(title: string): string {
	return deriveBindingKey(
		title,
		appsStore.bindings.map((binding) => binding.key),
	);
}

async function connect(name: string, binding: AppBinding) {
	try {
		await appsStore.addBinding(props.data.projectId, props.data.appId, binding);
		toast.showMessage({
			title: i18n.baseText('apps.connections.picker.connected', { interpolate: { name } }),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.connections.picker.error'));
	}
}

async function handleRowActivate(item: ToolConnectionItem) {
	if (item.kind === 'service') {
		const existing = bindingByWorkflowId.value.get(item.serviceId);
		if (existing) {
			await confirmAndDeleteBinding(props.data.projectId, props.data.appId, existing);
			return;
		}
		await connect(item.title, {
			key: bindingKeyFor(item.title),
			kind: 'workflow',
			workflowId: item.serviceId,
		});
		return;
	}

	if (item.kind === 'data-store') {
		const existing = bindingByDataTableId.value.get(item.dataStoreId);
		if (existing) {
			await confirmAndDeleteBinding(props.data.projectId, props.data.appId, existing);
			return;
		}
		pendingDataTable.value = item;
	}
}

async function connectDataTable(permissions: DataTablePermission[]) {
	const item = pendingDataTable.value;
	pendingDataTable.value = null;
	if (!item) return;
	await connect(item.title, {
		key: bindingKeyFor(item.title),
		kind: 'dataTable',
		dataTableId: item.dataStoreId,
		permissions,
	});
}
</script>

<template>
	<!-- Both dialogs teleport out; the div only satisfies the single-root rule. -->
	<div>
		<ToolsConnectionModal
			v-model:open="isOpen"
			:items="items"
			:categories="CATEGORIES"
			:category-icons="CATEGORY_ICONS"
			:title="i18n.baseText('apps.connections.picker.title')"
			:search-placeholder="i18n.baseText('apps.connections.picker.search')"
			:detail-item="null"
			@open-detail="handleRowActivate"
		/>
		<AppDataTableAccessDialog
			:open="pendingDataTable !== null"
			:name="pendingDataTable?.title ?? ''"
			@cancel="pendingDataTable = null"
			@connect="connectDataTable"
		/>
	</div>
</template>
