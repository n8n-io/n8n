<script lang="ts" setup>
import BaseBanner from '@/components/banners/BaseBanner.vue';
import { useToast } from '@/composables/useToast';
import { i18n as locale } from '@n8n/i18n';
import { useUsersStore } from '@/stores/users.store';
import { computed } from 'vue';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';

import { N8nButton } from '@n8n/design-system';
const toast = useToast();
const cloudPlanStore = useCloudPlanStore();

const userEmail = computed(() => {
	return cloudPlanStore.currentUserCloudInfo?.email ?? '';
});

async function onConfirmEmailClick() {
	try {
		await useUsersStore().sendConfirmationEmail();
		toast.showMessage({
			type: 'success',
			title: locale.baseText('banners.confirmEmail.toast.success.heading'),
			message: locale.baseText('banners.confirmEmail.toast.success.message'),
		});
	} catch (error) {
		toast.showMessage({
			type: 'error',
			title: locale.baseText('banners.confirmEmail.toast.error.heading'),
			message: error.message,
		});
	}
}
</script>

<template>
	<BaseBanner name="EMAIL_CONFIRMATION" theme="warning">
		<template #mainContent>
			<span>
				{{ locale.baseText('banners.confirmEmail.message.1') }}
				<RouterLink to="/settings/personal">{{ userEmail }}</RouterLink>
				{{ locale.baseText('banners.confirmEmail.message.2') }}
			</span>
		</template>
		<template #trailingContent>
			<N8nButton
				type="success"
				icon="mail"
				size="small"
				data-test-id="confirm-email-button"
				@click="onConfirmEmailClick"
			>
				{{ locale.baseText('banners.confirmEmail.button') }}
			</N8nButton>
		</template>
	</BaseBanner>
</template>
