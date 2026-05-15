<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { AgentIntegrationSettings, AgentTelegramIntegrationSettings } from '@n8n/api-types';

import { resolveSavedTelegramSettings } from '../utils/telegramAccessSettings';
import AgentTelegramAccessSettingsForm from './AgentTelegramAccessSettingsForm.vue';

const props = withDefaults(
	defineProps<{
		type: string;
		disabled?: boolean;
		connected?: boolean;
		savedSettings?: AgentIntegrationSettings;
	}>(),
	{ disabled: false, connected: false, savedSettings: undefined },
);

const telegramFormRef = ref<InstanceType<typeof AgentTelegramAccessSettingsForm>>();

const telegramSavedSettings = computed<AgentTelegramIntegrationSettings | undefined>(() =>
	resolveSavedTelegramSettings(props.savedSettings, props.connected),
);

const hasTelegramForm = computed(() => props.type === 'telegram');

const currentSettings = computed<AgentIntegrationSettings | undefined>(
	() => telegramFormRef.value?.currentSettings,
);

const validationError = computed<string | null>(
	() => telegramFormRef.value?.validationError ?? null,
);

const isDirty = computed<boolean>(() => telegramFormRef.value?.isDirty ?? false);

watch(
	() => props.type,
	() => {
		telegramFormRef.value = undefined;
	},
);

defineExpose({ currentSettings, validationError, isDirty });
</script>

<template>
	<AgentTelegramAccessSettingsForm
		v-if="hasTelegramForm"
		ref="telegramFormRef"
		:disabled="disabled"
		:saved-settings="telegramSavedSettings"
	/>
</template>
