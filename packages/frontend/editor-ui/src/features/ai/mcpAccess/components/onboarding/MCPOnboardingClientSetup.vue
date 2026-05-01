<script setup lang="ts">
import { useClipboard } from '@/app/composables/useClipboard';
import { N8nButton, N8nMarkdown, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

type MCPOnboardingClient = 'claude_code' | 'codex';

const props = defineProps<{
	client: MCPOnboardingClient;
	serverUrl: string;
	accessToken: string;
	isTokenReady: boolean;
}>();

const emit = defineEmits<{
	copy: [parameter: 'setup-config'];
}>();

const i18n = useI18n();
const { copy } = useClipboard();

const tokenValue = computed(() => (props.isTokenReady ? props.accessToken : '<your-access-token>'));

const envSnippet = computed(() => `export N8N_MCP_TOKEN="${tokenValue.value}"`);

const claudeConfigSnippet = computed(() =>
	JSON.stringify(
		{
			mcpServers: {
				n8n: {
					type: 'http',
					url: props.serverUrl,
					headers: {
						Authorization: 'Bearer ${N8N_MCP_TOKEN}',
					},
				},
			},
		},
		null,
		2,
	),
);

const codexConfigSnippet = computed(
	() =>
		`[mcp_servers.n8n]
url = "${props.serverUrl}"
bearer_token_env_var = "N8N_MCP_TOKEN"`,
);

const configSnippet = computed(() =>
	props.client === 'claude_code' ? claudeConfigSnippet.value : codexConfigSnippet.value,
);

const configLanguage = computed(() => (props.client === 'claude_code' ? 'json' : 'toml'));

const pathText = computed(() =>
	props.client === 'claude_code'
		? i18n.baseText('settings.mcp.onboarding.claudeCode.path')
		: i18n.baseText('settings.mcp.onboarding.codex.path'),
);

const envMarkdown = computed(() => `\`\`\`bash\n${envSnippet.value}\n\`\`\``);
const configMarkdown = computed(
	() => `\`\`\`${configLanguage.value}\n${configSnippet.value}\n\`\`\``,
);

async function copySetup(text: string) {
	await copy(text);
	emit('copy', 'setup-config');
}
</script>

<template>
	<div :class="$style.container" data-test-id="mcp-onboarding-client-setup">
		<div :class="$style.step">
			<N8nText tag="p" size="small" color="text-base">
				{{ i18n.baseText('settings.mcp.onboarding.step.env') }}
			</N8nText>
			<N8nMarkdown :content="envMarkdown" />
			<N8nButton
				variant="subtle"
				size="small"
				:disabled="!isTokenReady"
				data-test-id="mcp-onboarding-copy-env-button"
				@click="copySetup(envSnippet)"
			>
				{{ i18n.baseText('generic.copy') }}
			</N8nButton>
		</div>

		<div :class="$style.step">
			<N8nText tag="p" size="small" color="text-base">
				{{ i18n.baseText('settings.mcp.onboarding.step.config') }}
			</N8nText>
			<N8nText tag="p" size="small" color="text-light" data-test-id="mcp-onboarding-client-path">
				{{ pathText }}
			</N8nText>
			<N8nMarkdown :content="configMarkdown" />
			<N8nButton
				variant="subtle"
				size="small"
				:disabled="!isTokenReady"
				data-test-id="mcp-onboarding-copy-config-button"
				@click="copySetup(configSnippet)"
			>
				{{ i18n.baseText('generic.copy') }}
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.step {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);

	:global(.n8n-markdown) {
		width: 100%;
	}

	:global(code) {
		display: block;
		overflow-x: auto;
		font-size: var(--font-size--2xs);
	}
}
</style>
