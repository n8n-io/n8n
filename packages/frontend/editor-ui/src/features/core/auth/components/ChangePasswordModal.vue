<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { CHANGE_PASSWORD_MODAL_KEY } from '@/app/constants';
import Modal from '@/app/components/Modal.vue';
import { useUsersStore } from '@/features/settings/users/users.store';
import { createFormEventBus } from '@n8n/design-system/utils';
import { createEventBus } from '@n8n/utils/event-bus';
import type { IFormInputs, IFormInput, FormFieldValueUpdate, FormValues } from '@/Interface';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useMfaReverify } from '../composables/useMfaReverify';

import { N8nButton, N8nFormInputs, createPasswordRules } from '@n8n/design-system';
const config = ref<IFormInputs | null>(null);
const formBus = createFormEventBus();
const modalBus = createEventBus();
const password = ref('');
const loading = ref(false);

const i18n = useI18n();
const { showMessage, showError } = useToast();
const usersStore = useUsersStore();
const settingsStore = useSettingsStore();
const passwordMinLength = settingsStore.userManagement.passwordMinLength ?? 8;
const { reverify } = useMfaReverify();

const activeMfaMethod = computed(() => usersStore.currentUser?.mfaMethod ?? null);
const isWebauthnMfa = computed(
	() => activeMfaMethod.value === 'passkey' || activeMfaMethod.value === 'security_key',
);

const passwordsMatch = (value: string | number | boolean | null | undefined) => {
	if (typeof value !== 'string') {
		return false;
	}

	if (value !== password.value) {
		return {
			messageKey: 'auth.changePassword.passwordsMustMatchError',
		};
	}

	return false;
};

const onInput = (e: FormFieldValueUpdate) => {
	if (e.name === 'password' && typeof e.value === 'string') {
		password.value = e.value;
	}
};

const onSubmit = async (data: FormValues) => {
	const values = data as { currentPassword: string; password: string; mfaCode?: string };
	try {
		loading.value = true;
		let proof: { mfaCode?: string; mfaRecoveryCode?: string; webauthnResponse?: unknown } = {};
		if (usersStore.currentUser?.mfaEnabled) {
			if (isWebauthnMfa.value) {
				const result = await reverify();
				if (!result) {
					loading.value = false;
					return;
				}
				proof = result;
			} else {
				proof = { mfaCode: values.mfaCode };
			}
		}
		await usersStore.updateCurrentUserPassword({
			currentPassword: values.currentPassword,
			newPassword: values.password,
			...proof,
		});

		showMessage({
			type: 'success',
			title: i18n.baseText('auth.changePassword.passwordUpdated'),
			message: i18n.baseText('auth.changePassword.passwordUpdatedMessage'),
		});

		modalBus.emit('close');
	} catch (error) {
		showError(error, i18n.baseText('auth.changePassword.error'));
	} finally {
		loading.value = false;
	}
};

const onSubmitClick = () => {
	formBus.emit('submit');
};

onMounted(() => {
	const inputs: Record<string, IFormInput> = {
		currentPassword: {
			name: 'currentPassword',
			properties: {
				label: i18n.baseText('auth.changePassword.currentPassword'),
				type: 'password',
				required: true,
				autocomplete: 'current-password',
				capitalize: true,
				focusInitially: true,
			},
		},
		mfaCode: {
			name: 'mfaCode',
			properties: {
				label: i18n.baseText('auth.changePassword.mfaCode'),
				type: 'text',
				required: true,
				capitalize: true,
			},
		},
		newPassword: {
			name: 'password',
			properties: {
				label: i18n.baseText('auth.newPassword'),
				type: 'password',
				required: true,
				validationRules: [createPasswordRules(passwordMinLength)],
				infoText: i18n.baseText('auth.defaultPasswordRequirements', {
					interpolate: { minimum: passwordMinLength },
				}),
				autocomplete: 'new-password',
				capitalize: true,
			},
		},
		newPasswordAgain: {
			name: 'password2',
			properties: {
				label: i18n.baseText('auth.changePassword.reenterNewPassword'),
				type: 'password',
				required: true,
				validators: {
					TWO_PASSWORDS_MATCH: {
						validate: passwordsMatch,
					},
				},
				validationRules: [{ name: 'TWO_PASSWORDS_MATCH' }],
				autocomplete: 'new-password',
				capitalize: true,
			},
		},
	};

	const { currentUser } = usersStore;

	// Only TOTP users see the inline MFA code field; passkey/security-key users
	// will be prompted via a webauthn ceremony at submit time.
	const form: IFormInputs =
		currentUser?.mfaEnabled && !isWebauthnMfa.value
			? [inputs.currentPassword, inputs.mfaCode, inputs.newPassword, inputs.newPasswordAgain]
			: [inputs.currentPassword, inputs.newPassword, inputs.newPasswordAgain];

	config.value = form;
});
</script>

<template>
	<Modal
		:name="CHANGE_PASSWORD_MODAL_KEY"
		:title="i18n.baseText('auth.changePassword')"
		:center="true"
		width="460px"
		:event-bus="modalBus"
		@enter="onSubmitClick"
	>
		<template #content>
			<N8nFormInputs
				v-if="config"
				:inputs="config"
				:event-bus="formBus"
				:column-view="true"
				@update="onInput"
				@submit="onSubmit"
			/>
		</template>
		<template #footer>
			<N8nButton
				:loading="loading"
				:label="i18n.baseText('auth.changePassword')"
				float="right"
				data-test-id="change-password-button"
				@click="onSubmitClick"
			/>
		</template>
	</Modal>
</template>
