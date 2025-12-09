<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { ref, watch } from 'vue';
import { N8nButton, N8nPopoverReka, N8nRadioButtons } from '@n8n/design-system';
import MCPOAuthPopoverTab from '@/features/ai/mcpAccess/components/header/connectPopover/MCPOAuthPopoverTab.vue';
import MCPAccessTokenPopoverTab from '@/features/ai/mcpAccess/components/header/connectPopover/MCPAccessTokenPopoverTab.vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { MCP_ENDPOINT, MCP_CONNECT_POPOVER_WIDTH } from '@/features/ai/mcpAccess/mcp.constants';

const i18n = useI18n();
const telemetry = useTelemetry();
const rootStore = useRootStore();
const mcpStore = useMCPStore();

const props = defineProps<{
	disabled?: boolean;
}>();

const popoverOpen = ref(false);

const TABS = {
	ACCESS_TOKEN: 'accessToken',
	OAUTH: 'oauth',
};

const tabItems = ref([
	{ value: TABS.OAUTH, label: i18n.baseText('settings.mcp.connectPopover.tab.oauth') },
	{ value: TABS.ACCESS_TOKEN, label: i18n.baseText('settings.mcp.connectPopover.tab.accessToken') },
]);

const serverUrl = ref(`${rootStore.urlBaseEditor}${MCP_ENDPOINT}`);

const activeTab = ref(tabItems.value[0].value);

const handlePopoverOpenChange = (isOpen: boolean) => {
	popoverOpen.value = isOpen;
	if (!isOpen) {
		mcpStore.resetCurrentUserMCPKey();
	}
};

const handleTabChange = (newTab: string) => {
	activeTab.value = newTab;
};

const handleAccessTokenTabCopy = (type: 'serverUrl' | 'accessToken' | 'mcpJson') => {
	const itemMap = {
		serverUrl: 'server-url',
		accessToken: 'access-token',
		mcpJson: 'mcp-json',
	} as const;
	trackCopyEvent({ item: itemMap[type], source: 'token-tab' });
};

const trackCopyEvent = (payload: {
	item: 'server-url' | 'access-token' | 'mcp-json';
	source: 'oauth-tab' | 'token-tab';
}) => {
	telemetry.track('User copied MCP connection parameter', {
		parameter: payload.item,
		source: payload.source,
	});
};

// Automatically open the popover when mcp access is turned on
watch(
	() => props.disabled,
	(newValue) => {
		if (!newValue) {
			popoverOpen.value = true;
		}
	},
);
</script>

<template>
	<div>
		<N8nPopoverReka
			:id="'mcp-connect-popover'"
			:open="popoverOpen"
			:popper-options="{ strategy: 'fixed' }"
			:content-class="$style.popper"
			:show-arrow="false"
			:width="`${MCP_CONNECT_POPOVER_WIDTH}px`"
			@update:open="handlePopoverOpenChange"
		>
			<template #trigger>
				<N8nButton
					data-test-id="mcp-connect-popover-trigger-button"
					type="tertiary"
					:disabled="disabled"
				>
					{{ i18n.baseText('generic.connect') }}
				</N8nButton>
			</template>
			<template #content>
				<div :class="$style['popper-content']" data-test-id="mcp-connect-popover-content">
					<header>
						<N8nRadioButtons
							data-test-id="mcp-connect-popover-tabs"
							:model-value="activeTab"
							:options="tabItems"
							@update:model-value="handleTabChange"
						/>
					</header>
					<main>
						<MCPOAuthPopoverTab
							v-if="activeTab === TABS.OAUTH"
							:server-url="serverUrl"
							@copy="trackCopyEvent({ item: 'server-url', source: 'oauth-tab' })"
						/>
						<MCPAccessTokenPopoverTab
							v-else-if="activeTab === TABS.ACCESS_TOKEN"
							:server-url="serverUrl"
							@copy="handleAccessTokenTabCopy"
						/>
					</main>
				</div>
			</template>
		</N8nPopoverReka>
	</div>
</template>

<style lang="scss" module>
.popper {
	margin-right: var(--spacing--sm);
}

.popper-content {
	padding: var(--spacing--xs);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
</style>
