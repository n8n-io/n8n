<template>
	<Modal
		:name="CHANGE_PASSWORD_MODAL_KEY"
		:title="i18n.baseText('auth.changePassword')"
		:center="true"
		width="460px"
		:event-bus="modalBus"
		@enter="onSubmit"
	>
		<template #content>
			<n8n-form-inputs
				:inputs="config"
				:event-bus="formBus"
				:column-view="true"
				@update="onInput"
				@submit="onSubmit"
			/>
		</template>
		<template #footer>
			<n8n-button
				:loading="loading"
				:label="i18n.baseText('auth.changePassword')"
				float="right"
				data-test-id="change-password-button"
				@click="onSubmitClick"
			/>
		</template>
	</Modal>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useToast } from '@/composables/useToast';
import { CHANGE_PASSWORD_MODAL_KEY } from '../constants';
import Modal from '@/components/Modal.vue';
import { useUsersStore } from '@/stores/users.store';
import { createEventBus } from 'n8n-design-system/utils';
import type { IFormInputs } from '@/Interface';
import { useI18n } from '@/composables/useI18n';

const config = ref<IFormInputs | null>(null);
const formBus = createEventBus();
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

const onInput = (e: { name: string; value: string }) => {
	if (e.name === 'password') {
		password.value = e.value;
	}
};

const onSubmit = async (values: { currentPassword: string; password: string }) => {
	try {
		loading.value = true;
		await usersStore.updateCurrentUserPassword(values);

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
	const form: IFormInputs = [
		{
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
		{
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
		{
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
	];

	config.value = form;
});
</script>
