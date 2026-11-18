<script lang="ts" setup>
import type { McpServerShareDto } from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nCard,
	N8nCopyInput,
	N8nHeading,
	N8nIcon,
	N8nLink,
	N8nLogo,
	N8nSpinner,
	N8nText,
} from '@n8n/design-system';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useToast } from '@n8n/composables/useToast';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';

import McpServerClientInstructions from '../components/McpServerClientInstructions.vue';
import { MCP_SERVERS_LIST_VIEW } from '../constants';
import { getMcpServerPublicShare, getMcpServerShare } from '../mcpServers.api';
import {
	BEHAVIOR_BADGE_VARIANTS,
	BEHAVIOR_LABEL_KEYS,
	CONNECT_CLIENT_LABEL_KEYS,
	RESOURCE_KIND_LABEL_KEYS,
	cursorDeepLink,
	type ConnectClient,
} from '../mcpServers.utils';

const SHARE_CLIENTS: ConnectClient[] = [
	'claude',
	'cursor',
	'chatgpt',
	'vscode',
	'claudeCode',
	'codex',
];

const props = defineProps<{ slug: string }>();

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const clipboard = useClipboard();
const rootStore = useRootStore();
const usersStore = useUsersStore();
const documentTitle = useDocumentTitle();

const share = ref<McpServerShareDto | null>(null);
const state = ref<'loading' | 'ready' | 'needsLogin' | 'notFound'>('loading');
const client = ref<ConnectClient | null>(null);

function isStatus(error: unknown, status: number) {
	return error instanceof ResponseError && error.httpStatusCode === status;
}

async function load() {
	const context = rootStore.restApiContext;
	// A 401 from any REST call sends a signed-in user to "Session expired",
	// so a signed-in user never calls the public endpoint.
	if (usersStore.currentUser) {
		try {
			share.value = await getMcpServerShare(context, props.slug);
			state.value = 'ready';
		} catch (error) {
			state.value = isStatus(error, 404) ? 'notFound' : 'needsLogin';
		}
		return;
	}
	try {
		share.value = await getMcpServerPublicShare(context, props.slug);
		state.value = 'ready';
	} catch (error) {
		state.value = isStatus(error, 404) ? 'notFound' : 'needsLogin';
	}
}

onMounted(async () => {
	await load();
	documentTitle.set(share.value?.name ?? i18n.baseText('mcpServers.share.title'));
});

const signInHref = computed(
	() =>
		router.resolve({
			name: VIEWS.SIGNIN,
			query: { redirect: encodeURIComponent(route.fullPath) },
		}).href,
);
const buildHref = computed(() => router.resolve({ name: MCP_SERVERS_LIST_VIEW }).href);

function onAdd(next: ConnectClient) {
	if (!share.value) return;
	if (next === 'cursor' && share.value.accessMode !== 'apiKey') {
		window.location.href = cursorDeepLink({
			slug: share.value.slug,
			url: share.value.url,
			accessMode: share.value.accessMode,
		});
	}
	client.value = client.value === next ? null : next;
}

async function copyUrl() {
	if (!share.value) return;
	await clipboard.copy(share.value.url);
	toast.showMessage({ type: 'success', title: i18n.baseText('mcpServers.server.urlCopied') });
}
</script>

<template>
	<div :class="$style.page" data-testid="mcp-server-share-page">
		<div v-if="state === 'loading'" :class="$style.center">
			<N8nSpinner type="brand" size="xlarge" />
		</div>

		<N8nCard v-else-if="state === 'needsLogin'" :class="$style.card">
			<div :class="$style.message">
				<N8nIcon icon="lock" :size="28" />
				<N8nHeading tag="h1" size="large" bold>
					{{ i18n.baseText('mcpServers.share.needsLogin.title') }}
				</N8nHeading>
				<N8nText color="text-light">{{
					i18n.baseText('mcpServers.share.needsLogin.description')
				}}</N8nText>
				<N8nButton variant="brand" :href="signInHref" data-testid="mcp-server-share-sign-in">
					{{ i18n.baseText('mcpServers.share.needsLogin.button') }}
				</N8nButton>
			</div>
		</N8nCard>

		<N8nCard v-else-if="state === 'notFound' || !share" :class="$style.card">
			<div :class="$style.message">
				<N8nIcon icon="circle-help" :size="28" />
				<N8nHeading tag="h1" size="large" bold>
					{{ i18n.baseText('mcpServers.share.notFound') }}
				</N8nHeading>
			</div>
		</N8nCard>

		<template v-else>
			<N8nCard :class="$style.card">
				<div :class="$style.body">
					<div :class="$style.titleRow">
						<div :class="$style.titleText">
							<N8nHeading tag="h1" size="xlarge" bold>{{ share.name }}</N8nHeading>
							<N8nText color="text-light">
								{{
									i18n.baseText('mcpServers.share.subtitle', {
										adjustToNumber: share.tools.length,
										interpolate: { count: share.tools.length, owner: share.ownerName },
									})
								}}
							</N8nText>
						</div>
						<N8nBadge :variant="share.active ? 'success' : 'subtle'" size="small">
							{{
								i18n.baseText(share.active ? 'mcpServers.share.online' : 'mcpServers.share.offline')
							}}
						</N8nBadge>
					</div>

					<N8nText v-if="share.description" tag="p">{{ share.description }}</N8nText>

					<div :class="$style.actions">
						<N8nButton
							v-for="(item, index) in SHARE_CLIENTS.slice(0, 4)"
							:key="item"
							:variant="index === 0 ? 'brand' : 'outline'"
							:class="{ [$style.activeClient]: client === item }"
							:data-testid="`mcp-server-share-add-${item}`"
							@click="onAdd(item)"
						>
							{{
								i18n.baseText('mcpServers.share.addTo', {
									interpolate: { client: i18n.baseText(CONNECT_CLIENT_LABEL_KEYS[item]) },
								})
							}}
						</N8nButton>
						<N8nButton
							variant="ghost"
							icon="copy"
							data-testid="mcp-server-share-copy"
							@click="copyUrl"
						>
							{{ i18n.baseText('mcpServers.share.copyUrl') }}
						</N8nButton>
					</div>

					<N8nCopyInput
						:value="share.url"
						:label="i18n.baseText('mcpServers.connect.url')"
						size="medium"
					/>

					<div v-if="client" :class="$style.instructions">
						<N8nHeading tag="h3" size="small" bold>
							{{ i18n.baseText(CONNECT_CLIENT_LABEL_KEYS[client]) }}
						</N8nHeading>
						<McpServerClientInstructions
							:client="client"
							:slug="share.slug"
							:url="share.url"
							:access-mode="share.accessMode"
						/>
					</div>

					<section :class="$style.section">
						<N8nHeading tag="h2" size="medium" bold>
							{{ i18n.baseText('mcpServers.build.tools.title') }}
						</N8nHeading>
						<N8nText v-if="share.tools.length === 0" size="small" color="text-light">
							{{ i18n.baseText('mcpServers.share.noTools') }}
						</N8nText>
						<div v-for="tool in share.tools" :key="tool.name" :class="$style.row">
							<span :class="$style.mono">{{ tool.name }}</span>
							<N8nText size="small" color="text-light" :class="$style.rowDescription">
								{{ tool.description }}
							</N8nText>
							<N8nBadge :variant="BEHAVIOR_BADGE_VARIANTS[tool.behavior]" size="small">
								{{ i18n.baseText(BEHAVIOR_LABEL_KEYS[tool.behavior]) }}
							</N8nBadge>
						</div>
					</section>

					<section v-if="share.resources.length" :class="$style.section">
						<N8nHeading tag="h2" size="medium" bold>
							{{ i18n.baseText('mcpServers.build.resources.title') }}
						</N8nHeading>
						<div v-for="resource in share.resources" :key="resource.name" :class="$style.row">
							<N8nText size="small" bold>{{ resource.name }}</N8nText>
							<N8nText size="small" color="text-light" :class="$style.rowDescription">
								{{ resource.description }}
							</N8nText>
							<N8nBadge variant="outline" size="small">
								{{ i18n.baseText(RESOURCE_KIND_LABEL_KEYS[resource.kind]) }}
							</N8nBadge>
						</div>
					</section>

					<footer :class="$style.footer">
						<span :class="$style.builtWith">
							<N8nLogo size="small" collapsed />
							<N8nText size="small" color="text-light">{{
								i18n.baseText('mcpServers.share.builtWith')
							}}</N8nText>
						</span>
						<N8nLink :to="buildHref" size="small">
							{{ i18n.baseText('mcpServers.share.buildYourOwn') }}
						</N8nLink>
					</footer>
				</div>
			</N8nCard>
		</template>
	</div>
</template>

<style lang="scss" module>
.page {
	// The auth layout is a narrow column. This public page covers the whole window.
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
}

.card {
	width: 100%;
	max-width: 760px;
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
	gap: var(--spacing--md);
	width: 100%;
	padding: var(--spacing--xs);
}

.titleRow {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--sm);
}

.titleText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
}

.actions {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.activeClient {
	box-shadow: 0 0 0 1px var(--color--primary);
}

.instructions {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border-radius: var(--radius--lg);
	background: var(--background--subtle);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.row {
	display: grid;
	grid-template-columns: 200px 1fr auto;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xs) 0;
	border-bottom: var(--border);
}

.rowDescription {
	min-width: 0;
}

.mono {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
}

.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding-top: var(--spacing--sm);
	border-top: var(--border);
}

.builtWith {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}
</style>
