import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';

/** How n8n Assistant shows up next to agents in the n8n Chat picker and library. */
export function useN8nAssistantIdentity() {
	const i18n = useI18n();
	return {
		name: computed(() => i18n.baseText('instanceAi.view.title')),
		description: computed(() => i18n.baseText('agents.n8nChatPage.picker.assistantDescription')),
	};
}
