<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { computed, h, markRaw, toRef } from 'vue';
import { N8nEmptyState, N8nButton, N8nIcon } from '@n8n/design-system';
import type { EmptyStateIconCards } from '@n8n/design-system';
import type { SecretProviderTypeResponse } from '@n8n/api-types';
import SecretsProviderImage from './SecretsProviderImage.ee.vue';

const i18n = useI18n();

const props = defineProps<{
	providerTypes?: SecretProviderTypeResponse[];
	canCreate?: boolean;
}>();

const providerTypes = toRef(props, 'providerTypes');
const supportedProviders = computed(() => providerTypes.value ?? []);

const emit = defineEmits<{
	addSecretsStore: [];
}>();

// The vault mark, flanked by side cards cycling through the supported providers' logos. The
// cards render side icons as prop-less components, so each logo is bound to its provider here.
const emptyStateIcon = computed<EmptyStateIconCards>(() => ({
	type: 'cards',
	center: 'vault',
	sides: supportedProviders.value.map((provider) =>
		markRaw(() => h(SecretsProviderImage, { provider })),
	),
}));

function onAddSecretsStore() {
	emit('addSecretsStore');
}
</script>

<template>
	<N8nEmptyState
		class="mt-2xl mb-l"
		data-test-id="secrets-provider-connections-empty-state"
		:icon="emptyStateIcon"
		:heading="i18n.baseText('settings.secretsProviderConnections.emptyState.heading')"
		:description="i18n.baseText('settings.secretsProviderConnections.emptyState.description')"
	>
		<template #additionalContent>
			<N8nButton
				variant="ghost"
				class="mr-2xs n8n-button--highlight"
				:href="i18n.baseText('settings.externalSecrets.docs')"
				target="_blank"
				data-test-id="secrets-provider-connections-learn-more"
			>
				{{ i18n.baseText('generic.learnMore') }} <N8nIcon icon="arrow-up-right" />
			</N8nButton>
			<N8nButton v-if="canCreate" variant="solid" @click="onAddSecretsStore">
				{{ i18n.baseText('settings.secretsProviderConnections.buttons.addSecretsStore') }}
			</N8nButton>
		</template>
	</N8nEmptyState>
</template>
