<script setup lang="ts">
import { VIEWS } from '@/app/constants';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useSSOStore } from '@/features/settings/sso/sso.store';
import { useToast } from '@/app/composables/useToast';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { onMounted } from 'vue';

const usersStore = useUsersStore();
const ssoStore = useSSOStore();
const toast = useToast();
const router = useRouter();
const i18n = useI18n();

const logout = async () => {
	try {
		const oidcLogoutUrl = ssoStore.oidc.logoutUrl;

		// When an OIDC logout URL is configured, perform RP-initiated logout.
		// We don't gate on isDefaultAuthenticationOidc because the backend resets
		// userManagement.authenticationMethod to its native value on every
		// getSettings() call, so it can't be relied upon here. The presence of a
		// logoutUrl is sufficient and only set when the OIDC hook is active.
		// Skip the standard POST /logout because the backend OIDC logout route
		// (/auth/oidc/logout) already invalidates the session.
		await usersStore.logout({ skipApiCall: Boolean(oidcLogoutUrl) });

		if (oidcLogoutUrl) {
			window.location.href = oidcLogoutUrl;
			return;
		}

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
