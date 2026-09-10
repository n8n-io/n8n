<script setup lang="ts">
import type { DescribedWorkflowBinding, WorkflowToolIncompatibilityReason } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { computed, onMounted } from 'vue';

import { useUIStore } from '@/app/stores/ui.store';
import { useAgentToolCatalog } from '@/features/agents/composables/useAgentToolCatalog';
import { workflowToolTriggerLabel } from '@/features/agents/utils/workflowToolTriggers';
import { useAppsStore } from '@/features/apps/apps.store';
import { deriveBindingKey } from '@/features/apps/bindingKey';
import { useAppDeletion } from '@/features/apps/useAppDeletion';
import ToolsConnectionModal from '@/features/shared/toolsConnection/ToolsConnectionModal.vue';
import type {
	ToolConnectionItem,
	WorkflowConnectionItem,
} from '@/features/shared/toolsConnection/types';
import type { IWorkflowDb } from '@/Interface';

// DynamicModalLoader passes `open`/`active`/`mode`/`activeId` alongside the
// props we declare. Without this they fall through onto ToolsConnectionModal,
// and the inherited `open` (always true while mounted) pins the dialog open.
defineOptions({ inheritAttrs: false });

const props = defineProps<{
	modalName: string;
	data: { projectId: string; appId: string };
}>();

const i18n = useI18n();
const toast = useToast();
const uiStore = useUIStore();
const appsStore = useAppsStore();
const { confirmAndDeleteBinding } = useAppDeletion();
const { availableWorkflows, incompatibleWorkflows, loadWorkflows } = useAgentToolCatalog();

const isOpen = computed({
	get: () => uiStore.modalsById[props.modalName]?.open === true,
	set: (value: boolean) => {
		if (!value) uiStore.closeModal(props.modalName);
	},
});

onMounted(() => {
	void loadWorkflows(props.data.projectId);
});

const bindingByWorkflowId = computed(() => {
	const map = new Map<string, DescribedWorkflowBinding>();
	for (const binding of appsStore.bindings) {
		if (binding.kind === 'workflow' && !binding.missing) map.set(binding.workflowId, binding);
	}
	return map;
});

function availableWorkflowItem(workflow: IWorkflowDb): WorkflowConnectionItem {
	return {
		id: `workflow:${workflow.id}`,
		kind: 'workflow',
		workflowId: workflow.id,
		title: workflow.name,
		description: workflow.description ?? undefined,
		warning:
			workflow.activeVersionId === null
				? i18n.baseText('agents.tools.workflow.notPublished')
				: undefined,
		status: bindingByWorkflowId.value.has(workflow.id) ? 'connected' : 'none',
	};
}

function disabledWorkflowReasonText(reason: WorkflowToolIncompatibilityReason): string {
	if (reason.reason === 'incompatible_nodes') {
		return i18n.baseText('agents.tools.workflow.disabled.incompatibleNodes');
	}
	return i18n.baseText('agents.tools.workflow.disabled.noSupportedTrigger', {
		interpolate: { trigger: workflowToolTriggerLabel() },
	});
}

function disabledWorkflowItem(
	workflow: IWorkflowDb,
	reason: WorkflowToolIncompatibilityReason,
): WorkflowConnectionItem {
	return {
		id: `workflow-disabled:${workflow.id}`,
		kind: 'workflow',
		workflowId: workflow.id,
		title: workflow.name,
		description: workflow.description ?? undefined,
		status: 'none',
		disabled: true,
		disabledReason: disabledWorkflowReasonText(reason),
	};
}

// Incompatible workflows come last, greyed out, so the user sees why they are
// missing instead of them simply being absent.
const items = computed<ToolConnectionItem[]>(() => [
	...availableWorkflows.value.map(availableWorkflowItem),
	...incompatibleWorkflows.value.map(({ workflow, reason }) =>
		disabledWorkflowItem(workflow, reason),
	),
]);

async function handleRowActivate(item: ToolConnectionItem) {
	if (item.kind !== 'workflow' || item.disabled) return;

	const existing = bindingByWorkflowId.value.get(item.workflowId);
	if (existing) {
		await confirmAndDeleteBinding(props.data.projectId, props.data.appId, existing);
		return;
	}

	try {
		await appsStore.addBinding(props.data.projectId, props.data.appId, {
			key: deriveBindingKey(
				item.title,
				appsStore.bindings.map((binding) => binding.key),
			),
			kind: 'workflow',
			workflowId: item.workflowId,
		});
		toast.showMessage({
			title: i18n.baseText('apps.connections.picker.connected', {
				interpolate: { name: item.title },
			}),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.connections.picker.error'));
	}
}
</script>

<template>
	<ToolsConnectionModal
		v-model:open="isOpen"
		:items="items"
		:categories="['workflows']"
		:title="i18n.baseText('apps.connections.picker.title')"
		:search-placeholder="i18n.baseText('apps.connections.picker.search')"
		:detail-item="null"
		@connect="handleRowActivate"
		@open-detail="handleRowActivate"
	/>
</template>
