<script lang="ts" setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/constants';
import { useUsersStore } from '@/stores/users.store';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@/composables/useI18n';

const router = useRouter();
const usersStore = useUsersStore();
const toast = useToast();
const i18n = useI18n();

const logout = async () => {
	try {
		await usersStore.logout();
		window.location.href = router.resolve({ name: VIEWS.SIGNIN }).href;
	} catch (e) {
		toast.showError(e, i18n.baseText('auth.signout.error'));
	}
};

onMounted(() => {
	void logout();
});
</script>

<template>
	<div />
</template>
