<script setup lang="ts">
import { useConsentStore } from '@/app/stores/consent.store';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useI18n } from '@n8n/i18n';
import { onMounted, computed, ref, watch } from 'vue';
import type { ConsentDetails } from '@n8n/rest-api-client/api/consent';
import {
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nHeading,
	N8nIcon,
	N8nLogo,
	N8nNotice,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { MCP_SCOPE_GROUPS } from '@/features/ai/mcpAccess/mcp.constants';
import { getClientBrand } from '@/features/ai/mcpAccess/clients.utils';
import { useToast } from '@/app/composables/useToast';
import { useTelemetry } from '@/app/composables/useTelemetry';
import ScopesSelector from '@/app/components/scopes/ScopesSelector.vue';

const consentStore = useConsentStore();

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const toast = useToast();
const telemetry = useTelemetry();

// Success state:
const waitingForRedirect = ref(false);
const redirectUriTrusted = ref(false);
const selectedScopes = ref<string[]>([]);

const error = computed(() => consentStore.error);
const loading = computed(() => consentStore.isLoading);
const resourceName = computed(() => consentStore.consentDetails?.resourceName);

const errorMessage = computed(() => {
	if (consentStore.errorCode === 'resource_unavailable') {
		return i18n.baseText('oauth.consentView.error.resourceUnavailable');
	} else if (consentStore.errorCode === 'forbidden') {
		return i18n.baseText('oauth.consentView.error.insufficientScope');
	}
	return consentStore.error;
});

const clientDetails = computed<ConsentDetails | null>(() => consentStore.consentDetails);
// Known clients get their brand mark on the left tile; unknown ones fall back to the MCP glyph.
const clientBrandIcon = computed(() => getClientBrand(clientDetails.value?.clientName ?? '').icon);
const availableScopes = computed(() => clientDetails.value?.scopes ?? []);
const hasScopes = computed(() => availableScopes.value.length > 0);
const trustRequired = computed(() => !!clientDetails.value?.redirectUri);
const noScopesSelected = computed(() => hasScopes.value && selectedScopes.value.length === 0);
const allowDisabled = computed(
	() =>
		loading.value ||
		error.value !== null ||
		!clientDetails.value ||
		(trustRequired.value && !redirectUriTrusted.value) ||
		noScopesSelected.value,
);
// Why Allow is disabled, surfaced as a tooltip on the button.
const allowDisabledReason = computed(() => {
	if (noScopesSelected.value) {
		return i18n.baseText('oauth.consentView.allowDisabled.noScopes');
	}
	if (trustRequired.value && !redirectUriTrusted.value) {
		return i18n.baseText('oauth.consentView.allowDisabled.trust');
	}
	return null;
});

watch(
	() => clientDetails.value?.redirectUri,
	() => {
		redirectUriTrusted.value = false;
	},
);

// Preselect the user's previous grant for this client so re-consent respects
// their earlier decision; first-time consents default to everything grantable.
watch(
	availableScopes,
	(scopes) => {
		const previous = clientDetails.value?.previousScopes ?? [];
		selectedScopes.value = previous.length > 0 ? previous : [...scopes];
	},
	{ immediate: true },
);

const handleAllow = async () => {
	try {
		const response = await consentStore.approveConsent(
			true,
			hasScopes.value ? selectedScopes.value : undefined,
		);
		telemetry.track('User approved MCP consent', {
			client_name: clientDetails.value?.clientName,
			selected_scopes: selectedScopes.value,
			selected_scopes_count: selectedScopes.value.length,
			all_scopes_selected: selectedScopes.value.length === availableScopes.value.length,
		});
		waitingForRedirect.value = true;
		window.location.href = response.redirectUrl;
	} catch (err) {
		toast.showError(err, i18n.baseText('oauth.consentView.error.allow'));
	}
};

const handleDeny = async () => {
	try {
		await consentStore.approveConsent(false);
		telemetry.track('User denied MCP consent', {
			client_name: clientDetails.value?.clientName,
		});
		window.location.href = window.BASE_PATH ?? '/';
	} catch (err) {
		toast.showError(err, i18n.baseText('oauth.consentView.error.deny'));
	}
};

// On a failed details fetch the session is already gone (the server clears it,
// e.g. on resource_unavailable), so there's nothing to approve/deny — just leave.
const handleClose = () => {
	window.location.href = window.BASE_PATH ?? '/';
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('oauth.consentView.title'));
	try {
		await consentStore.fetchConsentDetails();
		telemetry.track('User viewed MCP consent screen', {
			client_name: clientDetails.value?.clientName,
			available_scopes_count: availableScopes.value.length,
		});
	} catch (err) {
		toast.showError(err, i18n.baseText('oauth.consentView.error.fetchDetails'));
	}
});
</script>

<template>
	<div :class="$style.overlay">
		<div :class="$style['consent-dialog']">
			<header :class="$style.header">
				<div :class="$style.logo">
					<component :is="clientBrandIcon" v-if="clientBrandIcon" :class="$style['brand-icon']" />
					<N8nIcon v-else icon="mcp" size="large" color="text-dark" />
				</div>
				<!-- Pending-connection connector: a dashed SVG line marching toward the n8n tile
				     with a slow muted spinner badge. Decorative. -->
				<span :class="$style.connector" aria-hidden="true">
					<svg viewBox="0 0 64 8" preserveAspectRatio="none">
						<line
							:class="$style['connector-line']"
							x1="0"
							y1="4"
							x2="64"
							y2="4"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-dasharray="2 5"
						/>
					</svg>
					<span :class="$style.badge">
						<N8nIcon :class="$style['badge-spinner']" icon="loader-circle" size="large" />
					</span>
				</span>
				<div :class="$style.logo">
					<N8nLogo size="small" :collapsed="true" release-channel="stable" />
				</div>
			</header>
			<!-- Success screen, show while waiting to be redirected back to client -->
			<div v-if="waitingForRedirect" :class="$style.success" data-test-id="consent-success-screen">
				<N8nHeading tag="h2" size="large" :bold="true">
					{{ i18n.baseText('oauth.consentView.success.title') }}
				</N8nHeading>
				<N8nText color="text-base">
					{{ i18n.baseText('oauth.consentView.success.description') }}
				</N8nText>
			</div>
			<!-- Rejection state: the details fetch failed (e.g. the requested resource
				is no longer available), so we must not present a consent grant. -->
			<div v-else-if="error" :class="$style.content" data-test-id="consent-error">
				<N8nHeading tag="h2" size="large" :bold="true">
					{{ i18n.baseText('oauth.consentView.error.heading') }}
				</N8nHeading>
				<N8nNotice
					theme="danger"
					:data-test-id="'consent-error-notice'"
					:content="errorMessage ?? ''"
				></N8nNotice>
			</div>
			<!-- Default content -->
			<div v-else :class="$style.content" data-test-id="consent-content">
				<N8nHeading v-if="resourceName" tag="h2" size="large" :bold="true">
					{{
						i18n.baseText('oauth.consentView.headingWithWorkflow', {
							interpolate: { clientName: clientDetails?.clientName ?? '', resourceName },
						})
					}}
				</N8nHeading>
				<N8nHeading v-else tag="h2" size="large" :bold="true">
					{{
						i18n.baseText('oauth.consentView.heading', {
							interpolate: { clientName: clientDetails?.clientName ?? '' },
						})
					}}
				</N8nHeading>
				<div :class="$style['text-content']">
					<N8nText v-if="resourceName" color="text-base" size="medium">
						{{
							i18n.baseText('oauth.consentView.descriptionWithWorkflow', {
								interpolate: { clientName: clientDetails?.clientName ?? '' },
							})
						}}
					</N8nText>
					<N8nText v-else-if="hasScopes" color="text-base" size="medium">
						{{
							i18n.baseText('oauth.consentView.scopes.description', {
								interpolate: { clientName: clientDetails?.clientName ?? '' },
							})
						}}
					</N8nText>
					<N8nText v-else color="text-base" size="medium">
						{{
							i18n.baseText('oauth.consentView.description', {
								interpolate: { clientName: clientDetails?.clientName ?? '' },
							})
						}}
					</N8nText>
					<ScopesSelector
						v-if="hasScopes"
						v-model="selectedScopes"
						:available-scopes="availableScopes"
						:groups="MCP_SCOPE_GROUPS"
						:scope-tools="clientDetails?.scopeTools"
						i18n-key-prefix="oauth.consentView.scopes"
						root-test-id="consent-scopes"
					/>
					<ul v-else-if="!resourceName" :class="$style['permission-list']">
						<li>{{ i18n.baseText('oauth.consentView.action.listWorkflows') }}</li>
						<li>{{ i18n.baseText('oauth.consentView.action.workflowDetails') }}</li>
						<li>{{ i18n.baseText('oauth.consentView.action.executeWorkflows') }}</li>
						<li>{{ i18n.baseText('oauth.consentView.action.executionDetails') }}</li>
						<li>{{ i18n.baseText('oauth.consentView.action.createUpdateWorkflows') }}</li>
						<li>{{ i18n.baseText('oauth.consentView.action.createDataTables') }}</li>
						<li>{{ i18n.baseText('oauth.consentView.action.searchProjectsAndFolders') }}</li>
					</ul>
				</div>
			</div>
			<footer v-if="!waitingForRedirect" :class="$style.footer">
				<!-- The trust acknowledgment lives inside the warning itself so it can't be missed:
				     one block that says where access goes, shows the URL, and asks for the check. -->
				<N8nCallout
					v-if="!error && clientDetails?.redirectUri"
					theme="warning"
					data-test-id="consent-redirect-warning"
				>
					<div :class="$style['redirect-warning-content']">
						<N8nText :bold="true" size="small">
							{{ i18n.baseText('oauth.consentView.redirectWarning.title') }}
						</N8nText>
						<code :class="$style['redirect-warning-url']" data-test-id="consent-redirect-uri">
							{{ clientDetails.redirectUri }}
						</code>
						<N8nCheckbox
							v-model="redirectUriTrusted"
							:class="$style['redirect-warning-confirm']"
							:label="i18n.baseText('oauth.consentView.redirectWarning.confirm')"
							data-test-id="consent-redirect-confirm"
						/>
					</div>
				</N8nCallout>
				<div :class="$style['footer-actions']">
					<div :class="$style['button-group']">
						<N8nButton
							v-if="error"
							variant="solid"
							:data-test-id="'consent-close-button'"
							:size="'large'"
							@click="handleClose"
						>
							{{ i18n.baseText('generic.close') }}
						</N8nButton>
						<template v-else>
							<N8nButton
								variant="outline"
								:data-test-id="'consent-deny-button'"
								:size="'large'"
								:loading="loading"
								:disabled="loading"
								@click="handleDeny"
							>
								{{ i18n.baseText('generic.deny') }}
							</N8nButton>
							<N8nTooltip :disabled="!allowDisabled || !allowDisabledReason">
								<template #content>{{ allowDisabledReason }}</template>
								<N8nButton
									variant="solid"
									:data-test-id="'consent-allow-button'"
									:size="'large'"
									:loading="loading"
									:disabled="allowDisabled"
									@click="handleAllow"
								>
									{{ i18n.baseText('oauth.consentView.allow') }}
								</N8nButton>
							</N8nTooltip>
						</template>
					</div>
				</div>
			</footer>
		</div>
	</div>
</template>

<style module lang="scss">
.overlay {
	position: fixed;
	inset: 0;
	display: flex;
	justify-content: center;
	/* Top-aligned so a tall consent card scrolls within the page instead of clipping. */
	align-items: flex-start;
	padding: var(--spacing--xl) var(--spacing--sm);
	overflow-y: auto;
	background: var(--background--subtle);
	z-index: 1000;
}

.consent-dialog {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	width: 100%;
	max-width: 36rem;
	/* Settle the card a step below the top on tall windows, but don't waste
	   vertical space in the short popup windows OAuth clients open. */
	margin-block-start: clamp(0px, calc(10vh - var(--spacing--3xl)), var(--spacing--4xl));
	padding: var(--spacing--xl);
	background: var(--background--surface);
	border: var(--border-width, 1px) solid var(--border-color--subtle);
	border-radius: var(--radius--lg);
	box-shadow: var(--shadow--sm);
}

.header {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
}

.logo {
	display: flex;
	justify-content: center;
	align-items: center;
	flex: 0 0 auto;
	width: calc(var(--spacing--md) * 2);
	height: calc(var(--spacing--md) * 2);
	border: var(--border-width, 1px) solid var(--border-color--subtle);
	border-radius: var(--radius--xs);
	background: var(--background--surface);
	box-shadow: var(--shadow--xs);
	font-size: var(--font-size--xl);
	color: var(--text-color--subtle);
}

.brand-icon {
	width: 1em;
	height: 1em;
}

.connector {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--3xl);
	height: var(--spacing--2xs);
	color: var(--color--primary);

	svg {
		display: block;
		width: 100%;
		height: 100%;
		overflow: visible;
	}
}

/* Dashes march toward the n8n tile (right); a whole dash period (2 + 5) keeps the loop seamless. */
.connector-line {
	animation: mcp-connector-dash 0.8s linear infinite;
}

@keyframes mcp-connector-dash {
	to {
		stroke-dashoffset: -14;
	}
}

/* Muted spinner disc centered over the connector; the surface fill lets it overlap the line. */
.badge {
	position: absolute;
	top: 50%;
	left: 50%;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	transform: translate(-50%, -50%);
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	border-radius: var(--radius--full);
	background: var(--background--surface);
	color: var(--color--text--tint-1);
	line-height: 0;
}

/* Slow, calm rotation since the spinner can sit on screen while the user decides. */
.badge-spinner {
	transform-origin: center;
	animation: mcp-connector-spin 2s linear infinite;
}

@keyframes mcp-connector-spin {
	to {
		transform: rotate(360deg);
	}
}

@media (prefers-reduced-motion: reduce) {
	.connector-line,
	.badge-spinner {
		animation: none;
	}
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.success {
	padding: var(--spacing--xl);
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--2xs);
	text-align: center;
}

.text-content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.permission-list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding-left: var(--spacing--lg);
	list-style-type: disc;

	li {
		color: var(--color--text);
		font-size: var(--font-size--2xs);
	}
}

.footer {
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.redirect-warning-content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.redirect-warning-url {
	font-size: var(--font-size--2xs);
	word-break: break-all;
}

.redirect-warning-confirm {
	margin-top: var(--spacing--3xs);
	margin-bottom: 0;
}

/* CTAs sit at the right; the trust checkbox anchors the left edge of the row. */
.footer-actions {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--sm);

	.button-group {
		display: flex;
		justify-content: flex-end;
		gap: var(--spacing--2xs);
	}
}
</style>
