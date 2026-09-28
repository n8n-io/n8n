<script setup lang="ts">
import { computed } from 'vue';
import { N8nButton, N8nIcon, N8nTooltip } from '@n8n/design-system';
import { MCP_DOCS_PAGE_URL } from '@/features/ai/mcpAccess/mcp.constants';
import { useI18n } from '@n8n/i18n';
import McpEmptyStateCard from '@/features/ai/mcpAccess/components/McpEmptyStateCard.vue';

type Props = {
	disabled?: boolean;
	loading?: boolean;
	managedByEnv?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	disabled: false,
	loading: false,
	managedByEnv: false,
});

const emit = defineEmits<{
	turnOnMcp: [];
}>();

const i18n = useI18n();

const buttonDisabled = computed(() => props.disabled || props.loading);
</script>

<template>
	<McpEmptyStateCard
		surface
		:class="$style.card"
		data-test-id="mcp-empty-state-container"
		:title="i18n.baseText('settings.mcp.actionBox.heading')"
		:description="i18n.baseText('settings.mcp.emptyState.description')"
	>
		<template #actions>
			<N8nButton
				variant="ghost"
				size="medium"
				:href="MCP_DOCS_PAGE_URL"
				target="_blank"
				data-test-id="mcp-empty-state-learn-more"
			>
				{{ i18n.baseText('generic.learnMore') }} <N8nIcon icon="arrow-up-right" size="small" />
			</N8nButton>
			<N8nTooltip :disabled="!buttonDisabled">
				<template #content>
					<span v-if="props.loading">{{ i18n.baseText('generic.loading') }}...</span>
					<span v-else-if="props.managedByEnv">
						{{ i18n.baseText('settings.mcp.managedByEnv.tooltip') }}
					</span>
					<span v-else>
						{{ i18n.baseText('settings.mcp.toggle.disabled.tooltip') }}
					</span>
				</template>
				<N8nButton
					variant="solid"
					size="medium"
					:disabled="buttonDisabled"
					data-test-id="enable-mcp-access-button"
					@click="emit('turnOnMcp')"
				>
					{{ i18n.baseText('settings.mcp.actionBox.button.label') }}
				</N8nButton>
			</N8nTooltip>
		</template>
	</McpEmptyStateCard>
</template>

<style lang="scss" module>
.card {
	margin-top: var(--spacing--xl);
}
</style>
