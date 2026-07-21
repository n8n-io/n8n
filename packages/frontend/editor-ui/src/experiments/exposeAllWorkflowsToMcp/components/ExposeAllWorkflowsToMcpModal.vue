<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { useToast } from '@/app/composables/useToast';
import { useSettingsStore } from '@/app/stores/settings.store';
import { EXPOSE_ALL_WORKFLOWS_TO_MCP_MODAL_KEY } from '@/experiments/exposeAllWorkflowsToMcp/constants';
import { useExposeAllWorkflowsToMcpStore } from '@/experiments/exposeAllWorkflowsToMcp/stores/exposeAllWorkflowsToMcp.store';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { N8nButton, N8nText } from '@n8n/design-system';
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
const mcpStore = useMCPStore();
const settingsStore = useSettingsStore();
const experimentStore = useExposeAllWorkflowsToMcpStore();
const modalBus = createEventBus();

const isSaving = ref(false);
const closedByAction = ref(false);

// With the agents module active, "expose all" covers agents too, and the
// copy must say so (the ADO-5615 requirement).
const includesAgents = computed(() => settingsStore.isModuleActive('agents'));

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

async function onExposeAll(close: () => void) {
	isSaving.value = true;
	try {
		const [workflowsResponse, agentsResponse] = await Promise.all([
			mcpStore.toggleWorkflowsMcpAccess({ allWorkflows: true }, true),
			includesAgents.value
				? mcpStore.toggleAgentsMcpAccess({ allAgents: true }, true)
				: Promise.resolve(undefined),
		]);
		closedByAction.value = true;
		experimentStore.trackConfirmed();
		toast.showMessage({
			type: 'success',
			...successToast(workflowsResponse.updatedCount, agentsResponse?.updatedCount ?? 0),
		});
		await props.data.onExposed?.();
		close();
	} catch (error) {
		toast.showError(error, i18n.baseText('experiments.exposeAllWorkflowsToMcp.modal.error.title'));
	} finally {
		isSaving.value = false;
	}
}

function onNotNow(close: () => void) {
	closedByAction.value = true;
	experimentStore.trackDeclined();
	close();
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
	<Modal
		:name="EXPOSE_ALL_WORKFLOWS_TO_MCP_MODAL_KEY"
		:title="modalCopy.title"
		width="480px"
		:event-bus="modalBus"
		:closeOnClickModal="false"
	>
		<template #content>
			<N8nText color="text-base" data-test-id="expose-all-workflows-mcp-description">
				{{ modalCopy.description }}
			</N8nText>
		</template>
		<template #footer="{ close }">
			<div :class="$style.footer">
				<N8nButton
					variant="subtle"
					size="small"
					:label="i18n.baseText('experiments.exposeAllWorkflowsToMcp.modal.notNow')"
					:disabled="isSaving"
					data-test-id="expose-all-workflows-mcp-not-now-button"
					@click="onNotNow(close)"
				/>
				<N8nButton
					variant="solid"
					size="small"
					:label="modalCopy.confirm"
					:loading="isSaving"
					data-test-id="expose-all-workflows-mcp-confirm-button"
					@click="onExposeAll(close)"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
