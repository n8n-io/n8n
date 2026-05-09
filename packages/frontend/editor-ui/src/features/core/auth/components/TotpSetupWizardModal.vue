<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { I18nT } from 'vue-i18n';
import { useI18n } from '@n8n/i18n';
//@ts-ignore
import QrcodeVue from 'qrcode.vue';
import {
	N8nButton,
	N8nInfoTip,
	N8nInput,
	N8nInputLabel,
	N8nNotice,
	N8nText,
} from '@n8n/design-system';

import Modal from '@/app/components/Modal.vue';
import {
	MFA_AUTHENTICATION_CODE_INPUT_MAX_LENGTH,
	MFA_AUTHENTICATION_CODE_WINDOW_EXPIRED,
	TOTP_SETUP_WIZARD_MODAL_KEY,
} from '@/app/constants';
import { useToast } from '@/app/composables/useToast';
import { useClipboard } from '@/app/composables/useClipboard';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useUIStore } from '@/app/stores/ui.store';
import { twoFactorWizardBus } from '../auth.eventBus';
import MfaWizardSteps from './MfaWizardSteps.vue';

const props = defineProps<{
	data?: { replacing?: 'totp' | 'passkey' | 'security_key' | null };
}>();

const i18n = useI18n();
const usersStore = useUsersStore();
const toast = useToast();
const clipboard = useClipboard();
const uiStore = useUIStore();

const secret = ref('');
const qrCode = ref('');
const recoveryCodes = ref<string[]>([]);
const recoveryCodesDownloaded = ref(false);
const authenticatorCode = ref('');
const infoTextErrorMessage = ref('');
const loadingQrCode = ref(true);
const showRecoveryCodes = ref(false);
const submitting = ref(false);

const replacing = computed(() => props.data?.replacing ?? null);
const replaceWarning = computed(() => {
	if (!replacing.value) return '';
	return i18n.baseText(`settings.personal.twoFactor.replaceWarning.${replacing.value}` as never);
});

const onCopySecretToClipboard = () => {
	void clipboard.copy(secret.value);
	toast.showToast({
		title: i18n.baseText('mfa.setup.step1.toast.copyToClipboard.title'),
		message: i18n.baseText('mfa.setup.step1.toast.copyToClipboard.message'),
		type: 'success',
	});
};

const verifying = ref(false);

const verifyCode = async () => {
	if (authenticatorCode.value.length !== MFA_AUTHENTICATION_CODE_INPUT_MAX_LENGTH) return;
	if (verifying.value) return;
	verifying.value = true;
	try {
		await usersStore.verifyMfaCode({ mfaCode: authenticatorCode.value });
		showRecoveryCodes.value = true;
	} catch {
		infoTextErrorMessage.value = i18n.baseText('mfa.setup.invalidCode');
	} finally {
		verifying.value = false;
	}
};

const onInput = () => {
	if (infoTextErrorMessage.value) infoTextErrorMessage.value = '';
	if (authenticatorCode.value.length === MFA_AUTHENTICATION_CODE_INPUT_MAX_LENGTH) {
		void verifyCode();
	}
};

const onContinue = async () => {
	await verifyCode();
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

const onBack = () => {
	if (showRecoveryCodes.value) {
		showRecoveryCodes.value = false;
		return;
	}
	twoFactorWizardBus.emit('back');
	uiStore.closeModal(TOTP_SETUP_WIZARD_MODAL_KEY);
};

const onEnable = async () => {
	submitting.value = true;
	try {
		await usersStore.enableMfa({ mfaCode: authenticatorCode.value });
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('settings.personal.twoFactor.toast.enabled.totp.title'),
			message: i18n.baseText('settings.personal.twoFactor.toast.enabled.totp.message'),
		});
		twoFactorWizardBus.emit('completed', { method: 'totp' });
		uiStore.closeModal(TOTP_SETUP_WIZARD_MODAL_KEY);
	} catch (e) {
		if (e.errorCode === MFA_AUTHENTICATION_CODE_WINDOW_EXPIRED) {
			toast.showMessage({
				type: 'error',
				title: i18n.baseText('mfa.setup.step2.toast.tokenExpired.error.message'),
			});
			return;
		}
		toast.showError(e, i18n.baseText('settings.personal.twoFactor.toast.error.title'));
	} finally {
		submitting.value = false;
	}
};

onMounted(async () => {
	try {
		const response = await usersStore.fetchMfaQR();
		qrCode.value = response.qrCode;
		secret.value = response.secret;
		recoveryCodes.value = response.recoveryCodes;
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.api.view.error'));
	} finally {
		loadingQrCode.value = false;
	}
});
</script>

<template>
	<Modal
		width="460px"
		height="80%"
		max-height="640px"
		:title="i18n.baseText('settings.personal.twoFactor.totpWizard.title')"
		:name="TOTP_SETUP_WIZARD_MODAL_KEY"
		:center="true"
		:loading="loadingQrCode"
	>
		<template #content>
			<MfaWizardSteps :current="showRecoveryCodes ? 3 : 2" :total="3" />
			<div :class="$style.stepLabel">
				<template v-if="!showRecoveryCodes">
					{{
						i18n.baseText('settings.personal.twoFactor.totpWizard.scan.step', {
							interpolate: { current: 2, total: 3 },
						})
					}}
				</template>
				<template v-else>
					{{
						i18n.baseText('settings.personal.twoFactor.totpWizard.recovery.step', {
							interpolate: { current: 3, total: 3 },
						})
					}}
				</template>
			</div>

			<div v-if="!showRecoveryCodes" :class="$style.container">
				<N8nNotice
					v-if="replaceWarning"
					theme="warning"
					:content="replaceWarning"
					data-test-id="mfa-replace-warning"
				/>
				<div :class="$style.textContainer">
					<N8nText size="large" color="text-dark" :bold="true">{{
						i18n.baseText('mfa.setup.step1.instruction1.title')
					}}</N8nText>
				</div>
				<div>
					<N8nText size="medium">
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
					</N8nText>
				</div>
				<div :class="$style.qrContainer">
					<QrcodeVue :value="qrCode" :size="150" level="H" />
				</div>
				<div :class="$style.textContainer">
					<N8nText size="large" color="text-dark" :bold="true">{{
						i18n.baseText('mfa.setup.step1.instruction2.title')
					}}</N8nText>
				</div>
				<div :class="[$style.form, infoTextErrorMessage ? $style.error : '']">
					<N8nInputLabel size="medium" :label="i18n.baseText('mfa.setup.step1.input.label')">
						<N8nInput
							v-model="authenticatorCode"
							type="text"
							:maxlength="6"
							:placeholder="i18n.baseText('mfa.code.input.placeholder')"
							:required="true"
							data-test-id="mfa-token-input"
							@input="onInput"
						/>
					</N8nInputLabel>
					<div :class="[$style.infoText, 'mt-4xs']">
						<span v-text="infoTextErrorMessage"></span>
					</div>
				</div>
			</div>

			<div v-else :class="$style.container">
				<div>
					<N8nText size="medium">{{ i18n.baseText('mfa.setup.step2.description') }}</N8nText>
				</div>
				<div :class="$style.recoveryCodesContainer">
					<div v-for="code in recoveryCodes" :key="code">
						<N8nText size="medium">{{ code }}</N8nText>
					</div>
				</div>
				<N8nInfoTip>
					<I18nT keypath="mfa.setup.step2.infobox.description" tag="span" scope="global">
						<template #part1>
							{{ i18n.baseText('mfa.setup.step2.infobox.description.part1') }}
						</template>
						<template #part2>
							<N8nText size="small" :bold="true" :class="$style.loseAccessText">
								{{ i18n.baseText('mfa.setup.step2.infobox.description.part2') }}
							</N8nText>
						</template>
					</I18nT>
				</N8nInfoTip>
				<div>
					<N8nButton
						variant="solid"
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
			<div :class="$style.footer">
				<N8nButton variant="subtle" @click="onBack">
					{{ i18n.baseText('settings.personal.twoFactor.back') }}
				</N8nButton>
				<N8nButton
					v-if="!showRecoveryCodes"
					:disabled="authenticatorCode.length !== 6"
					:loading="verifying"
					data-test-id="mfa-continue-button"
					@click="onContinue"
				>
					{{ i18n.baseText('settings.personal.twoFactor.picker.continue') }}
				</N8nButton>
				<N8nButton
					v-else
					:disabled="!recoveryCodesDownloaded"
					:loading="submitting"
					data-test-id="mfa-save-button"
					@click="onEnable"
				>
					{{ i18n.baseText('settings.personal.twoFactor.totpWizard.enable') }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.stepLabel {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	letter-spacing: 0.04em;
	margin-bottom: var(--spacing--sm);
	text-transform: uppercase;
	font-weight: var(--font-weight--medium);
}

.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.textContainer {
	text-align: left;
	margin: 0;
}

.qrContainer {
	text-align: center;

	canvas {
		border: 4px solid var(--qr-code--border-color);
	}
}

.recoveryCodesContainer {
	display: flex;
	flex-direction: column;
	background-color: var(--mfa--recovery-code--color--background);
	text-align: center;
	flex-wrap: nowrap;
	justify-content: space-between;
	padding: var(--spacing--xs) 0;
	gap: var(--spacing--xs);
}

.recoveryCodesContainer span {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--regular);
	line-height: var(--spacing--md);
	color: var(--mfa--recovery-code--color);
}

.form input {
	width: 50%;
	height: 30px;
}

.secret {
	color: var(--color--primary);
	font-weight: var(--font-weight--bold);
	cursor: pointer;
}

.loseAccessText {
	color: var(--mfa--lose-access--color--text);
}

.error input {
	border-color: var(--color--danger);
}

.error > div > span {
	color: var(--color--danger);
	font-size: var(--font-size--2xs);
}

.footer {
	display: flex;
	gap: var(--spacing--3xs);
	justify-content: flex-end;
}
</style>
