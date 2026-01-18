<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { useI18n } from '@n8n/i18n';
import {
	MCP_CONNECT_WORKFLOWS_MODAL_KEY,
	MCP_DOCS_PAGE_URL,
	ELIGIBLE_WORKFLOWS_DOCS_SECTION,
} from '@/features/ai/mcpAccess/mcp.constants';
import MCPWorkflowsSelect from '@/features/ai/mcpAccess/components/MCPWorkflowsSelect.vue';
import { N8nButton, N8nNotice } from '@n8n/design-system';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useTelemetry } from '@/app/composables/useTelemetry';

type SelectRef = InstanceType<typeof MCPWorkflowsSelect>;

const props = defineProps<{
	data: {
		onEnableMcpAccess: (workflowId: string) => Promise<void>;
	};
}>();

const i18n = useI18n();
const telemetry = useTelemetry();

const isSaving = ref(false);
const selectedWorkflowId = ref<string>();
const selectRef = ref<SelectRef | null>(null);
const modalBus = createEventBus();
const closedByAction = ref(false);
const docsLink = `${MCP_DOCS_PAGE_URL}#${ELIGIBLE_WORKFLOWS_DOCS_SECTION}`;

const canSave = computed(() => !!selectedWorkflowId.value);

const cancel = (close: () => void) => {
	closedByAction.value = true;
	telemetry.track('User dismissed mcp workflows dialog');
	close();
};

async function save(close: () => void) {
	if (!selectedWorkflowId.value) return;

	isSaving.value = true;
	try {
		await props.data.onEnableMcpAccess(selectedWorkflowId.value);
		closedByAction.value = true;
		telemetry.track('User selected workflow from list', {
			workflowId: selectedWorkflowId.value,
		});
		close();
	} finally {
		isSaving.value = false;
	}
}

function onModalClosed() {
	if (!closedByAction.value) {
		telemetry.track('User dismissed mcp workflows dialog');
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
		:name="MCP_CONNECT_WORKFLOWS_MODAL_KEY"
		:title="i18n.baseText('settings.mcp.connectWorkflows.modalTitle')"
		width="600px"
		:class="$style.container"
		:event-bus="modalBus"
	>
		<template #content>
			<div :class="$style.content">
				<N8nNotice
					data-test-id="mcp-connect-workflows-info-notice"
					theme="info"
					:content="
						i18n.baseText('settings.mcp.connectWorkflows.notice', { interpolate: { docsLink } })
					"
					:class="$style.notice"
				/>
				<MCPWorkflowsSelect
					ref="selectRef"
					v-model="selectedWorkflowId"
					:placeholder="i18n.baseText('settings.mcp.connectWorkflows.input.placeholder')"
					:disabled="isSaving"
					@ready="onSelectReady"
					@confirm="onConfirm"
				/>
			</div>
		</template>
		<template #footer="{ close }">
			<div :class="$style.footer">
				<N8nButton
					:label="i18n.baseText('generic.cancel')"
					:size="'small'"
					:disabled="isSaving"
					type="tertiary"
					data-test-id="mcp-connect-workflows-cancel-button"
					@click="cancel(close)"
				/>
				<N8nButton
					:label="i18n.baseText('settings.mcp.connectWorkflows.confirm.label')"
					:loading="isSaving"
					:disabled="!canSave || isSaving"
					type="primary"
					data-test-id="mcp-connect-workflows-save-button"
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

		a {
			font-weight: normal;
		}
	}
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
}
</style>
