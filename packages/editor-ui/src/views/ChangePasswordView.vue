<template>
	<AuthView
		v-if="config"
		:form="config"
		:formLoading="loading"
		@submit="onSubmit"
		@input="onInput"
	/>
</template>

<script lang="ts">
import AuthView from './AuthView.vue';
import { showMessage } from '@/components/mixins/showMessage';

import mixins from 'vue-typed-mixins';
import { IFormBoxConfig } from '@/Interface';

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
			config: null as null | IFormBoxConfig,
		};
	},
	async mounted() {
		this.config = {
			title: 'Change Password',
			buttonText: 'Change Password',
			redirectText: 'Sign in',
			redirectLink: '/signin',
			inputs: [[
				{
					name: 'password',
					properties: {
						label: 'New password',
						type: 'password',
						required: true,
						validationRules: [{name: 'DEFAULT_PASSWORD_RULES'}],
						infoText: 'At least 8 characters with 1 number and 1 uppercase',
						autocomplete: 'new-password',
					},
				},
				{
					name: 'password2',
					properties: {
						label: 'Re-enter new password',
						type: 'password',
						required: true,
						validators: {
							TWO_PASSWORDS_MATCH: {
								validate: this.passwordsMatch,
							},
						},
						validationRules: [{name: 'TWO_PASSWORDS_MATCH'}],
						autocomplete: 'new-password',
					},
				},
			]],
		};

		const token = this.$route.query.token;
		const userId = this.$route.query.userId;
		try {
			if (!token) {
				throw new Error('Missing token');
			}
			if (!userId) {
				throw new Error('Missing userId');
			}

			await this.$store.dispatch('users/validatePasswordToken', {token, userId});
		} catch (e) {
			this.$showError(e, 'Issue validating token');
		}
	},
	methods: {
		passwordsMatch(value: string) {
			if (value !== this.password) {
				throw new Error('Two passwords must match');
			}
		},
		onInput(e: {name: string, value: string}) {
			if (e.name === 'password') {
				this.password = e.value;
			}
		},
		async onSubmit() {
			try {
				this.loading = true;
				const token = this.$route.query.token;
				const userId = this.$route.query.userId;
				await this.$store.dispatch('users/changePassword', {token, userId, password: this.password});

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
