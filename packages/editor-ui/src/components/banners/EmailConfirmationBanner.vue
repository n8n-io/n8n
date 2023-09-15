<script lang="ts" setup>
import BaseBanner from '@/components/banners/BaseBanner.vue';
import { i18n as locale } from '@/plugins/i18n';
import { useUsersStore } from '@/stores/users.store';
import { computed } from 'vue';

const userEmail = computed(() => {
	const { currentUser } = useUsersStore();
	return currentUser?.email ?? '';
});
</script>

<template>
	<base-banner name="EMAIL_CONFIRMATION" theme="warning">
		<template #mainContent>
			<span>
				{{ locale.baseText('banners.confirmEmail.message.1') }}
				<router-link to="/settings/personal">
					{{
						locale.baseText('banners.confirmEmail.message.2', { interpolate: { email: userEmail } })
					}}
				</router-link>
				{{ locale.baseText('banners.confirmEmail.message.3') }}
			</span>
		</template>
	</base-banner>
</template>
