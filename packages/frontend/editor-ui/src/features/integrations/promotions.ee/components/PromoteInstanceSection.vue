<script setup lang="ts">
import { N8nButton, N8nSettingsSection } from '@n8n/design-system';
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
</script>

<template>
	<N8nSettingsSection
		v-if="canPromote && connection && promoteConfig"
		:title="i18n.baseText('settings.promotions.promote.title')"
		:description="i18n.baseText('settings.promotions.promote.description')"
	>
		<N8nButton
			type="primary"
			data-test-id="promote-instance-button"
			@click="dialogOpen = true"
		>
			{{ i18n.baseText('settings.promotions.promote.button') }}
		</N8nButton>

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
