<script setup lang="ts">
import { mcpServerSlugSchema, type McpServerShare } from '@n8n/api-types';
import { useDocumentTitle } from '@n8n/composables/useDocumentTitle';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import {
	N8nButton,
	N8nCard,
	N8nCopyInput,
	N8nHeading,
	N8nIcon,
	N8nSpinner,
	N8nText,
} from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import {
	claudeAddConnectorUrl,
	getMcpClientCatalog,
	type McpClientId,
	type McpClientSetup,
} from '@n8n/frontend-utils/mcpClients';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import { TELEMETRY_EVENT, type InferTelemetryProps } from '@n8n/telemetry';
import { computed, markRaw, ref, watch, type Component } from 'vue';
import { I18nT } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import ClaudeIcon from '../assets/client-icons/claude.svg?component';
import CodexIcon from '../assets/client-icons/codex.svg?component';
import CursorIcon from '../assets/client-icons/cursor.svg?component';
import GeminiIcon from '../assets/client-icons/gemini.svg?component';
import OpenAiIcon from '../assets/client-icons/openai.svg?component';
import VsCodeIcon from '../assets/client-icons/vscode.svg?component';
import { getMcpServerPublicShare, getMcpServerShare } from '../mcp-servers.api';

const CLIENT_CLICKED =
	TELEMETRY_EVENT.CUSTOM_MCP_SERVERS.USER_CLICKED_CLIENT_ON_MCP_SERVER_SHARE_PAGE;
type ClientMethod = InferTelemetryProps<typeof CLIENT_CLICKED>['method'];

const ICONS: Partial<Record<McpClientId, Component>> = {
	'claude-ai': markRaw(ClaudeIcon),
	'claude-code': markRaw(ClaudeIcon),
	codex: markRaw(CodexIcon),
	cursor: markRaw(CursorIcon),
	'gemini-cli': markRaw(GeminiIcon),
	chatgpt: markRaw(OpenAiIcon),
	vscode: markRaw(VsCodeIcon),
};

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const rootStore = useRootStore();
const usersStore = useUsersStore();
const telemetry = useTelemetry();
const documentTitle = useDocumentTitle();

const share = ref<McpServerShare | null>(null);
const state = ref<'loading' | 'ready' | 'notFound' | 'error'>('loading');

const slug = computed(() => String(route.params.slug ?? ''));
const latestFetch = useLatestFetch();
const signedIn = computed(() => !!usersStore.currentUser);

/**
 * A signed-in person reads the signed-in route, which gives the tools to a person who can
 * connect. A person who is not signed in reads the public route: a 401 from any REST call
 * would send a signed-in person to "Session expired".
 */
async function load() {
	const isLatest = latestFetch.next();
	// Another slug in the same page: drop the old server at once.
	share.value = null;
	state.value = 'loading';
	// vue-router decodes the param, so a crafted link could point the request at another route.
	if (!mcpServerSlugSchema.safeParse(slug.value).success) {
		state.value = 'notFound';
		documentTitle.set(i18n.baseText('mcpServers.share.title'));
		return;
	}
	try {
		const response = signedIn.value
			? await getMcpServerShare(rootStore.restApiContext, slug.value)
			: await getMcpServerPublicShare(rootStore.restApiContext, slug.value);
		if (!isLatest()) return;
		share.value = response;
		state.value = 'ready';
		// The backend sends the page view, also for a person who is not signed in.
		documentTitle.set(share.value.name);
	} catch (error) {
		if (!isLatest()) return;
		state.value =
			error instanceof ResponseError && error.httpStatusCode === 404 ? 'notFound' : 'error';
		documentTitle.set(i18n.baseText('mcpServers.share.title'));
	}
}

// The router reuses this page for another slug, so a slug change loads again.
watch(slug, load, { immediate: true });

const clients = computed(() => {
	if (!share.value) return new Map<McpClientId, McpClientSetup>();
	const catalog = getMcpClientCatalog(share.value.serverUrl, { serverName: share.value.slug });
	return new Map(catalog.flatMap((group) => group.clients).map((client) => [client.id, client]));
});

const oneClickClients = computed(() => {
	if (!share.value) return [];
	const { name, serverUrl } = share.value;
	return [
		{ id: 'claude-ai', label: 'Claude', href: claudeAddConnectorUrl(name, serverUrl) },
		{ id: 'cursor', label: 'Cursor', href: clients.value.get('cursor')?.deepLink },
		{ id: 'vscode', label: 'VS Code', href: clients.value.get('vscode')?.deepLink },
	] satisfies Array<{ id: McpClientId; label: string; href?: string }>;
});

const commandClients = computed(() =>
	(['claude-code', 'codex', 'gemini-cli'] as const).flatMap((id) => {
		const client = clients.value.get(id);
		return client?.installCommand ? [{ ...client, installCommand: client.installCommand }] : [];
	}),
);

const failureText = computed(() =>
	state.value === 'notFound'
		? {
				title: i18n.baseText('mcpServers.share.notFound.title'),
				description: i18n.baseText('mcpServers.share.notFound.description'),
			}
		: {
				title: i18n.baseText('mcpServers.share.error.title'),
				description: i18n.baseText('mcpServers.share.error.description'),
			},
);

const signInHref = computed(
	() =>
		router.resolve({
			name: VIEWS.SIGNIN,
			query: { redirect: encodeURIComponent(route.fullPath) },
		}).href,
);

/** `any`: the URL at the top of the page. `other`: the steps for any other client. */
function trackClient(client: McpClientId | 'any' | 'other', method: ClientMethod) {
	if (!share.value) return;
	telemetry.track(CLIENT_CLICKED, {
		server_id: share.value.id,
		client,
		method,
	});
}
</script>

<template>
	<div :class="$style.page" data-test-id="mcp-share-page">
		<div v-if="state === 'loading'" :class="$style.center">
			<N8nSpinner type="dots" size="large" />
		</div>

		<N8nCard v-else-if="state !== 'ready' || !share" :class="$style.card">
			<div :class="$style.message" data-test-id="mcp-share-not-found">
				<N8nIcon icon="circle-help" size="xlarge" />
				<N8nHeading tag="h1" size="large" bold>{{ failureText.title }}</N8nHeading>
				<N8nText color="text-light">{{ failureText.description }}</N8nText>
			</div>
		</N8nCard>

		<N8nCard v-else :class="$style.card">
			<div :class="$style.body">
				<header :class="$style.header">
					<N8nHeading tag="h1" size="xlarge" bold data-test-id="mcp-share-name">
						{{ share.name }}
					</N8nHeading>
					<N8nText color="text-light" data-test-id="mcp-share-who">
						<I18nT
							v-if="share.projectType === 'team' || share.projectName"
							:keypath="
								share.projectType === 'team'
									? 'mcpServers.share.who.team'
									: 'mcpServers.share.who.personal'
							"
							scope="global"
						>
							<template #project>
								<strong :class="$style.emphasis">{{ share.projectName }}</strong>
							</template>
							<template #owner>
								<strong :class="$style.emphasis">{{ share.projectName }}</strong>
							</template>
						</I18nT>
						<template v-else>
							{{ i18n.baseText('mcpServers.share.who.personalUnnamed') }}
						</template>
					</N8nText>
					<N8nText v-if="share.canConnect && share.description" tag="p">
						{{ share.description }}
					</N8nText>
				</header>

				<N8nCopyInput
					:value="share.serverUrl"
					:label="i18n.baseText('mcpServers.share.serverUrl')"
					size="medium"
					@copy="trackClient('any', 'copy_url')"
				/>

				<section :class="$style.section">
					<N8nHeading tag="h2" size="medium" bold>
						{{ i18n.baseText('mcpServers.share.oneClick.title') }}
					</N8nHeading>
					<div :class="$style.buttons">
						<N8nButton
							v-for="(client, index) in oneClickClients"
							:key="client.id"
							:variant="index === 0 ? 'solid' : 'outline'"
							:href="client.href"
							:target="client.id === 'claude-ai' ? '_blank' : undefined"
							:rel="client.id === 'claude-ai' ? 'noopener noreferrer' : undefined"
							:data-test-id="`mcp-share-add-${client.id}`"
							:data-attr="`mcp-share-add-${client.id}`"
							@click="trackClient(client.id, 'deep_link')"
						>
							<component :is="ICONS[client.id]" :class="$style.brandIcon" />
							{{
								i18n.baseText('mcpServers.share.addTo', { interpolate: { client: client.label } })
							}}
						</N8nButton>
					</div>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('mcpServers.share.oneClick.afterAdd') }}
					</N8nText>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('mcpServers.share.claude.manual') }}
					</N8nText>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('mcpServers.share.claude.plans') }}
					</N8nText>
				</section>

				<section :class="$style.section">
					<N8nHeading tag="h2" size="medium" bold>
						{{ i18n.baseText('mcpServers.share.command.title') }}
					</N8nHeading>
					<div
						v-for="client in commandClients"
						:key="client.id"
						:class="$style.client"
						:data-test-id="`mcp-share-command-${client.id}`"
					>
						<div :class="$style.clientName">
							<component :is="ICONS[client.id]" :class="$style.brandIcon" />
							<N8nText bold>{{ client.name }}</N8nText>
						</div>
						<N8nCopyInput
							:value="client.installCommand"
							:label="client.name"
							size="medium"
							@copy="trackClient(client.id, 'copy_command')"
						/>
						<template v-if="client.id === 'codex' && client.authCommand">
							<N8nText size="small" color="text-light">
								{{ i18n.baseText('mcpServers.share.command.signIn.codex') }}
							</N8nText>
							<N8nCopyInput
								:value="client.authCommand"
								:label="client.name"
								size="medium"
								@copy="trackClient(client.id, 'copy_sign_in_command')"
							/>
						</template>
						<N8nText v-else-if="client.id === 'claude-code'" size="small" color="text-light">
							{{ i18n.baseText('mcpServers.share.command.signIn.claudeCode') }}
						</N8nText>
						<N8nText v-else-if="client.id === 'gemini-cli'" size="small" color="text-light">
							{{
								i18n.baseText('mcpServers.share.command.signIn.geminiCli', {
									interpolate: { name: share.slug },
								})
							}}
						</N8nText>
					</div>
				</section>

				<section :class="$style.section">
					<N8nHeading tag="h2" size="medium" bold>
						{{ i18n.baseText('mcpServers.share.other.title') }}
					</N8nHeading>
					<div :class="$style.client" data-test-id="mcp-share-steps-chatgpt">
						<div :class="$style.clientName">
							<component :is="ICONS.chatgpt" :class="$style.brandIcon" />
							<N8nText bold>ChatGPT</N8nText>
						</div>
						<N8nText size="small">{{ i18n.baseText('mcpServers.share.chatgpt.steps') }}</N8nText>
						<N8nCopyInput
							:value="share.serverUrl"
							:label="i18n.baseText('mcpServers.share.serverUrl')"
							size="medium"
							@copy="trackClient('chatgpt', 'copy_url')"
						/>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('mcpServers.share.chatgpt.plans') }}
						</N8nText>
					</div>
					<div :class="$style.client" data-test-id="mcp-share-steps-other">
						<N8nText bold>{{ i18n.baseText('mcpServers.share.other.name') }}</N8nText>
						<N8nText size="small">{{ i18n.baseText('mcpServers.share.other.steps') }}</N8nText>
						<N8nCopyInput
							:value="share.serverUrl"
							:label="i18n.baseText('mcpServers.share.serverUrl')"
							size="medium"
							@copy="trackClient('other', 'copy_url')"
						/>
					</div>
				</section>

				<section v-if="share.canConnect" :class="$style.section" data-test-id="mcp-share-tools">
					<N8nHeading tag="h2" size="medium" bold>
						{{ i18n.baseText('mcpServers.share.tools.title') }}
					</N8nHeading>
					<N8nText v-if="share.tools.length === 0" size="small" color="text-light">
						{{ i18n.baseText('mcpServers.share.tools.empty') }}
					</N8nText>
					<div v-for="tool in share.tools" :key="tool.toolName" :class="$style.tool">
						<N8nText size="small" :class="$style.toolName">{{ tool.toolName }}</N8nText>
						<N8nText size="small" color="text-light">{{ tool.description }}</N8nText>
					</div>
				</section>
				<div v-else-if="!signedIn" :class="$style.signIn">
					<N8nButton
						variant="outline"
						icon="lock"
						:href="signInHref"
						data-test-id="mcp-share-sign-in"
						data-attr="mcp-share-sign-in"
					>
						{{ i18n.baseText('mcpServers.share.signIn') }}
					</N8nButton>
				</div>
			</div>
		</N8nCard>
	</div>
</template>

<style lang="scss" module>
.page {
	// The auth layout is a narrow column. This page covers the whole window.
	position: fixed;
	inset: 0;
	z-index: 1;
	display: flex;
	justify-content: center;
	align-items: flex-start;
	padding: var(--spacing--2xl) var(--spacing--sm);
	background: var(--background--subtle);
	box-sizing: border-box;
	overflow-y: auto;
}

.center {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--2xl);
}

.card {
	width: 100%;
	max-width: 720px;
	height: fit-content;
}

.message {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--sm);
	width: 100%;
	padding: var(--spacing--xl);
	text-align: center;
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	width: 100%;
	padding: var(--spacing--xs);
}

.header,
.section,
.client {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.section {
	gap: var(--spacing--sm);
	padding-top: var(--spacing--md);
	border-top: var(--border);
}

.buttons {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.clientName {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

// The base style of `strong` is the medium weight, too close to the regular text to show.
.emphasis {
	font-weight: var(--font-weight--bold);
}

.brandIcon {
	width: var(--spacing--sm);
	height: var(--spacing--sm);
	flex-shrink: 0;
}

.tool {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
	gap: var(--spacing--sm);
	padding: var(--spacing--2xs) 0;
	border-bottom: var(--border);
}

.toolName {
	font-family: var(--font-family--monospace);
	overflow-wrap: anywhere;
}

.signIn {
	display: flex;
	justify-content: center;
	padding-top: var(--spacing--md);
	border-top: var(--border);
}
</style>
