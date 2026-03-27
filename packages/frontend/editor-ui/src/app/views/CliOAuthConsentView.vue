<script setup lang="ts">
import { useConsentStore } from '@/app/stores/consent.store';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useI18n } from '@n8n/i18n';
import { onMounted, computed, ref } from 'vue';
import {
	N8nButton,
	N8nCheckbox,
	N8nHeading,
	N8nIcon,
	N8nLogo,
	N8nNotice,
	N8nText,
} from '@n8n/design-system';
import { useToast } from '@/app/composables/useToast';

const consentStore = useConsentStore();

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const toast = useToast();

const waitingForRedirect = ref(false);
const selectedScopes = ref<string[]>([]);

const error = computed(() => consentStore.error);
const loading = computed(() => consentStore.isLoading);

const clientDetails = computed(() => consentStore.consentDetails);

// Group scopes by resource for display
const groupedScopes = computed(() => {
	const scopes = clientDetails.value?.requestedScopes ?? [];
	const groups: Record<string, string[]> = {};

	for (const scope of scopes) {
		const [resource, action] = scope.split(':');
		if (!groups[resource]) {
			groups[resource] = [];
		}
		if (action) {
			groups[resource].push(action);
		}
	}

	return groups;
});

const allScopesSelected = computed(() => {
	const requested = clientDetails.value?.requestedScopes ?? [];
	return requested.length > 0 && selectedScopes.value.length === requested.length;
});

const toggleScope = (scope: string) => {
	const idx = selectedScopes.value.indexOf(scope);
	if (idx === -1) {
		selectedScopes.value.push(scope);
	} else {
		selectedScopes.value.splice(idx, 1);
	}
};

const toggleAllScopes = () => {
	const requested = clientDetails.value?.requestedScopes ?? [];
	if (allScopesSelected.value) {
		selectedScopes.value = [];
	} else {
		selectedScopes.value = [...requested];
	}
};

const handleAllow = async () => {
	try {
		const response = await consentStore.approveConsent(true, selectedScopes.value);
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
	documentTitle.set(i18n.baseText('cliOauth.consentView.title'));
	try {
		const details = await consentStore.fetchConsentDetails();
		if (details?.requestedScopes) {
			selectedScopes.value = [...details.requestedScopes];
		}
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
					<N8nIcon icon="terminal" size="xlarge" color="text-dark" />
				</div>
			</header>

			<!-- Success screen -->
			<div v-if="waitingForRedirect" :class="$style.success" data-test-id="cli-consent-success">
				<N8nHeading tag="h2" size="large" :bold="true">
					{{ i18n.baseText('oauth.consentView.success.title') }}
				</N8nHeading>
				<N8nText color="text-base">
					{{ i18n.baseText('cliOauth.consentView.success.description') }}
				</N8nText>
			</div>

			<!-- Consent form -->
			<div v-else :class="$style.content" data-test-id="cli-consent-content">
				<N8nHeading tag="h2" size="large" :bold="true">
					{{ i18n.baseText('cliOauth.consentView.heading') }}
				</N8nHeading>
				<div :class="$style['text-content']">
					<N8nText color="text-base" size="small">
						{{ i18n.baseText('cliOauth.consentView.description') }}
					</N8nText>

					<!-- Scope selector -->
					<div
						v-if="clientDetails?.requestedScopes?.length"
						:class="$style['scope-selector']"
						data-test-id="cli-scope-selector"
					>
						<div :class="$style['scope-header']">
							<N8nCheckbox
								:model-value="allScopesSelected"
								:label="i18n.baseText('oauth.consentView.scopes.selectAll')"
								@update:model-value="toggleAllScopes"
							/>
						</div>
						<div
							v-for="(actions, resource) in groupedScopes"
							:key="resource"
							:class="$style['scope-group']"
						>
							<N8nText :class="$style['scope-group-label']" color="text-dark" size="small">
								{{ resource.charAt(0).toUpperCase() + resource.slice(1) }}
							</N8nText>
							<div :class="$style['scope-items']">
								<N8nCheckbox
									v-for="action in actions"
									:key="`${resource}:${action}`"
									:model-value="selectedScopes.includes(`${resource}:${action}`)"
									:label="`${resource}:${action}`"
									@update:model-value="toggleScope(`${resource}:${action}`)"
								/>
							</div>
						</div>
					</div>
				</div>
			</div>

			<footer v-if="!waitingForRedirect" :class="$style.footer">
				<N8nNotice
					v-if="error"
					theme="danger"
					data-test-id="cli-consent-error"
					:content="error"
				></N8nNotice>
				<div :class="$style['button-group']">
					<N8nButton
						variant="subtle"
						data-test-id="cli-consent-deny"
						size="large"
						:loading="loading"
						:disabled="loading || error !== null"
						@click="handleDeny"
					>
						{{ i18n.baseText('generic.deny') }}
					</N8nButton>
					<N8nButton
						variant="solid"
						data-test-id="cli-consent-allow"
						size="large"
						:loading="loading"
						:disabled="loading || error !== null || selectedScopes.length === 0"
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

.scope-selector {
	border: var(--border);
	border-radius: var(--radius);
	padding: var(--spacing--xs);
	max-height: 300px;
	overflow-y: auto;
}

.scope-header {
	padding-bottom: var(--spacing--2xs);
	margin-bottom: var(--spacing--2xs);
	border-bottom: var(--border);
}

.scope-group {
	margin-bottom: var(--spacing--xs);

	&:last-child {
		margin-bottom: 0;
	}
}

.scope-group-label {
	font-weight: var(--font-weight--bold);
	text-transform: uppercase;
	font-size: var(--font-size--3xs);
	margin-bottom: var(--spacing--4xs);
	display: block;
}

.scope-items {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding-left: var(--spacing--sm);
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
