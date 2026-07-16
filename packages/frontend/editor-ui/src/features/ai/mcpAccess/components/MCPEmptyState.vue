<script setup lang="ts">
import { computed } from 'vue';
import { N8nButton, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
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
		<McpClientLogoCards :class="$style.cards" />
		<div :class="$style.copy">
			<N8nText bold size="large" color="text-dark">
				{{ i18n.baseText('settings.mcp.actionBox.heading') }}
			</N8nText>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('settings.mcp.emptyState.description') }}
			</N8nText>
		</div>
		<div :class="$style.actions">
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
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: var(--spacing--sm);
	margin-top: var(--spacing--xl);
	padding: var(--spacing--2xl) var(--spacing--xl);
	border: var(--border-width) dashed var(--border-color);
	border-radius: var(--radius--lg);
	/* Match the page surface (white in light theme) so only the dashed border
	   frames the state, like the prototype. */
	background: transparent;
	/* Gentle entrance for the enable/disable swap, matching the prototype. */
	animation: mcp-reveal-in var(--duration--base, 240ms) var(--easing--ease-out, ease-out);
}

@keyframes mcp-reveal-in {
	from {
		opacity: 0;
		transform: translateY(var(--spacing--2xs));
	}

	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@media (prefers-reduced-motion: reduce) {
	.container {
		animation: none;
	}
}

.cards {
	margin-bottom: var(--spacing--sm);
}

.copy {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	max-width: 32rem;
}

.actions {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
}
</style>
