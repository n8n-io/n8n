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
import AuthView from './AuthView.vue';
import { showMessage } from '@/mixins/showMessage';

import mixins from 'vue-typed-mixins';
import { IFormBoxConfig } from '@/Interface';
import { VIEWS } from '@/constants';
import { mapStores } from 'pinia';
import { useUsersStore } from '@/stores/users';
import { useSettingsStore } from '@/stores/settings';

export default mixins(showMessage).extend({
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

		if (!this.settingsStore.isDesktopDeployment || this.settingsStore.isUserManagementEnabled) {
			this.FORM_CONFIG.redirectLink = '/forgot-password';
		}
	},
	methods: {
		async onSubmit(values: { [key: string]: string }) {
			try {
				this.loading = true;
				await this.usersStore.loginWithCreds(values as { email: string; password: string });
				this.clearAllStickyNotifications();
				this.loading = false;

				if (typeof this.$route.query.redirect === 'string') {
					const redirect = decodeURIComponent(this.$route.query.redirect);
					if (redirect.startsWith('/')) {
						// protect against phishing
						this.$router.push(redirect);

						return;
					}
				}

				this.$router.push({ name: VIEWS.HOMEPAGE });
			} catch (error) {
				this.$showError(error, this.$locale.baseText('auth.signin.error'));
				this.loading = false;
			}
		},
	},
});
</script>
