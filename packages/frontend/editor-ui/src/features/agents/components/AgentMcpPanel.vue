<script setup lang="ts">
import { N8nSwitch2, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import shared from '../styles/agent-panel.module.scss';

defineProps<{
	availableInMcp: boolean;
	disabled: boolean;
}>();

const emit = defineEmits<{
	'toggle-mcp-access': [enabled: boolean];
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.mcpPanel">
		<div :class="$style.settingRow">
			<div :class="$style.settingLabel">
				<N8nText step="sm" bold :class="shared.dataEntryLabel">
					{{ i18n.baseText('agents.builder.mcp.availableInMCP.label') }}
				</N8nText>
				<N8nText size="small" :class="shared.dataEntrySubLabel">
					{{ i18n.baseText('agents.builder.mcp.availableInMCP.hint') }}
				</N8nText>
			</div>
			<N8nSwitch2
				:model-value="availableInMcp"
				:disabled="disabled"
				data-testid="agent-available-in-mcp-toggle"
				@update:model-value="(value: boolean) => emit('toggle-mcp-access', value)"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.mcpPanel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.settingRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	min-height: var(--spacing--xl);
	width: 100%;
}

.settingLabel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}
</style>
