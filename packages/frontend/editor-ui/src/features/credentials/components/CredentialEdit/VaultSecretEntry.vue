<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { N8nButton, N8nInfoTip, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { isRecord } from '@n8n/utils/is-record';

import { startVaultCapture } from '../../credentials.api';

const WINDOW_NAME = 'n8n-vault-entry';
const WINDOW_WIDTH = 440;
const WINDOW_HEIGHT = 420;
const WATCH_INTERVAL_MS = 500;

const props = defineProps<{ credentialId: string }>();
const emit = defineEmits<{ stored: [] }>();

const i18n = useI18n();
const rootStore = useRootStore();

type EntryState = 'idle' | 'opening' | 'waiting' | 'stored' | 'error';

const state = ref<EntryState>('idle');
const errorKind = ref<'blocked' | 'failed'>('failed');

let entryWindow: Window | null = null;
let captureOrigin: string | undefined;
let watchTimer: ReturnType<typeof setInterval> | undefined;

function stopWatching() {
	if (watchTimer !== undefined) clearInterval(watchTimer);
	watchTimer = undefined;
}

function closeEntryWindow() {
	stopWatching();
	if (entryWindow && !entryWindow.closed) entryWindow.close();
	entryWindow = null;
}

function fail(kind: 'blocked' | 'failed') {
	errorKind.value = kind;
	state.value = 'error';
}

// The person closing the window without storing anything puts the section back to its start.
function watchEntryWindow() {
	stopWatching();
	watchTimer = setInterval(() => {
		if (entryWindow?.closed && state.value === 'waiting') {
			stopWatching();
			entryWindow = null;
			state.value = 'idle';
		}
	}, WATCH_INTERVAL_MS);
}

// The window opens centered over the editor, where the dialog is. The entry page sizes itself.
function windowFeatures() {
	const left = Math.round(window.screenX + (window.outerWidth - WINDOW_WIDTH) / 2);
	const top = Math.round(window.screenY + (window.outerHeight - WINDOW_HEIGHT) / 2);
	return `popup=yes,width=${WINDOW_WIDTH},height=${WINDOW_HEIGHT},left=${left},top=${top}`;
}

// The entry page follows the editor theme. It also gets the center of the editor window, because
// the page resizes itself and has to place itself again. It cannot read the editor's position.
function entryUrl(captureUrl: string) {
	const url = new URL(captureUrl);
	const dark = document.body.getAttribute('data-theme') === 'dark';
	url.searchParams.set('theme', dark ? 'dark' : 'light');
	url.searchParams.set('cx', String(Math.round(window.screenX + window.outerWidth / 2)));
	url.searchParams.set('cy', String(Math.round(window.screenY + window.outerHeight / 2)));
	return url.toString();
}

async function openEntry() {
	// Open the window inside the click, before any request, so the browser does not block it.
	closeEntryWindow();
	entryWindow = window.open('about:blank', WINDOW_NAME, windowFeatures());
	if (!entryWindow) {
		fail('blocked');
		return;
	}

	state.value = 'opening';
	try {
		const result = await startVaultCapture(rootStore.restApiContext, props.credentialId);
		captureOrigin = result.captureOrigin;
		entryWindow.location.href = entryUrl(result.captureUrl);
		state.value = 'waiting';
		watchEntryWindow();
	} catch {
		closeEntryWindow();
		fail('failed');
	}
}

function showWindow() {
	entryWindow?.focus();
}

// Only the vault origin that n8n pinned, and only the window n8n opened, may report a result.
function onMessage(event: MessageEvent) {
	if (!captureOrigin || event.origin !== captureOrigin) return;
	if (!entryWindow || event.source !== entryWindow) return;
	const data: unknown = event.data;
	if (!isRecord(data)) return;

	if (
		data.type === 'n8n-vault-credential-stored' &&
		isRecord(data.reference) &&
		data.reference.$vault === `kv/creds/${props.credentialId}`
	) {
		closeEntryWindow();
		state.value = 'stored';
		emit('stored');
	}
}

onMounted(() => {
	window.addEventListener('message', onMessage);
});

onBeforeUnmount(() => {
	window.removeEventListener('message', onMessage);
	closeEntryWindow();
});

watch(
	() => props.credentialId,
	() => {
		closeEntryWindow();
		state.value = 'idle';
	},
);
</script>

<template>
	<div :class="$style.wrapper" data-test-id="vault-secret-entry">
		<N8nInfoTip v-if="state === 'idle' || state === 'error'" :bold="false">
			{{ i18n.baseText('credentialEdit.vaultSecrets.hint') }}
		</N8nInfoTip>

		<div v-if="state === 'waiting' || state === 'opening'" :class="$style.row">
			<N8nText size="small" color="text-base" data-test-id="vault-secret-waiting">
				{{ i18n.baseText('credentialEdit.vaultSecrets.waiting') }}
			</N8nText>
			<N8nButton
				v-if="state === 'waiting'"
				type="secondary"
				size="small"
				:label="i18n.baseText('credentialEdit.vaultSecrets.showWindow')"
				data-test-id="vault-secret-show"
				@click="showWindow"
			/>
		</div>

		<div v-else-if="state === 'stored'" :class="$style.row">
			<N8nText size="small" color="success" data-test-id="vault-secret-stored">
				{{ i18n.baseText('credentialEdit.vaultSecrets.stored') }}
			</N8nText>
			<N8nButton
				type="secondary"
				size="small"
				:label="i18n.baseText('credentialEdit.vaultSecrets.replace')"
				data-test-id="vault-secret-replace"
				@click="openEntry"
			/>
		</div>

		<div v-else :class="$style.row">
			<N8nButton
				type="secondary"
				:label="
					i18n.baseText(
						state === 'error'
							? 'credentialEdit.vaultSecrets.retry'
							: 'credentialEdit.vaultSecrets.enter',
					)
				"
				data-test-id="vault-secret-open"
				@click="openEntry"
			/>
			<N8nText
				v-if="state === 'error'"
				size="small"
				color="danger"
				data-test-id="vault-secret-error"
			>
				{{
					i18n.baseText(
						errorKind === 'blocked'
							? 'credentialEdit.vaultSecrets.blocked'
							: 'credentialEdit.vaultSecrets.error',
					)
				}}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	width: 100%;
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	flex-wrap: wrap;
}
</style>
