<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import MCPWorkflowsSelect from '@/features/ai/mcpAccess/components/MCPWorkflowsSelect.vue';
import { N8nButton, N8nDialog, N8nDialogFooter } from '@n8n/design-system';
import { computed, ref, watch } from 'vue';
import { useTelemetry } from '@n8n/composables/useTelemetry';

type SelectRef = InstanceType<typeof MCPWorkflowsSelect>;

const props = defineProps<{
	enableMcpAccess: (workflowIds: string[]) => Promise<void>;
}>();

const open = defineModel<boolean>('open', { default: false });

const i18n = useI18n();
const telemetry = useTelemetry();

const isSaving = ref(false);
const selectedWorkflowIds = ref<string[]>([]);
const selectRef = ref<SelectRef | null>(null);
const closedByAction = ref(false);

const canSave = computed(() => selectedWorkflowIds.value.length > 0);

// The view keeps this component mounted, so every opening starts from an empty selection.
watch(open, (isOpen) => {
	if (isOpen) {
		selectedWorkflowIds.value = [];
		closedByAction.value = false;
	} else if (!closedByAction.value) {
		telemetry.track('User dismissed mcp workflows dialog');
	}
});

async function save() {
	if (selectedWorkflowIds.value.length === 0) return;

	isSaving.value = true;
	try {
		await props.enableMcpAccess(selectedWorkflowIds.value);
		closedByAction.value = true;
		telemetry.track('User selected workflow from list', {
			workflowIds: selectedWorkflowIds.value,
			count: selectedWorkflowIds.value.length,
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
		:header="i18n.baseText('settings.mcp.connectWorkflows.modalTitle')"
		data-test-id="mcp-connect-workflows-dialog"
		@interact-outside="preventOutsideClose"
	>
		<MCPWorkflowsSelect
			ref="selectRef"
			v-model="selectedWorkflowIds"
			:placeholder="i18n.baseText('settings.mcp.connectWorkflows.input.placeholder')"
			:disabled="isSaving"
			@ready="onSelectReady"
			@confirm="onConfirm"
		/>
		<N8nDialogFooter>
			<N8nButton
				variant="subtle"
				:label="i18n.baseText('generic.cancel')"
				:disabled="isSaving"
				data-test-id="mcp-connect-workflows-cancel-button"
				@click="open = false"
			/>
			<N8nButton
				variant="solid"
				:label="i18n.baseText('settings.mcp.connectWorkflows.confirm.label')"
				:loading="isSaving"
				:disabled="!canSave || isSaving"
				data-test-id="mcp-connect-workflows-save-button"
				@click="save"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>
