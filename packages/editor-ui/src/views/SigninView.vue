<template>
	<div>
		<AuthView
			v-if="!showMfaView"
			:form="FORM_CONFIG"
			:form-loading="loading"
			:with-sso="true"
			data-test-id="signin-form"
			@submit="onEmailPasswordSubmitted"
		/>
		<MfaView
			v-if="showMfaView"
			:report-error="reportError"
			@submit="onMFASubmitted"
			@onBackClick="onBackClick"
			@onFormChanged="onFormChanged"
		/>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import AuthView from './AuthView.vue';
import MfaView, { FORM } from './MfaView.vue';
import { useToast } from '@/composables/useToast';
import type { IFormBoxConfig } from '@/Interface';
import { MFA_AUTHENTICATION_REQUIRED_ERROR_CODE, VIEWS } from '@/constants';
import { mapStores } from 'pinia';
import { useUsersStore } from '@/stores/users.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { useUIStore } from '@/stores/ui.store';

export default defineComponent({
	name: 'SigninView',
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
			reportError: false,
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
		async onMFASubmitted(form: { token?: string; recoveryCode?: string }) {
			await this.login({
				email: this.email,
				password: this.password,
				token: form.token,
				recoveryCode: form.recoveryCode,
			});
		},
		async onEmailPasswordSubmitted(form: { email: string; password: string }) {
			await this.login(form);
		},
		isRedirectSafe() {
			const redirect = this.getRedirectQueryParameter();
			return redirect.startsWith('/') || redirect.startsWith(window.location.origin);
		},
		getRedirectQueryParameter() {
			let redirect = '';
			if (typeof this.$route.query?.redirect === 'string') {
				redirect = decodeURIComponent(this.$route.query?.redirect);
			}
			return redirect;
		},
		async login(form: { email: string; password: string; token?: string; recoveryCode?: string }) {
			try {
				this.loading = true;
				await this.usersStore.loginWithCreds({
					email: form.email,
					password: form.password,
					mfaToken: form.token,
					mfaRecoveryCode: form.recoveryCode,
				});
				this.loading = false;
				if (this.settingsStore.isCloudDeployment) {
					try {
						await this.cloudPlanStore.checkForCloudPlanData();
					} catch (error) {
						console.warn('Failed to check for cloud plan data', error);
					}
				}
				await this.settingsStore.getSettings();
				this.clearAllStickyNotifications();
				this.checkRecoveryCodesLeft();

				this.$telemetry.track('User attempted to login', {
					result: this.showMfaView ? 'mfa_success' : 'success',
				});

				if (this.isRedirectSafe()) {
					const redirect = this.getRedirectQueryParameter();
					if (redirect.startsWith('http')) {
						window.location.href = redirect;
						return;
					}

					void this.$router.push(redirect);
					return;
				}

				await this.$router.push({ name: VIEWS.HOMEPAGE });
			} catch (error) {
				if (error.errorCode === MFA_AUTHENTICATION_REQUIRED_ERROR_CODE) {
					this.showMfaView = true;
					this.cacheCredentials(form);
					return;
				}

				this.$telemetry.track('User attempted to login', {
					result: this.showMfaView ? 'mfa_token_rejected' : 'credentials_error',
				});

				if (!this.showMfaView) {
					this.showError(error, this.$locale.baseText('auth.signin.error'));
					this.loading = false;
					return;
				}

				this.reportError = true;
			}
		},
		onBackClick(fromForm: string) {
			this.reportError = false;
			if (fromForm === FORM.MFA_TOKEN) {
				this.showMfaView = false;
				this.loading = false;
			}
		},
		onFormChanged(toForm: string) {
			if (toForm === FORM.MFA_RECOVERY_CODE) {
				this.reportError = false;
			}
		},
		cacheCredentials(form: { email: string; password: string }) {
			this.email = form.email;
			this.password = form.password;
		},
		checkRecoveryCodesLeft() {
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
		},
	},
});
</script>
