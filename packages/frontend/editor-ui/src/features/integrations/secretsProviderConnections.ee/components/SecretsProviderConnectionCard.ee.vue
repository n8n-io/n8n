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
	<N8nCard :class="$style.card">
		<div :class="$style.cardBody">
			<ExternalSecretsProviderImage :class="$style.cardImage" :provider="provider" />
			<div :class="$style.cardContent">
				<N8nText bold>{{ provider.displayName }}</N8nText>
			</div>
			<div :class="$style.cardActions">
				<N8nActionToggle theme="dark" :actions="actionDropdownOptions" />
			</div>
		</div>
	</N8nCard>
</template>

<style lang="scss" module>
.cardImage {
	width: 28px;
	height: 28px;
}

.cardBody {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: var(--spacing--sm);
}

.cardContent {
	display: flex;
	flex-direction: column;
	flex-grow: 1;
}

.cardActions {
	display: flex;
	flex-direction: row;
	align-items: center;
}
</style>
