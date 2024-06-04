<script lang="ts" setup>
import type { PropType } from 'vue';
import type { ExternalSecretsProvider } from '@/Interface';
import { computed } from 'vue';

import infisical from '../assets/images/infisical.webp';
import doppler from '../assets/images/doppler.webp';
import vault from '../assets/images/hashicorp.webp';
import awsSecretsManager from '../assets/images/aws-secrets-manager.svg';

const props = defineProps({
	provider: {
		type: Object as PropType<ExternalSecretsProvider>,
		required: true,
	},
});

const image = computed(
	() =>
		({
			doppler,
			infisical,
			vault,
			awsSecretsManager,
		})[props.provider.name],
);
</script>

<template>
	<img :src="image" :alt="provider.displayName" width="28" height="28" />
</template>
