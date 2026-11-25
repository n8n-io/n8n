<script setup lang="ts">
import { N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { computed } from 'vue';

const settingsStore = useSettingsStore();
const i18n = useI18n();

const noticeKey = computed(() => {
	const instanceAi = settingsStore.moduleSettings['instance-ai'];
	if (instanceAi?.enabled === false) {
		return 'selfHealing.config.assistantDisabledNotice';
	}
	if (instanceAi?.setupCompleted === false) {
		return 'selfHealing.config.assistantSetupIncompleteNotice';
	}
	return null;
});
</script>

<template>
	<N8nCallout v-if="noticeKey" theme="warning" data-test-id="self-healing-assistant-notice">
		{{ i18n.baseText(noticeKey) }}
	</N8nCallout>
</template>
