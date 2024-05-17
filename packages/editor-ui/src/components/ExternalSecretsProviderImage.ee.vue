<script lang="ts" setup>
/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { PropType } from 'vue';
import type { ExternalSecretsProvider } from '@/Interface';
import { computed } from 'vue';

// @ts-expect-error
import infisical from '../assets/images/infisical.webp';
// @ts-expect-error
import doppler from '../assets/images/doppler.webp';
// @ts-expect-error
import vault from '../assets/images/hashicorp.webp';
// @ts-expect-error
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
