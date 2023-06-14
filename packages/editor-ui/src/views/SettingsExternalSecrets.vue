<script lang="ts" setup>
import { useUIStore } from '@/stores/ui.store';
import { useI18n, useMessage, useToast } from '@/composables';
import { useExternalSecretsStore } from '@/stores';
import { onMounted } from 'vue';
import ExternalSecretsProviderCard from '@/components/ExternalSecretsProviderCard.ee.vue';

const { i18n } = useI18n();
const uiStore = useUIStore();
const externalSecretsStore = useExternalSecretsStore();
const message = useMessage();
const toast = useToast();

onMounted(() => {
	void externalSecretsStore.fetchAllSecrets();
	void externalSecretsStore.getProviders();
});

function goToUpgrade() {
	uiStore.goToUpgrade('external-secrets', 'upgrade-external-secrets');
}
</script>

<template>
	<div class="pb-3xl">
		<n8n-heading size="2xlarge">{{ i18n.baseText('settings.externalSecrets.title') }}</n8n-heading>

		<n8n-callout theme="secondary" class="mt-2xl mb-l">
			{{ i18n.baseText('settings.externalSecrets.info') }}
			<a href="https://docs.n8n.io/user-management/external-secrets/" target="_blank">
				{{ i18n.baseText('settings.externalSecrets.info.link') }}
			</a>
		</n8n-callout>
		<div
			v-if="externalSecretsStore.isEnterpriseExternalSecretsEnabled"
			data-test-id="sso-content-licensed"
		>
			<ExternalSecretsProviderCard
				v-for="provider in externalSecretsStore.providers"
				:key="provider.name"
				:provider="provider"
			/>
		</div>
		<n8n-action-box
			v-else
			data-test-id="external-secrets-content-unlicensed"
			:description="i18n.baseText('settings.externalSecrets.actionBox.description')"
			:buttonText="i18n.baseText('settings.externalSecrets.actionBox.buttonText')"
			@click="goToUpgrade"
		>
			<template #heading>
				<span>{{ i18n.baseText('settings.externalSecrets.actionBox.title') }}</span>
			</template>
		</n8n-action-box>
	</div>
</template>
