<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { EXPOSE_ALL_WORKFLOWS_TO_MCP_MODAL_KEY } from '@/experiments/exposeAllWorkflowsToMcp/constants';
import { useExposeAllWorkflowsToMcpStore } from '@/experiments/exposeAllWorkflowsToMcp/stores/exposeAllWorkflowsToMcp.store';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { useMcp } from '@/features/ai/mcpAccess/composables/useMcp';
import { useUIStore } from '@/app/stores/ui.store';
import { N8nButton, N8nDialog, N8nDialogBody, N8nDialogFooter, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps<{
	data: {
		onExposed?: () => Promise<void> | void;
	};
}>();

const i18n = useI18n();
const toast = useToast();
const mcp = useMcp();
const mcpStore = useMCPStore();
const settingsStore = useSettingsStore();
const experimentStore = useExposeAllWorkflowsToMcpStore();
const uiStore = useUIStore();
const modalBus = createEventBus();
const modalOpen = computed(
	() => uiStore.modalsById[EXPOSE_ALL_WORKFLOWS_TO_MCP_MODAL_KEY]?.open === true,
);

const isSaving = ref(false);
const closedByAction = ref(false);

// With the agents module active, "expose all" covers agents too, and the
// copy must say so (the ADO-5615 requirement).
const includesAgents = computed(() => settingsStore.isAgentsEnabled);

const modalCopy = computed(() =>
	includesAgents.value
		? {
				title: i18n.baseText('experiments.exposeAllWorkflowsToMcp.modal.withAgents.title'),
				description: i18n.baseText(
					'experiments.exposeAllWorkflowsToMcp.modal.withAgents.description',
				),
				confirm: i18n.baseText('experiments.exposeAllWorkflowsToMcp.modal.withAgents.confirm'),
			}
		: {
				title: i18n.baseText('experiments.exposeAllWorkflowsToMcp.modal.title'),
				description: i18n.baseText('experiments.exposeAllWorkflowsToMcp.modal.description'),
				confirm: i18n.baseText('experiments.exposeAllWorkflowsToMcp.modal.confirm'),
			},
);

function successToast(workflowCount: number, agentCount: number) {
	if (!includesAgents.value) {
		return {
			title: i18n.baseText('experiments.exposeAllWorkflowsToMcp.modal.success.title'),
			message: i18n.baseText('experiments.exposeAllWorkflowsToMcp.modal.success.message', {
				adjustToNumber: workflowCount,
				interpolate: { count: String(workflowCount) },
			}),
		};
	}
	return {
		title: i18n.baseText('experiments.exposeAllWorkflowsToMcp.modal.withAgents.success.title'),
		message: i18n.baseText('experiments.exposeAllWorkflowsToMcp.modal.withAgents.success.message', {
			interpolate: {
				workflows: i18n.baseText('settings.mcp.workflowsExposed.count', {
					adjustToNumber: workflowCount,
					interpolate: { count: String(workflowCount) },
				}),
				agents: i18n.baseText('settings.mcp.agentsExposed.count', {
					adjustToNumber: agentCount,
					interpolate: { count: String(agentCount) },
				}),
			},
		}),
	};
}

async function closeDialog() {
	uiStore.closeModal(EXPOSE_ALL_WORKFLOWS_TO_MCP_MODAL_KEY);
	modalBus.emit('closed');
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) void closeDialog();
}

async function onExposeAll() {
	isSaving.value = true;
	try {
		const [workflowsResponse, agentsResponse] = await Promise.all([
			mcpStore.toggleWorkflowsMcpAccess({ allWorkflows: true }, true),
			includesAgents.value
				? mcpStore.toggleAgentsMcpAccess({ allAgents: true }, true)
				: Promise.resolve(undefined),
		]);

		await mcpStore.setAutoExposeNewWorkflows(true);
		mcp.trackAutoExposeToggled({ enabled: true, source: 'expose_all' });
		closedByAction.value = true;
		experimentStore.trackConfirmed();
		toast.showMessage({
			type: 'success',
			...successToast(workflowsResponse.updatedCount, agentsResponse?.updatedCount ?? 0),
		});
		await props.data.onExposed?.();
		await closeDialog();
	} catch (error) {
		toast.showError(error, i18n.baseText('experiments.exposeAllWorkflowsToMcp.modal.error.title'));
	} finally {
		isSaving.value = false;
	}
}

function onNotNow() {
	closedByAction.value = true;
	experimentStore.trackDeclined();
	void closeDialog();
}

function onModalClosed() {
	if (!closedByAction.value) {
		experimentStore.trackDismissed();
	}
}

onMounted(() => {
	modalBus.on('closed', onModalClosed);
});

onBeforeUnmount(() => {
	modalBus.off('closed', onModalClosed);
});
</script>

<template>
	<N8nDialog
		:open="modalOpen"
		size="medium"
		:header="modalCopy.title"
		:close-on-overlay-click="false"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogBody>
			<N8nText color="text-base" data-test-id="expose-all-workflows-mcp-description">
				{{ modalCopy.description }}
			</N8nText>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				variant="subtle"
				size="small"
				:label="i18n.baseText('experiments.exposeAllWorkflowsToMcp.modal.notNow')"
				:disabled="isSaving"
				data-test-id="expose-all-workflows-mcp-not-now-button"
				@click="onNotNow"
			/>
			<N8nButton
				variant="solid"
				size="small"
				:label="modalCopy.confirm"
				:loading="isSaving"
				data-test-id="expose-all-workflows-mcp-confirm-button"
				@click="onExposeAll"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>
