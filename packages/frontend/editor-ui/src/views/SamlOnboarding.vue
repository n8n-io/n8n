<script lang="ts" setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { IFormBoxConfig } from '@n8n/design-system';
import AuthView from '@/views/AuthView.vue';
import { VIEWS } from '@/constants';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import { useUsersStore } from '@/stores/users.store';

const router = useRouter();
const locale = useI18n();
const toast = useToast();

const usersStore = useUsersStore();

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
		await router.push({ name: VIEWS.HOMEPAGE });
	} catch (error) {
		loading.value = false;
		toast.showError(error, 'Error', error.message);
	}
};
</script>

<template>
	<AuthView :form="FORM_CONFIG" :form-loading="loading" @submit="onSubmit" />
</template>
