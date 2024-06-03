<template>
	<Modal
		width="460px"
		height="80%"
		max-height="640px"
		:title="
			!showRecoveryCodes
				? $locale.baseText('mfa.setup.step1.title')
				: $locale.baseText('mfa.setup.step2.title')
		"
		:event-bus="modalBus"
		:name="MFA_SETUP_MODAL_KEY"
		:center="true"
		:loading="loadingQrCode"
	>
		<template #content>
			<div v-if="!showRecoveryCodes" :class="[$style.container, $style.modalContent]">
				<div :class="$style.textContainer">
					<n8n-text size="large" color="text-dark" :bold="true">{{
						$locale.baseText('mfa.setup.step1.instruction1.title')
					}}</n8n-text>
				</div>
				<div>
					<n8n-text size="medium" :bold="false">
						<i18n-t keypath="mfa.setup.step1.instruction1.subtitle" tag="span">
							<template #part1>
								{{ $locale.baseText('mfa.setup.step1.instruction1.subtitle.part1') }}
							</template>
							<template #part2>
								<a
									:class="$style.secret"
									data-test-id="mfa-secret-button"
									@click="onCopySecretToClipboard"
									>{{ $locale.baseText('mfa.setup.step1.instruction1.subtitle.part2') }}</a
								>
							</template>
						</i18n-t>
					</n8n-text>
				</div>
				<div :class="$style.qrContainer">
					<QrcodeVue :value="qrCode" :size="150" level="H" />
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
							:required="true"
							data-test-id="mfa-token-input"
							@input="onInput"
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
					<i18n-t keypath="mfa.setup.step2.infobox.description" tag="span">
						<template #part1>
							{{ $locale.baseText('mfa.setup.step2.infobox.description.part1') }}
						</template>
						<template #part2>
							<n8n-text size="small" :bold="true" :class="$style.loseAccessText">
								{{ $locale.baseText('mfa.setup.step2.infobox.description.part2') }}
							</n8n-text>
						</template>
					</i18n-t>
				</n8n-info-tip>
				<div>
					<n8n-button
						type="primary"
						icon="download"
						float="right"
						:label="$locale.baseText('mfa.setup.step2.button.download')"
						data-test-id="mfa-recovery-codes-button"
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
						size="large"
						data-test-id="mfa-save-button"
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
import Modal from './Modal.vue';
import {
	MFA_AUTHENTICATION_TOKEN_INPUT_MAX_LENGTH,
	MFA_AUTHENTICATION_TOKEN_WINDOW_EXPIRED,
	MFA_SETUP_MODAL_KEY,
} from '../constants';
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useUsersStore } from '@/stores/users.store';
import { mfaEventBus } from '@/event-bus';
import { useToast } from '@/composables/useToast';
//@ts-ignore
import QrcodeVue from 'qrcode.vue';
import { useClipboard } from '@/composables/useClipboard';
export default defineComponent({
	name: 'MfaSetupModal',
	components: {
		Modal,
		QrcodeVue,
	},
	setup() {
		const clipboard = useClipboard();

		return {
			clipboard,
			...useToast(),
		};
	},
	data() {
		return {
			modalBus: mfaEventBus,
			MFA_SETUP_MODAL_KEY,
			secret: '',
			qrCode: '',
			readyToSubmit: false,
			formBus: mfaEventBus,
			showRecoveryCodes: false,
			recoveryCodes: [] as string[],
			recoveryCodesDownloaded: false,
			authenticatorCode: '',
			infoTextErrorMessage: '',
			loadingQrCode: true,
		};
	},
	computed: {
		...mapStores(useNDVStore, useUIStore, useUsersStore),
	},
	async mounted() {
		await this.getMfaQR();
	},
	methods: {
		closeDialog(): void {
			this.modalBus.emit('close');
		},
		onInput(value: string) {
			if (value.length !== MFA_AUTHENTICATION_TOKEN_INPUT_MAX_LENGTH) {
				this.infoTextErrorMessage = '';
				return;
			}
			this.usersStore
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
			void this.clipboard.copy(this.secret);
			this.showToast({
				title: this.$locale.baseText('mfa.setup.step1.toast.copyToClipboard.title'),
				message: this.$locale.baseText('mfa.setup.step1.toast.copyToClipboard.message'),
				type: 'success',
			});
		},
		async onSubmit(form: { authenticatorCode: string }) {
			try {
				await this.usersStore.verifyMfaToken({ token: form.authenticatorCode });
				this.showRecoveryCodes = true;
				this.authenticatorCode = form.authenticatorCode;
			} catch (error) {
				this.showError(error, this.$locale.baseText('settings.mfa.invalidAuthenticatorCode'));
			}
		},
		onSaveClick() {
			this.formBus.emit('submit');
		},
		onDownloadClick() {
			const filename = 'n8n-recovery-codes.txt';
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
				await this.usersStore.enableMfa({ token: this.authenticatorCode });
				this.closeDialog();
				this.showMessage({
					type: 'success',
					title: this.$locale.baseText('mfa.setup.step2.toast.setupFinished.message'),
				});
			} catch (e) {
				if (e.errorCode === MFA_AUTHENTICATION_TOKEN_WINDOW_EXPIRED) {
					this.showMessage({
						type: 'error',
						title: this.$locale.baseText('mfa.setup.step2.toast.tokenExpired.error.message'),
					});
					return;
				}

				this.showMessage({
					type: 'error',
					title: this.$locale.baseText('mfa.setup.step2.toast.setupFinished.error.message'),
				});
			}
		},
		async getMfaQR() {
			try {
				const { secret, qrCode, recoveryCodes } = await this.usersStore.getMfaQR();
				this.qrCode = qrCode;
				this.secret = secret;
				this.recoveryCodes = recoveryCodes;
			} catch (error) {
				this.showError(error, this.$locale.baseText('settings.api.view.error'));
			} finally {
				this.loadingQrCode = false;
			}
		},
	},
});
</script>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	height: 100%;
}

.container > * {
	overflow: visible;
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
	text-align: center;

	canvas {
		border: 4px solid var(--prim-gray-10);
	}
}

.headerContainer {
	text-align: center;
}
.recoveryCodesContainer {
	display: flex;
	flex-direction: column;
	background-color: var(--color-mfa-recovery-code-background);
	text-align: center;
	flex-wrap: nowrap;
	justify-content: space-between;
	align-items: normal;
	align-content: normal;
	padding-top: var(--spacing-xs);
	padding-bottom: var(--spacing-xs);
	gap: var(--spacing-xs);
	margin-bottom: var(--spacing-2xs);
	overflow-y: auto;
}

.recoveryCodesContainer span {
	font-size: var(--font-size-s);
	font-weight: var(--font-weight-regular);
	line-height: var(--spacing-m);
	color: var(--color-mfa-recovery-code-color);
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
	color: var(--color-mfa-lose-access-text-color);
}

.error input {
	border-color: var(--color-danger);
}

.error > div > span {
	color: var(--color-danger);
	font-size: var(--font-size-2xs);
}

.modalFooter {
	justify-content: space-between;
	display: flex;
	flex-direction: row;
}

.notice {
	margin: 0;
}
</style>
