<template>
	<AuthView
		:form="config"
		:formLoading="loading"
		@submit="onSetup"
		@input="onInput"
	/>
</template>

<script lang="ts">
import AuthView from './AuthView.vue';
import { showMessage } from '@/components/mixins/showMessage';

import mixins from 'vue-typed-mixins';

const FORM_CONFIG = {
	title: 'Change Password',
	buttonText: 'Change Password',
	redirectText: 'Sign in',
	redirectLink: '/login',
	inputs: [
		{
			name: 'password',
			placeholder: 'New password',
			type: 'password',
			required: true,
			validationRules: [{name: 'DEFAULT_PASSWORD_RULES'}],
		},
		{
			name: 'password2',
			placeholder: 'Re-enter new password',
			type: 'password',
			required: true,
			validators: {},
			validationRules: [{name: 'TWO_PASSWORDS_MATCH'}],
		},
	],
};

export default mixins(
	showMessage,
).extend({
	name: 'ChangePasswordView',
	components: {
		AuthView,
	},
	data() {
		return {
			password: '',
			loading: false,
			config: {
				...FORM_CONFIG,
			},
		};
	},
	mounted() {
		this.config.inputs[1].validators = {
			TWO_PASSWORDS_MATCH: {
				isValid: this.passwordsMatch,
				defaultError: 'Two passwords must match',
			},
		};
	},
	methods: {
		passwordsMatch(value: string) {
			return value === this.password;
		},
		onInput(e: {name: string, value: string}) {
			if (e.name === 'password') {
				this.password = e.value;
			}
		},
		async onSetup(values: {[key: string]: string}) {
			try {
				this.loading = true;
				await this.$store.dispatch('users/changePassword', values);

				this.$showMessage({
					type: 'success',
					title: 'Password reset successfully',
					message: 'You can now sign in with your new password',
				});

				await this.$router.push({ name: 'SigninView' });
			} catch (error) {
				this.$showError(error, 'Problem changing the password', 'There was a problem while trying to change the password:');
			}
			this.loading = false;
		},
	},
});
</script>
