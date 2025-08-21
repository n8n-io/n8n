<script setup lang="ts">
import Modal from './Modal.vue';
import {
	MFA_AUTHENTICATION_CODE_INPUT_MAX_LENGTH,
	MFA_AUTHENTICATION_CODE_WINDOW_EXPIRED,
	MFA_SETUP_MODAL_KEY,
	VIEWS,
} from '../constants';
import { ref, onMounted } from 'vue';
import { useUsersStore } from '@/stores/users.store';
import { mfaEventBus } from '@/event-bus';
import { useToast } from '@/composables/useToast';
//@ts-ignore
import QrcodeVue from 'qrcode.vue';
import { useClipboard } from '@/composables/useClipboard';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@/stores/settings.store';
import router from '@/router';
import { I18nT } from 'vue-i18n';

// ---------------------------------------------------------------------------
// #region Reactive properties
// ---------------------------------------------------------------------------

const MFA_SETUP_MODAL_KEY_NAME = ref(MFA_SETUP_MODAL_KEY);
const modalBus = ref(mfaEventBus);
const secret = ref('');
const qrCode = ref('');
const readyToSubmit = ref(false);
const formBus = ref(mfaEventBus);
const showRecoveryCodes = ref(false);
const recoveryCodes = ref<string[]>([]);
const recoveryCodesDownloaded = ref(false);
const authenticatorCode = ref('');
const infoTextErrorMessage = ref('');
const loadingQrCode = ref(true);

// #endregion

// ---------------------------------------------------------------------------
// #region Composable
// ---------------------------------------------------------------------------

const clipboard = useClipboard();
const userStore = useUsersStore();
const settingsStore = useSettingsStore();
const i18n = useI18n();
const toast = useToast();

// #endregion

// ---------------------------------------------------------------------------
// #region Methods
// ---------------------------------------------------------------------------

const closeDialog = () => {
	modalBus.value.emit('close');
};

const onInput = (value: string) => {
	if (value.length !== MFA_AUTHENTICATION_CODE_INPUT_MAX_LENGTH) {
		infoTextErrorMessage.value = '';
		return;
	}
	userStore
		.verifyMfaCode({ mfaCode: value })
		.then(() => {
			showRecoveryCodes.value = true;
			authenticatorCode.value = value;
		})
		.catch(() => {
			infoTextErrorMessage.value = i18n.baseText('mfa.setup.invalidCode');
		});
};

const onCopySecretToClipboard = () => {
	void clipboard.copy(secret.value);
	toast.showToast({
		title: i18n.baseText('mfa.setup.step1.toast.copyToClipboard.title'),
		message: i18n.baseText('mfa.setup.step1.toast.copyToClipboard.message'),
		type: 'success',
	});
};

const onSaveClick = () => {
	formBus.value.emit('submit');
};

const onDownloadClick = () => {
	const filename = 'n8n-recovery-codes.txt';
	const temporalElement = document.createElement('a');
	temporalElement.setAttribute(
		'href',
		'data:text/plain;charset=utf-8,' + encodeURIComponent(recoveryCodes.value.join('\n')),
	);
	temporalElement.setAttribute('download', filename);
	temporalElement.style.display = 'none';
	document.body.appendChild(temporalElement);
	temporalElement.click();
	document.body.removeChild(temporalElement);
	recoveryCodesDownloaded.value = true;
};

const onSetupClick = async () => {
	try {
		await userStore.enableMfa({ mfaCode: authenticatorCode.value });
		closeDialog();
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('mfa.setup.step2.toast.setupFinished.message'),
		});
		if (settingsStore.isMFAEnforced) {
			await userStore.logout();
			await router.push({ name: VIEWS.SIGNIN });
		}
	} catch (e) {
		if (e.errorCode === MFA_AUTHENTICATION_CODE_WINDOW_EXPIRED) {
			toast.showMessage({
				type: 'error',
				title: i18n.baseText('mfa.setup.step2.toast.tokenExpired.error.message'),
			});
			return;
		}

		toast.showMessage({
			type: 'error',
			title: i18n.baseText('mfa.setup.step2.toast.setupFinished.error.message'),
		});
	}
};

const getMfaQR = async () => {
	try {
		const response = await userStore.fetchMfaQR();
		qrCode.value = response.qrCode;
		secret.value = response.secret;
		recoveryCodes.value = response.recoveryCodes;
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.api.view.error'));
	} finally {
		loadingQrCode.value = false;
	}
};

// #endregion

// ---------------------------------------------------------------------------
// #region Lifecycle hooks
// ---------------------------------------------------------------------------

onMounted(async () => {
	await getMfaQR();
});

// #endregion
</script>

<template>
	<Modal
		width="460px"
		height="80%"
		max-height="640px"
		:title="
			!showRecoveryCodes
				? i18n.baseText('mfa.setup.step1.title')
				: i18n.baseText('mfa.setup.step2.title')
		"
		:event-bus="modalBus"
		:name="MFA_SETUP_MODAL_KEY_NAME"
		:center="true"
		:loading="loadingQrCode"
	>
		<template #content>
			<div v-if="!showRecoveryCodes" :class="[$style.container, $style.modalContent]">
				<div :class="$style.textContainer">
					<n8n-text size="large" color="text-dark" :bold="true">{{
						i18n.baseText('mfa.setup.step1.instruction1.title')
					}}</n8n-text>
				</div>
				<div>
					<n8n-text size="medium" :bold="false">
						<I18nT keypath="mfa.setup.step1.instruction1.subtitle" tag="span" scope="global">
							<template #part1>
								{{ i18n.baseText('mfa.setup.step1.instruction1.subtitle.part1') }}
							</template>
							<template #part2>
								<a
									:class="$style.secret"
									data-test-id="mfa-secret-button"
									@click="onCopySecretToClipboard"
									>{{ i18n.baseText('mfa.setup.step1.instruction1.subtitle.part2') }}</a
								>
							</template>
						</I18nT>
					</n8n-text>
				</div>
				<div :class="$style.qrContainer">
					<QrcodeVue :value="qrCode" :size="150" level="H" />
				</div>
				<div :class="$style.textContainer">
					<n8n-text size="large" color="text-dark" :bold="true">{{
						i18n.baseText('mfa.setup.step1.instruction2.title')
					}}</n8n-text>
				</div>
				<div :class="[$style.form, infoTextErrorMessage ? $style.error : '']">
					<n8n-input-label
						size="medium"
						:bold="false"
						:class="$style.labelTooltip"
						:label="i18n.baseText('mfa.setup.step1.input.label')"
					>
						<n8n-input
							v-model="authenticatorCode"
							type="text"
							:maxlength="6"
							:placeholder="i18n.baseText('mfa.code.input.placeholder')"
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
						i18n.baseText('mfa.setup.step2.description')
					}}</n8n-text>
				</div>
				<div :class="$style.recoveryCodesContainer">
					<div v-for="recoveryCode in recoveryCodes" :key="recoveryCode">
						<n8n-text size="medium">{{ recoveryCode }}</n8n-text>
					</div>
				</div>
				<n8n-info-tip :bold="false" :class="$style['edit-mode-footer-infotip']">
					<I18nT keypath="mfa.setup.step2.infobox.description" tag="span" scope="global">
						<template #part1>
							{{ i18n.baseText('mfa.setup.step2.infobox.description.part1') }}
						</template>
						<template #part2>
							<n8n-text size="small" :bold="true" :class="$style.loseAccessText">
								{{ i18n.baseText('mfa.setup.step2.infobox.description.part2') }}
							</n8n-text>
						</template>
					</I18nT>
				</n8n-info-tip>
				<div>
					<n8n-button
						type="primary"
						icon="hard-drive-download"
						float="right"
						:label="i18n.baseText('mfa.setup.step2.button.download')"
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
						:label="i18n.baseText('mfa.setup.step2.button.save')"
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
						:label="i18n.baseText('mfa.setup.step1.button.continue')"
						size="large"
						:disabled="!readyToSubmit"
						@click="onSaveClick"
					/>
				</div>
			</div>
		</template>
	</Modal>
</template>

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
	margin: 0;
	margin-bottom: 5px;
}

.formContainer {
	padding-bottom: var(--spacing-xl);
}

.qrContainer {
	text-align: center;

	canvas {
		border: 4px solid var(--color-qr-code-border);
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
