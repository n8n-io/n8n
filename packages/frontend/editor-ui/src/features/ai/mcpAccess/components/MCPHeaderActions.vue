<script setup lang="ts">
import { MCP_DOCS_PAGE_URL } from '@/features/ai/mcpAccess/mcp.constants';
import ExternalLink from '@n8n/design-system/components/N8nExternalLink/ExternalLink.vue';
import MCPAccessToggle from '@/features/ai/mcpAccess/components/MCPAccessToggle.vue';
import McpConnectPopover from '@/features/ai/mcpAccess/components/McpConnectPopover.vue';
import { useI18n } from '@n8n/i18n';

type Props = {
	toggleDisabled?: boolean;
	loading?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	toggleDisabled: false,
	loading: false,
});

const emit = defineEmits<{
	disableMcpAccess: [];
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.container" data-test-id="mcp-header-actions">
		<ExternalLink :href="MCP_DOCS_PAGE_URL">{{ i18n.baseText('generic.docs') }}</ExternalLink>
		<MCPAccessToggle
			:model-value="true"
			:disabled="props.toggleDisabled"
			:loading="props.loading"
			@disable-mcp-access="emit('disableMcpAccess')"
		/>
		<McpConnectPopover />
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	gap: var(--spacing--lg);
	align-items: center;

	a {
		font-size: var(--font-size--2xs);
	}
}
</style>
