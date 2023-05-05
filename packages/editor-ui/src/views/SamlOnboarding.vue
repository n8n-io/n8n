<script lang="ts" setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router/composables';
import { Notification } from 'element-ui';
import type { IFormBoxConfig } from 'n8n-design-system';
import AuthView from '@/views/AuthView.vue';
import { i18n as locale } from '@/plugins/i18n';
import { useSSOStore } from '@/stores/sso';
import { VIEWS } from '@/constants';

const router = useRouter();
const ssoStore = useSSOStore();

const loading = ref(false);
const FORM_CONFIG: IFormBoxConfig = reactive({
	title: locale.baseText('auth.signup.setupYourAccount'),
	buttonText: locale.baseText('auth.signup.finishAccountSetup'),
	inputs: [
		{
			name: 'firstName',
			initialValue: ssoStore.userData?.firstName,
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
			initialValue: ssoStore.userData?.lastName,
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
const onSubmit = async (values: { firstName: string; lastName: string }) => {
	try {
		loading.value = true;
		await ssoStore.updateUser(values);
		await router.push({ name: VIEWS.HOMEPAGE });
	} catch (error) {
		loading.value = false;
		Notification.error({
			title: 'Error',
			message: error.message,
			position: 'bottom-right',
		});
	}
};
</script>

<template>
	<AuthView :form="FORM_CONFIG" :formLoading="loading" @submit="onSubmit" />
</template>
