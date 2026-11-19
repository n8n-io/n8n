<script lang="ts" setup>
import type { McpServerAccessMode } from '@n8n/api-types';
import { N8nButton, N8nCallout, N8nCodeBlock, N8nCopyInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import {
	claudeCodeCommand,
	codexSnippet,
	cursorDeepLink,
	cursorJson,
	vscodeJson,
	type ConnectClient,
} from '../mcpServers.utils';

/**
 * Copy-paste steps to connect one AI client. Shared by the Connect tab and the
 * share page. Never shows a real key: API key mode uses a placeholder.
 */
const props = defineProps<{
	client: ConnectClient;
	slug: string;
	url: string;
	accessMode: McpServerAccessMode;
}>();

const i18n = useI18n();

const input = computed(() => ({
	slug: props.slug,
	url: props.url,
	accessMode: props.accessMode,
}));

const authNote = computed(() => {
	switch (props.accessMode) {
		case 'oauth':
			return i18n.baseText('mcpServers.connect.auth.oauth');
		case 'apiKey':
			return i18n.baseText('mcpServers.connect.auth.apiKey');
		default:
			return i18n.baseText('mcpServers.connect.auth.public');
	}
});

/** Claude and ChatGPT connectors take OAuth or no auth. They cannot send a key header. */
const connectorNoKey = computed(
	() => (props.client === 'claude' || props.client === 'chatgpt') && props.accessMode === 'apiKey',
);

const snippet = computed(() => {
	switch (props.client) {
		case 'claudeCode':
			return { code: claudeCodeCommand(input.value), language: 'bash' };
		case 'cursor':
			return { code: cursorJson(input.value), language: 'json' };
		case 'vscode':
			return { code: vscodeJson(input.value), language: 'json' };
		case 'codex':
			return { code: codexSnippet(input.value), language: 'auto' };
		default:
			return null;
	}
});

const stepsKey = computed(() => {
	switch (props.client) {
		case 'claude':
			return 'mcpServers.connect.steps.claude' as const;
		case 'chatgpt':
			return 'mcpServers.connect.steps.chatgpt' as const;
		case 'claudeCode':
			return 'mcpServers.connect.steps.claudeCode' as const;
		case 'cursor':
			return 'mcpServers.connect.steps.cursor' as const;
		case 'vscode':
			return 'mcpServers.connect.steps.vscode' as const;
		default:
			return 'mcpServers.connect.steps.codex' as const;
	}
});

const cursorLink = computed(() => cursorDeepLink(input.value));
</script>

<template>
	<div :class="$style.instructions" data-testid="mcp-server-client-instructions">
		<N8nText tag="p">{{ i18n.baseText(stepsKey) }}</N8nText>
		<N8nCopyInput
			:value="url"
			:label="i18n.baseText('mcpServers.connect.url')"
			size="medium"
			data-testid="mcp-server-connect-url"
		/>
		<N8nCodeBlock
			v-if="snippet"
			:code="snippet.code"
			:language="snippet.language"
			:collapsed="false"
			data-testid="mcp-server-connect-snippet"
		/>
		<div v-if="client === 'cursor' && accessMode !== 'apiKey'">
			<N8nButton
				variant="outline"
				size="small"
				icon="external-link"
				:href="cursorLink"
				data-testid="mcp-server-connect-cursor-link"
			>
				{{ i18n.baseText('mcpServers.connect.cursor.oneClick') }}
			</N8nButton>
		</div>
		<N8nCallout v-if="connectorNoKey" theme="warning" icon="triangle-alert">
			{{ i18n.baseText('mcpServers.connect.connectorNoKey') }}
		</N8nCallout>
		<N8nText v-else size="small" color="text-light">{{ authNote }}</N8nText>
	</div>
</template>

<style lang="scss" module>
.instructions {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}
</style>
