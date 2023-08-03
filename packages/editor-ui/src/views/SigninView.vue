<template>
	<AuthView
		:form="FORM_CONFIG"
		:formLoading="loading"
		:with-sso="true"
		data-test-id="signin-form"
		@submit="onSubmit"
	/>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import AuthView from './AuthView.vue';
import { useToast } from '@/composables';
import type { IFormBoxConfig } from '@/Interface';
import { MFA_AUTHENTICATION_REQUIRED_ERROR_CODE, VIEWS } from '@/constants';
import { mapStores } from 'pinia';
import { useUsersStore } from '@/stores/users.store';
import { useSettingsStore } from '@/stores/settings.store';
import { genericHelpers } from '@/mixins/genericHelpers';

export default defineComponent({
	name: 'SigninView',
	mixins: [genericHelpers],
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
			FORM_CONFIG: {} as IFormBoxConfig,
			loading: false,
		};
	},
	computed: {
		...mapStores(useUsersStore, useSettingsStore),
	},
	mounted() {
		let emailLabel = this.$locale.baseText('auth.email');
		const ldapLoginLabel = this.settingsStore.ldapLoginLabel;
		const isLdapLoginEnabled = this.settingsStore.isLdapLoginEnabled;
		if (isLdapLoginEnabled && ldapLoginLabel) {
			emailLabel = ldapLoginLabel;
		}
		this.FORM_CONFIG = {
			title: this.$locale.baseText('auth.signin'),
			buttonText: this.$locale.baseText('auth.signin'),
			redirectText: this.$locale.baseText('forgotPassword'),
			inputs: [
				{
					name: 'email',
					properties: {
						label: emailLabel,
						type: 'email',
						required: true,
						...(!isLdapLoginEnabled && { validationRules: [{ name: 'VALID_EMAIL' }] }),
						showRequiredAsterisk: false,
						validateOnBlur: false,
						autocomplete: 'email',
						capitalize: true,
					},
				},
				{
					name: 'password',
					properties: {
						label: this.$locale.baseText('auth.password'),
						type: 'password',
						required: true,
						showRequiredAsterisk: false,
						validateOnBlur: false,
						autocomplete: 'current-password',
						capitalize: true,
					},
				},
			],
		};

		if (!this.settingsStore.isDesktopDeployment) {
			this.FORM_CONFIG.redirectLink = '/forgot-password';
		}
	},
	methods: {
		async onSubmit(values: { [key: string]: string }) {
			console.log('VALUES');
			console.log(values);

			try {
				this.loading = true;
				await this.usersStore.loginWithCreds(values as { email: string; password: string });
				this.clearAllStickyNotifications();
				this.loading = false;

				this.$telemetry.track('User attempted to login', {
					result: 'success',
				});

				if (this.isRedirectSafe()) {
					const redirect = this.getRedirectQueryParameter();
					void this.$router.push(redirect);
					return;
				}

				await this.$router.push({ name: VIEWS.HOMEPAGE });
			} catch (error) {
				if (error.errorCode === MFA_AUTHENTICATION_REQUIRED_ERROR_CODE) {
					console.log('mamando');
					console.log({ email: values.email, password: values.password });
					void this.$router.push({
						name: VIEWS.MFA_VIEW,
						state: { email: values.email, password: values.password },
					});
					return;
				}

				this.$telemetry.track('User attempted to login', {
					result: 'credentials_error',
				});

				this.showError(error, this.$locale.baseText('auth.signin.error'));
				this.loading = false;
			}
		},
	},
});
</script>
