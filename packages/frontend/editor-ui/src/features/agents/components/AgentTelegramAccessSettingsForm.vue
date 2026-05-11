<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { N8nCallout, N8nInput, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentTelegramIntegrationSettings } from '@n8n/api-types';

import {
	createTelegramSettings,
	DEFAULT_TELEGRAM_PUBLIC_SETTINGS,
	serializeTelegramUserIds,
	validateTelegramSettings,
	type TelegramSettingsValidationError,
} from '../utils/telegramAccessSettings';

const props = withDefaults(
	defineProps<{
		disabled?: boolean;
		/**
		 * Saved settings — pass `undefined` for fresh setup so the form defaults
		 * to private; for connected legacy integrations pass
		 * `DEFAULT_TELEGRAM_PUBLIC_SETTINGS` so the form starts public.
		 */
		savedSettings?: AgentTelegramIntegrationSettings;
	}>(),
	{ disabled: false, savedSettings: undefined },
);

const i18n = useI18n();

const accessMode = ref<AgentTelegramIntegrationSettings['accessMode']>(
	props.savedSettings?.accessMode ?? 'private',
);
const userIdsInput = ref<string>(
	props.savedSettings ? serializeTelegramUserIds(props.savedSettings.allowedUserIds) : '',
);

// Only sync when saved settings are populated. If the integration disconnects
// the prop becomes undefined — keep whatever the user has typed so they can
// edit and reconnect without retyping the allowlist.
watch(
	() => props.savedSettings,
	(saved) => {
		if (!saved) return;
		accessMode.value = saved.accessMode;
		userIdsInput.value = serializeTelegramUserIds(saved.allowedUserIds);
	},
);

const currentSettings = computed<AgentTelegramIntegrationSettings>(() =>
	createTelegramSettings(accessMode.value, userIdsInput.value),
);

const validationError = computed<TelegramSettingsValidationError | null>(() =>
	validateTelegramSettings(currentSettings.value, userIdsInput.value),
);

const validationErrorText = computed<string>(() => {
	if (validationError.value === 'invalid') {
		return i18n.baseText('agents.builder.addTrigger.telegram.validation.invalid');
	}
	if (validationError.value === 'required') {
		return i18n.baseText('agents.builder.addTrigger.telegram.validation.required');
	}
	return '';
});

const isDirty = computed<boolean>(() => {
	const saved = props.savedSettings ?? DEFAULT_TELEGRAM_PUBLIC_SETTINGS;
	const current = currentSettings.value;
	if (current.accessMode !== saved.accessMode) return true;
	if (current.allowedUserIds.length !== saved.allowedUserIds.length) return true;
	return current.allowedUserIds.some((id, i) => id !== saved.allowedUserIds[i]);
});

defineExpose({ currentSettings, validationError, isDirty });
</script>

<template>
	<div :class="$style.form">
		<div :class="$style.field">
			<N8nText size="small" bold>
				{{ i18n.baseText('agents.builder.addTrigger.telegram.accessMode.label') }}
			</N8nText>
			<N8nSelect
				v-model="accessMode"
				size="small"
				:disabled="disabled"
				data-testid="telegram-access-mode"
			>
				<N8nOption
					value="private"
					:label="i18n.baseText('agents.builder.addTrigger.telegram.accessMode.private')"
				/>
				<N8nOption
					value="public"
					:label="i18n.baseText('agents.builder.addTrigger.telegram.accessMode.public')"
				/>
			</N8nSelect>
		</div>

		<div v-if="accessMode === 'private'" :class="$style.field">
			<N8nText size="small" bold>
				{{ i18n.baseText('agents.builder.addTrigger.telegram.userIds.label') }}
			</N8nText>
			<N8nInput
				v-model="userIdsInput"
				:placeholder="i18n.baseText('agents.builder.addTrigger.telegram.userIds.placeholder')"
				:disabled="disabled"
				data-testid="telegram-user-ids"
			/>
			<N8nText
				v-if="validationError"
				:class="$style.error"
				size="small"
				data-testid="telegram-user-ids-error"
			>
				{{ validationErrorText }}
			</N8nText>
		</div>

		<N8nCallout
			v-else
			:class="$style.warning"
			theme="warning"
			slim
			data-testid="telegram-public-warning"
		>
			{{ i18n.baseText('agents.builder.addTrigger.telegram.public.warning') }}
		</N8nCallout>
	</div>
</template>

<style module lang="scss">
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.warning {
	align-items: flex-start;
}

.error {
	color: var(--color--danger);
}
</style>
