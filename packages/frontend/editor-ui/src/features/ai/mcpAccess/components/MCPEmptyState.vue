<script setup lang="ts">
import { N8nActionBox } from '@n8n/design-system';
import { N8nText } from '@n8n/design-system';
import { MCP_DOCS_PAGE_URL } from '@/features/ai/mcpAccess/mcp.constants';
import { useI18n } from '@n8n/i18n';

type Props = {
	disabled?: boolean;
	loading?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	disabled: false,
	loading: false,
});

const emit = defineEmits<{
	turnOnMcp: [];
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.container" data-test-id="mcp-empty-state-container">
		<N8nActionBox
			:icon="{ type: 'icon', value: 'mcp' }"
			:heading="i18n.baseText('settings.mcp.actionBox.heading')"
			:description="i18n.baseText('settings.mcp.description')"
			:button-text="i18n.baseText('settings.mcp.actionBox.button.label')"
			:button-disabled="props.disabled || props.loading"
			button-variant="solid"
			data-test-id="enable-mcp-access-button"
			@click:button="emit('turnOnMcp')"
		>
			<template #disabledButtonTooltip>
				<span v-if="props.loading">{{ i18n.baseText('generic.loading') }}...</span>
				<span v-else-if="props.disabled">
					{{ i18n.baseText('settings.mcp.toggle.disabled.tooltip') }}
				</span>
			</template>
			<template #additionalContent>
				<N8nText color="text-light" size="small">
					{{ i18n.baseText('settings.mcp.emptyState.docs.part1') }}
					<a
						:href="MCP_DOCS_PAGE_URL"
						:class="$style['docs-link']"
						target="_blank"
						rel="noopener noreferrer"
					>
						{{ i18n.baseText('generic.learnMore').toLowerCase() }}
					</a>
				</N8nText>
			</template>
		</N8nActionBox>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);

	button {
		margin-bottom: var(--spacing--2xs);
	}
}

.docs-link {
	text-decoration: underline;
}
</style>
