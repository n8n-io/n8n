<script setup lang="ts">
import { N8nTabs } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { MCP_SERVER_CONNECTIONS_VIEW, MCP_SERVER_VIEW } from '../mcp-servers.constants';

const i18n = useI18n();
const route = useRoute();
const router = useRouter();

const tabs = computed(() => [
	{ value: MCP_SERVER_VIEW, label: i18n.baseText('mcpServers.server.tabs.contents') },
	{
		value: MCP_SERVER_CONNECTIONS_VIEW,
		label: i18n.baseText('mcpServers.server.tabs.connections'),
	},
]);

const selectedTab = computed(() =>
	route.name === MCP_SERVER_CONNECTIONS_VIEW ? MCP_SERVER_CONNECTIONS_VIEW : MCP_SERVER_VIEW,
);

async function onSelectTab(tab: string) {
	await router.push({ name: tab, params: route.params });
}
</script>

<template>
	<div :class="$style.page" data-test-id="mcp-server-page">
		<N8nTabs
			:model-value="selectedTab"
			:options="tabs"
			data-test-id="mcp-server-tabs"
			@update:model-value="onSelectTab"
		/>
		<div
			v-if="selectedTab === MCP_SERVER_VIEW"
			:class="$style.panel"
			data-test-id="mcp-server-contents"
		/>
		<div v-else :class="$style.panel" data-test-id="mcp-server-connections" />
	</div>
</template>

<style lang="scss" module>
.page {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	width: 100%;
	max-width: var(--content-container--width);
	box-sizing: border-box;
	padding: var(--spacing--lg) var(--spacing--2xl) 0;
}

.panel {
	min-height: 0;
}
</style>
