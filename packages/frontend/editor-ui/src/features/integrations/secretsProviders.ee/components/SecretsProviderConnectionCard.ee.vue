<script lang="ts" setup>
import { computed, toRef } from 'vue';
import SecretsProviderImage from './SecretsProviderImage.ee.vue';
import { N8nActionToggle, N8nBadge, N8nCard, N8nHeading, N8nText } from '@n8n/design-system';
import type { SecretProviderConnection, SecretProviderTypeResponse } from '@n8n/api-types';
import { DateTime } from 'luxon';
import { isDateObject } from '@/app/utils/typeGuards';
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
const props = defineProps<{
	provider: SecretProviderConnection;
	providerTypeInfo?: SecretProviderTypeResponse;
	canUpdate: boolean;
}>();

const emit = defineEmits<{
	edit: [connectionId: string];
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

const showDisconnectedBadge = computed(() => {
	return provider.value.state === 'error';
});

const actionDropdownOptions = computed(() => {
	if (!props.canUpdate) return [];
	return [
		{
			label: i18n.baseText('generic.edit'),
			value: 'edit',
		},
	];
});

function onAction(action: string) {
	if (action === 'edit') {
		emit('edit', provider.value.name);
	}
}
</script>

<template>
	<N8nCard :class="$style.card" hoverable>
		<template v-if="providerTypeInfo" #prepend>
			<SecretsProviderImage
				:class="$style.providerImage"
				:provider="providerTypeInfo"
				data-test-id="secrets-provider-image"
			/>
		</template>
		<template #header>
			<div :class="$style.headerContainer">
				<N8nHeading tag="h2" bold data-test-id="secrets-provider-name">{{
					provider.name
				}}</N8nHeading>
				<N8nBadge
					v-if="showDisconnectedBadge"
					theme="warning"
					:bold="false"
					size="xsmall"
					data-test-id="disconnected-badge"
				>
					{{ i18n.baseText('settings.secretsProviderConnections.state.disconnected') }}
				</N8nBadge>
			</div>
		</template>
		<template #default>
			<N8nText class="pb-4xs" color="text-light" size="small">
				<span data-test-id="secrets-provider-display-name">
					{{ providerTypeInfo?.displayName ?? provider.type }}
				</span>
				|
				<span data-test-id="secrets-provider-secrets-count">
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
				<span data-test-id="secrets-provider-created-at">
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
			<N8nActionToggle
				:actions="actionDropdownOptions"
				data-test-id="secrets-provider-action-toggle"
				@action="onAction"
			/>
		</template>
	</N8nCard>
</template>

<style lang="css" module>
.card {
	--card--padding: var(--spacing--2xs);
	padding-left: var(--spacing--sm);
}

.providerImage {
	width: 100%;
	height: 100%;
}

.headerContainer {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}
</style>
