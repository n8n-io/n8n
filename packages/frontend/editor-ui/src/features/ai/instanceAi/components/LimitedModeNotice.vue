<script lang="ts" setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { VIEWS } from '@/app/constants';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';

const i18n = useI18n();
const settingsStore = useSettingsStore();
const instanceAiSettingsStore = useInstanceAiSettingsStore();

const isLimited = computed(() => !settingsStore.isAiDataSharingEnabled);
</script>

<template>
	<N8nCallout
		v-if="isLimited"
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
