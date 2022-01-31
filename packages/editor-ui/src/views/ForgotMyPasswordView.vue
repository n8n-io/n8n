<template>
	<AuthView
		:form="formConfig"
		:formLoading="loading"
		@submit="onSubmit"
	/>
</template>

<script lang="ts">
import AuthView from './AuthView.vue';
import { showMessage } from '@/components/mixins/showMessage';

import mixins from 'vue-typed-mixins';
import { IFormBoxConfig } from '@/Interface';
import { mapGetters } from 'vuex';

const EMAIL_INPUTS: IFormBoxConfig['inputs'] = [
	{
		name: 'email',
		properties: {
			label: 'Email',
			type: 'email',
			required: true,
			validationRules: [{name: 'VALID_EMAIL'}],
			autocomplete: 'email',
		},
	},
];

const NO_SMTP_INPUTS: IFormBoxConfig['inputs'] = [
	{
		name: 'no-smtp-warning',
		properties: {
			label: 'Please contact your admin. n8n isn’t set up to send email right now.',
			type: 'text',
		},
	},
];

const DEFAULT_FORM_CONFIG = {
	title: 'Recover password',
	redirectText: 'Back to sign in',
	redirectLink: '/signin',
};

export default mixins(
	showMessage,
).extend({
	name: 'ForgotMyPasswordView',
	components: {
		AuthView,
	},
	data() {
		return {
			loading: false,
		};
	},
	computed: {
		...mapGetters('settings', ['isSmtpSetup']),
		formConfig(): IFormBoxConfig {
			if (this.isSmtpSetup) {
				return {
					...DEFAULT_FORM_CONFIG,
					buttonText: 'Email me a recovery link',
					inputs: EMAIL_INPUTS,
				};
			}
			return {
				...DEFAULT_FORM_CONFIG,
				inputs: NO_SMTP_INPUTS,
			};
		},
	},
	methods: {
		async onSubmit(values: {[key: string]: string}) {
			try {
				this.loading = true;
				await this.$store.dispatch('users/sendForgotPasswordEmail', values);

				this.$showMessage({
					type: 'success',
					title: 'Recovery email sent',
					message: 'Please check your inbox (and perhaps your spam folder)',
				});
			} catch (error) {
				this.$showError(error, 'Problem sending email', 'There was a problem while trying to send the email:');
			}
			this.loading = false;
		},
	},
});
</script>
