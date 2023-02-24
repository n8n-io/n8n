<template>
	<AuthView
		:form="FORM_CONFIG"
		:formLoading="loading"
		data-test-id="signin-form"
		@submit="onSubmit"
	/>
</template>

<script lang="ts">
import AuthView from './AuthView.vue';
import { showMessage } from '@/mixins/showMessage';
import { genericHelpers } from '@/mixins/genericHelpers';
import mixins from 'vue-typed-mixins';
import { IFormBoxConfig } from '@/Interface';
import { MFA_AUTHENTICATION_ENABLED, VIEWS } from '@/constants';
import { mapStores } from 'pinia';
import { useUsersStore } from '@/stores/users';
import { useSettingsStore } from '@/stores/settings';

export default mixins(showMessage, genericHelpers).extend({
	name: 'SigninView',
	components: {
		AuthView,
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
			redirectLink: '/forgot-password',
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
	},
	methods: {
		async onSubmit(values: { [key: string]: string }) {
			try {
				this.loading = true;
				await this.usersStore.loginWithCreds(values as { email: string; password: string });
				this.clearAllStickyNotifications();
				this.loading = false;

				this.$telemetry.track('User attempted to login', {
					result: 'success',
					mfaEnabled: false,
				});

				this.protectFromPhishing();

				this.$router.push({ name: VIEWS.HOMEPAGE });
			} catch (error) {
				if (error.errorCode === MFA_AUTHENTICATION_ENABLED) {
					this.$router.push({
						name: VIEWS.MFA,
						params: { email: values.email, password: values.password },
					});
					return;
				}

				this.$telemetry.track('User attempted to login', {
					result: 'credentials_error',
					mfaEnabled: false,
				});

				this.$showError(error, this.$locale.baseText('auth.signin.error'));
				this.loading = false;
			}
		},
	},
});
</script>
