<script lang="ts" setup>
import { computed, toRef } from 'vue';
import ExternalSecretsProviderImage from '@/features/integrations/externalSecrets.ee/components/ExternalSecretsProviderImage.ee.vue';
import { N8nActionToggle, N8nCard, N8nText } from '@n8n/design-system';
import type { ExternalSecretsProvider } from '@n8n/api-types';

const props = defineProps<{
	provider: ExternalSecretsProvider;
}>();

const provider = toRef(props, 'provider');

const actionDropdownOptions = computed(() => []);
</script>

<template>
	<N8nCard hoverable>
		<template #prepend>
			<ExternalSecretsProviderImage :class="$style.providerImage" :provider="provider" />
		</template>
		<template #header>
			<N8nText tag="h2" bold>{{ provider.displayName }}</N8nText>
		</template>
		<template #append>
			<N8nActionToggle :actions="actionDropdownOptions" />
		</template>
	</N8nCard>
</template>

<style lang="css" module>
.providerImage {
	width: 28px;
	height: 28px;
}
</style>
