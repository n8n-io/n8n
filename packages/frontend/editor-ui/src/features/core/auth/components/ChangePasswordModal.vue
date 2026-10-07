<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useToast } from '@n8n/composables/useToast';
import { CHANGE_PASSWORD_MODAL_KEY } from '../auth.constants';
import { useUsersStore } from '@n8n/stores/users.store';
import type { IFormInputs, IFormInput, FormFieldValueUpdate, FormValues } from '@/Interface';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';

import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nFormInputs,
	createFormEventBus,
	createPasswordRules,
} from '@n8n/design-system';

// DynamicModalLoader's modal-state props must not reach the dialog root.
defineOptions({ inheritAttrs: false });
const config = ref<IFormInputs | null>(null);
const formBus = createFormEventBus();
const password = ref('');
const loading = ref(false);

const i18n = useI18n();
const uiStore = useUIStore();
const modalOpen = computed(() => uiStore.modalsById[CHANGE_PASSWORD_MODAL_KEY]?.open === true);
const { showMessage, showError } = useToast();
const usersStore = useUsersStore();
const settingsStore = useSettingsStore();
const passwordMinLength = settingsStore.userManagement.passwordMinLength ?? 8;

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
		await usersStore.updateCurrentUserPassword({
			currentPassword: values.currentPassword,
			newPassword: values.password,
			mfaCode: values.mfaCode,
		});

		showMessage({
			type: 'success',
			title: i18n.baseText('auth.changePassword.passwordUpdated'),
			message: i18n.baseText('auth.changePassword.passwordUpdatedMessage'),
		});

		void closeDialog();
	} catch (error) {
		showError(error, i18n.baseText('auth.changePassword.error'));
	} finally {
		loading.value = false;
	}
};

const onSubmitClick = () => {
	formBus.emit('submit');
};

function closeDialog() {
	uiStore.closeModal(CHANGE_PASSWORD_MODAL_KEY);
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) void closeDialog();
}

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

	const form: IFormInputs = currentUser?.mfaEnabled
		? [inputs.currentPassword, inputs.mfaCode, inputs.newPassword, inputs.newPasswordAgain]
		: [inputs.currentPassword, inputs.newPassword, inputs.newPasswordAgain];

	config.value = form;
});
</script>

<template>
	<N8nDialog
		:open="modalOpen"
		size="medium"
		:header="i18n.baseText('auth.changePassword')"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogBody>
			<N8nFormInputs
				v-if="config"
				:inputs="config"
				:event-bus="formBus"
				:column-view="true"
				@update="onInput"
				@submit="onSubmit"
			/>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				:loading="loading"
				:label="i18n.baseText('auth.changePassword')"
				float="right"
				data-test-id="change-password-button"
				@click="onSubmitClick"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>
