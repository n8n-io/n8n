<script lang="ts" setup>
import { computed, toRef } from 'vue';
import SecretsProviderImage from './SecretsProviderImage.ee.vue';
import { N8nActionToggle, N8nCard, N8nHeading, N8nText } from '@n8n/design-system';
import type { SecretProviderConnection, SecretProviderTypeResponse } from '@n8n/api-types';
import { DateTime } from 'luxon';
import { isDateObject } from '@/app/utils/typeGuards';
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
const props = defineProps<{
	provider: SecretProviderConnection;
	providerTypeInfo?: SecretProviderTypeResponse;
}>();

const provider = toRef(props, 'provider');
const providerTypeInfo = toRef(props, 'providerTypeInfo');

const formattedDate = computed(() => {
	return DateTime.fromISO(
		isDateObject(provider.value.createdAt)
			? provider.value.createdAt.toISOString()
			: provider.value.createdAt || new Date().toISOString(),
	).toFormat('dd LLL yyyy');
});

const actionDropdownOptions = computed(() => []);
</script>

<template>
	<N8nCard hoverable>
		<template v-if="providerTypeInfo" #prepend>
			<SecretsProviderImage
				:class="$style.providerImage"
				:provider="providerTypeInfo"
				data-test-id="secrets-provider-image"
			/>
		</template>
		<template #header>
			<N8nHeading tag="h2" bold>{{ provider.name }}</N8nHeading>
		</template>
		<template #default>
			<N8nText color="text-light" size="small">
				<span>
					{{ providerTypeInfo?.displayName ?? provider.type }}
				</span>
				|
				<span>
					{{
						provider.secretsCount === 1
							? i18n.baseText('settings.externalSecrets.card.secretCount', {
									interpolate: {
										count: `${provider.secretsCount}`,
									},
								})
							: i18n.baseText('settings.externalSecrets.card.secretsCount', {
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
