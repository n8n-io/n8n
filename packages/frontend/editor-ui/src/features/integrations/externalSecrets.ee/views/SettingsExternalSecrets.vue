<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useExternalSecretsStore } from '../externalSecrets.ee.store';
import { computed, onMounted } from 'vue';
import ExternalSecretsProviderCard from '../components/ExternalSecretsProviderCard.ee.vue';
import type { ExternalSecretsProvider } from '../externalSecrets.types';
import { useUpgradePrompt } from '@/app/composables/useUpgradePrompt';

import { N8nCallout, N8nEmptyState, N8nHeading } from '@n8n/design-system';
const i18n = useI18n();
const externalSecretsStore = useExternalSecretsStore();
const toast = useToast();
const documentTitle = useDocumentTitle();
const { ctaLabel, planName, goToUpgrade } = useUpgradePrompt('external-secrets');

const sortedProviders = computed(() => {
	return ([...externalSecretsStore.providers] as ExternalSecretsProvider[]).sort((a, b) => {
		return b.name.localeCompare(a.name);
	});
});

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.externalSecrets.title'));
	if (!externalSecretsStore.isEnterpriseExternalSecretsEnabled) return;
	try {
		void externalSecretsStore.fetchGlobalSecrets();
		void externalSecretsStore.getProviders();
	} catch (error) {
		toast.showError(error, i18n.baseText('error'));
	}
});
</script>

<template>
	<div class="pb-3xl">
		<N8nHeading size="2xlarge">{{ i18n.baseText('settings.externalSecrets.title') }}</N8nHeading>
		<div
			v-if="externalSecretsStore.isEnterpriseExternalSecretsEnabled"
			data-test-id="external-secrets-content-licensed"
		>
			<N8nCallout theme="secondary" class="mt-2xl mb-l">
				{{ i18n.baseText('settings.externalSecrets.info') }}
				<a href="https://docs.n8n.io/external-secrets/" target="_blank">
					{{ i18n.baseText('settings.externalSecrets.info.link') }}
				</a>
			</N8nCallout>
			<ExternalSecretsProviderCard
				v-for="provider in sortedProviders"
				:key="provider.name"
				:provider="provider"
			/>
		</div>
		<N8nEmptyState
			v-else
			variant="gated"
			class="mt-2xl mb-l"
			data-test-id="external-secrets-content-unlicensed"
			:icon-cluster="['key-round', 'circle-ellipsis', 'vault']"
			:title="
				i18n.baseText('settings.externalSecrets.upgrade.title', { interpolate: { planName } })
			"
			:description="i18n.baseText('settings.externalSecrets.upgrade.description')"
			:learn-more-url="i18n.baseText('settings.externalSecrets.docs')"
			:learn-more-text="i18n.baseText('generic.learnMore')"
			:button-text="ctaLabel"
			@click:button="goToUpgrade"
		/>
	</div>
</template>
