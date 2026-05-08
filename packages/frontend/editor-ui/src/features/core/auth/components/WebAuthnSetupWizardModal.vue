<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nInfoTip, N8nInput, N8nInputLabel } from '@n8n/design-system';

import Modal from '@/app/components/Modal.vue';
import { VIEWS, WEBAUTHN_SETUP_WIZARD_MODAL_KEY } from '@/app/constants';
import router from '@/app/router';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useToast } from '@/app/composables/useToast';
import { useUsersStore } from '@/features/settings/users/users.store';
import { twoFactorWizardBus, type TwoFactorMethod } from '../auth.eventBus';
import MfaWizardSteps from './MfaWizardSteps.vue';

const props = defineProps<{
	data?: { method: 'passkey' | 'security_key' };
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const settingsStore = useSettingsStore();
const toast = useToast();

const method = computed<'passkey' | 'security_key'>(() => props.data?.method ?? 'passkey');
const attachment = computed<'platform' | 'cross-platform'>(() =>
	method.value === 'passkey' ? 'platform' : 'cross-platform',
);

const label = ref('');
const submitting = ref(false);

const title = computed(() =>
	method.value === 'passkey'
		? i18n.baseText('settings.personal.twoFactor.passkeyWizard.title')
		: i18n.baseText('settings.personal.twoFactor.securityKeyWizard.title'),
);

const heading = computed(() =>
	method.value === 'passkey'
		? i18n.baseText('settings.personal.twoFactor.passkeyWizard.heading')
		: i18n.baseText('settings.personal.twoFactor.securityKeyWizard.heading'),
);

const description = computed(() =>
	method.value === 'passkey'
		? i18n.baseText('settings.personal.twoFactor.passkeyWizard.description')
		: i18n.baseText('settings.personal.twoFactor.securityKeyWizard.description'),
);

const labelFieldLabel = computed(() =>
	method.value === 'passkey'
		? i18n.baseText('settings.personal.twoFactor.passkeyWizard.label')
		: i18n.baseText('settings.personal.twoFactor.securityKeyWizard.label'),
);

const labelFieldPlaceholder = computed(() =>
	method.value === 'passkey'
		? i18n.baseText('settings.personal.twoFactor.passkeyWizard.label.placeholder')
		: i18n.baseText('settings.personal.twoFactor.securityKeyWizard.label.placeholder'),
);

const submitLabel = computed(() =>
	method.value === 'passkey'
		? i18n.baseText('settings.personal.twoFactor.passkeyWizard.register')
		: i18n.baseText('settings.personal.twoFactor.securityKeyWizard.register'),
);

const tone = computed(() => (method.value === 'passkey' ? 'passkey' : 'security_key'));

const onCancel = () => {
	twoFactorWizardBus.emit('cancelled');
	uiStore.closeModal(WEBAUTHN_SETUP_WIZARD_MODAL_KEY);
};

const onRegister = async () => {
	if (!label.value.trim()) return;
	submitting.value = true;
	try {
		await usersStore.registerWebAuthnCredential(label.value.trim(), attachment.value);
		const completed: TwoFactorMethod = method.value;
		toast.showMessage({
			type: 'success',
			title: i18n.baseText(`settings.personal.twoFactor.toast.enabled.${completed}.title` as never),
			message: i18n.baseText(
				`settings.personal.twoFactor.toast.enabled.${completed}.message` as never,
			),
		});
		twoFactorWizardBus.emit('completed', { method: completed });
		uiStore.closeModal(WEBAUTHN_SETUP_WIZARD_MODAL_KEY);
		if (settingsStore.isMFAEnforced) {
			await usersStore.logout();
			await router.push({ name: VIEWS.SIGNIN });
		}
	} catch (e) {
		toast.showError(e, i18n.baseText('settings.personal.twoFactor.toast.error.title'));
	} finally {
		submitting.value = false;
	}
};
</script>

<template>
	<Modal width="460px" :title="title" :name="WEBAUTHN_SETUP_WIZARD_MODAL_KEY" :center="true">
		<template #content>
			<MfaWizardSteps :current="2" :total="2" />
			<div :class="$style.stepLabel">
				{{
					i18n.baseText('settings.personal.twoFactor.passkeyWizard.step', {
						interpolate: { current: 2, total: 2 },
					})
				}}
			</div>
			<div :class="[$style.bigIcon, $style[`tone_${tone}`]]">
				<N8nIcon :icon="method === 'passkey' ? 'fingerprint' : 'key-round'" :size="36" />
			</div>
			<div :class="$style.heading">{{ heading }}</div>
			<div :class="$style.description">{{ description }}</div>
			<N8nInputLabel :label="labelFieldLabel" :class="$style.labelField">
				<N8nInput
					v-model="label"
					:placeholder="labelFieldPlaceholder"
					data-test-id="mfa-webauthn-label-input"
				/>
			</N8nInputLabel>
			<N8nInfoTip
				v-if="method === 'security_key'"
				theme="info"
				:class="$style.infoTip"
				data-test-id="mfa-webauthn-pin-info"
			>
				{{ i18n.baseText('settings.personal.twoFactor.securityKeyWizard.info') }}
			</N8nInfoTip>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton variant="subtle" @click="onCancel">
					{{ i18n.baseText('settings.personal.twoFactor.back') }}
				</N8nButton>
				<N8nButton
					:loading="submitting"
					:disabled="!label.trim()"
					data-test-id="mfa-webauthn-register-button"
					@click="onRegister"
				>
					{{ submitLabel }}
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

.bigIcon {
	width: calc(var(--spacing--3xl) + var(--spacing--xs));
	height: calc(var(--spacing--3xl) + var(--spacing--xs));
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin: var(--spacing--xs) auto var(--spacing--sm);
	font-size: var(--font-size--2xl);
}

.tone_passkey {
	background: var(--color--blue-alpha-100);
	color: var(--color--blue-500);
}

.tone_security_key {
	background: var(--color--orange-alpha-100);
	color: var(--color--orange-500);
}

.heading {
	text-align: center;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	color: var(--color--text);
	margin-bottom: var(--spacing--3xs);
}

.description {
	text-align: center;
	font-size: var(--font-size--xs);
	color: var(--color--text--tint-1);
	line-height: 1.5;
	margin-bottom: var(--spacing--sm);
}

.labelField {
	margin-bottom: var(--spacing--xs);
}

.infoTip {
	margin-bottom: 0;
}

.footer {
	display: flex;
	gap: var(--spacing--3xs);
	justify-content: flex-end;
}
</style>
