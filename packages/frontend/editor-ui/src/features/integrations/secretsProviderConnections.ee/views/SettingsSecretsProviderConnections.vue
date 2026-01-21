<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useSecretsProviders } from '../composables/useSecretsProviders';
import { computed, onMounted } from 'vue';
import { N8nActionBox, N8nHeading, N8nLink, N8nText } from '@n8n/design-system';
import SecretsProviderConnectionCard from '../components/SecretsProviderConnectionCard.ee.vue';
import SecretsProviderConnectionsEmptyState from '../components/SecretsProviderConnectionsEmptyState.ee.vue';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { usePostHog } from '@/app/stores/posthog.store';
import { I18nT } from 'vue-i18n';

const i18n = useI18n();
const secretsProviders = useSecretsProviders();
const toast = useToast();
const documentTitle = useDocumentTitle();
const pageRedirectionHelper = usePageRedirectionHelper();
const posthogStore = usePostHog();

const hasActiveProviders = computed(() => secretsProviders.activeProviders.value.length > 0);

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.secretsProviderConnections.title'));
	if (!secretsProviders.isEnterpriseExternalSecretsEnabled.value) return;
	try {
		void secretsProviders.fetchActiveConnections();
	} catch (error) {
		toast.showError(error, i18n.baseText('error'));
	}
});

function goToUpgrade() {
	void pageRedirectionHelper.goToUpgrade('external-secrets', 'upgrade-external-secrets');
}
</script>

<template>
	<div v-if="posthogStore.isFeatureEnabled('secretsProviderConnections')" class="pb-3xl">
		<N8nHeading size="2xlarge">
			{{ i18n.baseText('settings.secretsProviderConnections.title') }}
		</N8nHeading>
		<div
			v-if="secretsProviders.isEnterpriseExternalSecretsEnabled.value"
			data-test-id="secrets-provider-connections-content-licensed"
		>
			<SecretsProviderConnectionsEmptyState v-if="!hasActiveProviders" />
			<div v-else-if="hasActiveProviders" class="mt-s">
				<N8nText color="text-base" size="medium"
					>{{ i18n.baseText('settings.secretsProviderConnections.description') }}
					<N8nLink
						theme="text"
						:icon="'external-link'"
						:href="i18n.baseText('settings.externalSecrets.docs')"
						target="_blank"
						rel="noopener noreferrer"
					>
						{{ i18n.baseText('generic.documentation').toLocaleLowerCase() }}↗
					</N8nLink></N8nText
				>
				<div class="mt-l mb-l">
					<SecretsProviderConnectionCard
						v-for="provider in secretsProviders.activeProviders.value"
						:key="provider.name"
						:class="$style.card"
						:provider="provider"
					/>
				</div>
			</div>
		</div>
		<N8nActionBox
			v-else
			class="mt-2xl mb-l"
			data-test-id="secrets-provider-connections-content-unlicensed"
			:button-text="i18n.baseText('settings.externalSecrets.actionBox.buttonText')"
			@click="goToUpgrade"
		>
			<template #heading>
				<span>{{ i18n.baseText('settings.externalSecrets.actionBox.title') }}</span>
			</template>
			<template #description>
				<I18nT keypath="settings.externalSecrets.actionBox.description" scope="global">
					<template #link>
						<a :href="i18n.baseText('settings.externalSecrets.docs')" target="_blank">
							{{ i18n.baseText('settings.externalSecrets.actionBox.description.link') }}
						</a>
					</template>
				</I18nT>
			</template>
		</N8nActionBox>
	</div>
</template>

<style lang="scss" module>
.card {
	margin-bottom: var(--spacing--2xs);
}
</style>
