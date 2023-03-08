<template>
	<div :class="$style.container">
		<div :class="$style.logoContainer">
			<Logo />
		</div>
		<n8n-card>
			<div :class="$style.headerContainer">
				<n8n-heading size="xlarge" color="text-dark">{{
					showRecoveryCodeForm
						? $locale.baseText('mfa.recovery.modal.title')
						: $locale.baseText('mfa.code.modal.title')
				}}</n8n-heading>
			</div>
			<div :class="[$style.formContainer, formError ? $style.formError : '']">
				<n8n-form-inputs
					data-test-id="mfa-login-form"
					v-if="formInputs"
					:inputs="formInputs"
					:eventBus="formBus"
					@input="onInput"
					@submit="onSubmit"
				/>
				<div :class="$style.infoBox">
					<n8n-text
						size="small"
						color="text-base"
						:bold="false"
						v-if="!showRecoveryCodeForm && !formError"
						>{{ $locale.baseText('mfa.code.input.info') }}
						<a
						data-test-id="mfa-enter-recovery-code-button"
						@click="onRecoveryCodeClick">{{
							$locale.baseText('mfa.code.input.info.action')
						}}</a></n8n-text
					>
					<n8n-text color="danger" v-if="formError" size="small"
						>{{ formError }}
						<a
							v-if="!showRecoveryCodeForm"
							@click="onRecoveryCodeClick"
							:class="$style.recoveryCodeLink"
						>
							{{ $locale.baseText('mfa.recovery.input.info.action') }}</a
						>
					</n8n-text>
				</div>
			</div>
			<div>
				<n8n-button
					float="right"
					:loading="verifyingMfaToken"
					:label="
						showRecoveryCodeForm
							? $locale.baseText('mfa.recovery.button.verify')
							: $locale.baseText('mfa.code.button.continue')
					"
					size="large"
					:disabled="!hasAnyChanges"
					@click="onSaveClick"
				/>
				<n8n-button
					float="left"
					:label="$locale.baseText('mfa.button.back')"
					size="large"
					type="tertiary"
					@click="onBackClick"
				/>
			</div>
		</n8n-card>
	</div>
</template>

<script lang="ts">
import AuthView from './AuthView.vue';
import { showMessage } from '@/mixins/showMessage';
import { genericHelpers } from '@/mixins/genericHelpers';
import Vue from 'vue';

import mixins from 'vue-typed-mixins';
import { IFormInputs } from '@/Interface';

import Logo from '../components/Logo.vue';
import { VIEWS } from '@/constants';
import { useUsersStore } from '@/stores/users';
import { mapStores } from 'pinia';

const TOKEN_INPUT_MAX_LENGTH = 6;
const RECOVERY_CODE_INPUT_MAX_LENGTH = 36;

export default mixins(showMessage, genericHelpers).extend({
	name: 'MfaView',
	components: {
		AuthView,
		Logo,
	},
	async mounted() {
		const { email, password } = this.$route.params;
		this.email = email;
		this.password = password;
		this.formInputs = [
			{
				name: 'token',
				initialValue: '',
				properties: {
					label: this.$locale.baseText('mfa.code.input.label'),
					placeholder: this.$locale.baseText('mfa.code.input.placeholder'),
					maxlength: TOKEN_INPUT_MAX_LENGTH,
					capitalize: true,
					validateOnBlur: false,
				},
			},
		];
	},
	data() {
		return {
			email: '',
			password: '',
			hasAnyChanges: false,
			formBus: new Vue(),
			formInputs: null as null | IFormInputs,
			showRecoveryCodeForm: false,
			formError: '',
			verifyingMfaToken: false,
		};
	},
	computed: {
		...mapStores(useUsersStore),
	},
	methods: {
		onRecoveryCodeClick() {
			this.formError = '';
			this.showRecoveryCodeForm = true;
			this.hasAnyChanges = false;
			this.formInputs = [
				{
					name: 'recoveryCode',
					initialValue: '',
					properties: {
						label: this.$locale.baseText('mfa.recovery.input.label'),
						placeholder: this.$locale.baseText('mfa.recovery.input.placeholder'),
						maxlength: RECOVERY_CODE_INPUT_MAX_LENGTH,
						capitalize: true,
						validateOnBlur: false,
					},
				},
			];
		},
		onBackClick() {
			if (!this.showRecoveryCodeForm) {
				this.$router.push({ name: VIEWS.SIGNIN });
				return;
			}

			this.showRecoveryCodeForm = false;
			this.hasAnyChanges = true;
			this.formInputs = [
				{
					name: 'token',
					initialValue: '',
					properties: {
						label: this.$locale.baseText('mfa.code.input.label'),
						placeholder: this.$locale.baseText('mfa.code.input.placeholder'),
						maxlength: TOKEN_INPUT_MAX_LENGTH,
						capitalize: true,
					},
				},
			];
		},
		onInput({ value, name }: { name: string; value: string }) {
			const isSubmittingMfaToken = name === 'token';
			const inputValidLength = isSubmittingMfaToken
				? TOKEN_INPUT_MAX_LENGTH
				: RECOVERY_CODE_INPUT_MAX_LENGTH;

			if (value.length !== inputValidLength) {
				this.hasAnyChanges = false;
				return;
			}

			this.verifyingMfaToken = true;
			this.hasAnyChanges = true;

			this.onSubmit({ token: value, recoveryCode: value })
				.catch(() => {})
				.finally(() => (this.verifyingMfaToken = false));
		},
		async onSubmit(form: { token: string; recoveryCode: string }) {
			try {
				await this.usersStore.loginWithCreds({
					email: this.email,
					password: this.password,
					mfaToken: form.token,
					mfaRecoveryCode: form.recoveryCode,
				});

				if (this.usersStore.currentUser) {
					const { hasRecoveryCodesLeft, mfaEnabled } = this.usersStore.currentUser;

					if (mfaEnabled && !hasRecoveryCodesLeft) {
						this.$showToast({
							title: this.$locale.baseText('settings.mfa.toast.noRecoveryCodeLeft.title'),
							message: this.$locale.baseText('settings.mfa.toast.noRecoveryCodeLeft.message'),
							type: 'info',
							duration: 0,
						});
					}
				}
			} catch (error) {
				this.formError = !this.showRecoveryCodeForm
					? this.$locale.baseText('mfa.code.invalid')
					: this.$locale.baseText('mfa.recovery.invalid');

				this.$telemetry.track('User attempted to login', {
					result: 'mfa_token_rejected',
				});

				return;
			}

			if (this.phishingAttempt()) {
					const redirect = this.getRedirectQueryParameter();
					this.$router.push(redirect);
					return;
			}

			this.$telemetry.track('User attempted to login', {
				result: 'mfa_success',
			});

			this.$router.push({ name: VIEWS.HOMEPAGE });
		},
		onSaveClick() {
			this.formBus.$emit('submit');
		},
	},
});
</script>

<style lang="scss" module>
body {
	background-color: var(--color-background-light);
}

.container {
	display: flex;
	align-items: center;
	flex-direction: column;
	padding-top: var(--spacing-2xl);

	> * {
		margin-bottom: var(--spacing-l);
		width: 352px;
	}
}

.logoContainer {
	display: flex;
	justify-content: center;
}

.textContainer {
	text-align: center;
}

.formContainer {
	padding-bottom: var(--spacing-xl);
}

.qrContainer {
	text-align: center;
}

.headerContainer {
	text-align: center;
	margin-bottom: var(--spacing-xl);
}

.formError input {
	border-color: var(--color-danger);
}

.recoveryCodeLink {
	text-decoration: underline;
}

.infoBox {
	padding-top: var(--spacing-4xs);
}
</style>
