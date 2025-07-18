<script lang="ts" setup>
import AuthView from '@/views/AuthView.vue';
import { useToast } from '@/composables/useToast';

import { computed, onMounted, ref } from 'vue';
import type { IFormBoxConfig } from '@/Interface';
import { VIEWS } from '@/constants';
import { useUsersStore } from '@/stores/users.store';
import { useI18n } from '@n8n/i18n';
import { useRoute, useRouter } from 'vue-router';

const usersStore = useUsersStore();

const toast = useToast();
const i18n = useI18n();
const router = useRouter();
const route = useRoute();

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
				validationRules: [{ name: 'DEFAULT_PASSWORD_RULES' }],
				required: true,
				infoText: i18n.baseText('auth.defaultPasswordRequirements'),
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
const inviterId = ref<string | null>(null);
const inviteeId = ref<string | null>(null);

const inviteMessage = computed(() => {
	if (!inviter.value) {
		return '';
	}

	return i18n.baseText('settings.signup.signUpInviterInfo', {
		interpolate: { firstName: inviter.value.firstName, lastName: inviter.value.lastName },
	});
});

onMounted(async () => {
	const inviterIdParam = getQueryParameter('inviterId');
	const inviteeIdParam = getQueryParameter('inviteeId');
	try {
		if (!inviterIdParam || !inviteeIdParam) {
			throw new Error(i18n.baseText('auth.signup.missingTokenError'));
		}

		inviterId.value = inviterIdParam;
		inviteeId.value = inviteeIdParam;

		const invite = await usersStore.validateSignupToken({
			inviteeId: inviteeId.value,
			inviterId: inviterId.value,
		});
		inviter.value = invite.inviter as { firstName: string; lastName: string };
	} catch (e) {
		toast.showError(e, i18n.baseText('auth.signup.tokenValidationError'));
		void router.replace({ name: VIEWS.SIGNIN });
	}
});

async function onSubmit(values: { [key: string]: string | boolean }) {
	if (!inviterId.value || !inviteeId.value) {
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
			inviterId: inviterId.value,
			inviteeId: inviteeId.value,
		} as {
			inviteeId: string;
			inviterId: string;
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

function getQueryParameter(key: 'inviterId' | 'inviteeId'): string | null {
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
