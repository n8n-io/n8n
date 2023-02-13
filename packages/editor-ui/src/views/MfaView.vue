<template>
	<div :class="$style.container">
		<div :class="$style.logoContainer">
			<Logo />
		</div>
		<div :class="$style.headerContainer">
			<n8n-heading v-if="showRecoveryCodeForm" tag="h2" size="xlarge" color="text-dark"
				>Enter MFA Recovery Code</n8n-heading
			>
			<n8n-heading v-else tag="h2" size="xlarge" color="text-dark">Enter MFA Token</n8n-heading>
		</div>
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
				>Don't have your mobile device?
				<a @click="OnRecoveryCodeClick">Enter a recovery code</a></n8n-info-tip
			>
		</div>
		<div>
			<n8n-button
				float="right"
				label="Submit"
				size="large"
				:disabled="!hasAnyChanges || !readyToSubmit"
				@click="onSaveClick"
			/>
			<n8n-button
				v-if="showRecoveryCodeForm"
				float="left"
				label="Back"
				size="large"
				type="secondary"
				@click="onBackClick"
			/>
		</div>
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
					label: 'Token',
					maxlength: 20,
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
						maxlength: 36,
						required: true,
						capitalize: true,
					},
				},
			];
		},
		onBackClick() {
			this.showRecoveryCodeForm = false;
			this.formInputs = [
				{
					name: 'token',
					initialValue: '',
					properties: {
						label: 'Token',
						maxlength: 20,
						required: true,
						capitalize: true,
					},
				},
			];
		},
		onInput() {
			console.log('on input');
			this.hasAnyChanges = true;
		},
		onReadyToSubmit(ready: boolean) {
			console.log(ready);
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
