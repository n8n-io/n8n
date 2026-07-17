<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { useToast } from '@/app/composables/useToast';
import { EXPOSE_ALL_WORKFLOWS_TO_MCP_MODAL_KEY } from '@/experiments/exposeAllWorkflowsToMcp/constants';
import { useExposeAllWorkflowsToMcpStore } from '@/experiments/exposeAllWorkflowsToMcp/stores/exposeAllWorkflowsToMcp.store';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { createEventBus } from '@n8n/utils/event-bus';
import { onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps<{
	data: {
		onExposed?: () => Promise<void> | void;
	};
}>();

const i18n = useI18n();
const toast = useToast();
const mcpStore = useMCPStore();
const experimentStore = useExposeAllWorkflowsToMcpStore();
const modalBus = createEventBus();

const isSaving = ref(false);
const closedByAction = ref(false);

async function onExposeAll(close: () => void) {
	isSaving.value = true;
	try {
		const response = await mcpStore.toggleWorkflowsMcpAccess({ allWorkflows: true }, true);
		closedByAction.value = true;
		experimentStore.trackConfirmed();
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('experiments.exposeAllWorkflowsToMcp.modal.success.title'),
			message: i18n.baseText('experiments.exposeAllWorkflowsToMcp.modal.success.message', {
				adjustToNumber: response.updatedCount,
				interpolate: { count: String(response.updatedCount) },
			}),
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
		:title="i18n.baseText('experiments.exposeAllWorkflowsToMcp.modal.title')"
		width="480px"
		:event-bus="modalBus"
		:closeOnClickModal="false"
	>
		<template #content>
			<N8nText color="text-base" data-test-id="expose-all-workflows-mcp-description">
				{{ i18n.baseText('experiments.exposeAllWorkflowsToMcp.modal.description') }}
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
					:label="i18n.baseText('experiments.exposeAllWorkflowsToMcp.modal.confirm')"
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
