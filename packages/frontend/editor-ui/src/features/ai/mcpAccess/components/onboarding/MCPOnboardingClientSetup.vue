<script setup lang="ts">
import { useClipboard } from '@/app/composables/useClipboard';
import { N8nIconButton, N8nMarkdown, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { computed, ref } from 'vue';

type MCPOnboardingClient = 'claude_code' | 'cursor' | 'codex';

const props = defineProps<{
	client: MCPOnboardingClient;
	serverUrl: string;
	accessToken: string;
	isTokenReady: boolean;
}>();

const emit = defineEmits<{
	copy: [parameter: 'agent-prompt'];
}>();

const i18n = useI18n();
const { copy } = useClipboard();

const tokenValue = computed(() => (props.isTokenReady ? props.accessToken : '<your-access-token>'));

const promptKeys: Record<MCPOnboardingClient, BaseTextKey> = {
	claude_code: 'settings.mcp.onboarding.prompt.claudeCode',
	cursor: 'settings.mcp.onboarding.prompt.cursor' as BaseTextKey,
	codex: 'settings.mcp.onboarding.prompt.codex',
};

const clientLabelKeys: Record<MCPOnboardingClient, BaseTextKey> = {
	claude_code: 'settings.mcp.onboarding.client.claudeCode',
	cursor: 'settings.mcp.onboarding.client.cursor' as BaseTextKey,
	codex: 'settings.mcp.onboarding.client.codex',
};

const promptKey = computed(() => promptKeys[props.client]);

const promptBody = computed(() =>
	i18n.baseText(promptKey.value, {
		interpolate: {
			token: tokenValue.value,
			serverUrl: props.serverUrl,
			cursorTokenReference: '${env:N8N_MCP_TOKEN}',
		},
	}),
);

const promptMarkdown = computed(() => `\`\`\`\n${promptBody.value}\n\`\`\``);

const clientLabel = computed(() => i18n.baseText(clientLabelKeys[props.client]));

const description = computed(() =>
	i18n.baseText('settings.mcp.onboarding.prompt.description', {
		interpolate: { client: clientLabel.value },
	}),
);

const justCopied = ref(false);
let copyResetTimeout: ReturnType<typeof setTimeout> | null = null;

async function handleCopy() {
	await copy(promptBody.value);
	emit('copy', 'agent-prompt');

	justCopied.value = true;
	if (copyResetTimeout) {
		clearTimeout(copyResetTimeout);
	}
	copyResetTimeout = setTimeout(() => {
		justCopied.value = false;
	}, 1800);
}

const copyTooltip = computed(() =>
	justCopied.value
		? i18n.baseText('settings.mcp.onboarding.copy.copied')
		: i18n.baseText('settings.mcp.onboarding.copy.tooltip'),
);
</script>

<template>
	<div :class="$style.container" data-test-id="mcp-onboarding-client-setup">
		<N8nText tag="p" size="small" color="text-light" :class="$style.helper">
			{{ description }}
		</N8nText>
		<div :class="$style.codeBlock">
			<div :class="$style.codeToolbar">
				<N8nTooltip :content="copyTooltip" placement="top">
					<N8nIconButton
						icon="copy"
						variant="ghost"
						size="small"
						:disabled="!isTokenReady"
						:aria-label="copyTooltip"
						data-test-id="mcp-onboarding-copy-prompt-button"
						@click="handleCopy"
					/>
				</N8nTooltip>
			</div>
			<N8nMarkdown :content="promptMarkdown" />
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: 100%;
}

.helper {
	line-height: 1.5;
}

.codeBlock {
	position: relative;
	border: var(--border);
	border-radius: var(--radius);
	background: var(--background--surface);
	overflow: hidden;
	width: 100%;

	:global(.n8n-markdown) {
		width: 100%;
	}

	:global(pre) {
		margin: 0;
		max-height: 240px;
		overflow-y: auto;
	}

	:global(code) {
		display: block;
		overflow-x: auto;
		font-size: var(--font-size--3xs);
		line-height: 1.55;
		padding-right: var(--spacing--xl);
	}
}

.codeToolbar {
	position: absolute;
	top: var(--spacing--4xs);
	right: var(--spacing--4xs);
	z-index: 1;
	background: var(--background--surface);
	border-radius: var(--radius--xs);
	padding: var(--spacing--5xs);
}
</style>
