<template>
	<AuthView
		v-if="config"
		:form="config"
		:form-loading="loading"
		@submit="onSubmit"
		@update="onInput"
	/>
</template>

<script lang="ts">
import AuthView from '@/views/AuthView.vue';
import { useToast } from '@/composables/useToast';

import { defineComponent } from 'vue';
import type { IFormBoxConfig } from '@/Interface';
import { MFA_AUTHENTICATION_TOKEN_INPUT_MAX_LENGTH, VIEWS } from '@/constants';
import { mapStores } from 'pinia';
import { useUsersStore } from '@/stores/users.store';

export default defineComponent({
	name: 'ChangePasswordView',
	components: {
		AuthView,
	},
	setup() {
		return {
			...useToast(),
		};
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

		const token = this.getResetToken();
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

			await this.usersStore.validatePasswordToken({ token });
		} catch (e) {
			this.showError(e, this.$locale.baseText('auth.changePassword.tokenValidationError'));
			void this.$router.replace({ name: VIEWS.SIGNIN });
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
		getResetToken() {
			return !this.$route.query.token || typeof this.$route.query.token !== 'string'
				? null
				: this.$route.query.token;
		},
		getMfaEnabled() {
			if (!this.$route.query.mfaEnabled) return null;
			return this.$route.query.mfaEnabled === 'true' ? true : false;
		},
		async onSubmit(values: { mfaToken: string }) {
			try {
				this.loading = true;
				const token = this.getResetToken();

				if (token) {
					const changePasswordParameters = {
						token,
						password: this.password,
						...(values.mfaToken && { mfaToken: values.mfaToken }),
					};

					await this.usersStore.changePassword(changePasswordParameters);

					this.showMessage({
						type: 'success',
						title: this.$locale.baseText('auth.changePassword.passwordUpdated'),
						message: this.$locale.baseText('auth.changePassword.passwordUpdatedMessage'),
					});

					await this.$router.push({ name: VIEWS.SIGNIN });
				} else {
					this.showError(
						new Error(this.$locale.baseText('auth.validation.missingParameters')),
						this.$locale.baseText('auth.changePassword.error'),
					);
				}
			} catch (error) {
				this.showError(error, this.$locale.baseText('auth.changePassword.error'));
			}
			this.loading = false;
		},
	},
});
</script>
