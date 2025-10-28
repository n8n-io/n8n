<script setup lang="ts">
import { useConsentStore } from '@/stores/consent.store';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useI18n } from '@n8n/i18n';
import { ref, onMounted, computed } from 'vue';
import type { ConsentDetails } from '@n8n/rest-api-client/api/consent';
import { N8nButton, N8nHeading, N8nIcon, N8nLogo, N8nText } from '@n8n/design-system';
import { MCP_DOCS_PAGE_URL } from '@/features/mcpAccess/mcp.constants';

const consentStore = useConsentStore();
const i18n = useI18n();
const documentTitle = useDocumentTitle();

const error = ref<string | null>(null);

const clentDetails = computed<ConsentDetails>(
	() =>
		consentStore.consentDetails ?? {
			clientName: 'Test Client',
			clientId: 'test-client-id',
			scopes: [],
		},
);

const handleAllow = async () => {
	try {
		const response = await consentStore.approveConsent(true);
		window.location.href = response.redirectUrl;
	} catch (err) {
		// Error is already set in the store
		console.error('Failed to approve consent', err);
	}
};

const handleDeny = async () => {
	try {
		const response = await consentStore.approveConsent(false);
		window.location.href = response.redirectUrl;
	} catch (err) {
		console.error('Failed to deny consent', err);
	}
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.mcp'));
	await consentStore.fetchConsentDetails();
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
				<div :class="[$style.logo, $style.n8n]">
					<N8nIcon icon="mcp" size="xlarge" color="text-dark" />
				</div>
			</header>
			<div :class="$style.content">
				<N8nHeading tag="h2" size="large" :bold="true">
					{{
						i18n.baseText('mcp.consentView.heading', {
							interpolate: { clientName: clentDetails.clientName },
						})
					}}
				</N8nHeading>
				<div :class="$style['text-content']">
					<N8nText color="text-base" size="medium">
						{{
							i18n.baseText('mcp.consentView.description', {
								interpolate: { clientName: clentDetails.clientName },
							})
						}}
					</N8nText>
					<ul :class="$style['permission-list']">
						<li>{{ i18n.baseText('mcp.consentView.action.listWorkflows') }}</li>
						<li>{{ i18n.baseText('mcp.consentView.action.workflowDetails') }}</li>
						<li>{{ i18n.baseText('mcp.consentView.action.executeWorkflow') }}</li>
					</ul>
					<p :class="$style['docs-link']">
						<span
							v-n8n-html="
								i18n.baseText('mcp.consentView.readMore', {
									interpolate: {
										docsUrl: MCP_DOCS_PAGE_URL,
									},
								})
							"
						></span>
					</p>
				</div>
			</div>
			<footer :class="$style.footer">
				<!-- TODO: ADD notice for errror and warning -->
				<div :class="$style['button-group']">
					<N8nButton
						type="tertiary"
						:data-test-id="'consent-deny-button'"
						:size="'large'"
						@click="handleDeny"
					>
						{{ i18n.baseText('generic.deny') }}
					</N8nButton>
					<N8nButton
						type="primary"
						:data-test-id="'consent-allow-button'"
						:size="'large'"
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
	// TODO: Use a CSS variable for z-index values
	z-index: 1000;
}

.consent-dialog {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 500px;
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
	padding: var(--spacing--2xs);
}

.content {
	padding: var(--spacing--lg);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
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
	padding-left: var(--spacing--md);
	list-style-type: disc;

	li {
		color: var(--color--text);
		font-size: var(--font-size--xs);
	}
}

.docs-link {
	color: var(--color--text);
	font-size: var(--font-size--xs);
}

.footer {
	width: 100%;
	display: flex;
	justify-content: center;

	.button-group {
		display: flex;
		justify-content: center;
		gap: var(--spacing--2xs);
	}
}
</style>
