<script lang="ts" setup>
import { reactive, ref } from 'vue';
import { IFormBoxConfig } from 'n8n-design-system';
import AuthView from '@/views/AuthView.vue';
import { i18n as locale } from '@/plugins/i18n';
import { useSSOStore } from '@/stores/sso';

const ssoStore = useSSOStore();

const loading = ref(false);
const FORM_CONFIG: IFormBoxConfig = reactive({
	title: locale.baseText('auth.signup.setupYourAccount'),
	buttonText: locale.baseText('auth.signup.finishAccountSetup'),
	inputs: [
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
	],
});
const onSubmit = (values: { firstName: string; lastName: string }) => {
	ssoStore.updateUser(values);
};
</script>

<template>
	<AuthView :form="FORM_CONFIG" :formLoading="loading" @submit="onSubmit" />
</template>
