<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nIcon, N8nSwitch2, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useUIStore } from '@/app/stores/ui.store';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { useMcp } from '@/features/ai/mcpAccess/composables/useMcp';
import { SURFACE_MCP_ONBOARDING_MODAL_KEY } from '@/experiments/surfaceMcpToNewCloudUsers/constants';

const props = defineProps<{
	workflowId: string;
	availableInMcp: boolean;
	canEdit: boolean;
	isMcpEnabled: boolean;
	isMcpModuleActive: boolean;
	canManageInstanceMcp: boolean;
}>();

const locale = useI18n();
const toast = useToast();
const uiStore = useUIStore();
const mcpStore = useMCPStore();
const mcp = useMcp();

// Optimistically reflect the new state in the switch without mutating props.
// null means no local override yet.
const optimisticAvailability = ref<boolean | null>(null);

const isAvailableInMCP = computed(() => optimisticAvailability.value ?? props.availableInMcp);

const showToggle = computed(
	() => props.isMcpModuleActive && (props.canEdit || isAvailableInMCP.value),
);

const switchModelValue = computed(() => props.isMcpEnabled && isAvailableInMCP.value);

// Non-admins can't flip instance-level MCP, so the modal would be a dead end.
const blockedByMissingAdminScope = computed(
	() => !props.isMcpEnabled && !props.canManageInstanceMcp,
);

const switchDisabled = computed(() => !props.canEdit || blockedByMissingAdminScope.value);

const tooltipContent = computed(() => {
	if (!props.canEdit) {
		return locale.baseText('workflows.item.availableInMCP');
	}
	if (blockedByMissingAdminScope.value) {
		return locale.baseText('workflows.item.mcpDisabledByInstance');
	}
	return switchModelValue.value
		? locale.baseText('workflows.item.disableMCPAccess')
		: locale.baseText('workflows.item.enableMCPAccess');
});

async function toggleMcpAccess(enabled: boolean) {
	try {
		await mcpStore.toggleWorkflowMcpAccess(props.workflowId, enabled);
		optimisticAvailability.value = enabled;
		if (enabled) {
			mcp.trackMcpAccessEnabledForWorkflow(props.workflowId);
		}
	} catch (error) {
		toast.showError(error, locale.baseText('workflowSettings.toggleMCP.error.title'));
	}
}

async function onSwitchChange(nextValue: boolean) {
	if (props.isMcpEnabled) {
		await toggleMcpAccess(nextValue);
		return;
	}

	uiStore.openModalWithData({
		name: SURFACE_MCP_ONBOARDING_MODAL_KEY,
		data: {
			surface: 'workflow_card',
			onMcpAccessEnabled: () => {
				if (isAvailableInMCP.value) return;
				void toggleMcpAccess(true);
			},
		},
	});
}
</script>

<template>
	<N8nTooltip v-if="showToggle" placement="top" :content="tooltipContent">
		<span :class="$style.container">
			<N8nIcon :class="$style.icon" icon="mcp" size="medium" />
			<N8nSwitch2
				:model-value="switchModelValue"
				:disabled="switchDisabled"
				size="small"
				:aria-label="tooltipContent"
				data-test-id="workflow-card-mcp-toggle"
				@update:model-value="onSwitchChange"
				@click.stop
			/>
		</span>
	</N8nTooltip>
</template>

<style lang="scss" module>
.container {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.icon {
	color: var(--color--text);
}
</style>
