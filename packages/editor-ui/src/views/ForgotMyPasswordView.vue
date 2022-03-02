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
			const EMAIL_INPUTS: IFormBoxConfig['inputs'] = [
				{
					name: 'email',
					properties: {
						label: this.$locale.baseText('EMAIL'),
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
						label: this.$locale.baseText('NO_SMTP_TO_SEND_EMAIL_WARNING'),
						type: 'text',
					},
				},
			];

			const DEFAULT_FORM_CONFIG = {
				title: this.$locale.baseText('RECOVER_PASSWORD'),
				redirectText: this.$locale.baseText('RETURN_TO_SIGN_IN'),
				redirectLink: '/signin',
			};

			if (this.isSmtpSetup) {
				return {
					...DEFAULT_FORM_CONFIG,
					buttonText: this.$locale.baseText('GET_RECOVERY_LINK'),
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
					title: this.$locale.baseText('RECOVERY_EMAIL_SENT'),
					message: this.$locale.baseText('CHECK_INBOX_AND_SPAM'),
				});
			} catch (error) {
				this.$showError(error, this.$locale.baseText('SENDING_EMAIL_ERROR'));
			}
			this.loading = false;
		},
	},
});
</script>
