<script setup lang="ts">
import { useDocumentTitle } from '@n8n/composables/useDocumentTitle';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nAlertDialog,
	N8nCopyInput,
	N8nEmptyState,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
} from '@n8n/design-system';
import type { EmptyStateIconCards } from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import ScimConnectionCallout from '../components/ScimConnectionCallout.vue';
import ScimDeprovisioningSection from '../components/ScimDeprovisioningSection.vue';
import ScimStatusControl from '../components/ScimStatusControl.vue';
import ScimTokenRow from '../components/ScimTokenRow.vue';
import { SCIM_DOCS_URL, SCIM_STATUS_POLL_INTERVAL_MS } from '../scim.constants';
import { useScimStore } from '../scim.store';
import { formatTimeAgo } from '../scim.utils';

const i18n = useI18n();
const toast = useToast();
const telemetry = useTelemetry();
const router = useRouter();
const settingsStore = useSettingsStore();
const scimStore = useScimStore();
const documentTitle = useDocumentTitle({
	releaseChannel: settingsStore.settings.releaseChannel,
});

const busy = ref(false);
const loaded = ref(false);
const disableDialogOpen = ref(false);
const rotateDialogOpen = ref(false);
const revokeDialogOpen = ref(false);

const needsSsoIcon: EmptyStateIconCards = {
	type: 'cards',
	center: 'user-check',
	sides: ['shield', 'refresh-cw'],
};

const offIcon: EmptyStateIconCards = {
	type: 'cards',
	center: 'user-check',
	sides: ['users', 'refresh-cw'],
};

const config = computed(() => scimStore.config);
const pageState = computed(() => scimStore.pageState);
const connectionState = computed(() => {
	const state = pageState.value;
	return state === 'no_token' || state === 'waiting' || state === 'connected' || state === 'error'
		? state
		: null;
});

const dotVariant = computed(() => {
	switch (pageState.value) {
		case 'connected':
			return 'success';
		case 'error':
			return 'danger';
		default:
			return 'warning';
	}
});

const statusText = computed(() => {
	const current = config.value;
	if (!current) return '';
	switch (pageState.value) {
		case 'no_token':
			return i18n.baseText('settings.scim.status.noToken');
		case 'waiting':
			return i18n.baseText('settings.scim.status.waiting');
		case 'error':
			return i18n.baseText('settings.scim.status.error', {
				interpolate: {
					time: current.lastAuthFailure ? formatTimeAgo(current.lastAuthFailure.at) : '',
				},
			});
		case 'connected':
			return i18n.baseText('settings.scim.status.connected', {
				adjustToNumber: current.provisionedCount,
				interpolate: {
					count: String(current.provisionedCount),
					time: current.token?.lastUsedAt ? formatTimeAgo(current.token.lastUsedAt) : '',
				},
			});
		default:
			return '';
	}
});

/** Only the connected callout is dismissable. The others describe the current state. */
const showCallout = computed(() => {
	if (connectionState.value === 'connected') return scimStore.connectedCallout;
	return connectionState.value !== null;
});

async function run(action: () => Promise<void>, errorTitle: string) {
	busy.value = true;
	try {
		await action();
	} catch (error) {
		toast.showError(error, errorTitle);
	} finally {
		busy.value = false;
	}
}

function onBack() {
	void router.push({ name: VIEWS.SSO_SETTINGS });
}

function onSetUpSso() {
	telemetry.track(TELEMETRY_EVENT.SCIM.SCIM_SET_UP_SSO_CLICKED, {});
	void router.push({ name: VIEWS.SSO_SETTINGS });
}

async function onEnable() {
	await run(async () => await scimStore.enable(), i18n.baseText('settings.scim.enable.error'));
}

async function onConfirmDisable() {
	disableDialogOpen.value = false;
	await run(async () => await scimStore.disable(), i18n.baseText('settings.scim.disable.error'));
}

async function onGenerateToken() {
	await run(
		async () => await scimStore.generateToken(),
		i18n.baseText('settings.scim.token.error.generate'),
	);
}

async function onConfirmRotate() {
	rotateDialogOpen.value = false;
	await onGenerateToken();
}

async function onConfirmRevoke() {
	revokeDialogOpen.value = false;
	await run(
		async () => await scimStore.revokeToken(),
		i18n.baseText('settings.scim.token.error.revoke'),
	);
}

function onBaseUrlCopied() {
	telemetry.track(TELEMETRY_EVENT.SCIM.SCIM_BASE_URL_COPIED, {});
}

function onTokenCopied() {
	telemetry.track(TELEMETRY_EVENT.SCIM.SCIM_TOKEN_COPIED, {});
}

function onHelpClick(link: 'docs' | 'test_help') {
	const status = pageState.value;
	if (status !== 'waiting' && status !== 'error') return;
	telemetry.track(TELEMETRY_EVENT.SCIM.SCIM_HELP_LINK_CLICKED, {
		link,
		status,
		source: 'scim_page',
	});
}

function trackPageViewed() {
	const status = pageState.value;
	telemetry.track(TELEMETRY_EVENT.SCIM.SCIM_SETTINGS_VIEWED, {
		opt_in_source: scimStore.optInSource,
		status,
		error_cause: status === 'error' ? config.value?.lastAuthFailure?.reason : undefined,
	});
}

// Polls while the page waits for the first request from the identity provider.
let pollTimer: ReturnType<typeof setInterval> | undefined;

function stopPolling() {
	if (pollTimer === undefined) return;
	clearInterval(pollTimer);
	pollTimer = undefined;
}

function startPolling() {
	if (pollTimer !== undefined) return;
	pollTimer = setInterval(() => {
		void scimStore.fetchConfig().catch(() => {
			// A failed poll keeps the last known state. The next tick retries.
		});
	}, SCIM_STATUS_POLL_INTERVAL_MS);
}

watch(
	pageState,
	(state) => {
		if (state === 'waiting') startPolling();
		else stopPolling();
	},
	{ immediate: true },
);

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.scim.title'));
	try {
		// The SSO forms change the login state without a reload. Fresh settings
		// keep the needs-SSO check true to the backend.
		await settingsStore.getSettings();
		await scimStore.fetchConfig();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.scim.error.loading'));
	} finally {
		loaded.value = true;
	}
	trackPageViewed();
});

onBeforeUnmount(() => {
	stopPolling();
	// The token shows once. Leaving the page forgets it.
	scimStore.clearRevealedToken();
});
</script>

<template>
	<N8nSettingsLayout
		show-back
		:back-label="i18n.baseText('settings.sso.back')"
		:class="$style.layout"
		data-test-id="scim-settings-view"
		@back="onBack"
	>
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.scim.title')"
			:description="i18n.baseText('settings.scim.description')"
			:docs-url="SCIM_DOCS_URL"
			data-test-id="scim-settings-header"
		/>

		<template v-if="loaded">
			<N8nEmptyState
				v-if="pageState === 'needs_sso'"
				:icon="needsSsoIcon"
				:heading="i18n.baseText('settings.scim.needsSso.heading')"
				:description="i18n.baseText('settings.scim.needsSso.description')"
				:button-text="i18n.baseText('settings.scim.needsSso.button')"
				data-test-id="scim-needs-sso"
				@click:button="onSetUpSso"
			/>

			<N8nEmptyState
				v-else-if="pageState === 'off'"
				:icon="offIcon"
				:heading="i18n.baseText('settings.scim.off.heading')"
				:description="i18n.baseText('settings.scim.off.description')"
				:button-text="i18n.baseText('settings.scim.off.button')"
				:button-disabled="busy"
				data-test-id="scim-off"
				@click:button="onEnable"
			/>

			<template v-else-if="config && connectionState">
				<ScimConnectionCallout
					v-if="showCallout"
					:state="connectionState"
					:last-auth-failure="config.lastAuthFailure"
					:token-created-at="config.token?.createdAt ?? null"
					@generate="onGenerateToken"
					@rotate="rotateDialogOpen = true"
					@dismiss="scimStore.dismissConnectedCallout()"
					@help="onHelpClick"
				/>

				<N8nSettingsSection
					:title="i18n.baseText('settings.scim.connection.title')"
					data-test-id="scim-connection-section"
				>
					<N8nSettingsRowGroup>
						<N8nSettingsRow
							:title="i18n.baseText('settings.scim.status.title')"
							:description="statusText"
							data-test-id="scim-status-row"
						>
							<template #action>
								<ScimStatusControl
									:variant="dotVariant"
									:pulse="pageState === 'connected'"
									:disabled="busy"
									@disable="disableDialogOpen = true"
								/>
							</template>
						</N8nSettingsRow>
						<N8nSettingsRow
							:title="i18n.baseText('settings.scim.baseUrl.title')"
							:description="i18n.baseText('settings.scim.baseUrl.description')"
							data-test-id="scim-base-url-row"
						>
							<template #action>
								<N8nCopyInput
									:value="config.baseUrl"
									:label="i18n.baseText('settings.scim.baseUrl.title')"
									size="medium"
									data-test-id="scim-base-url-input"
									@copy="onBaseUrlCopied"
								/>
							</template>
						</N8nSettingsRow>
						<ScimTokenRow
							:has-token="config.hasToken"
							:token-hint="config.tokenHint"
							:token="config.token"
							:revealed-token="scimStore.revealedToken"
							:disabled="busy"
							@generate="onGenerateToken"
							@rotate="rotateDialogOpen = true"
							@revoke="revokeDialogOpen = true"
							@copy="onTokenCopied"
						/>
					</N8nSettingsRowGroup>
				</N8nSettingsSection>

				<ScimDeprovisioningSection :config="config" />
			</template>
		</template>

		<N8nAlertDialog
			:open="disableDialogOpen"
			:title="i18n.baseText('settings.scim.disable.title')"
			:description="i18n.baseText('settings.scim.disable.description')"
			:action-label="i18n.baseText('settings.scim.disable.confirm')"
			:cancel-label="i18n.baseText('generic.cancel')"
			action-variant="destructive"
			:loading="busy"
			size="medium"
			@update:open="disableDialogOpen = $event"
			@action="onConfirmDisable"
			@cancel="disableDialogOpen = false"
		/>
		<N8nAlertDialog
			:open="rotateDialogOpen"
			:title="i18n.baseText('settings.scim.token.rotate.title')"
			:description="i18n.baseText('settings.scim.token.rotate.description')"
			:action-label="i18n.baseText('settings.scim.token.rotate')"
			:cancel-label="i18n.baseText('generic.cancel')"
			action-variant="destructive"
			:loading="busy"
			size="medium"
			@update:open="rotateDialogOpen = $event"
			@action="onConfirmRotate"
			@cancel="rotateDialogOpen = false"
		/>
		<N8nAlertDialog
			:open="revokeDialogOpen"
			:title="i18n.baseText('settings.scim.token.revoke.title')"
			:description="i18n.baseText('settings.scim.token.revoke.description')"
			:action-label="i18n.baseText('settings.scim.token.revoke')"
			:cancel-label="i18n.baseText('generic.cancel')"
			action-variant="destructive"
			:loading="busy"
			size="medium"
			@update:open="revokeDialogOpen = $event"
			@action="onConfirmRevoke"
			@cancel="revokeDialogOpen = false"
		/>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
// The settings shell pads the page top and pins the back row; the layout's own inset doubles it.
.layout {
	padding-top: 0;
}
</style>
