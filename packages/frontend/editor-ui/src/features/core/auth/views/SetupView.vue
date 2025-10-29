<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

import { useToast } from '@/composables/useToast';
import { useI18n } from '@n8n/i18n';

import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useSSOStore } from '@/features/settings/sso/sso.store';

import type { IFormBoxConfig } from '@/Interface';
import { VIEWS } from '@/constants';

import AuthView from './AuthView.vue';

const settingsStore = useSettingsStore();
const usersStore = useUsersStore();
const ssoStore = useSSOStore();

const toast = useToast();
const locale = useI18n();
const router = useRouter();
const route = useRoute();

const loading = ref(false);

// Redirect to Azure AD login for owner setup (only if not already authenticated)
onMounted(async () => {
	// Check if user is already authenticated
	if (usersStore.currentUserId) {
		// User is logged in, redirect to home page
		await router.push({ name: VIEWS.HOMEPAGE });
		return;
	}

	if (ssoStore.isAzureAdLoginEnabled) {
		toast.showMessage({
			title: locale.baseText('auth.setup.azureAdRedirect.title'),
			message: locale.baseText('auth.setup.azureAdRedirect.message'),
			type: 'info',
		});
		const redirect = typeof route.query?.redirect === 'string' ? route.query.redirect : undefined;
		const loginUrl = ssoStore.getAzureAdLoginUrl(redirect);
		window.location.href = loginUrl;
	}
});
const formConfig: IFormBoxConfig = reactive({
	title: locale.baseText('auth.setup.setupOwner'),
	buttonText: locale.baseText('auth.setup.next'),
	inputs: [
		{
			name: 'email',
			properties: {
				label: locale.baseText('auth.email'),
				type: 'email',
				required: true,
				validationRules: [{ name: 'VALID_EMAIL' }],
				autocomplete: 'email',
				capitalize: true,
			},
		},
		{
			name: 'firstName',
			properties: {
				label: locale.baseText('auth.firstName'),
				maxlength: 32,
				required: true,
				autocomplete: 'given-name',
				capitalize: true,
			},
		},
		{
			name: 'lastName',
			properties: {
				label: locale.baseText('auth.lastName'),
				maxlength: 32,
				required: true,
				autocomplete: 'family-name',
				capitalize: true,
			},
		},
		{
			name: 'password',
			properties: {
				label: locale.baseText('auth.password'),
				type: 'password',
				required: true,
				validationRules: [{ name: 'DEFAULT_PASSWORD_RULES' }],
				infoText: locale.baseText('auth.defaultPasswordRequirements'),
				autocomplete: 'new-password',
				capitalize: true,
			},
		},
		{
			name: 'agree',
			properties: {
				label: locale.baseText('auth.agreement.label'),
				type: 'checkbox',
			},
		},
	],
});

const onSubmit = async (values: { [key: string]: string | boolean }) => {
	try {
		const forceRedirectedHere = settingsStore.showSetupPage;
		loading.value = true;
		await usersStore.createOwner(
			values as { firstName: string; lastName: string; email: string; password: string },
		);

		if (values.agree === true) {
			try {
				await usersStore.submitContactEmail(values.email.toString(), values.agree);
			} catch {}
		}
		if (forceRedirectedHere) {
			await router.push({ name: VIEWS.HOMEPAGE });
		} else {
			await router.push({ name: VIEWS.USERS_SETTINGS });
		}
	} catch (error) {
		toast.showError(error, locale.baseText('auth.setup.settingUpOwnerError'));
	}
	loading.value = false;
};
</script>

<template>
	<AuthView
		:form="formConfig"
		:form-loading="loading"
		data-test-id="setup-form"
		@submit="onSubmit"
	/>
</template>
