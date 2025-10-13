<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { CONFIRM_PASSWORD_MODAL_KEY } from '../../constants';
import Modal from '@/components/Modal.vue';
import { createFormEventBus } from '@n8n/design-system/utils';
import type { IFormInputs, IFormInput, FormValues } from '@/Interface';
import { useI18n } from '@n8n/i18n';
import { confirmPasswordEventBus } from './confirm-password.event-bus';

import { N8nButton, N8nFormInputs, N8nText } from '@n8n/design-system';
const config = ref<IFormInputs | null>(null);
const formBus = createFormEventBus();
const loading = ref(false);

const i18n = useI18n();

const onSubmit = (data: FormValues) => {
	const currentPassword = (data as { currentPassword: string }).currentPassword;

	if (!currentPassword) {
		return;
	}

	loading.value = true;

	confirmPasswordEventBus.emit('close', {
		currentPassword,
	});
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
	<Modal
		:name="CONFIRM_PASSWORD_MODAL_KEY"
		:title="i18n.baseText('auth.confirmPassword')"
		:center="true"
		width="460px"
		:event-bus="confirmPasswordEventBus"
		@enter="onSubmitClick"
	>
		<template #content>
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
		</template>
		<template #footer>
			<N8nButton
				:loading="loading"
				:label="i18n.baseText('generic.confirm')"
				float="right"
				data-test-id="confirm-password-button"
				@click="onSubmitClick"
			/>
		</template>
	</Modal>
</template>
<style lang="scss" module>
.description {
	margin-bottom: var(--spacing--sm);
}
</style>
