<script lang="ts" setup>
import { computed } from 'vue';
import { I18nT } from 'vue-i18n';
import { useLocalStorage } from '@vueuse/core';
import { N8nIconButton, N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { LOCAL_STORAGE_INSTANCE_AI_MODEL_TRAINING_NOTICE_DISMISSED } from '@/app/constants';
import { INSTANCE_AI_SETTINGS_VIEW } from '../constants';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';

const i18n = useI18n();
const settingsStore = useSettingsStore();
const usersStore = useUsersStore();
const instanceAiSettingsStore = useInstanceAiSettingsStore();

const isDismissed = useLocalStorage(
	() => LOCAL_STORAGE_INSTANCE_AI_MODEL_TRAINING_NOTICE_DISMISSED(usersStore.currentUserId ?? ''),
	false,
	{ writeDefaults: false },
);

// Only users who can opt the instance out see the notice.
const isVisible = computed(
	() =>
		instanceAiSettingsStore.isModelTrainingOptOutAvailable &&
		instanceAiSettingsStore.canManageAiUsage &&
		settingsStore.settings.ai?.allowModelTraining === true &&
		!isDismissed.value,
);
</script>

<template>
	<div v-if="isVisible" :class="$style.notice" data-test-id="instance-ai-model-training-notice">
		<N8nText size="small" color="text-base">
			<I18nT keypath="instanceAi.modelTrainingNotice.text" scope="global">
				<template #settings>
					<N8nLink
						:to="{ name: INSTANCE_AI_SETTINGS_VIEW }"
						theme="text"
						size="small"
						data-test-id="instance-ai-model-training-notice-settings-link"
					>
						{{ i18n.baseText('instanceAi.modelTrainingNotice.settingsLink') }}
					</N8nLink>
				</template>
			</I18nT>
		</N8nText>
		<N8nIconButton
			icon="x"
			variant="ghost"
			size="small"
			:aria-label="i18n.baseText('generic.dismiss')"
			:title="i18n.baseText('generic.dismiss')"
			data-test-id="instance-ai-model-training-notice-dismiss"
			@click="isDismissed = true"
		/>
	</div>
</template>

<style lang="scss" module>
.notice {
	position: relative;
	z-index: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
}
</style>
