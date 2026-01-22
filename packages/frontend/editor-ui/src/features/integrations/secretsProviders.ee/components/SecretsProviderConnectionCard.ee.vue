<script lang="ts" setup>
import { computed, toRef } from 'vue';
import ExternalSecretsProviderImage from '@/features/integrations/externalSecrets.ee/components/ExternalSecretsProviderImage.ee.vue';
import { N8nActionToggle, N8nCard, N8nText } from '@n8n/design-system';
import type { SecretProviderConnection } from '@n8n/api-types';
import { DateTime } from 'luxon';
import { isDateObject } from '@/app/utils/typeGuards';
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
const props = defineProps<{
	provider: SecretProviderConnection;
}>();

const provider = toRef(props, 'provider');

const formattedDate = computed(() => {
	return DateTime.fromISO(
		isDateObject(provider.value.createdAt)
			? provider.value.createdAt.toISOString()
			: provider.value.createdAt || new Date().toISOString(),
	).toFormat('dd LLL yyyy');
});

// Adapter to convert SecretProviderConnection to ExternalSecretsProvider format for the image component
const providerForImage = computed(() => ({
	name: provider.value.type,
	displayName: provider.value.displayName,
	icon: provider.value.type,
	connected: provider.value.enabled,
	connectedAt: provider.value.createdAt,
	state: provider.value.state,
}));

const actionDropdownOptions = computed(() => []);
</script>

<template>
	<N8nCard hoverable>
		<template #prepend>
			<ExternalSecretsProviderImage :class="$style.providerImage" :provider="providerForImage" />
		</template>
		<template #header>
			<N8nText tag="h2" bold>{{ provider.name }}</N8nText>
		</template>
		<template #default>
			<N8nText v-if="provider.enabled" color="text-light" size="small">
				<span>
					{{ provider.displayName }}
				</span>
				|
				<span>
					{{
						i18n.baseText('settings.externalSecrets.card.secretsCount', {
							interpolate: {
								count: `${provider.secretsCount}`,
							},
						})
					}}
				</span>
				|
				<span>
					{{
						i18n.baseText('settings.secretsProviderConnections.card.createdAt', {
							interpolate: {
								date: formattedDate,
							},
						})
					}}
				</span>
			</N8nText>
		</template>
		<template #append>
			<N8nActionToggle :actions="actionDropdownOptions" />
		</template>
	</N8nCard>
</template>

<style lang="css" module>
.providerImage {
	width: 100%;
	height: 100%;
}
</style>
