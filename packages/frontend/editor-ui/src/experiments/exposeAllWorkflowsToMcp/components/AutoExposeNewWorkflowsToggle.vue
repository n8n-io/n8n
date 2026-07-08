<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElSwitch } from 'element-plus';
import { N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useExposeAllWorkflowsToMcpStore } from '@/experiments/exposeAllWorkflowsToMcp/stores/exposeAllWorkflowsToMcp.store';

const i18n = useI18n();
const toast = useToast();
const mcpStore = useMCPStore();
const usersStore = useUsersStore();
const experimentStore = useExposeAllWorkflowsToMcpStore();

const saving = ref(false);
const canManage = computed(() => usersStore.isAdminOrOwner);

const tooltip = computed(() =>
	canManage.value
		? i18n.baseText('settings.mcp.autoExposeNewWorkflows.tooltip')
		: i18n.baseText('settings.mcp.toggle.disabled.tooltip'),
);

async function onToggle(enabled: string | number | boolean) {
	saving.value = true;
	try {
		const updated = await mcpStore.setAutoExposeNewWorkflows(enabled === true);
		experimentStore.trackAutoExposeToggled(updated);
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.autoExposeNewWorkflows.error'));
	} finally {
		saving.value = false;
	}
}
</script>

<template>
	<div
		v-if="experimentStore.isEnabled"
		:class="$style.container"
		data-test-id="mcp-auto-expose-toggle-container"
	>
		<N8nText size="small" color="text-base">
			{{ i18n.baseText('settings.mcp.autoExposeNewWorkflows.label') }}
		</N8nText>
		<N8nTooltip :content="tooltip" placement="top">
			<ElSwitch
				data-test-id="mcp-auto-expose-toggle"
				:model-value="mcpStore.mcpAutoExposeNewWorkflows"
				:disabled="!canManage"
				:loading="saving"
				@update:model-value="onToggle"
			/>
		</N8nTooltip>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-right: var(--spacing--xs);
	white-space: nowrap;
}
</style>
