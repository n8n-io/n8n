<script setup lang="ts">
import { useConsentStore } from '@/app/stores/consent.store';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useI18n } from '@n8n/i18n';
import { onMounted, computed, ref } from 'vue';
import type { ConsentDetails } from '@n8n/rest-api-client/api/consent';
import { N8nButton, N8nHeading, N8nIcon, N8nLogo, N8nNotice, N8nText } from '@n8n/design-system';
import { MCP_DOCS_PAGE_URL } from '@/features/ai/mcpAccess/mcp.constants';
import { useToast } from '@/app/composables/useToast';

const ANTHROPIC_CLIENTS = ['claude', 'mcp inspector'];
const LOVABLE_CLIENTS = ['lovable'];

const consentStore = useConsentStore();

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const toast = useToast();

// Success state:
const waitingForRedirect = ref(false);

const error = computed(() => consentStore.error);
const loading = computed(() => consentStore.isLoading);

const clentDetails = computed<ConsentDetails | null>(() => consentStore.consentDetails);

const clientIcon = computed(() => {
	const clientName = clentDetails.value?.clientName?.toLowerCase() ?? '';
	if (ANTHROPIC_CLIENTS.some((name) => clientName.includes(name))) {
		return 'anthropic';
	} else if (LOVABLE_CLIENTS.some((name) => clientName.includes(name))) {
		return 'lovable';
	} else {
		return 'mcp';
	}
});

const handleAllow = async () => {
	try {
		const response = await consentStore.approveConsent(true);
		waitingForRedirect.value = true;
		window.location.href = response.redirectUrl;
	} catch (err) {
		toast.showError(err, i18n.baseText('oauth.consentView.error.allow'));
	}
};

const handleDeny = async () => {
	try {
		const response = await consentStore.approveConsent(false);
		window.location.href = response.redirectUrl;
	} catch (err) {
		toast.showError(err, i18n.baseText('oauth.consentView.error.deny'));
	}
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('oauth.consentView.title'));
	try {
		await consentStore.fetchConsentDetails();
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
					<N8nIcon :icon="clientIcon" size="xlarge" color="text-dark" />
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
			<!-- Default content -->
			<div v-else :class="$style.content" data-test-id="consent-content">
				<N8nHeading tag="h2" size="large" :bold="true">
					{{
						i18n.baseText('oauth.consentView.heading', {
							interpolate: { clientName: clentDetails?.clientName ?? '' },
						})
					}}
				</N8nHeading>
				<div :class="$style['text-content']">
					<N8nText color="text-base" size="small">
						{{
							i18n.baseText('oauth.consentView.description', {
								interpolate: { clientName: clentDetails?.clientName ?? '' },
							})
						}}
					</N8nText>
					<ul :class="$style['permission-list']">
						<li>{{ i18n.baseText('oauth.consentView.action.listWorkflows') }}</li>
						<li>{{ i18n.baseText('oauth.consentView.action.workflowDetails') }}</li>
						<li>{{ i18n.baseText('oauth.consentView.action.executeWorkflows') }}</li>
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
				</div>
			</div>
			<footer v-if="!waitingForRedirect" :class="$style.footer">
				<N8nNotice
					v-if="error"
					theme="danger"
					:data-test-id="'consent-error-notice'"
					:content="error"
				></N8nNotice>
				<div :class="$style['button-group']">
					<N8nButton
						variant="subtle"
						:data-test-id="'consent-deny-button'"
						:size="'large'"
						:loading="loading"
						:disabled="loading || error !== null"
						@click="handleDeny"
					>
						{{ i18n.baseText('generic.deny') }}
					</N8nButton>
					<N8nButton
						variant="solid"
						:data-test-id="'consent-allow-button'"
						:size="'large'"
						:loading="loading"
						:disabled="loading || error !== null"
						@click="handleAllow"
					>
						{{ i18n.baseText('generic.allow') }}
					</N8nButton>
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
