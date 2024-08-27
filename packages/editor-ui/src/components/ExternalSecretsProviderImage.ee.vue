<script lang="ts" setup>
import type { ExternalSecretsProvider } from '@/Interface';
import { computed } from 'vue';

import infisical from '../assets/images/infisical.webp';
import doppler from '../assets/images/doppler.webp';
import vault from '../assets/images/hashicorp.webp';
import awsSecretsManager from '../assets/images/aws-secrets-manager.svg';
import azureKeyVault from '../assets/images/azure-key-vault.svg';
import gcpSecretsManager from '../assets/images/gcp-secrets-manager.svg';

const props = defineProps<{
	provider: ExternalSecretsProvider;
}>();

const image = computed(
	() =>
		({
			doppler,
			infisical,
			vault,
			awsSecretsManager,
			azureKeyVault,
			gcpSecretsManager,
		})[props.provider.name],
);
</script>

<template>
	<img :src="image" :alt="provider.displayName" width="28" height="28" />
</template>
