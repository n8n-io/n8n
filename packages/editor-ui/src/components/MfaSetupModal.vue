<template>
	<Modal
		width="460px"
		:title="
			!showRecoveryCodes
				? $locale.baseText('mfa.setup.step1.title')
				: $locale.baseText('mfa.setup.step2.title')
		"
		:eventBus="modalBus"
		:name="MFA_SETUP_MODAL_KEY"
		:center="true"
		:loading="loadingQrCode"
	>
		<template #content>
			<div v-if="!showRecoveryCodes" :class="$style.container">
				<div :class="$style.textContainer">
					<n8n-text size="large" color="text-dark" :bold="true">{{
						$locale.baseText('mfa.setup.step1.instruction1.title')
					}}</n8n-text>
				</div>
				<div>
					<n8n-text size="medium" :bold="false"
						>{{ $locale.baseText('mfa.setup.step1.instruction1.subtitle').split('|')[0] }}
						<a :class="$style.secret" @click="onCopySecretToClipboard">{{
							$locale.baseText('mfa.setup.step1.instruction1.subtitle').split('|')[1]
						}}</a>
						{{ $locale.baseText('mfa.setup.step1.instruction1.subtitle').split('|')[2] }}
						<span style="display: none" ref="codeSecret">{{ secret }}</span>
					</n8n-text>
				</div>
				<div :class="$style.qrContainer">
					<qrcode-vue :value="qrCode" size="150" level="H" />
				</div>
				<div :class="$style.textContainer">
					<n8n-text size="large" color="text-dark" :bold="true">{{
						$locale.baseText('mfa.setup.step1.instruction2.title')
					}}</n8n-text>
				</div>
				<div :class="[$style.form, infoTextErrorMessage ? $style.error : '']">
					<n8n-input-label
						size="medium"
						:bold="false"
						:class="$style.labelTooltip"
						:label="$locale.baseText('mfa.setup.step1.input.label')"
					>
						<n8n-input
							v-model="authenticatorCode"
							type="text"
							:maxlength="6"
							:placeholder="$locale.baseText('mfa.code.input.placeholder')"
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
					<n8n-text size="medium" :bold="false">{{
						$locale.baseText('mfa.setup.step2.description')
					}}</n8n-text>
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
						:label="$locale.baseText('mfa.setup.step2.button.download')"
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
						:label="$locale.baseText('mfa.setup.step2.button.save')"
						@click="onSetupClick"
					/>
				</div>
			</div>
			<div v-else>
				<div>
					<n8n-button
						float="right"
						:label="$locale.baseText('mfa.setup.step1.button.continue')"
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
import { MFA_SETUP_MODAL_KEY } from '../constants';
import { showMessage } from '@/mixins/showMessage';
import mixins from 'vue-typed-mixins';
import { INodeUi } from '@/Interface';
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
			loadingQrCode: true,
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
				title: this.$locale.baseText('mfa.setup.step1.toast.copyToClipboard.title'),
				message: this.$locale.baseText('mfa.setup.step1.toast.copyToClipboard.message'),
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
					title: this.$locale.baseText('mfa.setup.step1.toast.setupFinished.message'),
				});
			} catch (e) {}
		},
		async getMfaQr() {
			try {
				const { secret, qrCode, recoveryCodes } = await this.settingsStore.getMfaQr();
				this.qrCode = qrCode;
				this.secret = secret;
				this.recoveryCodes = recoveryCodes;
				this.loadingQrCode = false;
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
	height: 140px;
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
	overflow-y: scroll;
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
