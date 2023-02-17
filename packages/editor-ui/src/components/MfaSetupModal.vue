<template>
	<Modal
		width="460px"
		:title="
			!showRecoveryCodes ? 'Setup Authenticator app [1/2]' : 'Download your recovery codes [2/2]'
		"
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
						<a :class="$style.secret" @click="onCopySecretToClipboard">this text code</a> instead.
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
				<div :class="[$style.form, infoTextErrorMessage ? $style.error : '']">
					<n8n-input-label
						size="medium"
						:bold="false"
						:class="$style.labelTooltip"
						label="Code from authenticator app"
					>
						<n8n-input
							v-model="authenticatorCode"
							type="text"
							:maxlength="6"
							placeholder="e.g. 123456"
							@input="onInput"
							:required="true"
						/>
					</n8n-input-label>
					<div :class="[$style.infoText, 'mt-4xs']">
						<span size="small" v-text="infoTextErrorMessage"></span>
					</div>
				</div>
			</div>
			<div v-else :class="$style.container">
				<div>
					<n8n-text size="medium" :bold="false"
						>You can use recovery codes as a second factor to authenticate in case you lose access
						to your device.</n8n-text
					>
				</div>
				<div :class="$style.recoveryCodesContainer">
					<div v-for="recoveryCode in recoveryCodes" :key="recoveryCode">
						<n8n-text size="medium">{{ recoveryCode }}</n8n-text>
					</div>
				</div>
				<n8n-info-tip :bold="false" :class="$style['edit-mode-footer-infotip']">
					Keep your recovery codes somewhere safe. if you lose your device and your recovery codes,
					you will
					<n8n-text size="small" bold="true" :class="$style.loseAccessText">
						lose access to you account.
					</n8n-text>
				</n8n-info-tip>
				<div>
					<n8n-button
						type="primary"
						icon="download"
						float="right"
						label="Download recovery codes"
						@click="onDownloadClick"
					/>
				</div>
			</div>
		</template>
		<template #footer>
			<div v-if="showRecoveryCodes">
				<div>
					<n8n-button
						float="right"
						:disabled="!recoveryCodesDownloaded"
						label="I have saved my recovery codes"
						@click="onSetupClick"
					/>
				</div>
			</div>
			<div v-else>
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
import { INodeUi, Validatable } from '@/Interface';
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
			readyToSubmit: false,
			formBus: new Vue(),
			showRecoveryCodes: false,
			recoveryCodes: [] as string[],
			recoveryCodesDownloaded: false,
			authenticatorCode: '',
			infoTextErrorMessage: '',
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
		onInput(value: string) {
			if (value.length !== 6) {
				this.infoTextErrorMessage = '';
				return;
			}
			this.settingsStore
				.verifyMfaToken({ token: value })
				.then(() => {
					this.showRecoveryCodes = true;
					this.authenticatorCode = value;
				})
				.catch(() => {
					this.infoTextErrorMessage = this.$locale.baseText('mfa.setup.invalidCode');
				});
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
				this.$showMessage({
					type: 'success',
					message: 'Two-factor authentication enabled',
					title: '',
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
		onCopy() {},
	},
	async mounted() {
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

.headerContainer {
	text-align: center;
}
.recoveryCodesContainer {
	height: 159px;
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
	gap: 10px;
	margin-bottom: 3px;
}

.recoveryCodesContainer span {
	font-size: var(--font-size-s);
	font-weight: var(--font-weight-regular);
	line-height: 19px;
	color: #7d7d87;
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
.secret {
	color: var(--color-primary);
	font-weight: var(--font-weight-bold);
}

.loseAccessText {
	color: #f45959;
}

.error {
	input {
		border-color: #f45959;
	}
}
.error > div > span {
	color: #f45959;
	font-size: var(--font-size-2xs);
}
</style>
