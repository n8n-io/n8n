<script lang="ts" setup>
import type { ExternalSecretsProvider } from '../externalSecrets.types';
import { computed } from 'vue';

import infisical from '../assets/images/infisical.webp';
import doppler from '../assets/images/doppler.webp';
import vault from '../assets/images/hashicorp.webp';
import AwsSecretsManager from '../assets/images/aws-secrets-manager.svg';
import AzureKeyVault from '../assets/images/azure-key-vault.svg';
import GcpSecretsManager from '../assets/images/gcp-secrets-manager.svg';

const { provider } = defineProps<{
	provider: ExternalSecretsProvider;
}>();

const image = computed(() => ({ doppler, infisical, vault })[provider.name]);
</script>

<template>
	<AwsSecretsManager v-if="provider.name === 'awsSecretsManager'" />
	<AzureKeyVault v-else-if="provider.name === 'azureKeyVault'" />
	<GcpSecretsManager v-else-if="provider.name === 'gcpSecretsManager'" />
	<img v-else :src="image" :alt="provider.displayName" width="28" height="28" />
</template>
