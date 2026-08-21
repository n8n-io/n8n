<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useInstanceAiSettingsStore } from '../../instanceAiSettings.store';
import { useInstanceAiBrowserUseTelemetry } from '../../instanceAiBrowserUse.telemetry';
import { useExtensionDirectConnect } from '../../composables/useExtensionDirectConnect';

const CONNECT_URL_REFRESH_MARGIN_MS = 30_000;
const CONNECT_POPUP_WIDTH = 540;
const CONNECT_POPUP_HEIGHT = 700;

const props = withDefaults(defineProps<{ autoConnect?: boolean }>(), { autoConnect: false });

const i18n = useI18n();
const store = useInstanceAiSettingsStore();
const telemetry = useInstanceAiBrowserUseTelemetry();
const { status, attempt } = useExtensionDirectConnect();

const connectUrl = ref<string | null>(null);
let refreshTimer: ReturnType<typeof setTimeout> | undefined;

function clearRefreshTimer(): void {
	if (refreshTimer) {
		clearTimeout(refreshTimer);
		refreshTimer = undefined;
	}
}

async function refreshConnectUrl(): Promise<void> {
	clearRefreshTimer();
	connectUrl.value = await store.fetchBrowserConnectUrl();

	const expiresAt = store.browserConnectUrlExpiresAt;
	if (!connectUrl.value || !expiresAt) return;

	const delay = Date.parse(expiresAt) - Date.now() - CONNECT_URL_REFRESH_MARGIN_MS;
	if (!Number.isFinite(delay) || delay <= 0) return;

	refreshTimer = setTimeout(() => {
		void refreshConnectUrl();
	}, delay);
}

onMounted(async () => {
	await refreshConnectUrl();
	if (!props.autoConnect || !connectUrl.value) return;
	telemetry.trackDirectConnectRequested();
	await attempt(connectUrl.value);
});

async function retry(): Promise<void> {
	if (!connectUrl.value) await refreshConnectUrl();
	if (!connectUrl.value) return;
	telemetry.trackDirectConnectRequested();
	await attempt(connectUrl.value);
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
			v-if="status === 'waiting'"
			:class="$style.waiting"
			data-test-id="browser-use-direct-connect-waiting"
		>
			<N8nIcon icon="spinner" color="primary" spin size="small" />
			<N8nText color="text-light" size="small">
				{{ i18n.baseText('instanceAi.browserUse.directConnect.waiting') }}
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
				@click="retry"
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
				@click="openConnectPage"
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
