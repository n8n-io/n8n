<script lang="ts" setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useLocalStorage } from '@vueuse/core';
import { N8nCallout, N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { LOCAL_STORAGE_INSTANCE_AI_LIMITED_MODE_DISMISSED, VIEWS } from '@/app/constants';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';

const i18n = useI18n();
const settingsStore = useSettingsStore();
const usersStore = useUsersStore();
const instanceAiSettingsStore = useInstanceAiSettingsStore();

const isDismissed = useLocalStorage(
	() => LOCAL_STORAGE_INSTANCE_AI_LIMITED_MODE_DISMISSED(usersStore.currentUserId ?? ''),
	false,
	{ writeDefaults: false },
);

const isLimited = computed(() => !settingsStore.isAiDataSharingEnabled);
</script>

<template>
	<N8nCallout
		v-if="isLimited && !isDismissed"
		:class="$style.notice"
		theme="warning"
		data-test-id="instance-ai-limited-mode-notice"
	>
		<span :class="$style.copy">
			<strong>{{ i18n.baseText('instanceAi.limitedMode.title') }}</strong>
			<span>{{ i18n.baseText('instanceAi.limitedMode.description') }}</span>
			<RouterLink
				v-if="instanceAiSettingsStore.canManageAiUsage"
				:to="{ name: VIEWS.AI_SETTINGS }"
				data-test-id="instance-ai-limited-mode-settings-link"
			>
				{{ i18n.baseText('instanceAi.limitedMode.settingsLink') }}
			</RouterLink>
			<span v-else>{{ i18n.baseText('instanceAi.limitedMode.askAdmin') }}</span>
		</span>
		<template #trailingContent>
			<N8nIconButton
				icon="x"
				variant="ghost"
				size="small"
				:aria-label="i18n.baseText('generic.dismiss')"
				:title="i18n.baseText('generic.dismiss')"
				data-test-id="instance-ai-limited-mode-dismiss"
				@click="isDismissed = true"
			/>
		</template>
	</N8nCallout>
</template>

<style lang="scss" module>
.notice {
	width: 100%;
}

.copy {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
</style>
