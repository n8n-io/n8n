<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { useI18n } from '@n8n/i18n';
import { MCP_CONNECT_AGENTS_MODAL_KEY } from '@/features/ai/mcpAccess/mcp.constants';
import MCPAgentsSelect from '@/features/ai/mcpAccess/components/MCPAgentsSelect.vue';
import { N8nButton, N8nNotice } from '@n8n/design-system';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useTelemetry } from '@/app/composables/useTelemetry';

type SelectRef = InstanceType<typeof MCPAgentsSelect>;

const props = defineProps<{
	data: {
		onEnableMcpAccess: (agentIds: string[]) => Promise<void>;
	};
}>();

const i18n = useI18n();
const telemetry = useTelemetry();

const isSaving = ref(false);
const selectedAgentIds = ref<string[]>([]);
const selectRef = ref<SelectRef | null>(null);
const modalBus = createEventBus();
const closedByAction = ref(false);

const canSave = computed(() => selectedAgentIds.value.length > 0);

const cancel = (close: () => void) => {
	closedByAction.value = true;
	telemetry.track('User dismissed mcp agents dialog');
	close();
};

async function save(close: () => void) {
	if (selectedAgentIds.value.length === 0) return;

	isSaving.value = true;
	try {
		await props.data.onEnableMcpAccess(selectedAgentIds.value);
		closedByAction.value = true;
		telemetry.track('User selected agent from list', {
			agentIds: selectedAgentIds.value,
			count: selectedAgentIds.value.length,
		});
		close();
	} finally {
		isSaving.value = false;
	}
}

function onModalClosed() {
	if (!closedByAction.value) {
		telemetry.track('User dismissed mcp agents dialog');
	}
}

function onSelectReady() {
	selectRef.value?.focusOnInput();
}

function onConfirm() {
	if (!isSaving.value) {
		void save(() => modalBus.emit('close'));
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
		:name="MCP_CONNECT_AGENTS_MODAL_KEY"
		:title="i18n.baseText('settings.mcp.connectAgents.modalTitle')"
		width="600px"
		:class="$style.container"
		:event-bus="modalBus"
	>
		<template #content>
			<div :class="$style.content">
				<N8nNotice
					data-test-id="mcp-connect-agents-info-notice"
					theme="info"
					:content="i18n.baseText('settings.mcp.connectAgents.notice')"
					:class="$style.notice"
				/>
				<MCPAgentsSelect
					ref="selectRef"
					v-model="selectedAgentIds"
					:placeholder="i18n.baseText('settings.mcp.connectAgents.input.placeholder')"
					:disabled="isSaving"
					@ready="onSelectReady"
					@confirm="onConfirm"
				/>
			</div>
		</template>
		<template #footer="{ close }">
			<div :class="$style.footer">
				<N8nButton
					variant="subtle"
					:label="i18n.baseText('generic.cancel')"
					:size="'small'"
					:disabled="isSaving"
					data-test-id="mcp-connect-agents-cancel-button"
					@click="cancel(close)"
				/>
				<N8nButton
					variant="solid"
					:label="i18n.baseText('settings.mcp.connectAgents.confirm.label')"
					:loading="isSaving"
					:disabled="!canSave || isSaving"
					data-test-id="mcp-connect-agents-save-button"
					@click="save(close)"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);

	.notice {
		margin: 0;
	}
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
}
</style>
