<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useInstanceAiSettingsStore } from '../../instanceAiSettings.store';
import { useInstanceAiBrowserUseTelemetry } from '../../instanceAiBrowserUse.telemetry';
import {
	resetExtensionDirectConnect,
	useExtensionDirectConnect,
} from '../../composables/useExtensionDirectConnect';

const CONNECT_URL_REFRESH_MARGIN_MS = 30_000;
const CONNECT_POPUP_WIDTH = 540;
const CONNECT_POPUP_HEIGHT = 700;

const props = withDefaults(defineProps<{ autoConnect?: boolean }>(), { autoConnect: false });

const i18n = useI18n();
const store = useInstanceAiSettingsStore();
const telemetry = useInstanceAiBrowserUseTelemetry();
const { status, isFlowActive, attempt } = useExtensionDirectConnect();

const connectUrl = ref<string | null>(null);
// A remembered host attaches with no popup, so it must not be told to confirm one.
const inFlightTextKey = computed(() => {
	if (status.value === 'waiting') return 'instanceAi.browserUse.directConnect.waiting';
	// `connected` keeps the spinner up until the parent swaps to its connected view, which
	// happens on a separate push — otherwise the connect action flashes back in between.
	if (status.value === 'connecting' || status.value === 'connected') {
		return 'instanceAi.browserUse.directConnect.connecting';
	}
	return null;
});
let refreshTimer: ReturnType<typeof setTimeout> | undefined;

function clearRefreshTimer(): void {
	if (refreshTimer) {
		clearTimeout(refreshTimer);
		refreshTimer = undefined;
	}
}

/**
 * Minting rotates the relay token server-side, killing any connect already in flight — so
 * reuse a stored link while it has life left in it.
 */
function usableStoredConnectUrl(): string | null {
	const url = store.browserConnectUrl;
	const expiresAt = store.browserConnectUrlExpiresAt;
	if (!url || !expiresAt) return null;
	return Date.parse(expiresAt) - Date.now() > CONNECT_URL_REFRESH_MARGIN_MS ? url : null;
}

async function refreshConnectUrl(): Promise<void> {
	clearRefreshTimer();
	connectUrl.value = usableStoredConnectUrl() ?? (await store.fetchBrowserConnectUrl());

	const expiresAt = store.browserConnectUrlExpiresAt;
	if (!connectUrl.value || !expiresAt) return;

	const delay = Date.parse(expiresAt) - Date.now() - CONNECT_URL_REFRESH_MARGIN_MS;
	if (!Number.isFinite(delay) || delay <= 0) return;

	refreshTimer = setTimeout(() => {
		void refreshConnectUrl();
	}, delay);
}

onMounted(async () => {
	// Read before any await: an outer flow can settle while the URL is being fetched, and
	// both decisions below must reflect the state at the moment this view opened.
	const joinedOuterFlow = isFlowActive.value;
	// Don't inherit the leftover status of a flow that already finished.
	if (!joinedOuterFlow) resetExtensionDirectConnect();

	await refreshConnectUrl();
	if (!props.autoConnect || !connectUrl.value) return;
	// The outer flow is already driving this; render its status rather than re-requesting.
	if (joinedOuterFlow) return;
	telemetry.trackDirectConnectRequested();
	await attempt(connectUrl.value);
});

/**
 * Let the extension own the confirmation first — a remembered instance connects with no
 * window at all. The unreachable case resolves fast enough that the click's transient
 * activation still permits `window.open`.
 */
async function connect(): Promise<void> {
	if (!connectUrl.value) return;
	telemetry.trackDirectConnectRequested();
	await attempt(connectUrl.value);
	if (status.value === 'unsupported') openConnectPage();
}

function openConnectPage(): void {
	if (!connectUrl.value) return;
	telemetry.trackOpenExtensionClicked();
	const left = Math.max(
		0,
		Math.round(window.screenX + (window.outerWidth - CONNECT_POPUP_WIDTH) / 2),
	);
	const top = Math.max(
		0,
		Math.round(window.screenY + (window.outerHeight - CONNECT_POPUP_HEIGHT) / 2),
	);
	window.open(
		connectUrl.value,
		'n8n-browser-use-connect',
		`popup,width=${CONNECT_POPUP_WIDTH},height=${CONNECT_POPUP_HEIGHT},left=${left},top=${top}`,
	);
}

onBeforeUnmount(() => {
	clearRefreshTimer();
	store.clearBrowserConnectUrl();
});
</script>

<template>
	<div :class="$style.passthrough">
		<N8nText :bold="true" size="small">
			{{ i18n.baseText('instanceAi.browserUse.step.connect.title') }}
		</N8nText>

		<div
			v-if="inFlightTextKey"
			:class="$style.waiting"
			data-test-id="browser-use-direct-connect-waiting"
		>
			<N8nIcon icon="spinner" color="primary" spin size="small" />
			<N8nText color="text-light" size="small">
				{{ i18n.baseText(inFlightTextKey) }}
			</N8nText>
		</div>

		<template v-else-if="status === 'failed'">
			<N8nText color="text-light" size="small">
				{{ i18n.baseText('instanceAi.browserUse.directConnect.failed') }}
			</N8nText>
			<N8nButton
				:label="i18n.baseText('instanceAi.browserUse.directConnect.retry')"
				variant="solid"
				size="medium"
				data-test-id="browser-use-direct-connect-retry"
				@click="connect"
			/>
		</template>

		<template v-else>
			<N8nText color="text-light" size="small">
				{{ i18n.baseText('instanceAi.browserUse.step.connect.description') }}
			</N8nText>
			<N8nButton
				:label="i18n.baseText('instanceAi.browserUse.step.connect.cta')"
				variant="solid"
				size="medium"
				:disabled="!connectUrl"
				data-test-id="browser-use-open-connect-page"
				@click="connect"
			/>
		</template>
	</div>
</template>

<style lang="scss" module>
.passthrough {
	display: contents;
}

.waiting {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
