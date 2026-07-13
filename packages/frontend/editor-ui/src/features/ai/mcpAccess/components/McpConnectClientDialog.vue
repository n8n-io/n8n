<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import {
	N8nButton,
	N8nDialog,
	N8nDropdownMenu,
	N8nIcon,
	N8nLink,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nText,
} from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { MCP_ENDPOINT } from '@/features/ai/mcpAccess/mcp.constants';
import { getMcpClientCatalog } from '@/features/ai/mcpAccess/mcp.clients.catalog';
import type { McpClientSetup } from '@/features/ai/mcpAccess/mcp.clients.catalog';
import ConnectionParameter from '@/features/ai/mcpAccess/components/ConnectionParameter.vue';
import McpConfigSnippet from '@/features/ai/mcpAccess/components/McpConfigSnippet.vue';
import MCPAccessTokenPopoverTab from '@/features/ai/mcpAccess/components/MCPAccessTokenPopoverTab.vue';

const i18n = useI18n();
const telemetry = useTelemetry();
const rootStore = useRootStore();
const mcpStore = useMCPStore();

const serverUrl = `${rootStore.urlBaseEditor}${MCP_ENDPOINT}`;
const catalog = getMcpClientCatalog(serverUrl);
const clientsById = new Map<string, McpClientSetup>(
	catalog.flatMap((group) => group.clients.map((client) => [client.id, client])),
);

const activeClientId = ref('claude-code');
const clientSearch = ref('');
const showTokenSetup = ref(false);

const activeClient = computed(() => clientsById.get(activeClientId.value));

type MenuItemData = { kind: 'header' } | { kind: 'client'; client: McpClientSetup };

// Grouped picker items: each category is a disabled, divided header item
// (non-selectable) followed by its clients; the active client carries `checked`.
// The menu only emits `search`, so the term is filtered here and empty
// categories drop out.
const clientMenuItems = computed<Array<DropdownMenuItemProps<string, MenuItemData>>>(() => {
	const term = clientSearch.value.trim().toLowerCase();
	const items: Array<DropdownMenuItemProps<string, MenuItemData>> = [];
	for (const group of catalog) {
		const matching = group.clients.filter((client) => client.name.toLowerCase().includes(term));
		if (matching.length === 0) continue;
		items.push({
			id: `header:${group.id}`,
			label: i18n.baseText(`settings.mcp.connectDialog.category.${group.id}` as BaseTextKey),
			disabled: true,
			divided: items.length > 0,
			data: { kind: 'header' },
		});
		for (const client of matching) {
			items.push({
				id: client.id,
				label: client.name,
				checked: client.id === activeClientId.value,
				data: { kind: 'client', client },
			});
		}
	}
	return items;
});

const onSelectClient = (id: string) => {
	if (id.startsWith('header:')) return;
	activeClientId.value = id;
	telemetry.track('User selected MCP client in connect dialog', { client: id });
};

const onClientSearch = (term: string) => {
	clientSearch.value = term ?? '';
};

const onOpenChange = (open: boolean) => {
	if (open) {
		mcpStore.openConnectPopover();
	} else {
		mcpStore.closeConnectPopover();
		mcpStore.resetCurrentUserMCPKey();
		showTokenSetup.value = false;
	}
};

const trackCopy = (parameter: string) => {
	telemetry.track('User copied MCP connection parameter', {
		parameter,
		source: 'connect-dialog',
	});
};

const handleTokenTabCopy = (type: 'serverUrl' | 'accessToken' | 'mcpJson') => {
	const itemMap = { serverUrl: 'server-url', accessToken: 'access-token', mcpJson: 'mcp-json' };
	trackCopy(itemMap[type]);
};

const installDescription = computed(() =>
	i18n.baseText('settings.mcp.connectDialog.install.description', {
		interpolate: { client: activeClient.value?.name ?? '' },
	}),
);
const authenticateDescription = computed(() =>
	activeClient.value?.authCommand
		? i18n.baseText('settings.mcp.connectDialog.authenticate.description.command')
		: i18n.baseText('settings.mcp.connectDialog.authenticate.description.mcpCommand', {
				interpolate: { client: activeClient.value?.name ?? '' },
			}),
);
const oneClickDescription = computed(() =>
	activeClient.value?.category === 'web'
		? i18n.baseText('settings.mcp.connectDialog.oneClick.description.web', {
				interpolate: { client: activeClient.value?.name ?? '' },
			})
		: i18n.baseText('settings.mcp.connectDialog.oneClick.description.ide', {
				interpolate: { client: activeClient.value?.name ?? '' },
			}),
);
const addButtonLabel = computed(() =>
	i18n.baseText('settings.mcp.connectDialog.oneClick.button', {
		interpolate: { client: activeClient.value?.name ?? '' },
	}),
);
const serverUrlDescription = computed(() =>
	i18n.baseText('settings.mcp.connectDialog.serverUrl.description', {
		interpolate: { client: activeClient.value?.name ?? '' },
	}),
);
</script>

<template>
	<N8nDialog
		:open="mcpStore.connectPopoverOpen"
		size="large"
		:header="i18n.baseText('settings.mcp.connectDialog.title')"
		:description="i18n.baseText('settings.mcp.connectDialog.description')"
		data-test-id="mcp-connect-dialog"
		@update:open="onOpenChange"
	>
		<div :class="$style.body">
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					:title="i18n.baseText('settings.mcp.connectDialog.yourClient.title')"
					:description="i18n.baseText('settings.mcp.connectDialog.yourClient.description')"
					:show-divider="!!activeClient"
				>
					<template #action>
						<N8nDropdownMenu
							searchable
							:search-placeholder="i18n.baseText('settings.mcp.connectDialog.search.placeholder')"
							:empty-text="i18n.baseText('settings.mcp.connectDialog.search.empty')"
							:items="clientMenuItems"
							placement="bottom-end"
							max-height="min(var(--reka-dropdown-menu-content-available-height), 30rem)"
							data-test-id="mcp-connect-client-picker"
							@select="onSelectClient"
							@search="onClientSearch"
						>
							<template #trigger>
								<N8nButton
									variant="outline"
									size="medium"
									:aria-label="i18n.baseText('settings.mcp.connectDialog.yourClient.title')"
									data-test-id="mcp-connect-client-picker-trigger"
								>
									<span :class="$style['picker-trigger']">
										<component
											:is="activeClient.icon"
											v-if="activeClient?.icon"
											:class="$style['brand-icon']"
										/>
										<N8nIcon v-else icon="mcp" size="small" color="text-light" />
										{{ activeClient?.name }}
										<N8nIcon icon="chevron-down" size="small" />
									</span>
								</N8nButton>
							</template>
							<template #item-leading="{ item }">
								<template v-if="item.data?.kind === 'client'">
									<component
										:is="item.data.client.icon"
										v-if="item.data.client.icon"
										:class="$style['brand-icon']"
									/>
									<N8nIcon v-else icon="mcp" size="large" color="text-light" />
								</template>
							</template>
							<template #item-label="{ item }">
								<span v-if="item.data?.kind === 'header'" :class="$style.category">
									{{ item.label }}
								</span>
								<N8nText v-else size="medium" color="text-dark">{{ item.label }}</N8nText>
							</template>
						</N8nDropdownMenu>
					</template>
				</N8nSettingsRow>

				<!-- CLI: Install → Configure → Authenticate -->
				<template v-if="activeClient?.category === 'cli'">
					<N8nSettingsRow
						layout="vertical"
						:show-divider="false"
						:title="i18n.baseText('settings.mcp.connectDialog.install.title')"
						:description="installDescription"
					>
						<template #action>
							<ConnectionParameter
								:class="$style['copy-field']"
								id="mcp-install-command"
								:label="''"
								:value="activeClient.installCommand ?? ''"
								@copy="trackCopy('install-command')"
							/>
						</template>
					</N8nSettingsRow>
					<N8nSettingsRow
						layout="vertical"
						:show-divider="false"
						:title="i18n.baseText('settings.mcp.connectDialog.configure.title')"
						:description="i18n.baseText('settings.mcp.connectDialog.configure.description')"
					>
						<template #action>
							<McpConfigSnippet
								:class="$style['copy-field']"
								:value="activeClient.configSnippet ?? ''"
								:language="activeClient.id === 'codex' ? 'toml' : 'json'"
								@copy="trackCopy('config')"
							/>
						</template>
					</N8nSettingsRow>
					<N8nSettingsRow
						layout="vertical"
						:show-divider="false"
						:title="i18n.baseText('settings.mcp.connectDialog.authenticate.title')"
						:description="authenticateDescription"
					>
						<template #action>
							<ConnectionParameter
								:class="$style['copy-field']"
								id="mcp-auth-command"
								:label="''"
								:value="activeClient.authCommand ?? '/mcp'"
								@copy="trackCopy('auth-command')"
							/>
						</template>
					</N8nSettingsRow>
				</template>

				<!-- Web: one-click connector -->
				<N8nSettingsRow
					v-else-if="activeClient?.category === 'web'"
					:show-divider="false"
					:title="i18n.baseText('settings.mcp.connectDialog.oneClick.title')"
					:description="oneClickDescription"
				>
					<template #action>
						<N8nButton
							variant="outline"
							size="medium"
							:href="activeClient.addUrl"
							target="_blank"
							data-test-id="mcp-connect-one-click"
						>
							<component
								:is="activeClient.icon"
								v-if="activeClient.icon"
								:class="$style['brand-icon']"
							/>
							{{ addButtonLabel }}
						</N8nButton>
					</template>
				</N8nSettingsRow>

				<!-- IDE: one-click deep link (when supported) + manual config -->
				<template v-else-if="activeClient">
					<N8nSettingsRow
						v-if="activeClient.deepLink"
						:show-divider="false"
						:title="i18n.baseText('settings.mcp.connectDialog.oneClick.title')"
						:description="oneClickDescription"
					>
						<template #action>
							<N8nButton
								variant="outline"
								size="medium"
								:href="activeClient.deepLink"
								data-test-id="mcp-connect-one-click"
							>
								<component
									:is="activeClient.icon"
									v-if="activeClient.icon"
									:class="$style['brand-icon']"
								/>
								{{ addButtonLabel }}
							</N8nButton>
						</template>
					</N8nSettingsRow>
					<N8nSettingsRow
						layout="vertical"
						:show-divider="false"
						:title="i18n.baseText('settings.mcp.connectPopover.serverUrl')"
						:description="serverUrlDescription"
					>
						<template #action>
							<ConnectionParameter
								:class="$style['copy-field']"
								id="mcp-server-url"
								:label="''"
								:value="serverUrl"
								@copy="trackCopy('server-url')"
							/>
						</template>
					</N8nSettingsRow>
					<N8nSettingsRow
						layout="vertical"
						:show-divider="false"
						:title="i18n.baseText('settings.mcp.connectDialog.configure.title')"
						:description="i18n.baseText('settings.mcp.connectDialog.configure.description')"
					>
						<template #action>
							<McpConfigSnippet
								:class="$style['copy-field']"
								:value="activeClient.configSnippet ?? ''"
								@copy="trackCopy('config')"
							/>
						</template>
					</N8nSettingsRow>
				</template>
			</N8nSettingsRowGroup>

			<div :class="$style['token-toggle']">
				<N8nLink
					size="small"
					theme="text"
					data-test-id="mcp-connect-token-toggle"
					@click="showTokenSetup = !showTokenSetup"
				>
					{{
						showTokenSetup
							? i18n.baseText('settings.mcp.connectDialog.tokenSetup.hide')
							: i18n.baseText('settings.mcp.connectDialog.tokenSetup.show')
					}}
				</N8nLink>
			</div>
			<div
				v-if="showTokenSetup"
				:class="$style['token-setup']"
				data-test-id="mcp-connect-token-setup"
			>
				<MCPAccessTokenPopoverTab :server-url="serverUrl" @copy="handleTokenTabCopy" />
			</div>
		</div>
	</N8nDialog>
</template>

<style lang="scss" module>
/* Body-only scroll so the dialog header stays pinned and tall clients
   (e.g. Claude Code's config block) never run off-screen. */
.body {
	max-height: calc(100dvh - 16rem);
	margin-top: var(--spacing--xs);
	overflow-y: auto;
}

.picker-trigger {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.brand-icon {
	width: 1em;
	height: 1em;
	flex: 0 0 auto;
	font-size: var(--font-size--md);
}

.category {
	display: block;
	padding-block: var(--spacing--5xs);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--color--text--tint-1);
}

/* Vertical settings rows hug the action to its content; the copy fields
   should span the full row width. */
.copy-field {
	width: 100%;
}

.token-toggle {
	margin-top: var(--spacing--sm);
}

.token-setup {
	margin-top: var(--spacing--2xs);
}
</style>
