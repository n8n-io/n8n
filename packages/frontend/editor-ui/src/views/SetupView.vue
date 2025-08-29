<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useToast } from '@/composables/useToast';
import { useI18n } from '@n8n/i18n';

import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';

import type { IFormBoxConfig } from '@/Interface';
import { VIEWS } from '@/constants';

import AuthView from '@/views/AuthView.vue';

const settingsStore = useSettingsStore();
const usersStore = useUsersStore();

const toast = useToast();
const locale = useI18n();
const router = useRouter();

const loading = ref(false);
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
