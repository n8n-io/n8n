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
import { VIEWS } from '@/constants';

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
			title: this.$locale.baseText('auth.changePassword'),
			buttonText: this.$locale.baseText('auth.changePassword'),
			redirectText: this.$locale.baseText('auth.signin'),
			redirectLink: '/signin',
			inputs: [
				{
					name: 'password',
					properties: {
						label: this.$locale.baseText('auth.newPassword'),
						type: 'password',
						required: true,
						validationRules: [{name: 'DEFAULT_PASSWORD_RULES'}],
						infoText: this.$locale.baseText('auth.defaultPasswordRequirements'),
						autocomplete: 'new-password',
						capitalize: true,
					},
				},
				{
					name: 'password2',
					properties: {
						label: this.$locale.baseText('auth.changePassword.reenterNewPassword'),
						type: 'password',
						required: true,
						validators: {
							TWO_PASSWORDS_MATCH: {
								validate: this.passwordsMatch,
							},
						},
						validationRules: [{name: 'TWO_PASSWORDS_MATCH'}],
						autocomplete: 'new-password',
						capitalize: true,
					},
				},
			],
		};

		const token = this.$route.query.token;
		const userId = this.$route.query.userId;
		try {
			if (!token) {
				throw new Error(this.$locale.baseText('auth.changePassword.missingTokenError'));
			}
			if (!userId) {
				throw new Error(this.$locale.baseText('auth.changePassword.missingUserIdError'));
			}

			await this.$store.dispatch('users/validatePasswordToken', {token, userId});
		} catch (e) {
			this.$showMessage({title: this.$locale.baseText('auth.changePassword.tokenValidationError'), type: 'error'});
		}
	},
	methods: {
		passwordsMatch(value: string | number | boolean | null | undefined) {
			if (typeof value !== 'string') {
				return false;
			}

			if (value !== this.password) {
				return {
					messageKey: 'auth.changePassword.passwordsMustMatchError',
				};
			}

			return false;
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
					title: this.$locale.baseText('auth.changePassword.passwordUpdated'),
					message: this.$locale.baseText('auth.changePassword.passwordUpdatedMessage'),
				});

				await this.$router.push({ name: VIEWS.SIGNIN });
			} catch (error) {
				this.$showError(error, this.$locale.baseText('auth.changePassword.error'));
			}
			this.loading = false;
		},
	},
});
</script>
