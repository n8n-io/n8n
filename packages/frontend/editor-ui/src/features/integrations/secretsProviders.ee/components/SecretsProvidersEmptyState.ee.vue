<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { N8nEmptyState } from '@n8n/design-system';

defineProps<{
	canCreate?: boolean;
}>();

const i18n = useI18n();

const emit = defineEmits<{
	addSecretsStore: [];
}>();

function onAddSecretsStore() {
	emit('addSecretsStore');
}
</script>

<template>
	<N8nEmptyState
		class="mt-2xl mb-l"
		variant="empty"
		data-test-id="secrets-provider-connections-empty-state"
		:icon-cluster="['key-round', 'circle-ellipsis', 'vault']"
		:title="i18n.baseText('settings.secretsProviderConnections.emptyState.heading')"
		:description="i18n.baseText('settings.secretsProviderConnections.emptyState.description')"
		:learn-more-url="i18n.baseText('settings.externalSecrets.docs')"
		:learn-more-text="i18n.baseText('generic.learnMore')"
		:button-text="
			canCreate
				? i18n.baseText('settings.secretsProviderConnections.buttons.addSecretsStore')
				: undefined
		"
		@click:button="onAddSecretsStore"
	/>
</template>
