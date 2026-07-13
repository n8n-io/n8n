<script setup lang="ts">
import { computed } from 'vue';
import { N8nActionBox, N8nButton, N8nHeading, N8nIcon, N8nTooltip } from '@n8n/design-system';
import { MCP_DOCS_PAGE_URL } from '@/features/ai/mcpAccess/mcp.constants';
import { useI18n } from '@n8n/i18n';
import McpClientLogoCards from '@/features/ai/mcpAccess/components/McpClientLogoCards.vue';

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
	<div :class="$style.container" data-test-id="mcp-empty-state-container">
		<N8nActionBox description="-">
			<template #description>
				<McpClientLogoCards :class="$style.cards" />
				<N8nHeading tag="h2" size="medium" align="center" class="mb-2xs">
					{{ i18n.baseText('settings.mcp.actionBox.heading') }}
				</N8nHeading>
				<div>
					{{ i18n.baseText('settings.mcp.emptyState.description') }}
				</div>
			</template>
			<template #additionalContent>
				<N8nButton
					variant="ghost"
					class="mr-2xs n8n-button--highlight"
					:href="MCP_DOCS_PAGE_URL"
					target="_blank"
					data-test-id="mcp-empty-state-learn-more"
				>
					{{ i18n.baseText('generic.learnMore') }} <N8nIcon icon="arrow-up-right" />
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
						:disabled="buttonDisabled"
						data-test-id="enable-mcp-access-button"
						@click="emit('turnOnMcp')"
					>
						{{ i18n.baseText('settings.mcp.actionBox.button.label') }}
					</N8nButton>
				</N8nTooltip>
			</template>
		</N8nActionBox>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.cards {
	margin-bottom: var(--spacing--lg);
}
</style>
