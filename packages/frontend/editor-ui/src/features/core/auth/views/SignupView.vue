<script lang="ts" setup>
import AuthView from './AuthView.vue';
import { useToast } from '@/app/composables/useToast';

import { computed, onMounted, ref } from 'vue';
import type { IFormBoxConfig } from '@/Interface';
import { VIEWS } from '@/app/constants';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useI18n } from '@n8n/i18n';
import { createPasswordRules } from '@n8n/design-system';
import { useRoute, useRouter } from 'vue-router';

const usersStore = useUsersStore();
const settingsStore = useSettingsStore();

const toast = useToast();
const i18n = useI18n();
const router = useRouter();
const route = useRoute();
const passwordMinLength = settingsStore.userManagement.passwordMinLength ?? 8;

const FORM_CONFIG: IFormBoxConfig = {
	title: i18n.baseText('auth.signup.setupYourAccount'),
	buttonText: i18n.baseText('auth.signup.finishAccountSetup'),
	inputs: [
		{
			name: 'firstName',
			properties: {
				label: i18n.baseText('auth.firstName'),
				maxlength: 32,
				required: true,
				autocomplete: 'given-name',
				capitalize: true,
				focusInitially: true,
			},
		},
		{
			name: 'lastName',
			properties: {
				label: i18n.baseText('auth.lastName'),
				maxlength: 32,
				required: true,
				autocomplete: 'family-name',
				capitalize: true,
			},
		},
		{
			name: 'password',
			properties: {
				label: i18n.baseText('auth.password'),
				type: 'password',
				validationRules: [createPasswordRules(passwordMinLength)],
				required: true,
				infoText: i18n.baseText('auth.defaultPasswordRequirements', {
					interpolate: { minimum: passwordMinLength },
				}),
				autocomplete: 'new-password',
				capitalize: true,
			},
		},
		{
			name: 'agree',
			properties: {
				label: i18n.baseText('auth.agreement.label'),
				type: 'checkbox',
			},
		},
	],
};

const loading = ref(false);
const inviter = ref<null | { firstName: string; lastName: string }>(null);
const token = ref<string | undefined>(undefined);

const inviteMessage = computed(() => {
	if (!inviter.value) {
		return '';
	}

	return i18n.baseText('settings.signup.signUpInviterInfo', {
		interpolate: { firstName: inviter.value.firstName, lastName: inviter.value.lastName },
	});
});

onMounted(async () => {
	const tokenParam = getQueryParameter('token');

	try {
		if (!tokenParam) {
			throw new Error(i18n.baseText('auth.signup.missingTokenError'));
		}

		token.value = tokenParam;

		const invite = await usersStore.validateSignupToken({
			token: token.value,
		});
		inviter.value = invite.inviter as { firstName: string; lastName: string };
	} catch (e) {
		toast.showError(e, i18n.baseText('auth.signup.tokenValidationError'));
		void router.replace({ name: VIEWS.SIGNIN });
	}
});

async function onSubmit(values: { [key: string]: string | boolean }) {
	if (!token.value) {
		toast.showError(
			new Error(i18n.baseText('auth.signup.tokenValidationError')),
			i18n.baseText('auth.signup.setupYourAccountError'),
		);
		return;
	}

	try {
		loading.value = true;
		await usersStore.acceptInvitation({
			...values,
			token: token.value,
		} as {
			token: string;
			firstName: string;
			lastName: string;
			password: string;
		});

		if (values.agree === true) {
			try {
				await usersStore.submitContactEmail(values.email.toString(), values.agree);
			} catch {}
		}

		await router.push({ name: VIEWS.HOMEPAGE });
	} catch (error) {
		toast.showError(error, i18n.baseText('auth.signup.setupYourAccountError'));
	}
	loading.value = false;
}

function getQueryParameter(key: 'token'): string | null {
	return !route.query[key] || typeof route.query[key] !== 'string' ? null : route.query[key];
}
</script>

<template>
	<AuthView
		:form="FORM_CONFIG"
		:form-loading="loading"
		:subtitle="inviteMessage"
		@submit="onSubmit"
	/>
</template>
