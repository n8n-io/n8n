<script setup lang="ts">
import MCPOnboardingCopyBlock from '@/features/ai/mcpAccess/components/onboarding/MCPOnboardingCopyBlock.vue';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { computed } from 'vue';

type MCPOnboardingClient = 'claude' | 'claude_code' | 'codex' | 'cursor' | 'chatgpt';

const props = defineProps<{
	client: MCPOnboardingClient;
	serverUrl: string;
}>();

const emit = defineEmits<{
	copy: [parameter: 'agent-prompt'];
}>();

const i18n = useI18n();

const promptKeys: Record<MCPOnboardingClient, BaseTextKey> = {
	claude: 'settings.mcp.onboarding.prompt.claude' as BaseTextKey,
	claude_code: 'settings.mcp.onboarding.prompt.claudeCode',
	cursor: 'settings.mcp.onboarding.prompt.cursor' as BaseTextKey,
	codex: 'settings.mcp.onboarding.prompt.codex',
	chatgpt: 'settings.mcp.onboarding.prompt.codex',
};

const promptKey = computed(() => promptKeys[props.client]);

const promptBody = computed(() =>
	i18n.baseText(promptKey.value, {
		interpolate: {
			serverUrl: props.serverUrl,
		},
	}),
);

function handlePromptCopy() {
	emit('copy', 'agent-prompt');
}
</script>

<template>
	<div :class="$style.container" data-test-id="mcp-onboarding-client-setup">
		<MCPOnboardingCopyBlock
			:content="promptBody"
			:copy-tooltip="i18n.baseText('settings.mcp.onboarding.copy.tooltip')"
			copy-button-test-id="mcp-onboarding-copy-prompt-button"
			@copy="handlePromptCopy"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: 100%;
}
</style>
