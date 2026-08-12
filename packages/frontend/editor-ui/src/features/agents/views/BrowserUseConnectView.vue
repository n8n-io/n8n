<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { N8nButton, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';

/**
 * Public landing page an agent sends the chatting user to when it needs their
 * browser. Deliberately unauthenticated — on a channel like Slack the person
 * being asked may have no n8n account — so the setup token in the query string
 * is the only thing identifying the session.
 *
 * It mirrors the AI Assistant's Connect Browser Use modal, but polls for status
 * instead of listening on the push channel, which needs a logged-in user.
 */

const CHROME_EXTENSION_URL =
	'https://chromewebstore.google.com/detail/n8n-browser-use/cegmdpndekdfpnafgacidejijecomlhh';
const STATUS_POLL_INTERVAL_MS = 2000;
/** Re-mint the extension link before its token expires, as the modal does. */
const CONNECT_URL_REFRESH_MARGIN_MS = 30_000;

const i18n = useI18n();
const route = useRoute();
const rootStore = useRootStore();

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''));

const connectUrl = ref<string | null>(null);
const isConnected = ref(false);
const isLinkInvalid = ref(false);

let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let pollTimer: ReturnType<typeof setInterval> | undefined;

function stopTimers(): void {
	if (refreshTimer) clearTimeout(refreshTimer);
	if (pollTimer) clearInterval(pollTimer);
	refreshTimer = undefined;
	pollTimer = undefined;
}

async function refreshConnectUrl(): Promise<void> {
	if (refreshTimer) clearTimeout(refreshTimer);

	try {
		const { connectUrl: url, expiresAt } = await makeRestApiRequest<{
			connectUrl: string;
			expiresAt: string | null;
		}>(rootStore.restApiContext, 'GET', '/agent-browser-use/connect-link', { token: token.value });

		connectUrl.value = url;

		if (!expiresAt) return;
		const delay = Date.parse(expiresAt) - Date.now() - CONNECT_URL_REFRESH_MARGIN_MS;
		if (!Number.isFinite(delay) || delay <= 0) return;
		refreshTimer = setTimeout(() => void refreshConnectUrl(), delay);
	} catch {
		isLinkInvalid.value = true;
		stopTimers();
	}
}

async function pollStatus(): Promise<void> {
	try {
		const { connected } = await makeRestApiRequest<{ connected: boolean }>(
			rootStore.restApiContext,
			'GET',
			'/agent-browser-use/status',
			{ token: token.value },
		);

		if (!connected) return;
		isConnected.value = true;
		stopTimers();
	} catch {
		isLinkInvalid.value = true;
		stopTimers();
	}
}

onMounted(async () => {
	if (!token.value) {
		isLinkInvalid.value = true;
		return;
	}

	await pollStatus();
	if (isConnected.value || isLinkInvalid.value) return;

	await refreshConnectUrl();
	pollTimer = setInterval(() => void pollStatus(), STATUS_POLL_INTERVAL_MS);
});

onBeforeUnmount(stopTimers);
</script>

<template>
	<div :class="$style.page">
		<div :class="$style.card">
			<N8nHeading tag="h1" size="large" :class="$style.title">
				{{ i18n.baseText('agents.browserUse.connect.title') }}
			</N8nHeading>

			<template v-if="isLinkInvalid">
				<N8nText color="text-light" :class="$style.description">
					{{ i18n.baseText('agents.browserUse.connect.invalidLink') }}
				</N8nText>
			</template>

			<template v-else-if="isConnected">
				<div :class="$style.statusRow">
					<span :class="$style.statusDot" />
					<N8nText size="small" :bold="true">
						{{ i18n.baseText('agents.browserUse.connect.connected') }}
					</N8nText>
				</div>
				<N8nText color="text-light" :class="$style.description">
					{{ i18n.baseText('agents.browserUse.connect.connected.description') }}
				</N8nText>
			</template>

			<template v-else>
				<N8nText color="text-light" :class="$style.description">
					{{ i18n.baseText('agents.browserUse.connect.description') }}
				</N8nText>

				<div :class="$style.step">
					<N8nText :bold="true" size="small">
						{{ i18n.baseText('agents.browserUse.connect.step.extension.title') }}
					</N8nText>
					<N8nText color="text-light" size="small">
						{{ i18n.baseText('agents.browserUse.connect.step.extension.description') }}
					</N8nText>
					<N8nButton
						:label="i18n.baseText('agents.browserUse.connect.step.extension.cta')"
						:href="CHROME_EXTENSION_URL"
						target="_blank"
						variant="outline"
						size="medium"
						icon="external-link"
						data-test-id="agent-browser-use-install-extension"
					/>
				</div>

				<div :class="$style.step">
					<N8nText :bold="true" size="small">
						{{ i18n.baseText('agents.browserUse.connect.step.connect.title') }}
					</N8nText>
					<N8nText color="text-light" size="small">
						{{ i18n.baseText('agents.browserUse.connect.step.connect.description') }}
					</N8nText>
					<N8nButton
						:label="i18n.baseText('agents.browserUse.connect.step.connect.cta')"
						:href="connectUrl ?? undefined"
						target="_blank"
						variant="solid"
						size="medium"
						icon="external-link"
						:disabled="!connectUrl"
						data-test-id="agent-browser-use-open-connect-page"
					/>
				</div>

				<div :class="$style.waitingRow">
					<N8nIcon icon="spinner" color="primary" spin size="small" />
					<span>{{ i18n.baseText('agents.browserUse.connect.waiting') }}</span>
				</div>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.page {
	display: flex;
	justify-content: center;
	align-items: flex-start;
	min-height: 100vh;
	padding: var(--spacing--2xl) var(--spacing--md);
	background: var(--color--background);
}

.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
	max-width: 540px;
	padding: var(--spacing--lg);
	background: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
}

.title {
	margin: 0;
	font-size: var(--font-size--xl);
}

.description {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}

.step {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	background: var(--color--background--light-2);
	border-radius: var(--radius);
}

.statusRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.statusDot {
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: 50%;
	flex-shrink: 0;
	background: var(--color--success);
}

.waitingRow {
	display: flex;
	font-size: var(--font-size--2xs);
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: var(--color--background--light-2);
	color: var(--color--text--tint-1);
	font-weight: var(--font-weight--bold);
	border-radius: var(--radius);
}
</style>
