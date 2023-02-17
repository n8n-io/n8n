<template>
	<div :class="$style.container">
		<div :class="$style.logoContainer">
			<Logo />
		</div>
		<n8n-card>
			<div :class="$style.headerContainer">
				<n8n-heading v-if="showRecoveryCodeForm" tag="h2" size="xlarge" color="text-dark"
					>Two-factor authentication</n8n-heading
				>
				<n8n-heading v-else tag="h2" size="xlarge" color="text-dark"
					>Two-factor authentication</n8n-heading
				>
			</div>
			<br />
			<br />

			<div :class="$style.formContainer">
				<n8n-form-inputs
					v-if="formInputs"
					:inputs="formInputs"
					:eventBus="formBus"
					@input="onInput"
					@ready="onReadyToSubmit"
					@submit="onSubmit"
				/>
			</div>
			<div>
				<n8n-info-tip v-if="!showRecoveryCodeForm"
					>Don't have your auth device?
					<a @click="OnRecoveryCodeClick">Enter a recovery code</a></n8n-info-tip
				>
			</div>
			<br />
			<br />

			<div>
				<n8n-button
					float="right"
					label="Continue"
					size="large"
					:disabled="!hasAnyChanges || !readyToSubmit"
					@click="onSaveClick"
				/>
				<n8n-button float="left" label="Back" size="large" type="tertiary" @click="onBackClick" />
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
import { mapStores } from 'pinia';

export default mixins(showMessage).extend({
	name: 'MfaView',
	components: {
		AuthView,
		Logo,
	},
	async mounted() {
		console.log('montando');
		const { email, password } = this.$route.params;
		this.email = email;
		this.password = password;
		this.formInputs = [
			{
				name: 'token',
				initialValue: '',
				properties: {
					label: 'Two-factor code',
					placeholder: 'e.g. 123456',
					maxlength: 6,
					required: true,
					capitalize: true,
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
			readyToSubmit: false,
			showRecoveryCodeForm: false,
		};
	},
	computed: {
		...mapStores(useUsersStore),
	},
	methods: {
		OnRecoveryCodeClick() {
			this.showRecoveryCodeForm = true;
			this.formInputs = [
				{
					name: 'recoveryCode',
					initialValue: '',
					properties: {
						label: 'Recovery Code',
						placeholder: 'e.g c79f9c02-7b2e-44...',
						maxlength: 36,
						required: true,
						capitalize: true,
					},
				},
			];
		},
		onBackClick() {
			if (!this.showRecoveryCodeForm) {
				this.$router.push({ name: VIEWS.SIGNIN });
			} else {
				this.showRecoveryCodeForm = false;
				this.formInputs = [
					{
						name: 'token',
						initialValue: '',
						properties: {
							label: 'Two-factor code',
							placeholder: 'e.g. 123456',
							maxlength: 6,
							required: true,
							capitalize: true,
						},
					},
				];
			}
		},
		onInput() {
			console.log('on input');
			this.hasAnyChanges = true;
		},
		onReadyToSubmit(ready: boolean) {
			this.readyToSubmit = ready;
		},
		async onSubmit(form: { token: string; recoveryCode: string }) {
			try {
				await this.usersStore.loginWithCreds({
					email: this.email,
					password: this.password,
					mfaToken: form.token,
					mfaRecoveryCode: form.recoveryCode,
				});
			} catch (error) {
				console.log('mfa error loginwithcred');
				this.$router.push({ name: VIEWS.SIGNIN });
			}
			this.clearAllStickyNotifications();

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
}

.formContainer {
	margin-bottom: 5px;
	padding-bottom: 5px;
}
</style>
