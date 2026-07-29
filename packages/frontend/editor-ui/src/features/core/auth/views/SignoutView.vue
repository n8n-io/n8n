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
		// When OIDC is the active authentication method, sign out through the
		// OIDC logout endpoint so the provider session can be terminated too
		// (RP-Initiated Logout). The backend verifies that this specific
		// session was actually established through OIDC before returning a
		// redirect URL, so e.g. an email session of the instance owner is
		// unaffected. If the endpoint is unavailable (e.g. the license lapsed
		// since login), the store falls back to the standard logout.
		const viaOidc = ssoStore.isDefaultAuthenticationOidc;
		const { redirectUrl } = await usersStore.logout({ viaOidc });

		window.location.href = redirectUrl ?? router.resolve({ name: VIEWS.SIGNIN }).href;
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
