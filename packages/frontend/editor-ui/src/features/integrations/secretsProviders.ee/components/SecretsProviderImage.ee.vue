<script lang="ts" setup>
import type { SecretProviderTypeResponse } from '@n8n/api-types';
import { computed } from 'vue';

import infisical from '../../externalSecrets.ee/assets/images/infisical.webp';
import doppler from '../../externalSecrets.ee/assets/images/doppler.webp';
import vault from '../../externalSecrets.ee/assets/images/hashicorp.webp';
import AwsSecretsManager from '../../externalSecrets.ee/assets/images/aws-secrets-manager.svg';
import AzureKeyVault from '../../externalSecrets.ee/assets/images/azure-key-vault.svg';
import GcpSecretsManager from '../../externalSecrets.ee/assets/images/gcp-secrets-manager.svg';

const { provider } = defineProps<{
	provider: SecretProviderTypeResponse;
}>();

const image = computed(() => {
	const providerName = provider.type;
	return ({ doppler, infisical, vault } as Record<string, string>)[providerName];
});
</script>

<template>
	<AwsSecretsManager v-if="provider.type === 'awsSecretsManager'" />
	<AzureKeyVault v-else-if="provider.type === 'azureKeyVault'" />
	<GcpSecretsManager v-else-if="provider.type === 'gcpSecretsManager'" />
	<img v-else :src="image" :alt="provider.displayName" width="28" height="28" />
</template>
