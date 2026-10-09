<script setup lang="ts">
import {
	N8nButton,
	N8nIcon,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import { useUsersStore } from '@n8n/stores/users.store';
import { computed, ref } from 'vue';

import ApplyInstanceDialog from './ApplyInstanceDialog.vue';
import PromoteInstanceDialog from './PromoteInstanceDialog.vue';
import { type PromotionConnection } from '../promotionsSettings.api';

const props = defineProps<{
	connection: PromotionConnection | null;
}>();

const i18n = useI18n();
const usersStore = useUsersStore();

const promoteDialogOpen = ref(false);
const applyDialogOpen = ref(false);

const promoteConfig = computed(() => props.connection?.configs.promote);
const applyConfig = computed(() => props.connection?.configs.apply);

const canPromote = computed(
	() =>
		!!promoteConfig.value &&
		!!getResourcePermissions(usersStore.currentUser?.globalScopes).gitConnection.push,
);
const canApply = computed(
	() =>
		!!applyConfig.value &&
		!!getResourcePermissions(usersStore.currentUser?.globalScopes).gitConnection.pull,
);

// Promote and apply each need a local checkout cloned from the current config. Until then
// the backend rejects the request, so the buttons wait for Connect in the form below.
const promoteConnected = computed(() => promoteConfig.value?.checkout.matchesConfig ?? false);
const applyConnected = computed(() => applyConfig.value?.checkout.matchesConfig ?? false);
</script>

<template>
	<N8nSettingsSection
		v-if="connection && (canPromote || canApply)"
		:title="i18n.baseText('settings.promotions.instanceActions.title')"
		:description="i18n.baseText('settings.promotions.instanceActions.description')"
	>
		<N8nSettingsRowGroup>
			<N8nSettingsRow v-if="canPromote && promoteConfig">
				<template #visual>
					<N8nIcon icon="arrow-up" color="text-dark" :size="20" />
				</template>
				<template #info>
					<N8nText bold size="medium" color="text-dark">
						{{ i18n.baseText('settings.promotions.promote.title') }}
					</N8nText>
					<N8nText v-if="promoteConnected" size="small" color="text-light">
						{{ i18n.baseText('settings.promotions.promote.description') }}
					</N8nText>
					<N8nText
						v-else
						size="small"
						color="text-light"
						data-test-id="promote-instance-not-connected"
					>
						{{ i18n.baseText('settings.promotions.promote.notConnected') }}
					</N8nText>
				</template>
				<template #action>
					<N8nButton
						:disabled="!promoteConnected"
						data-test-id="promote-instance-button"
						@click="promoteDialogOpen = true"
					>
						{{ i18n.baseText('settings.promotions.promote.button') }}
					</N8nButton>
				</template>
			</N8nSettingsRow>

			<N8nSettingsRow v-if="canApply && applyConfig">
				<template #visual>
					<N8nIcon icon="arrow-down" color="text-dark" :size="20" />
				</template>
				<template #info>
					<N8nText bold size="medium" color="text-dark">
						{{ i18n.baseText('settings.promotions.apply.title') }}
					</N8nText>
					<N8nText v-if="applyConnected" size="small" color="text-light">
						{{ i18n.baseText('settings.promotions.apply.description') }}
					</N8nText>
					<N8nText
						v-else
						size="small"
						color="text-light"
						data-test-id="apply-instance-not-connected"
					>
						{{ i18n.baseText('settings.promotions.apply.notConnected') }}
					</N8nText>
				</template>
				<template #action>
					<N8nButton
						:disabled="!applyConnected"
						data-test-id="apply-instance-button"
						@click="applyDialogOpen = true"
					>
						{{ i18n.baseText('settings.promotions.apply.button') }}
					</N8nButton>
				</template>
			</N8nSettingsRow>
		</N8nSettingsRowGroup>

		<PromoteInstanceDialog
			v-if="promoteDialogOpen && promoteConfig"
			:open="promoteDialogOpen"
			:connection-id="connection.id"
			:base-branch-name="promoteConfig.settings.baseBranchName"
			:create-branch-on-promotion="promoteConfig.settings.createBranchOnPromotion"
			@update:open="promoteDialogOpen = $event"
		/>
		<ApplyInstanceDialog
			v-if="applyDialogOpen && applyConfig"
			:open="applyDialogOpen"
			:connection-id="connection.id"
			:branch-name="applyConfig.settings.branchName"
			@update:open="applyDialogOpen = $event"
		/>
	</N8nSettingsSection>
</template>
