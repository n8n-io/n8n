<script setup lang="ts">
import { N8nCodeBlock, N8nTabs } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, ref } from 'vue';

import { buildMcpClientConfigs, type McpClientId } from './mcpClientConfig';

const props = defineProps<{
	agentName: string;
	url: string;
}>();

const i18n = useI18n();

const CLIENT_LABELS = {
	claudeCode: 'agents.channels.mcpServer.client.claudeCode.label',
	cursor: 'agents.channels.mcpServer.client.cursor.label',
	vscode: 'agents.channels.mcpServer.client.vscode.label',
	stdio: 'agents.channels.mcpServer.client.stdio.label',
} as const satisfies Record<McpClientId, BaseTextKey>;

const activeClient = ref<McpClientId>('claudeCode');

const configs = computed(() => buildMcpClientConfigs(props.agentName, props.url));

const tabs = computed(() =>
	configs.value.map(({ client }) => ({
		value: client,
		label: i18n.baseText(CLIENT_LABELS[client]),
	})),
);

const activeConfig = computed(
	() => configs.value.find(({ client }) => client === activeClient.value) ?? configs.value[0],
);
</script>

<template>
	<div :class="$style.clientConfig" data-testid="mcp-server-client-config">
		<N8nTabs v-model="activeClient" :options="tabs" :class="$style.tabs" />
		<N8nCodeBlock
			:key="activeConfig.client"
			:code="activeConfig.code"
			:language="activeConfig.language"
			:aria-label="i18n.baseText(CLIENT_LABELS[activeConfig.client])"
			:data-testid="`mcp-server-client-config-${activeConfig.client}`"
		/>
	</div>
</template>

<style module lang="scss">
.clientConfig {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.tabs {
	width: 100%;
	border-bottom: var(--border);
}
</style>
