<template>
	<AuthView
		:form="FORM_CONFIG"
		:formLoading="loading"
		@submit="onSubmit"
	/>
</template>

<script lang="ts">
import AuthView from './AuthView.vue';
import { showMessage } from '@/components/mixins/showMessage';

import mixins from 'vue-typed-mixins';
import { IFormBoxConfig } from '@/Interface';

const FORM_CONFIG: IFormBoxConfig = {
	title: 'Recover password',
	buttonText: 'Email me a recovery link',
	redirectText: 'Sign in',
	redirectLink: '/signin',
	inputs: [[
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
	]],
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
			FORM_CONFIG,
			loading: false,
		};
	},
	methods: {
		async onSubmit(values: {[key: string]: string}) {
			try {
				this.loading = true;
				await this.$store.dispatch('users/sendForgotPasswordEmail', values);

				this.$showMessage({
					type: 'success',
					title: 'Recovery email sent',
					message: 'Please click the link when you receive the email',
				});
			} catch (error) {
				this.$showError(error, 'Problem sending email', 'There was a problem while trying to send the email:');
			}
			this.loading = false;
		},
	},
});
</script>
