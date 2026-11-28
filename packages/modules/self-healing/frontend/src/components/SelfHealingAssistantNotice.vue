<script setup lang="ts">
import { N8nCallout, N8nLink } from '@n8n/design-system';
import { INSTANCE_AI_SETTINGS_VIEW } from '@n8n/frontend-constants/instance-ai';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { computed } from 'vue';

const settingsStore = useSettingsStore();
const rbacStore = useRBACStore();
const i18n = useI18n();

interface NoticeText {
	reason: BaseTextKey;
	askAdmin: BaseTextKey;
	link: BaseTextKey;
}

const notice = computed<NoticeText | null>(() => {
	const instanceAi = settingsStore.moduleSettings['instance-ai'];
	if (instanceAi?.enabled === false) {
		return {
			reason: 'selfHealing.config.assistantDisabledNotice',
			askAdmin: 'selfHealing.config.assistantDisabledNotice.askAdmin',
			link: 'selfHealing.config.assistantDisabledNotice.link',
		};
	}
	if (instanceAi?.modelAndSandboxConfigured === false) {
		return {
			reason: 'selfHealing.config.assistantSetupIncompleteNotice',
			askAdmin: 'selfHealing.config.assistantSetupIncompleteNotice.askAdmin',
			link: 'selfHealing.config.assistantSetupIncompleteNotice.link',
		};
	}
	return null;
});

// Only users who manage the Assistant can open its settings page.
const canManageAssistant = computed(() => rbacStore.hasScope('instanceAi:manage'));
</script>

<template>
	<N8nCallout v-if="notice" theme="warning" data-test-id="self-healing-assistant-notice">
		{{ i18n.baseText(notice.reason) }}
		<N8nLink
			v-if="canManageAssistant"
			:to="{ name: INSTANCE_AI_SETTINGS_VIEW }"
			size="small"
			theme="text"
			bold
			underline
			data-test-id="self-healing-assistant-notice-link"
			>{{ i18n.baseText(notice.link) }}</N8nLink
		>
		<template v-else>{{ i18n.baseText(notice.askAdmin) }}</template>
	</N8nCallout>
</template>
