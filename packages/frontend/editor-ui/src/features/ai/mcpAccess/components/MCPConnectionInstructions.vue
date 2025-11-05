<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nHeading, N8nTabs, N8nText } from '@n8n/design-system';
import type { ApiKey } from '@n8n/api-types';
import type { TabOptions } from '@n8n/design-system';
import type { OAuthClientResponseDto } from '@n8n/api-types';
import OAuthConnectionInstructions from '@/features/ai/mcpAccess/components/connectionInstructions/OAuthConnectionInstructions.vue';
import AccessTokenConnectionInstructions from '@/features/ai/mcpAccess/components/connectionInstructions/AccessTokenConnectionInstructions.vue';
import { MCP_DOCS_PAGE_URL } from '@/features/ai/mcpAccess/mcp.constants';

const MCP_ENDPOINT = 'mcp-server/http';

type ConnectionTabType = 'oauth' | 'token';

type Props = {
	baseUrl: string;
	apiKey: ApiKey;
	loadingApiKey: boolean;
	oAuthClients: OAuthClientResponseDto[];
	loadingOAuthClients: boolean;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	rotateKey: [];
	revokeClient: [client: OAuthClientResponseDto];
	refreshClientList: [];
}>();

const i18n = useI18n();

const selectedTab = ref<ConnectionTabType>('oauth');

const tabs = ref<Array<TabOptions<ConnectionTabType>>>([
	{
		label: i18n.baseText('settings.mcp.instructions.tabs.oauth'),
		value: 'oauth',
	},
	{
		label: i18n.baseText('settings.mcp.instructions.tabs.apiKey'),
		value: 'token',
	},
]);

const onTabSelected = (tab: ConnectionTabType) => {
	selectedTab.value = tab;
};
</script>

<template>
	<div :class="$style.container">
		<N8nHeading size="medium" :bold="true">
			{{ i18n.baseText('settings.mcp.connection.info.heading') }}
		</N8nHeading>
		<div>
			<N8nTabs :model-value="selectedTab" :options="tabs" @update:model-value="onTabSelected" />
			<OAuthConnectionInstructions
				v-show="selectedTab === 'oauth'"
				:server-url="`${props.baseUrl}${MCP_ENDPOINT}`"
				:clients="props.oAuthClients"
				:clients-loading="props.loadingOAuthClients"
				@revoke-client="emit('revokeClient', $event)"
				@refresh="emit('refreshClientList')"
			/>
			<AccessTokenConnectionInstructions
				v-show="selectedTab === 'token'"
				:server-url="`${props.baseUrl}${MCP_ENDPOINT}`"
				:api-key="props.apiKey"
				:loading-api-key="props.loadingApiKey"
				@rotate-key="emit('rotateKey')"
			/>
			<N8nText size="small" data-test-id="mcp-connection-instructions-docs-text">
				{{ i18n.baseText('settings.mcp.instructions.docs.part1') }}
				<a :href="MCP_DOCS_PAGE_URL" target="_blank">
					{{ i18n.baseText('settings.mcp.instructions.docs.part2') }}
				</a>
			</N8nText>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}
</style>
