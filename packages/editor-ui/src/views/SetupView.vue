<template>
	<AuthView
		:form="FORM_CONFIG"
		:formLoading="loading"
		data-test-id="setup-form"
		@submit="onSubmit"
		@secondaryClick="showSkipConfirmation"
	>
		<div :class="$style.otp">
			<p :class="$style.otpLabel">Secret:</p>
			<p :class="$style.otp32">{{ otpSecretBase32 }}</p>
			<div :class="$style.otpQR">
				<img :src="otpSecretAuthURL" />
			</div>
		</div>
	</AuthView>
</template>

<script lang="ts">
import AuthView from './AuthView.vue';
import { showMessage } from '@/mixins/showMessage';

import mixins from 'vue-typed-mixins';
import QRCode from 'qrcode';
import type { IFormBoxConfig } from '@/Interface';
import { VIEWS } from '@/constants';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useSettingsStore } from '@/stores/settings';
import { useUsersStore } from '@/stores/users';
import { useCredentialsStore } from '@/stores/credentials';

export default mixins(showMessage).extend({
	name: 'SetupView',
	components: {
		AuthView,
	},
	async mounted() {
		const [{ credentials, workflows }, { base32, otpauth_url }] = await Promise.all([
			this.usersStore.preOwnerSetup(),
			this.usersStore.generateOTPSecret(),
		]);

		this.credentialsCount = credentials;
		this.workflowsCount = workflows;
		this.otpSecretBase32 = base32;
		QRCode.toDataURL(otpauth_url, (_err, dataUrl) => {
			this.otpSecretAuthURL = dataUrl;
		});
	},
	data() {
		const FORM_CONFIG: IFormBoxConfig = {
			title: this.$locale.baseText('auth.setup.setupOwner'),
			buttonText: this.$locale.baseText('auth.setup.next'),
			secondaryButtonText: this.$locale.baseText('auth.setup.skipSetupTemporarily'),
			inputs: [
				{
					name: 'email',
					properties: {
						label: this.$locale.baseText('auth.email'),
						type: 'email',
						required: true,
						validationRules: [{ name: 'VALID_EMAIL' }],
						autocomplete: 'email',
						capitalize: true,
					},
				},
				{
					name: 'firstName',
					properties: {
						label: this.$locale.baseText('auth.firstName'),
						maxlength: 32,
						required: true,
						autocomplete: 'given-name',
						capitalize: true,
					},
				},
				{
					name: 'lastName',
					properties: {
						label: this.$locale.baseText('auth.lastName'),
						maxlength: 32,
						required: true,
						autocomplete: 'family-name',
						capitalize: true,
					},
				},
				{
					name: 'password',
					properties: {
						label: this.$locale.baseText('auth.password'),
						type: 'password',
						required: true,
						validationRules: [{ name: 'DEFAULT_PASSWORD_RULES' }],
						infoText: this.$locale.baseText('auth.defaultPasswordRequirements'),
						autocomplete: 'new-password',
						capitalize: true,
					},
				},
				{
					name: 'otp',
					properties: {
						label: this.$locale.baseText('auth.otp'),
						maxlength: 32,
						required: true,
						capitalize: true,
					},
				},
				{
					name: 'agree',
					properties: {
						label: this.$locale.baseText('auth.agreement.label'),
						type: 'checkbox',
					},
				},
			],
		};

		return {
			FORM_CONFIG,
			loading: false,
			workflowsCount: 0,
			credentialsCount: 0,
			otpSecretBase32: '',
			otpSecretAuthURL: '',
		};
	},
	computed: {
		...mapStores(useCredentialsStore, useSettingsStore, useUIStore, useUsersStore),
	},
	methods: {
		async confirmSetupOrGoBack(): Promise<boolean> {
			if (this.workflowsCount === 0 && this.credentialsCount === 0) {
				return true;
			}

			const workflows =
				this.workflowsCount > 0
					? this.$locale.baseText('auth.setup.setupConfirmation.existingWorkflows', {
							adjustToNumber: this.workflowsCount,
					  })
					: '';

			const credentials =
				this.credentialsCount > 0
					? this.$locale.baseText('auth.setup.setupConfirmation.credentials', {
							adjustToNumber: this.credentialsCount,
					  })
					: '';

			const entities =
				workflows && credentials
					? this.$locale.baseText('auth.setup.setupConfirmation.concatEntities', {
							interpolate: { workflows, credentials },
					  })
					: workflows || credentials;
			return await this.confirmMessage(
				this.$locale.baseText('auth.setup.confirmOwnerSetupMessage', {
					interpolate: {
						entities,
					},
				}),
				this.$locale.baseText('auth.setup.confirmOwnerSetup'),
				null,
				this.$locale.baseText('auth.setup.createAccount'),
				this.$locale.baseText('auth.setup.goBack'),
			);
		},
		async onSubmit(values: { [key: string]: string | boolean }) {
			try {
				const confirmSetup = await this.confirmSetupOrGoBack();
				if (!confirmSetup) {
					return;
				}

				const forceRedirectedHere = this.settingsStore.showSetupPage;
				this.loading = true;

				const inputValues = {
					...values,
					otpSecret: this.otpSecretBase32,
				} as {
					firstName: string;
					lastName: string;
					email: string;
					password: string;
					otp: string;
					otpSecret: string;
				};

				await this.usersStore.createOwner(inputValues);

				if (values.agree === true) {
					try {
						await this.uiStore.submitContactEmail(values.email.toString(), values.agree);
					} catch {}
				}

				if (forceRedirectedHere) {
					await this.$router.push({ name: VIEWS.NEW_WORKFLOW });
				} else {
					await this.$router.push({ name: VIEWS.USERS_SETTINGS });
				}
			} catch (error) {
				this.$showError(error, this.$locale.baseText('auth.setup.settingUpOwnerError'));
			}
			this.loading = false;
		},
		async showSkipConfirmation() {
			const skip = await this.confirmMessage(
				this.$locale.baseText('auth.setup.ownerAccountBenefits'),
				this.$locale.baseText('auth.setup.skipOwnerSetupQuestion'),
				null,
				this.$locale.baseText('auth.setup.skipSetup'),
				this.$locale.baseText('auth.setup.goBack'),
			);
			if (skip) {
				this.onSkip();
			}
		},
		onSkip() {
			this.usersStore.skipOwnerSetup();
			this.$router.push({
				name: VIEWS.NEW_WORKFLOW,
			});
		},
	},
});
</script>

<style lang="scss" module>
.otp {
	margin-bottom: 10px;
}

.otpLabel {
	font-size: var(--font-size-s);
	font-weight: 600;
}

.otp32 {
	font-size: var(--font-size-xs);
	overflow-wrap: break-word;
}

.otpQR {
	text-align: center;
}
</style>
