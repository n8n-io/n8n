<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useToast } from '@/composables/useToast';
import { CHANGE_PASSWORD_MODAL_KEY } from '../constants';
import Modal from '@/components/Modal.vue';
import { useUsersStore } from '@/stores/users.store';
import { createFormEventBus } from '@n8n/design-system/utils';
import { createEventBus } from '@n8n/utils/event-bus';
import type { IFormInputs, IFormInput, FormFieldValueUpdate, FormValues } from '@/Interface';
import { useI18n } from '@n8n/i18n';

import { N8nButton, N8nFormInputs } from '@n8n/design-system';
const config = ref<IFormInputs | null>(null);
const formBus = createFormEventBus();
const modalBus = createEventBus();
const password = ref('');
const loading = ref(false);

const i18n = useI18n();
const { showMessage, showError } = useToast();
const usersStore = useUsersStore();

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
				validationRules: [{ name: 'DEFAULT_PASSWORD_RULES' }],
				infoText: i18n.baseText('auth.defaultPasswordRequirements'),
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
