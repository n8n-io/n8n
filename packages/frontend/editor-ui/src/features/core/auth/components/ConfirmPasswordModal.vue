<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { CONFIRM_PASSWORD_MODAL_KEY } from '../auth.constants';
import type { IFormInputs, IFormInput, FormValues } from '@/Interface';
import { useI18n } from '@n8n/i18n';
import { confirmPasswordEventBus } from '../auth.eventBus';
import { useUIStore } from '@/app/stores/ui.store';

import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nFormInputs,
	N8nText,
	createFormEventBus,
} from '@n8n/design-system';

// DynamicModalLoader's modal-state props must not reach the dialog root.
defineOptions({ inheritAttrs: false });
const config = ref<IFormInputs | null>(null);
const formBus = createFormEventBus();
const loading = ref(false);

const i18n = useI18n();
const uiStore = useUIStore();
const modalOpen = computed(() => uiStore.modalsById[CONFIRM_PASSWORD_MODAL_KEY]?.open === true);

function closeDialog() {
	uiStore.closeModal(CONFIRM_PASSWORD_MODAL_KEY);
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) void closeDialog();
}

const onSubmit = (data: FormValues) => {
	const currentPassword = (data as { currentPassword: string }).currentPassword;

	if (!currentPassword) {
		return;
	}

	loading.value = true;

	confirmPasswordEventBus.emit('close', {
		currentPassword,
	});
	void closeDialog();
};

const onSubmitClick = () => {
	formBus.emit('submit');
};

onMounted(() => {
	const inputs: Record<string, IFormInput> = {
		currentPassword: {
			name: 'currentPassword',
			properties: {
				label: i18n.baseText('auth.confirmPassword.currentPassword'),
				type: 'password',
				required: true,
				autocomplete: 'current-password',
				capitalize: true,
				focusInitially: true,
			},
		},
	};

	const form: IFormInputs = [inputs.currentPassword];

	config.value = form;
});
</script>

<template>
	<N8nDialog
		:open="modalOpen"
		size="medium"
		:header="i18n.baseText('auth.confirmPassword')"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogBody>
			<N8nText :class="$style.description" tag="p">{{
				i18n.baseText('auth.confirmPassword.confirmPasswordToChangeEmail')
			}}</N8nText>
			<N8nFormInputs
				v-if="config"
				:inputs="config"
				:event-bus="formBus"
				:column-view="true"
				@submit="onSubmit"
			/>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				:loading="loading"
				:label="i18n.baseText('generic.confirm')"
				float="right"
				data-test-id="confirm-password-button"
				@click="onSubmitClick"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>
<style lang="scss" module>
.description {
	margin-bottom: var(--spacing--sm);
}
</style>
