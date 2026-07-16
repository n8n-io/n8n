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
} from '@n8n/design-system';
import { MCP_DOCS_PAGE_URL, MCP_SCOPE_GROUPS } from '@/features/ai/mcpAccess/mcp.constants';
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
const availableScopes = computed(() => clientDetails.value?.scopes ?? []);
const hasScopes = computed(() => availableScopes.value.length > 0);
const allowDisabled = computed(
	() =>
		loading.value ||
		error.value !== null ||
		!clientDetails.value ||
		!redirectUriTrusted.value ||
		(hasScopes.value && selectedScopes.value.length === 0),
);

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
				<div :class="[$style.logo, $style.n8n]">
					<N8nLogo size="small" :collapsed="true" release-channel="stable" />
				</div>
				<div :class="$style.arrow">
					<N8nIcon icon="arrow-right" size="large" color="text-light" />
				</div>
				<div :class="$style.logo">
					<N8nIcon icon="mcp" size="xlarge" color="text-dark" />
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
					<N8nText v-if="resourceName" color="text-base" size="small">
						{{
							i18n.baseText('oauth.consentView.descriptionWithWorkflow', {
								interpolate: { clientName: clientDetails?.clientName ?? '' },
							})
						}}
					</N8nText>
					<N8nText v-else-if="hasScopes" color="text-base" size="small">
						{{
							i18n.baseText('oauth.consentView.scopes.description', {
								interpolate: { clientName: clientDetails?.clientName ?? '' },
							})
						}}
					</N8nText>
					<N8nText v-else color="text-base" size="small">
						{{
							i18n.baseText('oauth.consentView.description', {
								interpolate: { clientName: clientDetails?.clientName ?? '' },
							})
						}}
					</N8nText>
					<template v-if="hasScopes">
						<ScopesSelector
							v-model="selectedScopes"
							:available-scopes="availableScopes"
							:groups="MCP_SCOPE_GROUPS"
							:scope-tools="clientDetails?.scopeTools"
							i18n-key-prefix="oauth.consentView.scopes"
							root-test-id="consent-scopes"
						/>
						<N8nText color="text-light" size="xsmall" data-test-id="consent-scopes-note">
							{{ i18n.baseText('oauth.consentView.scopes.note') }}
						</N8nText>
					</template>
					<ul v-else-if="!resourceName" :class="$style['permission-list']">
						<li>{{ i18n.baseText('oauth.consentView.action.listWorkflows') }}</li>
						<li>{{ i18n.baseText('oauth.consentView.action.workflowDetails') }}</li>
						<li>{{ i18n.baseText('oauth.consentView.action.executeWorkflows') }}</li>
						<li>{{ i18n.baseText('oauth.consentView.action.executionDetails') }}</li>
						<li>{{ i18n.baseText('oauth.consentView.action.createUpdateWorkflows') }}</li>
						<li>{{ i18n.baseText('oauth.consentView.action.createDataTables') }}</li>
						<li>{{ i18n.baseText('oauth.consentView.action.searchProjectsAndFolders') }}</li>
					</ul>
					<p :class="$style['docs-link']">
						<span
							v-n8n-html="
								i18n.baseText('oauth.consentView.readMore', {
									interpolate: {
										docsUrl: MCP_DOCS_PAGE_URL,
									},
								})
							"
						></span>
					</p>
					<N8nCallout
						v-if="clientDetails?.redirectUri"
						theme="warning"
						:class="$style['redirect-warning']"
						data-test-id="consent-redirect-warning"
					>
						<div :class="$style['redirect-warning-content']">
							<N8nText :bold="true">
								{{ i18n.baseText('oauth.consentView.redirectWarning.title') }}
							</N8nText>
							<N8nText
								:bold="true"
								:class="$style['redirect-warning-url']"
								data-test-id="consent-redirect-uri"
							>
								{{ clientDetails.redirectUri }}
							</N8nText>
							<N8nCheckbox
								v-model="redirectUriTrusted"
								:label="i18n.baseText('oauth.consentView.redirectWarning.confirm')"
							/>
						</div>
					</N8nCallout>
				</div>
			</div>
			<footer v-if="!waitingForRedirect" :class="$style.footer">
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
							variant="subtle"
							:data-test-id="'consent-deny-button'"
							:size="'large'"
							:loading="loading"
							:disabled="loading"
							@click="handleDeny"
						>
							{{ i18n.baseText('generic.deny') }}
						</N8nButton>
						<N8nButton
							variant="solid"
							:data-test-id="'consent-allow-button'"
							:size="'large'"
							:loading="loading"
							:disabled="allowDisabled"
							@click="handleAllow"
						>
							{{ i18n.baseText('generic.allow') }}
						</N8nButton>
					</template>
				</div>
			</footer>
		</div>
	</div>
</template>

<style module lang="scss">
.overlay {
	position: fixed;
	display: flex;
	justify-content: center;
	align-items: center;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-color: rgba(71, 69, 84, 0.75);
	z-index: 1000;
}

.consent-dialog {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	min-width: 500px;
	max-width: 70%;
	padding: var(--spacing--lg);
	background-color: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.logo {
	display: flex;
	justify-content: center;
	align-items: center;
	width: var(--spacing--2xl);
	height: var(--spacing--2xl);
	border: var(--border);
	border-radius: var(--radius);

	&.n8n > div {
		position: relative;
		bottom: var(--spacing--5xs);
	}
}

.content {
	padding: var(--spacing--lg);
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

.docs-link {
	color: var(--color--text);
	font-size: var(--font-size--2xs);
}

.redirect-warning {
	margin-top: var(--spacing--2xs);
}

.redirect-warning-content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.redirect-warning-url {
	word-break: break-all;
}

.footer {
	width: 100%;
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: var(--spacing--sm);

	:global(.notice) {
		margin: 0;
	}

	.button-group {
		display: flex;
		justify-content: center;
		gap: var(--spacing--2xs);
	}
}
</style>
