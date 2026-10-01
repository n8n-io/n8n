<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import MCPAgentsSelect from '@/features/ai/mcpAccess/components/MCPAgentsSelect.vue';
import { N8nButton, N8nDialog, N8nDialogFooter, N8nNotice } from '@n8n/design-system';
import { computed, ref, watch } from 'vue';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

type SelectRef = InstanceType<typeof MCPAgentsSelect>;

const props = defineProps<{
	enableMcpAccess: (agentIds: string[]) => Promise<void>;
}>();

const open = defineModel<boolean>('open', { default: false });

const i18n = useI18n();
const telemetry = useTelemetry();

const isSaving = ref(false);
const selectedAgentIds = ref<string[]>([]);
const selectRef = ref<SelectRef | null>(null);
const closedByAction = ref(false);

const canSave = computed(() => selectedAgentIds.value.length > 0);

// The view keeps this component mounted, so every opening starts from an empty selection.
watch(open, (isOpen) => {
	if (isOpen) {
		selectedAgentIds.value = [];
		closedByAction.value = false;
	} else if (!closedByAction.value) {
		telemetry.track(TELEMETRY_EVENT.AGENTS.USER_DISMISSED_MCP_AGENTS_DIALOG, {});
	}
});

async function save() {
	if (selectedAgentIds.value.length === 0) return;

	isSaving.value = true;
	try {
		await props.enableMcpAccess(selectedAgentIds.value);
		closedByAction.value = true;
		telemetry.track(TELEMETRY_EVENT.AGENTS.USER_SELECTED_AGENTS_FOR_MCP, {
			agentIds: selectedAgentIds.value,
			count: selectedAgentIds.value.length,
		});
		open.value = false;
	} finally {
		isSaving.value = false;
	}
}

function onSelectReady() {
	selectRef.value?.focusOnInput();
}

function onConfirm() {
	if (!isSaving.value) {
		void save();
	}
}

function preventOutsideClose(event: Event) {
	event.preventDefault();
}
</script>

<template>
	<N8nDialog
		v-model:open="open"
		size="xlarge"
		:header="i18n.baseText('settings.mcp.connectAgents.modalTitle')"
		data-test-id="mcp-connect-agents-dialog"
		@interact-outside="preventOutsideClose"
	>
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
		<N8nDialogFooter>
			<N8nButton
				variant="subtle"
				:label="i18n.baseText('generic.cancel')"
				:disabled="isSaving"
				data-test-id="mcp-connect-agents-cancel-button"
				@click="open = false"
			/>
			<N8nButton
				variant="solid"
				:label="i18n.baseText('settings.mcp.connectAgents.confirm.label')"
				:loading="isSaving"
				:disabled="!canSave || isSaving"
				data-test-id="mcp-connect-agents-save-button"
				@click="save"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);

	.notice {
		margin: 0;
	}
}
</style>
