<script lang="ts" setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { IFormBoxConfig } from '@n8n/design-system';
import AuthView from '@/features/core/auth/views/AuthView.vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useUsersStore } from '@n8n/stores/users.store';
import { useExperienceMode } from '@/features/ai/instanceAi/experience/useExperienceMode';
import { postSignInRoute } from '@/features/ai/instanceAi/experience/postSignInRoute';

const router = useRouter();
const locale = useI18n();
const toast = useToast();

const usersStore = useUsersStore();
const { isEnabled: isExperienceEnabled } = useExperienceMode();

const loading = ref(false);
const FORM_CONFIG: IFormBoxConfig = reactive({
	title: locale.baseText('auth.signup.setupYourAccount'),
	buttonText: locale.baseText('auth.signup.finishAccountSetup'),
	inputs: [
		{
			name: 'firstName',
			initialValue: usersStore.currentUser?.firstName,
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
			initialValue: usersStore.currentUser?.lastName,
			properties: {
				label: locale.baseText('auth.lastName'),
				maxlength: 32,
				required: true,
				autocomplete: 'family-name',
				capitalize: true,
			},
		},
	],
});

const isFormWithFirstAndLastName = (values: {
	[key: string]: string;
}): values is { firstName: string; lastName: string } => {
	return 'firstName' in values && 'lastName' in values;
};

const onSubmit = async (values: { [key: string]: string }) => {
	if (!isFormWithFirstAndLastName(values)) return;
	try {
		loading.value = true;
		await usersStore.updateUserName(values);
		// The first SAML sign-in ends here, so it lands where every other sign-in lands.
		await router.push(postSignInRoute({ experienceEnabled: isExperienceEnabled.value }));
	} catch (error) {
		loading.value = false;
		toast.showError(error, 'Error', { message: error.message });
	}
};
</script>

<template>
	<AuthView :form="FORM_CONFIG" :form-loading="loading" @submit="onSubmit" />
</template>
