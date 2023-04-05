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
import { showMessage } from '@/mixins/showMessage';

import mixins from 'vue-typed-mixins';
import { IFormBoxConfig } from '@/Interface';
import { MFA_AUTHENTICATION_TOKEN_INPUT_MAX_LENGTH, VIEWS } from '@/constants';
import { mapStores } from 'pinia';
import { useUsersStore } from '@/stores/users';

export default mixins(showMessage).extend({
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
	computed: {
		...mapStores(useUsersStore),
	},
	async mounted() {
		const form: IFormBoxConfig = {
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
						validationRules: [{ name: 'DEFAULT_PASSWORD_RULES' }],
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
						validationRules: [{ name: 'TWO_PASSWORDS_MATCH' }],
						autocomplete: 'new-password',
						capitalize: true,
					},
				},
			],
		};

		const token = this.getToken();
		const userId = this.getUserId();
		const mfaEnabled = this.getMfaEnabled();

		if (mfaEnabled) {
			form.inputs.push({
				name: 'mfaToken',
				initialValue: '',
				properties: {
					required: true,
					label: this.$locale.baseText('mfa.code.input.label'),
					placeholder: this.$locale.baseText('mfa.code.input.placeholder'),
					maxlength: MFA_AUTHENTICATION_TOKEN_INPUT_MAX_LENGTH,
					capitalize: true,
					validateOnBlur: true,
				},
			});
		}

		this.config = form;

		try {
			if (!token) {
				throw new Error(this.$locale.baseText('auth.changePassword.missingTokenError'));
			}
			if (!userId) {
				throw new Error(this.$locale.baseText('auth.changePassword.missingUserIdError'));
			}

			await this.usersStore.validatePasswordToken({ token, userId });
		} catch (e) {
			this.$showMessage({
				title: this.$locale.baseText('auth.changePassword.tokenValidationError'),
				type: 'error',
			});
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
		onInput(e: { name: string; value: string }) {
			if (e.name === 'password') {
				this.password = e.value;
			}
		},
		getToken() {
			return !this.$route.query.token || typeof this.$route.query.token !== 'string'
				? null
				: this.$route.query.token;
		},
		getUserId() {
			return !this.$route.query.userId || typeof this.$route.query.userId !== 'string'
				? null
				: this.$route.query.userId;
		},
		getMfaEnabled() {
			return !this.$route.query.mfaEnabled || typeof this.$route.query.userId !== 'string'
				? null
				: !!this.$route.query.mfaEnabled;
		},
		async onSubmit(values: { mfaToken: string }) {
			try {
				this.loading = true;
				const token = this.getToken();
				const userId = this.getUserId();

				if (token && userId) {
					const changePasswordParameters = {
						token,
						userId,
						password: this.password,
						...(values.mfaToken && { mfaToken: values.mfaToken }),
					};

					await this.usersStore.changePassword(changePasswordParameters);

					this.$showMessage({
						type: 'success',
						title: this.$locale.baseText('auth.changePassword.passwordUpdated'),
						message: this.$locale.baseText('auth.changePassword.passwordUpdatedMessage'),
					});

					await this.$router.push({ name: VIEWS.SIGNIN });
				} else {
					this.$showError(
						new Error(this.$locale.baseText('auth.validation.missingParameters')),
						this.$locale.baseText('auth.changePassword.error'),
					);
				}
			} catch (error) {
				this.$showError(error, this.$locale.baseText('auth.changePassword.error'));
			}
			this.loading = false;
		},
	},
});
</script>
