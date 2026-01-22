<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useSecretsProviders } from '../composables/useSecretsProviders';
import { computed, onMounted } from 'vue';
import { N8nActionBox, N8nHeading, N8nIcon, N8nLink, N8nText } from '@n8n/design-system';
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
		void secretsProviders.fetchProviders();
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
	<div v-if="posthogStore.isFeatureEnabled('secretsProviderConnections')" :class="$style.container">
		<div class="mb-xl" :class="$style.headerContainer">
			<div :class="$style.headerTitle">
				<N8nHeading tag="h1" size="2xlarge">
					{{ i18n.baseText('settings.secretsProviderConnections.title') }}
				</N8nHeading>
				<N8nText
					v-if="secretsProviders.isEnterpriseExternalSecretsEnabled.value && hasActiveProviders"
					color="text-base"
					size="medium"
				>
					{{ i18n.baseText('settings.secretsProviderConnections.description') }}
					{{ i18n.baseText('credentialResolver.view.learnMore') }}
					<N8nLink
						theme="text"
						:href="i18n.baseText('settings.externalSecrets.docs')"
						size="medium"
						new-window
					>
						<span :class="$style.link">
							{{ i18n.baseText('generic.documentation') }}
							<N8nIcon icon="arrow-up-right" />
						</span>
					</N8nLink>
				</N8nText>
			</div>
		</div>
		<div
			v-if="secretsProviders.isEnterpriseExternalSecretsEnabled.value"
			data-test-id="secrets-provider-connections-content-licensed"
		>
			<SecretsProviderConnectionsEmptyState v-if="!hasActiveProviders" />
			<div v-else>
				<SecretsProviderConnectionCard
					v-for="provider in secretsProviders.activeProviders.value"
					:key="provider.name"
					class="mb-2xs"
					:provider="provider"
				/>
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

<style lang="css" module>
.container {
	padding-bottom: var(--spacing--xl);
	max-width: 702px;
	margin: 0 auto;
}

.headerContainer {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.headerTitle {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.link {
	text-transform: lowercase;
	display: inline-flex;
	align-items: center;
}
</style>
