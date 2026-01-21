<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { computed, onMounted } from 'vue';
import { N8nActionBox, N8nHeading, N8nLink, N8nCard } from '@n8n/design-system';
import ExternalSecretsProviderImage from '@/features/integrations/externalSecrets.ee/components/ExternalSecretsProviderImage.ee.vue';
import { useSecretsProviders } from '../composables/useSecretsProviders';

const i18n = useI18n();
const secretsProviders = useSecretsProviders();

const emit = defineEmits<{
	addSecretsStore: [];
}>();

const supportedProviders = computed(() => secretsProviders.providers.value);

onMounted(() => {
	if (secretsProviders.isEnterpriseExternalSecretsEnabled.value) {
		void secretsProviders.fetchProviders();
	}
});

function onAddSecretsStore() {
	emit('addSecretsStore');
}
</script>

<template>
	<div :class="$style.emptyStateContainer">
		<N8nActionBox
			:description="i18n.baseText('settings.secretsProviderConnections.emptyState.description')"
			:button-text="i18n.baseText('settings.secretsProviderConnections.emptyState.buttonText')"
			button-variant="primary"
			data-test-id="secrets-provider-connections-empty-state"
			@click:button="onAddSecretsStore"
		>
			<template #heading>
				<div :class="$style.providersContainer">
					<N8nCard
						v-for="provider in supportedProviders.slice(0, 3)"
						:key="provider.name"
						:class="$style.providerCard"
					>
						<ExternalSecretsProviderImage :provider="provider" />
					</N8nCard>
				</div>
				<N8nHeading :class="$style.header" size="large" align="center">
					{{ i18n.baseText('settings.secretsProviderConnections.emptyState.heading') }}
				</N8nHeading>
			</template>
			<template #additionalContent>
				<N8nLink
					theme="text"
					:icon="'external-link'"
					:href="i18n.baseText('settings.externalSecrets.docs')"
					target="_blank"
					rel="noopener noreferrer"
					data-test-id="secrets-provider-connections-learn-more"
				>
					{{ i18n.baseText('generic.learnMore') }}
					↗
				</N8nLink>
			</template>
		</N8nActionBox>
	</div>
</template>

<style lang="scss" module>
.emptyStateContainer {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-top: var(--spacing--2xl);
}

.header {
	display: block;
}
.providersContainer {
	display: inline-flex;
	margin-bottom: var(--spacing--xl);
	align-items: center;
	justify-content: center;
}

.providerCard {
	padding: 0;
	overflow: hidden;
	box-shadow: var(--shadow--light);
}

.providerCard:nth-child(1) {
	transform: translateY(var(--spacing--3xs)) rotate(-10deg);
}

.providerCard:nth-child(2) {
	z-index: 2;
}

.providerCard:nth-child(3) {
	transform: translateY(var(--spacing--3xs)) rotate(10deg);
}

.providerCard :global(img),
.providerCard :global(svg) {
	width: var(--spacing--2xl);
	height: var(--spacing--2xl);
}
</style>
