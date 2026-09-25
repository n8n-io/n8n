<script setup lang="ts">
import { N8nButton, N8nSettingsSection, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import { useUsersStore } from '@n8n/stores/users.store';
import { computed, ref } from 'vue';

import ApplyInstanceDialog from './ApplyInstanceDialog.vue';
import { type PromotionConnection } from '../promotionsSettings.api';

const props = defineProps<{
	connection: PromotionConnection | null;
}>();

const i18n = useI18n();
const usersStore = useUsersStore();

const dialogOpen = ref(false);

const applyConfig = computed(() => props.connection?.configs.apply);

const canApply = computed(
	() =>
		!!applyConfig.value &&
		!!getResourcePermissions(usersStore.currentUser?.globalScopes).gitConnection.pull,
);

// Apply needs a local checkout cloned from the current config. Until then the
// backend rejects the import, so the button waits for Connect in the form below.
const isConnected = computed(() => applyConfig.value?.checkout.matchesConfig ?? false);
</script>

<template>
	<N8nSettingsSection
		v-if="canApply && connection && applyConfig"
		:title="i18n.baseText('settings.promotions.apply.title')"
		:description="i18n.baseText('settings.promotions.apply.description')"
	>
		<N8nButton
			:disabled="!isConnected"
			data-test-id="apply-instance-button"
			@click="dialogOpen = true"
		>
			{{ i18n.baseText('settings.promotions.apply.button') }}
		</N8nButton>
		<N8nText
			v-if="!isConnected"
			size="small"
			color="text-light"
			data-test-id="apply-instance-not-connected"
		>
			{{ i18n.baseText('settings.promotions.apply.notConnected') }}
		</N8nText>

		<ApplyInstanceDialog
			v-if="dialogOpen"
			:open="dialogOpen"
			:connection-id="connection.id"
			:branch-name="applyConfig.settings.branchName"
			@update:open="dialogOpen = $event"
		/>
	</N8nSettingsSection>
</template>
