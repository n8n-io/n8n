<script lang="ts" setup>
import BaseBanner from '@/components/banners/BaseBanner.vue';
import { useToast } from '@/composables';
import { i18n as locale } from '@/plugins/i18n';
import { useUsersStore } from '@/stores/users.store';
import { computed } from 'vue';

const toast = useToast();

const userEmail = computed(() => {
	const { currentUserCloudInfo } = useUsersStore();
	return currentUserCloudInfo?.email ?? '';
});

async function onConfirmEmailClick() {
	try {
		await useUsersStore().confirmEmail();
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
	<base-banner name="EMAIL_CONFIRMATION" theme="warning">
		<template #mainContent>
			<span>
				{{ locale.baseText('banners.confirmEmail.message.1') }}
				<router-link to="/settings/personal">{{ userEmail }}</router-link>
				{{ locale.baseText('banners.confirmEmail.message.2') }}
			</span>
		</template>
		<template #trailingContent>
			<n8n-button
				type="success"
				@click="onConfirmEmailClick"
				icon="envelope"
				size="small"
				data-test-id="confirm-email-button"
			>
				{{ locale.baseText('banners.confirmEmail.button') }}
			</n8n-button>
		</template>
	</base-banner>
</template>
