<template>
	<Modal
		width="500px"
		title="Setup Authenticator app [1/2]"
		:eventBus="modalBus"
		:name="MFA_SETUP_MODAL_KEY"
		:center="true"
	>
		<template #content>
			<div v-if="!showRecoveryCodes" :class="$style.container">
				<div :class="$style.textContainer">
					<n8n-text size="large" color="text-dark" :bold="true">1. Scan the QR code</n8n-text>
				</div>
				<div>
					<n8n-text size="medium" :bold="false"
						>Use an authenticator app from your phone to scan. If you can't scan the QR code, enter
						<a @click="onCopySecretToClipboard">this text code</a> instead.
						<span style="display: none" ref="codeSecret">{{ secret }}</span>
					</n8n-text>
				</div>
				<div :class="$style.qrContainer">
					<qrcode-vue :value="qrCode" size="150" level="H" />
				</div>
				<div :class="$style.textContainer">
					<n8n-text size="large" color="text-dark" :bold="true"
						>2. Verify the code from the app</n8n-text
					>
				</div>
				<div :class="$style.form">
					<n8n-form-inputs
						v-if="formInputs"
						:inputs="formInputs"
						:eventBus="formBus"
						@submit="onSubmit"
					/>
				</div>
			</div>
			<div v-if="showRecoveryCodes" :class="$style.container">
				<div :class="$style.textContainer">
					<n8n-text size="large" :bold="false"
						>With two-factor authentication enabled for your account, you'll need these recovery
						codes if you ever lose your device. Without your device or a recovery code, you'll have
						to contact n8n support to recover your account.</n8n-text
					>
				</div>
				<div :class="$style.recoveryCodes">
					<div v-for="recoveryCode in recoveryCodes" :key="recoveryCode">
						<n8n-text size="large" :class="$style.recoveryCode" :bold="true">{{
							recoveryCode
						}}</n8n-text>
					</div>
				</div>
				<div>
					<n8n-button
						type="success"
						icon="file-download"
						float="right"
						label="Download"
						@click="onDownloadClick"
					/>
				</div>
			</div>
		</template>
		<template #footer>
			<div v-if="showRecoveryCodes">
				<div :class="$style.separator"></div>
				<div>
					<n8n-button
						float="right"
						:disabled="!recoveryCodesDownloaded"
						label="I have saved my recovery codes"
						@click="onSetupClick"
					/>
				</div>
			</div>
			<div v-if="!showRecoveryCodes">
				<div>
					<n8n-button
						float="right"
						label="Continue"
						size="large"
						:disabled="!readyToSubmit"
						@click="onSaveClick"
					/>
				</div>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import Vue from 'vue';
import Modal from './Modal.vue';
import { MFA_SETUP_MODAL_KEY, VIEWS } from '../constants';
import { showMessage } from '@/mixins/showMessage';
import mixins from 'vue-typed-mixins';
import { IFormInputs, INodeUi, Validatable } from '@/Interface';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useNDVStore } from '@/stores/ndv';
import { useSettingsStore } from '@/stores/settings';
import CopyInput from '@/components/CopyInput.vue';
import { copyPaste } from '@/mixins/copyPaste';
//@ts-ignore
import QrcodeVue from 'qrcode.vue';

export default mixins(showMessage, copyPaste).extend({
	name: 'MfaSetupModal',
	components: {
		Modal,
		QrcodeVue,
		CopyInput,
		copyPaste,
	},
	data() {
		return {
			modalBus: new Vue(),
			MFA_SETUP_MODAL_KEY,
			secret: '',
			qrCode: '',
			hasAnyChanges: false,
			formBus: new Vue(),
			formInputs: null as null | IFormInputs,
			readyToSubmit: false,
			showRecoveryCodes: false,
			recoveryCodes: [] as string[],
			recoveryCodesDownloaded: false,
			authenticatorCode: '',
		};
	},
	computed: {
		...mapStores(useNDVStore, useUIStore, useSettingsStore),
		node(): INodeUi | null {
			return this.ndvStore.activeNode;
		},
	},
	methods: {
		closeDialog(): void {
			this.modalBus.$emit('close');
		},
		onInput(input: { value: string }) {
			this.hasAnyChanges = true;
		},
		onCopySecretToClipboard() {
			this.copyToClipboard((this.$refs.codeSecret as HTMLInputElement).innerHTML);
			this.$showToast({
				title: 'Code copied to clipboard',
				message: 'Enter the code in your authenticator app',
				type: 'success',
			});
		},
		async onSubmit(form: { authenticatorCode: string }) {
			try {
				await this.settingsStore.verifyMfaToken({ token: form.authenticatorCode });
				this.showRecoveryCodes = true;
				this.authenticatorCode = form.authenticatorCode;
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.mfa.invalidAuthenticatorCode'));
			}
		},
		onSaveClick() {
			this.formBus.$emit('submit');
		},
		onDownloadClick() {
			const filename = 'n8n-recovery-codes';
			const temporalElement = document.createElement('a');
			temporalElement.setAttribute(
				'href',
				'data:text/plain;charset=utf-8,' + encodeURIComponent(this.recoveryCodes.join('\n')),
			);
			temporalElement.setAttribute('download', filename);
			temporalElement.style.display = 'none';
			document.body.appendChild(temporalElement);
			temporalElement.click();
			document.body.removeChild(temporalElement);
			this.recoveryCodesDownloaded = true;
		},
		async onSetupClick() {
			try {
				await this.settingsStore.enableMfa();
				this.closeDialog();
				this.$showToast({
					title: 'Multi-factor Authentication',
					message: 'Succefully enabled',
					type: 'success',
					duration: 0,
				});
			} catch (e) {}
		},
		async getMfaQr() {
			try {
				const { secret, qrCode, recoveryCodes } = await this.settingsStore.getMfaQr();
				this.qrCode = qrCode;
				this.secret = secret;
				this.recoveryCodes = recoveryCodes;
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.api.view.error'));
			}
		},
		validateMfaCode(value: Validatable) {
			if (typeof value !== 'string') {
				return false;
			}

			if (/\D/.test(value)) {
				console.log('entre aqui');
				this.readyToSubmit = false;
				return {
					messageKey: 'mfa.setup.invalidCode',
				};
			}

			if (value.length !== 6) {
				this.readyToSubmit = false;
				return false;
			}

			this.readyToSubmit = true;
			return null;
		},
		onCopy() {},
	},
	async mounted() {
		console.log('montando');
		this.formInputs = [
			{
				name: 'authenticatorCode',
				initialValue: '',
				properties: {
					showRequiredAsterisk: false,
					label: 'Code from authenticator app',
					maxlength: 6,
					placeholder: 'XXXXXX',
					required: true,
					validateOnBlur: true,
					validationRules: [{ name: 'MFA_CODE_VALIDATOR' }],
					validators: {
						MFA_CODE_VALIDATOR: {
							validate: this.validateMfaCode,
						},
					},
				},
			},
		];
		await this.getMfaQr();
	},
});
</script>

<style module lang="scss">
.modalFooter {
	justify-content: space-between;
	display: flex;
	flex-direction: row;
}

.notice {
	margin: 0;
}

.container > * {
	margin-bottom: var(--spacing-s);
	&:last-child {
		margin-bottom: 0;
	}
}

.textContainer {
	text-align: left;
	margin: 0px;
	margin-bottom: 5px;
}

.formContainer {
	padding-bottom: var(--spacing-xl);
}

.qrContainer {
}

.headerContainer {
	text-align: center;
}

.recoveryCodes {
	height: 200px;
	display: flex;
	flex-direction: column;
	background-color: var(--color-background-base);
	text-align: center;
	flex-wrap: nowrap;
	justify-content: space-between;
	align-items: normal;
	align-content: normal;
	padding-top: 10px;
	padding-bottom: 10px;
}

.separator {
	margin-bottom: 10px;
	height: 1px;
	background: grey;
}

.form:first-child span {
	color: var(--color-text-base);
	font-weight: var(--font-weight-regular);
	font-size: var(--font-size-s);
}

.form input {
	width: 50%;
	height: 30px;
}
</style>
