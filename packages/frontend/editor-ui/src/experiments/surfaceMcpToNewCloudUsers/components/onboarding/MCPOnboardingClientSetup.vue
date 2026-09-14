<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { computed } from 'vue';
import MCPOnboardingCopyBlock from './MCPOnboardingCopyBlock.vue';
import type { MCPOnboardingClient } from './types';

type MCPOnboardingPromptClient = Exclude<MCPOnboardingClient, 'chatgpt'>;

const props = defineProps<{
	client: MCPOnboardingPromptClient;
	serverUrl: string;
}>();

const emit = defineEmits<{
	copy: [parameter: 'agent-prompt'];
}>();

const i18n = useI18n();

const promptKeys: Record<MCPOnboardingPromptClient, BaseTextKey> = {
	claude: 'experiments.surfaceMcpToNewCloudUsers.onboarding.prompt.claude' as BaseTextKey,
	claude_code: 'experiments.surfaceMcpToNewCloudUsers.onboarding.prompt.claudeCode',
	cursor: 'experiments.surfaceMcpToNewCloudUsers.onboarding.prompt.cursor' as BaseTextKey,
	codex: 'experiments.surfaceMcpToNewCloudUsers.onboarding.prompt.codex',
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
			:copy-tooltip="i18n.baseText('experiments.surfaceMcpToNewCloudUsers.onboarding.copy.tooltip')"
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
