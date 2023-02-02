<template>
	<div :class="$style.container">
		<div :class="$style.logoContainer">
			<Logo />
		</div>
		<div :class="$style.headerContainer">
			<n8n-heading tag="h2" size="xlarge" color="text-dark"
				>Multi-factor Authentication Setup</n8n-heading
			>
		</div>
		<div :class="$style.textContainer">
			<n8n-text size="large" :bold="true">1. Scan this barcode with your app.</n8n-text>
		</div>
		<div :class="$style.qrContainer">
			<qrcode-vue :value="qrCode" size="200" level="H" />
			<n8n-text size="small"
				>{{ $locale.baseText('settings.mfa.secret', { interpolate: { secret } }) }}
			</n8n-text>
		</div>
		<div :class="$style.textContainer">
			<n8n-text size="large" :bold="true">2. Enter six-digits from the application.</n8n-text>
		</div>
		<div>
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
			<n8n-button
				float="right"
				label="Enable"
				size="large"
				:disabled="!hasAnyChanges || !readyToSubmit"
				@click="onSaveClick"
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

//@ts-ignore
import QrcodeVue from 'qrcode.vue';
import Logo from '../components/Logo.vue';
import { VIEWS } from '@/constants';
import { useSettingsStore } from '@/stores/settings';
import { useUsersStore } from '@/stores/users';
import { mapStores } from 'pinia';

export default mixins(showMessage).extend({
	name: 'MfaSetupView',
	components: {
		AuthView,
		QrcodeVue,
		Logo,
	},
	async mounted() {
		console.log('montando');
		this.formInputs = [
			{
				name: 'authenticatorCode',
				initialValue: '',
				properties: {
					label: 'Code',
					maxlength: 6,
					required: true,
					capitalize: true,
				},
			},
		];
		await this.getMfaQr();
	},
	data() {
		return {
			secret: '',
			qrCode: '',
			hasAnyChanges: false,
			formBus: new Vue(),
			formInputs: null as null | IFormInputs,
			readyToSubmit: false,
		};
	},
	computed: {
		...mapStores(useSettingsStore, useUsersStore),
		isUserLoggedIn() {
			return this.usersStore.currentUser ? true : false;
		},
	},
	methods: {
		onInput() {
			this.hasAnyChanges = true;
		},
		onReadyToSubmit(ready: boolean) {
			this.readyToSubmit = ready;
		},
		async onSubmit(form: { authenticatorCode: string }) {
			try {
				await this.settingsStore.enableMfa({ code: form.authenticatorCode });
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.mfa.invalidAuthenticatorCode'));
			}
			this.$router.push({ name: VIEWS.PERSONAL_SETTINGS });
		},
		onSaveClick() {
			this.formBus.$emit('submit');
		},
		async getMfaQr() {
			try {
				const { secret, qrCode } = await this.settingsStore.getMfaQr();
				this.qrCode = qrCode;
				this.secret = secret;
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.api.view.error'));
			}
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
</style>
