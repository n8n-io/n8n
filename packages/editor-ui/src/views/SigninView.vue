<template>
	<div>
		<AuthView
			v-if="!showMfaView"
			:form="FORM_CONFIG"
			:formLoading="loading"
			:with-sso="true"
			data-test-id="signin-form"
			@submit="onSubmit"
		/>
		<MfaView v-if="showMfaView" @submit="onSubmit" @onBackClick="onBackClick" formError="" />
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import AuthView from './AuthView.vue';
import MfaView from './MfaView.vue';
import { useToast } from '@/composables';
import type { IFormBoxConfig } from '@/Interface';
import { MFA_AUTHENTICATION_REQUIRED_ERROR_CODE, VIEWS } from '@/constants';
import { mapStores } from 'pinia';
import { useUsersStore } from '@/stores/users.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useCloudPlanStore, useUIStore } from '@/stores';
import { genericHelpers } from '@/mixins/genericHelpers';

export default defineComponent({
	name: 'SigninView',
	mixins: [genericHelpers],
	components: {
		AuthView,
		MfaView,
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
			showMfaView: false,
			email: '',
			password: '',
		};
	},
	computed: {
		...mapStores(useUsersStore, useSettingsStore, useUIStore, useCloudPlanStore),
		userHasMfaEnabled() {
			return !!this.usersStore.currentUser?.mfaEnabled;
		},
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
		async onSubmit(form: {
			email: string;
			password: string;
			token?: string;
			recoveryCode?: string;
		}) {
			try {
				this.loading = true;
				await this.usersStore.loginWithCreds({
					email: form.email ?? this.email,
					password: form.password ?? this.password,
					mfaToken: form.token,
					mfaRecoveryCode: form.recoveryCode,
				});
				this.loading = false;
				await this.cloudPlanStore.checkForCloudPlanData();
				await this.uiStore.initBanners();
				this.clearAllStickyNotifications();

				if (this.usersStore.currentUser) {
					const { hasRecoveryCodesLeft, mfaEnabled } = this.usersStore.currentUser;

					if (mfaEnabled && !hasRecoveryCodesLeft) {
						this.showToast({
							title: this.$locale.baseText('settings.mfa.toast.noRecoveryCodeLeft.title'),
							message: this.$locale.baseText('settings.mfa.toast.noRecoveryCodeLeft.message'),
							type: 'info',
							duration: 0,
							dangerouslyUseHTMLString: true,
						});
					}
				}

				this.$telemetry.track('User attempted to login', {
					result: 'success',
					withMfa: this.userHasMfaEnabled,
				});

				this.clearCredentials();

				if (this.isRedirectSafe()) {
					const redirect = this.getRedirectQueryParameter();
					void this.$router.push(redirect);
					return;
				}

				await this.$router.push({ name: VIEWS.HOMEPAGE });
			} catch (error) {
				if (error.errorCode === MFA_AUTHENTICATION_REQUIRED_ERROR_CODE) {
					this.showMfaView = true;
					this.loading = false;
					this.cacheCredentials(form);
					return;
				}

				// this.formError = !this.showRecoveryCodeForm
				// 	? this.$locale.baseText('mfa.code.invalid')
				// 	: this.$locale.baseText('mfa.recovery.invalid');

				this.$telemetry.track('User attempted to login', {
					result: 'credentials_error',
					withMfa: this.userHasMfaEnabled,
				});

				this.showError(error, this.$locale.baseText('auth.signin.error'));
				this.loading = false;
			}
		},
		onBackClick() {
			this.showMfaView = false;
		},
		clearCredentials() {
			this.email = '';
			this.password = '';
		},
		cacheCredentials(form: { email: string; password: string }) {
			this.email = form.email;
			this.password = form.password;
		},
	},
});
</script>
