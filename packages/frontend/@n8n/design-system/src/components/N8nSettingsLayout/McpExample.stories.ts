import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, ref, type Component } from 'vue';

import {
	AutoHeight,
	BrandButton,
	ClientDetailsDialog,
	ClientLogoCards,
	clientAccessSummary,
	clientLogoComponents,
	CopyInput,
	defaultMcpAllowed,
	mcpClients,
	mcpToolCount,
	StatusDot,
	type McpClient,
} from './mcpExampleParts';
import N8nSettingsLayout from './SettingsLayout.vue';
import N8nButton from '../N8nButton';
import { N8nDialog, N8nDialogClose, N8nDialogFooter } from '../N8nDialog';
import { N8nDropdownMenu } from '../N8nDropdownMenu';
import N8nIcon from '../N8nIcon';
import type { IconName } from '../N8nIcon/icons';
import N8nSettingsPageHeader from '../N8nSettingsPageHeader';
import N8nSettingsRow from '../N8nSettingsRow';
import N8nSettingsRowConfigure from '../N8nSettingsRowConfigure';
import N8nSettingsRowGroup from '../N8nSettingsRowGroup';
import { confirmSaved } from '../N8nSettingsSaveBar/quickSaveNotification';
import N8nSettingsSection from '../N8nSettingsSection';
import N8nText from '../N8nText';

const meta = {
	title: 'Instance Settings/Model Context Protocol',
	component: N8nSettingsLayout,
	parameters: {
		docs: {
			description: {
				component:
					'The instance-level MCP page re-expressed in the native settings system: it enables/disables the server through a single **MCP status** status-action control (shown only while enabled: a green pulsing-dot "Enabled" dropdown whose danger "Disable" item opens an `N8nDialog` confirmation) rather than a toggle — collapsing to a dashed-border empty state, the sole enable affordance, while disabled — folds the **Connection details** inline as a client-led flow (a searchable, three-category "Client" picker that drives a dividerless group of official `N8nSettingsRow`s whose copyable values use `CopyInput` (readonly `N8nInput` + copy button): CLI Install/Configure/Authenticate, a web-client one-click "Add to …" row, or IDE deep-link + Server URL/token/Configure rows), summarizes **Access** ("4 of 7 allowed" Permissions, "12 across 4 projects" Workflows available — the dedicated sub-pages behind those rows are not part of this story set), and previews **Connected clients** inline. Access is granted **per connected client** (like PostHog\'s "Connected applications"): each preview row renders its grant as muted **plain truncated text** ("List workflows, Get workflow details +5" — never chips) that opens a **client details dialog** (brand mark + name, Connected by / Connected on / Last active, the full grant grouped by tool type, and a destructive Revoke access).',
			},
		},
	},
} satisfies Meta<typeof N8nSettingsLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

const components = {
	ClientLogoCards,
	StatusDot,
	CopyInput,
	AutoHeight,
	BrandButton,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsSection,
	N8nSettingsRowGroup,
	N8nSettingsRow,
	N8nSettingsRowConfigure,
	N8nButton,
	N8nDialog,
	N8nDialogClose,
	N8nDialogFooter,
	N8nIcon,
	N8nText,
	// Cast the generic dropdown menu to a plain Component so its generic signature doesn't leak
	// into (and break) the Storybook render-function types.
	N8nDropdownMenu: N8nDropdownMenu as unknown as Component,
};

// Full-height scrollable viewport so the page reads as a real, full-height settings page (no
// windowed box) on the app's subtle background, mirroring the composed Examples stories.
const fullPageViewportStyle =
	'height: 100vh; overflow-y: auto; display: flex; flex-direction: column; background: var(--background--subtle);';

// Sample instance content behind the main page's Workflows available summary ("12 across 4
// projects"). Only the counts show on the page; the per-workflow exposure UI lives on a dedicated
// sub-page that is not part of this story set.
const mcpWorkflowCount = 12;
const mcpWorkflowProjectCount = 4;

// ---------------------------------------------------------------------------
// Connection details — the client-led setup catalogue behind the Connect dialog: the same server
// URL for every client, a masked token, and a per-client descriptor whose `category` drives the
// setup UI. CLI clients carry install/auth commands + an alternative config file; IDEs carry a
// deep link + a manual config file; web clients carry a one-click connector URL.
// ---------------------------------------------------------------------------
const mcpServerUrl = 'https://acme.app.n8n.cloud/mcp/9f3a2b';
const mcpAuthToken = 'n8n_mcp_••••••••••••3f9a';
const mcpDocsUrl = 'https://docs.n8n.io/manage-cloud/mcp-access/';

// Config snippets, computed once from the server URL. Most clients take the common `mcpServers`
// JSON shape; Codex reads TOML, VS Code uses its `servers` map, Gemini an `httpUrl`, Windsurf a
// `serverUrl` — so each client points at the snippet it needs.
const mcpJsonSnippet = `{\n  "mcpServers": {\n    "n8n": {\n      "url": "${mcpServerUrl}"\n    }\n  }\n}`;
const mcpClaudeSnippet = `{\n  "mcpServers": {\n    "n8n": {\n      "type": "http",\n      "url": "${mcpServerUrl}"\n    }\n  }\n}`;
const mcpCodexSnippet = `[mcp_servers.n8n]\nurl = "${mcpServerUrl}"`;
const mcpGeminiSnippet = `{\n  "mcpServers": {\n    "n8n": {\n      "httpUrl": "${mcpServerUrl}"\n    }\n  }\n}`;
const mcpVscodeSnippet = `{\n  "servers": {\n    "n8n": {\n      "type": "http",\n      "url": "${mcpServerUrl}"\n    }\n  }\n}`;
const mcpWindsurfSnippet = `{\n  "mcpServers": {\n    "n8n": {\n      "serverUrl": "${mcpServerUrl}"\n    }\n  }\n}`;

// One-click deep links, computed from the server URL exactly as each editor expects:
//   • Cursor: base64 of `{"url":"<serverUrl>"}` passed in a `config` query param.
//   • VS Code: a URL-encoded `{"name","type":"http","url"}` JSON object.
const mcpCursorDeepLink = `cursor://anysphere.cursor-deeplink/mcp/install?name=n8n&config=${btoa(
	`{"url":"${mcpServerUrl}"}`,
)}`;
const mcpVscodeDeepLink = `vscode:mcp/install?${encodeURIComponent(
	`{"name":"n8n","type":"http","url":"${mcpServerUrl}"}`,
)}`;

type McpClientCategory = 'cli' | 'web' | 'ide';
interface McpClientSetup {
	id: string;
	name: string;
	category: McpClientCategory;
	/** Brand-mark key into `clientLogoComponents`; the DS `icon` is shown when absent. */
	logo?: string;
	icon: IconName;
	docsUrl: string;
	installCommand?: string;
	authCommand?: string;
	configFilename?: string;
	configSnippet?: string;
	deepLink?: string;
	addUrl?: string;
}
const mcpClientCatalog: Record<string, McpClientSetup> = {
	claude: {
		id: 'claude',
		name: 'Claude Code',
		category: 'cli',
		logo: 'claude',
		icon: 'anthropic',
		docsUrl: mcpDocsUrl,
		installCommand: `claude mcp add --transport http n8n ${mcpServerUrl}`,
		configFilename: '~/.claude.json',
		configSnippet: mcpClaudeSnippet,
	},
	codex: {
		id: 'codex',
		name: 'Codex',
		category: 'cli',
		logo: 'codex',
		icon: 'sparkles',
		docsUrl: mcpDocsUrl,
		installCommand: `codex mcp add n8n --url "${mcpServerUrl}"`,
		configFilename: '~/.codex/config.toml',
		configSnippet: mcpCodexSnippet,
		authCommand: 'codex mcp login n8n',
	},
	gemini: {
		id: 'gemini',
		name: 'Gemini CLI',
		category: 'cli',
		logo: 'gemini',
		icon: 'terminal',
		docsUrl: mcpDocsUrl,
		installCommand: `gemini mcp add --transport http n8n ${mcpServerUrl}`,
		configFilename: '~/.gemini/settings.json',
		configSnippet: mcpGeminiSnippet,
	},
	'claude-ai': {
		id: 'claude-ai',
		name: 'Claude.ai',
		category: 'web',
		logo: 'claude',
		icon: 'anthropic',
		docsUrl: mcpDocsUrl,
		addUrl: 'https://claude.ai/settings/connectors',
	},
	chatgpt: {
		id: 'chatgpt',
		name: 'ChatGPT',
		category: 'web',
		logo: 'chatgpt',
		icon: 'bot',
		docsUrl: mcpDocsUrl,
		addUrl: 'https://chatgpt.com/#settings/connectors',
	},
	cursor: {
		id: 'cursor',
		name: 'Cursor',
		category: 'ide',
		logo: 'cursor',
		icon: 'plug-zap',
		docsUrl: mcpDocsUrl,
		deepLink: mcpCursorDeepLink,
		configFilename: '.cursor/mcp.json',
		configSnippet: mcpJsonSnippet,
	},
	vscode: {
		id: 'vscode',
		name: 'VS Code',
		category: 'ide',
		logo: 'vscode',
		icon: 'code',
		docsUrl: mcpDocsUrl,
		deepLink: mcpVscodeDeepLink,
		configFilename: '.vscode/mcp.json',
		configSnippet: mcpVscodeSnippet,
	},
	windsurf: {
		id: 'windsurf',
		name: 'Windsurf',
		category: 'ide',
		icon: 'box',
		docsUrl: mcpDocsUrl,
		configFilename: '~/.codeium/windsurf/mcp_config.json',
		configSnippet: mcpWindsurfSnippet,
	},
};

// The three client categories, in the order they appear in the picker.
const mcpClientCategories: Array<{ id: McpClientCategory; label: string; clientIds: string[] }> = [
	{ id: 'cli', label: 'CLI', clientIds: ['claude', 'codex', 'gemini'] },
	{ id: 'web', label: 'Web Clients', clientIds: ['claude-ai', 'chatgpt'] },
	{ id: 'ide', label: 'IDE', clientIds: ['cursor', 'vscode', 'windsurf'] },
];

export const ModelContextProtocol: Story = {
	render: () => ({
		components: { ...components, ClientDetailsDialog },
		setup() {
			// Enabling/disabling the instance MCP server is high-stakes — it exposes the instance and
			// can disconnect connected clients — so this is an explicit status + button, NOT a toggle.
			// Enabling is lower-risk and applies instantly; disabling is gated behind a confirmation
			// `N8nDialog`. The connection area reads its on/off state at a glance via the status dot.
			const enabled = ref(true);
			const showDisableDialog = ref(false);
			// The client-led connect flow lives in a dialog opened from the "Your client" row's Connect
			// button: the grouped picker + tailored setup steps, nothing else — no footer and no
			// in-dialog consent, because granting access is the CLIENT's move: in reality the
			// configured client initiates the OAuth flow against the instance and n8n's authorization
			// (consent) screen opens in a new tab. That consent screen is not part of this story set,
			// so here closing the dialog is simply closing the dialog.
			const showConnectDialog = ref(false);
			const onOpenConnect = () => {
				showConnectDialog.value = true;
			};
			// Per-story reactive copy of the shared fixture so revoking mutates only this story (the
			// module `mcpClients` stays an untouched seed). The count summaries, the preview, the
			// count-gated "View all" row and the empty state all derive from this one source of truth.
			const clients = ref<McpClient[]>(mcpClients.map((client) => ({ ...client })));
			const clientCount = computed(() => clients.value.length);
			// Plural-aware disable confirmation body ("1 connected client" vs "N connected clients").
			const disableDialogDescription = computed(
				() =>
					`This disconnects ${clientCount.value} ${clientCount.value === 1 ? 'connected client' : 'connected clients'} and revokes their access. You can turn it back on later.`,
			);

			// Confirmations (instant enable, confirmed disable, and the copy affordances in the inlined
			// Connection details section) all go through the shared app notification.
			// Enabling is instant (low-stakes), then a follow-up dialog offers to expose every workflow
			// on the instance right away. Enabling flips on immediately + confirms; the dialog is the
			// optional next step (not a gate).
			const showExposeAllDialog = ref(false);
			const onEnable = () => {
				enabled.value = true;
				confirmSaved('MCP access enabled');
				showExposeAllDialog.value = true;
			};
			// "Expose all workflows" from the follow-up dialog. In the app/prototype this flips every
			// workflow's exposure (and the auto-expose-new flag) in the shared store so the Workflows
			// available page reflects it; here the main page and that page are separate story instances,
			// so this just closes + confirms to keep the UX demonstrable.
			const onExposeAll = () => {
				showExposeAllDialog.value = false;
				confirmSaved('All workflows exposed to MCP');
			};
			const onConfirmDisable = () => {
				enabled.value = false;
				showDisableDialog.value = false;
				confirmSaved('MCP access disabled');
			};
			// While enabled, the status control is a dropdown whose single danger item re-opens the
			// destructive disable confirmation (disabling is gated; it never toggles off instantly).
			const disableMenuItems: Array<{
				id: string;
				label: string;
				icon: { type: 'icon'; value: IconName };
			}> = [{ id: 'disable', label: 'Disable', icon: { type: 'icon', value: 'power' } }];
			const onDisableMenuSelect = () => {
				showDisableDialog.value = true;
			};

			// Connection details — folded onto the main page and rebuilt as a Supabase-style,
			// client-led flow, reading the module-scope catalogue (mcpServerUrl / mcpClientCatalog /
			// mcpClientCategories).
			//
			// Selected client drives the entire connect-dialog body. The dialog defaults to Claude Code
			// (the most common pick), so it opens with the CLI Install/Configure/Authenticate steps
			// already visible; the placeholder logic stays intact for when the value is cleared.
			const activeClient = ref('claude');
			const activeClientDef = computed(() => mcpClientCatalog[activeClient.value]);
			const activeClientLogo = computed(() => {
				const logo = activeClientDef.value?.logo;
				return logo ? clientLogoComponents[logo] : undefined;
			});

			// The grouped, searchable client picker is built with N8nDropdownMenu (N8nSelect has no
			// brand-mark option slot). N8nDropdownMenu has no native section header, so each category
			// is a disabled, `divided` header item (skipped by keyboard nav + non-selectable) followed
			// by its clients; the active client carries `checked`. The menu only emits `search`, so the
			// term is filtered here and empty categories drop out.
			const clientSearch = ref('');
			const clientMenuItems = computed(() => {
				const term = clientSearch.value.trim().toLowerCase();
				const items: Array<{
					id: string;
					label: string;
					disabled?: boolean;
					divided?: boolean;
					checked?: boolean;
					icon?: { type: 'icon'; value: IconName };
					data: { kind: 'header' | 'client'; logo?: string };
				}> = [];
				for (const category of mcpClientCategories) {
					const matching = category.clientIds.filter((id) =>
						mcpClientCatalog[id].name.toLowerCase().includes(term),
					);
					if (matching.length === 0) continue;
					items.push({
						id: `header:${category.id}`,
						label: category.label,
						disabled: true,
						divided: items.length > 0,
						data: { kind: 'header' },
					});
					for (const id of matching) {
						const client = mcpClientCatalog[id];
						items.push({
							id,
							label: client.name,
							checked: id === activeClient.value,
							icon: { type: 'icon', value: client.icon },
							data: { kind: 'client', logo: client.logo },
						});
					}
				}
				return items;
			});

			// Copy affordance. The contextual `message` follows n8n's existing "MCP URL copied" pattern
			// ("Server URL copied", "Token copied", "Config copied", "Command copied") instead of a
			// generic "Copied to clipboard".
			const onCopy = (text: string, message = 'Copied') => {
				void navigator.clipboard?.writeText(text);
				confirmSaved(message);
			};
			// Selecting a client switches the setup body (header items are disabled, so guard anyway).
			const onSelectClient = (id: string) => {
				if (typeof id !== 'string' || id.startsWith('header:')) return;
				activeClient.value = id;
			};
			const onClientSearch = (term: string) => {
				clientSearch.value = term ?? '';
			};

			// Per-client setup-row copy, computed in setup() because the story template is a JS
			// template literal (no nested backticks). Descriptions follow the vetted UX copy and have no
			// trailing period, matching the existing settings tone.
			const installDescription = computed(
				() => `Run this command to install ${activeClientDef.value?.name ?? ''}`,
			);
			const authDescription = computed(() =>
				activeClientDef.value?.authCommand
					? 'Run this command, then log in to authorize n8n'
					: `Run '/mcp' in ${activeClientDef.value?.name ?? ''} and select n8n to connect`,
			);
			const webDescription = computed(
				() => `Add n8n to ${activeClientDef.value?.name ?? ''} in one click, then approve access`,
			);
			const ideDescription = computed(
				() => `Open ${activeClientDef.value?.name ?? ''} and add the n8n server automatically`,
			);
			const serverUrlDescription = computed(
				() =>
					`Paste this into your config to point ${activeClientDef.value?.name ?? ''} at your instance`,
			);
			const addButtonLabel = computed(() => `Add to ${activeClientDef.value?.name ?? ''}`);

			// Tool access summary ("4 of 7 allowed"), read from the shared default allow-list. Tool
			// access itself is edited on a dedicated, save-gated Permissions sub-page (not part of
			// this story set).
			const allowedCount = Object.values(defaultMcpAllowed).filter(Boolean).length;
			const allowedSummary = `${allowedCount} of ${mcpToolCount} allowed`;

			// Workflows available summary ("12 across 4 projects"), read from the shared counts.
			const workflowsSummary = `${mcpWorkflowCount} across ${mcpWorkflowProjectCount} projects`;

			// Connected clients preview + "View all".
			const previewClients = computed(() => clients.value.slice(0, 3));
			// Only surface the "All connected clients / View all" row when there are MORE clients than
			// the inline preview already shows — otherwise it's redundant.
			const showViewAll = computed(() => clients.value.length > previewClients.value.length);
			// The Access rows and the "View all" row lead to dedicated sub-pages (the save-gated
			// Permissions page, Workflows available, and the full Connected clients table) that are
			// not part of this story set, so the clicks stub the navigation the same way the other
			// stories stub their back links.
			const onOpenPermissions = () => alert('Open the Permissions sub-page');
			const onOpenWorkflows = () => alert('Open the Workflows available sub-page');
			const onViewAllClients = () => alert('Open the Connected clients sub-page');
			const onRevokeClient = (client: McpClient) => {
				clients.value = clients.value.filter((c) => c.id !== client.id);
				confirmSaved(`${client.name} disconnected`);
			};

			// Client details dialog: opened by clicking a preview row's Access text; shows the full
			// per-client grant (grouped) and offers the same destructive revoke as the row's
			// hover-revealed button. `detailsClient` stays set through the close animation.
			const detailsClient = ref<McpClient | null>(null);
			const showDetailsDialog = ref(false);
			const onOpenClientDetails = (client: McpClient) => {
				detailsClient.value = client;
				showDetailsDialog.value = true;
			};
			const onRevokeFromDetails = (client: McpClient) => {
				showDetailsDialog.value = false;
				onRevokeClient(client);
			};

			return {
				enabled,
				showDisableDialog,
				showConnectDialog,
				detailsClient,
				showDetailsDialog,
				onOpenClientDetails,
				onRevokeFromDetails,
				accessSummary: clientAccessSummary,
				onOpenConnect,
				showExposeAllDialog,
				onExposeAll,
				clientCount,
				disableDialogDescription,
				onEnable,
				onConfirmDisable,
				disableMenuItems,
				onDisableMenuSelect,
				clientLogos: clientLogoComponents,
				serverUrl: mcpServerUrl,
				authToken: mcpAuthToken,
				docsUrl: mcpDocsUrl,
				activeClientDef,
				activeClientLogo,
				clientMenuItems,
				onCopy,
				onSelectClient,
				onClientSearch,
				installDescription,
				authDescription,
				webDescription,
				ideDescription,
				serverUrlDescription,
				addButtonLabel,
				allowedSummary,
				workflowsSummary,
				previewClients,
				showViewAll,
				onOpenPermissions,
				onOpenWorkflows,
				onViewAllClients,
				onRevokeClient,
			};
		},
		// Full-height scrollable viewport so the page reads as a real, long settings page. There is no
		// floating save bar here: enabling is instant, the client-led Connection details edits are
		// instant (one-click connect + copy affordances), and tool/workflow edits move to their
		// save-gated sub-pages, so the only persisted state changes are confirmed via the app
		// notification or a dialog.
		// While the server is DISABLED the page collapses to a single dashed-border empty state (a
		// call to action to enable); enabling instantly reveals the full Connection details / Access /
		// Connected clients page, with a gentle entrance animation on the swap.
		template: `
			<div style="${fullPageViewportStyle}">
				<N8nSettingsLayout>
					<N8nSettingsPageHeader
						title="Instance level MCP"
						description="Let AI assistants and IDEs connect to this instance over the Model Context Protocol (MCP), then control which tools and workflows they can use."
						docs-url="https://docs.n8n.io/manage-cloud/mcp-access/"
					/>

					<!-- Only shown when MCP is ENABLED. While disabled the whole top section (status row +
					     "Your client" row) is hidden and the dashed empty-state card below stands in as the
					     sole enable affordance, so no empty section/group wrapper is left behind. -->
					<N8nSettingsSection v-if="enabled">
						<N8nSettingsRowGroup>
							<N8nSettingsRow
								title="MCP status"
								description="Connect AI assistants and IDEs like Claude, Cursor, and ChatGPT to this instance over MCP."
							>
								<template #action>
									<N8nDropdownMenu :items="disableMenuItems" placement="bottom-end" @select="onDisableMenuSelect">
										<template #trigger>
											<N8nButton variant="outline" size="medium" aria-label="Manage MCP access">
												<span style="display: inline-flex; align-items: center; gap: var(--spacing--3xs);">
													<StatusDot color="var(--color--success)" pulse />
													Enabled
													<N8nIcon icon="chevron-down" size="small" />
												</span>
											</N8nButton>
										</template>
										<template #item-leading="{ item }">
											<N8nIcon :icon="item.icon.value" size="small" :style="{ color: 'var(--color--danger)' }" />
										</template>
										<template #item-label="{ item }">
											<span :style="{ color: 'var(--color--danger)' }">{{ item.label }}</span>
										</template>
									</N8nDropdownMenu>
								</template>
							</N8nSettingsRow>

							<!-- The client picker moves into a dialog. This row sits directly beneath
							     MCP status in the SAME group and just carries a prominent "Connect" button; the
							     grouped client picker + tailored setup steps live in the Connect dialog below. -->
							<N8nSettingsRow
								class="mcp-reveal"
								title="Your client"
								description="Connect an AI assistant or IDE, then follow the tailored setup steps."
							>
								<template #action>
									<N8nButton variant="outline" size="medium" label="Connect" @click="onOpenConnect" />
								</template>
							</N8nSettingsRow>
						</N8nSettingsRowGroup>
					</N8nSettingsSection>

					<!-- DISABLED → a single dashed-border empty state stands in for the whole page below the
					     status row. The animated logo-card cluster (static mcp mark flanked by cycling
					     client marks) previews the clients that could connect. The primary button calls the
					     same instant-enable handler as the status row; the ghost "Learn more" button to its
					     left opens the same docs URL as the page header in a new tab. -->
					<div
						v-if="!enabled"
						class="mcp-reveal"
						style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--spacing--sm); margin-block-start: var(--spacing--xl); padding: var(--spacing--2xl) var(--spacing--xl); border: var(--border-width, 1px) dashed var(--border-color); border-radius: var(--radius--lg); background: var(--background--surface);"
					>
						<ClientLogoCards icon="mcp" />
						<div style="display: flex; flex-direction: column; gap: var(--spacing--3xs); max-width: 32rem;">
							<N8nText bold size="large" color="text-dark">Connect AI assistants to build and run workflows</N8nText>
							<N8nText size="small" color="text-light">Let MCP clients like Claude Code and Cursor build, run, and iterate on workflows in your instance.</N8nText>
						</div>
						<div style="display: flex; align-items: center; justify-content: center; gap: var(--spacing--2xs);">
							<N8nButton variant="ghost" size="medium" :href="docsUrl" target="_blank">
								Learn more
								<N8nIcon icon="arrow-up-right" size="small" />
							</N8nButton>
							<N8nButton variant="solid" size="medium" label="Enable MCP access" @click="onEnable" />
						</div>
					</div>

					<N8nSettingsSection v-if="enabled" class="mcp-reveal" title="Access" description="What connected clients can do, and which workflows they can reach.">
						<N8nSettingsRowGroup>
							<N8nSettingsRow title="Permissions" description="Allow or block read-only, write, and execute tools." clickable @click="onOpenPermissions">
								<template #action><N8nSettingsRowConfigure :value="allowedSummary" /></template>
							</N8nSettingsRow>
							<N8nSettingsRow title="Workflows available" description="Choose which workflows connected clients can read and run." clickable @click="onOpenWorkflows">
								<template #action><N8nSettingsRowConfigure :value="workflowsSummary" /></template>
							</N8nSettingsRow>
						</N8nSettingsRowGroup>
					</N8nSettingsSection>

					<N8nSettingsSection v-if="enabled" class="mcp-reveal" title="Connected clients" description="Assistants and IDEs currently connected to this instance.">
						<!-- With clients connected: the inline preview, plus the "View all" row ONLY when the
						     total exceeds what the preview already shows. -->
						<template v-if="clientCount > 0">
							<N8nSettingsRowGroup>
								<!-- The info column is built via the #info slot (mirroring the row's own
								     title/description rendering) so a third, muted Access line fits below:
								     the client's granted permissions as plain truncated text ("a, b +N", no
								     chips) that opens the client details dialog on click. -->
								<N8nSettingsRow
									v-for="client in previewClients"
									:key="client.id"
									show-visual
									hoverable
									reveal-actions-on-hover
								>
									<template #visual>
										<component :is="clientLogos[client.id]" v-if="clientLogos[client.id]" style="font-size: var(--font-size--md);" />
										<N8nIcon v-else :icon="client.icon" />
									</template>
									<template #info>
										<div style="display: flex; flex-direction: column; gap: var(--spacing--5xs); min-width: 0;">
											<N8nText bold size="medium" color="text-dark" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ client.name }}</N8nText>
											<N8nText size="small" color="text-light" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ client.type }} · connected by {{ client.connectedBy }} · active {{ client.lastActive }}</N8nText>
											<button
												type="button"
												class="mcp-access-link"
												:aria-label="'View connection details for ' + client.name"
												@click="onOpenClientDetails(client)"
											>{{ accessSummary(client) }}</button>
										</div>
									</template>
									<template #action><N8nButton variant="outline" size="medium" label="Revoke access" @click="onRevokeClient(client)" /></template>
								</N8nSettingsRow>
							</N8nSettingsRowGroup>
							<N8nSettingsRowGroup v-if="showViewAll">
								<N8nSettingsRow title="All connected clients" :description="clientCount + ' clients have access'" clickable @click="onViewAllClients">
									<template #action><N8nSettingsRowConfigure value="View all" /></template>
								</N8nSettingsRow>
							</N8nSettingsRowGroup>
						</template>

						<!-- No clients: a compact, section-scoped empty state (same dashed-card + animated
						     logo-cards language as the disabled-MCP state, with the plug-zap mark in the
						     centre) that points back at the Connection details picker above. -->
						<div
							v-else
							style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--spacing--2xs); padding: var(--spacing--xl); border: var(--border-width, 1px) dashed var(--border-color); border-radius: var(--radius--lg); background: var(--background--surface);"
						>
							<ClientLogoCards icon="plug-zap" style="margin-block-end: var(--spacing--4xs);" />
							<N8nText bold size="medium" color="text-dark">No clients connected yet</N8nText>
							<N8nText size="small" color="text-light">Use Connect above to set up your first client.</N8nText>
						</div>
					</N8nSettingsSection>
				</N8nSettingsLayout>

				<N8nDialog
					v-model:open="showDisableDialog"
					size="small"
					header="Disable MCP access?"
					:description="disableDialogDescription"
				>
					<N8nDialogFooter>
						<N8nDialogClose as-child>
							<N8nButton variant="outline" label="Cancel" />
						</N8nDialogClose>
						<N8nButton variant="destructive" label="Disable MCP access" @click="onConfirmDisable" />
					</N8nDialogFooter>
				</N8nDialog>

				<!-- EXPOSE-ALL follow-up → opened right after enabling MCP (enabling is already instant).
				     Offers to expose every workflow on the instance to connected clients at once, with the
				     reassurance that individual workflows can be hidden or access revoked later. "Not now"
				     just closes; MCP stays enabled and exposure is unchanged. -->
				<N8nDialog
					v-model:open="showExposeAllDialog"
					size="small"
					header="Expose all workflows to MCP?"
					description="This lets connected clients reach every workflow on this instance right away. You can hide any workflow or revoke access at any time."
				>
					<N8nDialogFooter>
						<N8nDialogClose as-child>
							<N8nButton variant="outline" label="Not now" />
						</N8nDialogClose>
						<N8nButton variant="solid" label="Expose all workflows" @click="onExposeAll" />
					</N8nDialogFooter>
				</N8nDialog>

				<!-- CONNECT DIALOG → the client-led flow: the grouped client picker on top, the tailored
				     per-category instructions below, wrapped in AutoHeight so switching between a short
				     web client and a tall CLI/IDE animates the resize. Deliberately NO footer and NO
				     in-dialog consent: like the real flow, granting access is the CLIENT's move — after
				     setup the client initiates OAuth and n8n asks for consent in a new tab (outside this
				     story set). The large preset keeps it comfortably wide for snippets. -->
				<N8nDialog
					v-model:open="showConnectDialog"
					size="large"
					header="Connect a client"
					description="Pick the client you want to connect, then follow the tailored setup steps. When your client connects, n8n asks you to grant it access in a new tab."
				>
					<!-- Same structure the connect flow had on the page — ONE bordered N8nSettingsRowGroup
					     with the "Your client" picker row on top (divider shown once a client is selected)
					     and the tailored, dividerless setup rows below, wrapped in AutoHeight so switching
					     clients animates the dialog resize. Uses the official settings-row components so
					     the info column and action align exactly as on the page. -->
					<div class="mcp-connect-dialog" style="margin-block-start: var(--spacing--xs);">
						<N8nSettingsRowGroup>
							<N8nSettingsRow
								title="Your client"
								description="Choose your client to see tailored setup steps"
								:show-divider="!!activeClientDef"
							>
								<template #action>
									<N8nDropdownMenu
										searchable
										search-placeholder="Search clients…"
										empty-text="No clients found"
										:items="clientMenuItems"
										placement="bottom-end"
										@select="onSelectClient"
										@search="onClientSearch"
									>
										<template #trigger>
											<N8nButton variant="outline" size="medium" aria-label="Select client">
												<span style="display: inline-flex; align-items: center; gap: var(--spacing--2xs);">
													<template v-if="activeClientDef">
														<component :is="activeClientLogo" v-if="activeClientLogo" style="font-size: var(--font-size--md);" />
														<N8nIcon v-else :icon="activeClientDef.icon" size="small" color="text-light" />
														{{ activeClientDef.name }}
													</template>
													<N8nText v-else size="medium" color="text-light">Choose your client…</N8nText>
													<N8nIcon icon="chevron-down" size="small" />
												</span>
											</N8nButton>
										</template>
										<template #item-leading="{ item }">
											<component
												:is="clientLogos[item.data.logo]"
												v-if="item.data.kind === 'client' && item.data.logo && clientLogos[item.data.logo]"
												style="font-size: var(--font-size--md);"
											/>
											<N8nIcon
												v-else-if="item.data.kind === 'client'"
												:icon="item.icon.value"
												size="large"
												color="text-light"
											/>
										</template>
										<template #item-label="{ item }">
											<span
												v-if="item.data.kind === 'header'"
												style="display: block; padding-block: var(--spacing--5xs); font-size: var(--font-size--3xs); font-weight: var(--font-weight--bold); letter-spacing: var(--letter-spacing--wider); text-transform: uppercase; color: var(--text-color--subtle);"
											>{{ item.label }}</span>
											<N8nText v-else size="medium" color="text-dark">{{ item.label }}</N8nText>
										</template>
									</N8nDropdownMenu>
								</template>
							</N8nSettingsRow>

							<!-- Tailored setup steps (nothing until a client is picked). Dividerless rows read as one
							     connected block; AutoHeight animates the height when the selection switches. -->
							<AutoHeight>
								<!-- CLI: Install → Configure → Authenticate. -->
								<template v-if="activeClientDef?.category === 'cli'">
									<N8nSettingsRow layout="vertical" :show-divider="false" title="Install" :description="installDescription">
										<template #action>
											<CopyInput :value="activeClientDef.installCommand" aria-label="Copy command" @copy="(text) => onCopy(text, 'Command copied')" />
										</template>
									</N8nSettingsRow>
									<N8nSettingsRow layout="vertical" :show-divider="false" title="Configure" description="Add this to your config file to connect to n8n">
										<template #action>
											<CopyInput multiline :value="activeClientDef.configSnippet" aria-label="Copy config" @copy="(text) => onCopy(text, 'Config copied')" />
										</template>
									</N8nSettingsRow>
									<N8nSettingsRow layout="vertical" :show-divider="false" title="Authenticate" :description="authDescription">
										<template #action>
											<CopyInput :value="activeClientDef.authCommand || '/mcp'" aria-label="Copy command" @copy="(text) => onCopy(text, 'Command copied')" />
										</template>
									</N8nSettingsRow>
								</template>

								<!-- Web client: a single one-click row with a branded "Add to …" button. -->
								<template v-else-if="activeClientDef?.category === 'web'">
									<N8nSettingsRow :show-divider="false" title="One-click setup" :description="webDescription">
										<template #action>
											<BrandButton :label="addButtonLabel" :href="activeClientDef.addUrl">
												<template #leading>
													<component :is="activeClientLogo" v-if="activeClientLogo" />
													<N8nIcon v-else :icon="activeClientDef.icon" size="large" />
												</template>
											</BrandButton>
										</template>
									</N8nSettingsRow>
								</template>

								<!-- IDE: one-click deep-link row, then manual-config rows (Server URL, token, config). -->
								<template v-else-if="activeClientDef">
									<N8nSettingsRow :show-divider="false" title="One-click setup" :description="ideDescription">
										<template #action>
											<BrandButton :label="addButtonLabel" :href="activeClientDef.deepLink">
												<template #leading>
													<component :is="activeClientLogo" v-if="activeClientLogo" />
													<N8nIcon v-else :icon="activeClientDef.icon" size="large" />
												</template>
											</BrandButton>
										</template>
									</N8nSettingsRow>
									<N8nSettingsRow layout="vertical" :show-divider="false" title="Server URL" :description="serverUrlDescription">
										<template #action>
											<CopyInput :value="serverUrl" aria-label="Copy server URL" @copy="(text) => onCopy(text, 'Server URL copied')" />
										</template>
									</N8nSettingsRow>
									<N8nSettingsRow layout="vertical" :show-divider="false" title="Authentication token" description="Authorizes the connection, so treat it like a password">
										<template #action>
											<CopyInput :value="authToken" aria-label="Copy authentication token" @copy="(text) => onCopy(text, 'Token copied')" />
										</template>
									</N8nSettingsRow>
									<N8nSettingsRow layout="vertical" :show-divider="false" title="Configure" description="Add this to your config file to connect to n8n">
										<template #action>
											<CopyInput multiline :value="activeClientDef.configSnippet" aria-label="Copy config" @copy="(text) => onCopy(text, 'Config copied')" />
										</template>
									</N8nSettingsRow>
								</template>
							</AutoHeight>
						</N8nSettingsRowGroup>
					</div>
				</N8nDialog>

				<!-- CLIENT DETAILS → opened from a preview row's Access text: the full per-client grant
				     grouped by tool type, plus the destructive revoke (same behaviour as the row button). -->
				<ClientDetailsDialog
					v-model:open="showDetailsDialog"
					:client="detailsClient"
					@revoke="onRevokeFromDetails"
				/>
			</div>
		`,
	}),
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				story:
					'The main **Instance level MCP** page, re-expressed from the current instance-level MCP screen into the native settings system. **Connection** drops the old "Preview" badge and replaces the master toggle with a single **MCP status** status-action control, shown only while MCP is enabled: an outline **"Enabled"** trigger — a **green, gently pulsing dot** + a `chevron-down` — that opens an `N8nDropdownMenu` whose single, danger-styled **"Disable"** item opens an **`N8nDialog` confirmation** ("…will disconnect N connected clients and revoke their access"). Enabling stays instant while disabling stays gated, because a toggle would imply an instant, low-stakes change for something that exposes the instance. **When disabled**, the whole page below the header collapses to a single **dashed-border empty state**, the sole enable affordance (an **animated fanned trio of logo cards** — the static `mcp` mark in the raised centre card, flanked by two tilted cards cycling through the client brand marks with a staggered 300ms fade+blur swap every 3s, mimicking the External Secrets empty state from n8n PR #24685 and static under `prefers-reduced-motion` — above "Connect AI assistants to build and run workflows", the subtext "Let MCP clients like Claude Code and Cursor build, run, and iterate on workflows in your instance", and a centered button row — a ghost **"Learn more"** docs button with a trailing `arrow-up-right` icon (opens the docs in a new tab) to the left of the primary **"Enable MCP access"** button wired to the instant-enable handler); enabling reveals the full page with a gentle entrance animation (honouring `prefers-reduced-motion`). The **"No clients connected yet"** empty state reuses the same animated cluster with the `plug-zap` mark in the centre. **Connection details** is **client-led**: the first row is a **"Your client"** picker — a searchable `N8nDropdownMenu` grouped into three uppercase categories (**AI Agent CLI**, **Web Clients**, **IDE**) via disabled header items + `divided` separators, each client showing its real brand mark in the `#item-leading` slot (Cursor near-black `#26251e`, Claude Code coral `#D97757`, Codex purple→blue, VS Code blue-ribbon, ChatGPT/Claude.ai marks; DS-icon fallbacks for Gemini CLI / Windsurf). The selected client drives a **dividerless group of official `N8nSettingsRow`s** (matching the Figma installation section — each row carries its own title/description, and a `CopyInput` — a readonly monospace `N8nInput` paired with an icon-only copy `N8nButton` in its `#append` slot — renders the command/snippet/value inside the row\'s `#action`): **CLIs** (Claude Code, Codex, Gemini CLI) get **Install** → **Configure** → **Authenticate** rows, where Authenticate is a copyable command (Codex `codex mcp login`; Claude Code / Gemini the in-app `/mcp` command); **Web clients** (Claude.ai, ChatGPT) get a single **One-click setup** row whose action is a branded **"Add to …"** button; **IDEs** (Cursor, VS Code) get a **One-click setup** deep-link button row followed by **Server URL**, **Authentication token**, and **Configure** rows. Copies confirm via the existing app notification with contextual messages ("Server URL copied", "Token copied", "Config copied", "Command copied"). The dialog is deliberately **footerless** — client selection + setup steps only, no Cancel/Continue and no in-dialog consent — because granting access is the **client\'s** move, not the dialog\'s: in the real flow the configured client initiates OAuth and n8n asks for consent in a new tab (that authorization screen is not part of this story set). **Access** summarizes the save-gated **Permissions** sub-page (`N8nSettingsRowConfigure` "4 of 7 allowed") and the **Workflows available** sub-page ("12 across 4 projects"); these rows and the **Connected clients** "View all" row lead to dedicated sub-pages that are likewise out of scope here, so their clicks stub the navigation. **Connected clients** previews a few rows inline — each carrying a third, muted **Access** line: the client\'s granted permissions as **plain truncated text** ("List workflows, Get workflow details +5", the first two plus a "+N" overflow computed from the array — never chips) that opens the **client details dialog** (brand mark + name header, Connected by / Connected on / Last active fields, the full grant as a vertical list grouped by Read-only / Write / Execute, and a destructive **Revoke access** footer that removes the client like the row\'s hover-revealed button).',
			},
		},
	},
};
