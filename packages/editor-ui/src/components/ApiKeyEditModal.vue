<script lang="ts" setup>
import Modal from '@/components/Modal.vue';
import { API_KEY_EDIT_MODAL_KEY } from '@/constants';
import { onMounted, ref } from 'vue';
import { useUIStore } from '@/stores/ui.store';
import { createEventBus } from 'n8n-design-system/utils';
import { useTelemetry } from '@/composables/useTelemetry';
import { useI18n } from '@/composables/useI18n';
import { useUsersStore } from '@/stores/users.store';
import { useSettingsStore } from '@/stores/settings.store';
import type { ApiKey } from '@/Interface';

const telemetry = useTelemetry();
const i18n = useI18n();

const uiStore = useUIStore();
const usersStore = useUsersStore();
const settingsStore = useSettingsStore();

const label = ref('');
const modalBus = createEventBus();
const newApiKey = ref<ApiKey | null>(null);

const inputRef = ref<HTMLTextAreaElement | null>(null);

onMounted(() => {
	setTimeout(() => {
		inputRef.value?.focus();
	});
});

function onInput(value: string): void {
	label.value = value;
}

const onSave = async () => {
	if (!label.value) {
		return;
	}

	newApiKey.value = await settingsStore.createApiKey(label.value);
};
</script>

<template>
	<Modal
		title="Create API Key"
		:event-bus="modalBus"
		:name="API_KEY_EDIT_MODAL_KEY"
		width="600px"
		:lock-scroll="false"
	>
		<template #content>
			<div :class="$style.container">
				<n8n-card v-if="newApiKey" class="mb-4xs" :class="$style.card">
					<CopyInput
						:label="newApiKey.label"
						:value="newApiKey.apiKey"
						:copy-button-text="i18n.baseText('generic.clickToCopy')"
						:toast-title="i18n.baseText('settings.api.view.copy.toast')"
						:hint="i18n.baseText('settings.api.view.copy')"
					/>
				</n8n-card>

				<N8nInputLabel v-else label="Label" color="text-dark">
					<N8nInput
						ref="inputRef"
						required
						:model-value="label"
						type="text"
						placeholder="e.g Internal Project"
						@update:model-value="onInput"
					/>
				</N8nInputLabel>
			</div>
		</template>
		<template #footer>
			<div>
				<N8nButton float="right" :label="newApiKey ? 'Close' : 'Save'" @click="onSave" />
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.modalFooter {
	justify-content: space-between;
	display: flex;
	flex-direction: row;
}

.notice {
	margin: 0;
}

.container > * {
	margin-bottom: var(--spacing-s);
	&:last-child {
		margin-bottom: 0;
	}
}
</style>
