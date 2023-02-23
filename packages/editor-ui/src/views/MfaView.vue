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
						<a @click="OnRecoveryCodeClick">{{
							$locale.baseText('mfa.code.input.info.action')
						}}</a></n8n-text
					>
					<n8n-text color="danger" v-if="formError" size="small"
						>{{ formError }}
						<a
							v-if="!showRecoveryCodeForm"
							@click="OnRecoveryCodeClick"
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
import Vue from 'vue';

import mixins from 'vue-typed-mixins';
import { IFormInputs } from '@/Interface';

import Logo from '../components/Logo.vue';
import { VIEWS } from '@/constants';
import { useUsersStore } from '@/stores/users';
import { useSettingsStore } from '@/stores/settings';
import { mapStores } from 'pinia';

export default mixins(showMessage).extend({
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
					maxlength: 6,
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
		...mapStores(useUsersStore, useSettingsStore),
	},
	methods: {
		OnRecoveryCodeClick() {
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
						maxlength: 36,
						capitalize: true,
						validateOnBlur: false,
					},
				},
			];
		},
		onBackClick() {
			if (!this.showRecoveryCodeForm) {
				this.$router.push({ name: VIEWS.SIGNIN });
			} else {
				this.showRecoveryCodeForm = false;
				this.hasAnyChanges = true;
				this.formInputs = [
					{
						name: 'token',
						initialValue: '',
						properties: {
							label: this.$locale.baseText('mfa.code.input.label'),
							placeholder: this.$locale.baseText('mfa.code.input.placeholder'),
							maxlength: 6,
							capitalize: true,
						},
					},
				];
			}
		},
		onInput({ value, name }: { name: string; value: string }) {
			const isSubmittingMfaToken = name === 'token';
			const inputValidLength = isSubmittingMfaToken ? 6 : 36;

			if (value.length === inputValidLength) {
				this.hasAnyChanges = true;
				this.verifyingMfaToken = true;

				this.onSubmit({ token: value, recoveryCode: value })
					.catch(() => {})
					.finally(() => (this.verifyingMfaToken = false));

				return;
			}

			this.hasAnyChanges = false;
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
				return;
			}

			if (typeof this.$route.query.redirect === 'string') {
				const redirect = decodeURIComponent(this.$route.query.redirect);
				if (redirect.startsWith('/')) {
					// protect against phishing
					this.$router.push(redirect);

					return;
				}
			}

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
	border-color: #f45959;
}

.recoveryCodeLink {
	text-decoration: underline;
}

.infoBox {
	padding-top: var(--spacing-4xs);
}
</style>
