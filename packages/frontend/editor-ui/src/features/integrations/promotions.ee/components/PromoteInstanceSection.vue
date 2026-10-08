<script setup lang="ts">
import { N8nButton, N8nSettingsSection, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import { useUsersStore } from '@n8n/stores/users.store';
import { computed, ref } from 'vue';

import PromoteInstanceDialog from './PromoteInstanceDialog.vue';
import { type PromotionConnection } from '../promotionsSettings.api';

const props = defineProps<{
	connection: PromotionConnection | null;
}>();

const i18n = useI18n();
const usersStore = useUsersStore();

const dialogOpen = ref(false);

const promoteConfig = computed(() => props.connection?.configs.promote);

const canPromote = computed(
	() =>
		!!promoteConfig.value &&
		!!getResourcePermissions(usersStore.currentUser?.globalScopes).gitConnection.push,
);

// A promote needs a local checkout cloned from the current config. Until then the
// backend rejects the push, so the button waits for Connect in the form below.
const isConnected = computed(() => promoteConfig.value?.checkout.matchesConfig ?? false);
</script>

<template>
	<N8nSettingsSection
		v-if="canPromote && connection && promoteConfig"
		:title="i18n.baseText('settings.promotions.promote.title')"
		:description="i18n.baseText('settings.promotions.promote.description')"
	>
		<N8nButton
			:disabled="!isConnected"
			data-test-id="promote-instance-button"
			@click="dialogOpen = true"
		>
			{{ i18n.baseText('settings.promotions.promote.button') }}
		</N8nButton>
		<N8nText
			v-if="!isConnected"
			size="small"
			color="text-light"
			data-test-id="promote-instance-not-connected"
		>
			{{ i18n.baseText('settings.promotions.promote.notConnected') }}
		</N8nText>

		<PromoteInstanceDialog
			v-if="dialogOpen"
			:open="dialogOpen"
			:connection-id="connection.id"
			:base-branch-name="promoteConfig.settings.baseBranchName"
			:create-branch-on-promotion="promoteConfig.settings.createBranchOnPromotion"
			@update:open="dialogOpen = $event"
		/>
	</N8nSettingsSection>
</template>
