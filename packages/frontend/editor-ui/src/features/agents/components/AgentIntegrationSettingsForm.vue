<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { AgentIntegrationSettings, AgentTelegramIntegrationSettings } from '@n8n/api-types';

import { resolveSavedTelegramSettings } from '../utils/telegramAccessSettings';
import AgentTelegramAccessSettingsForm from './AgentTelegramAccessSettingsForm.vue';
import AgentSlackSettingsForm from './AgentSlackSettingsForm.vue';

const props = withDefaults(
	defineProps<{
		type: string;
		disabled?: boolean;
		connected?: boolean;
		savedSettings?: AgentIntegrationSettings;
		agentName?: string;
		projectId?: string;
		agentId?: string;
		setupSlackApp?: (appConfigurationToken: string) => Promise<boolean>;
	}>(),
	{
		disabled: false,
		connected: false,
		savedSettings: undefined,
		agentName: '',
		projectId: '',
		agentId: '',
		setupSlackApp: undefined,
	},
);

const telegramFormRef = ref<InstanceType<typeof AgentTelegramAccessSettingsForm>>();

const telegramSavedSettings = computed<AgentTelegramIntegrationSettings | undefined>(() =>
	resolveSavedTelegramSettings(props.savedSettings, props.connected),
);

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
		v-if="props.type === 'telegram'"
		ref="telegramFormRef"
		:disabled="disabled"
		:saved-settings="telegramSavedSettings"
	/>
	<AgentSlackSettingsForm
		v-else-if="props.type === 'slack'"
		:agent-name="agentName"
		:project-id="projectId"
		:agent-id="agentId"
		:connected="connected"
		:disabled="disabled"
		:setup-slack-app="setupSlackApp"
	>
		<template #manualConfiguration>
			<slot name="manualConfiguration" />
		</template>
	</AgentSlackSettingsForm>
</template>
