import { computed } from 'vue';
import type { AgentJsonConfig } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';

// The Assistant has no personalisation of its own: a sparkle on its brand gradient tokens,
// so the tile follows the theme like the rest of the Assistant UI.
const N8N_ASSISTANT_PERSONALISATION: AgentJsonConfig['personalisation'] = {
	icon: 'sparkles',
	gradient: {
		from: 'var(--assistant--color--highlight-1)',
		to: 'var(--assistant--color--highlight-3)',
		angle: 135,
		fromStop: 0,
		toStop: 100,
	},
};

/** How n8n Assistant shows up next to agents in the n8n Chat picker and library. */
export function useN8nAssistantIdentity() {
	const i18n = useI18n();
	return {
		name: computed(() => i18n.baseText('instanceAi.view.title')),
		description: computed(() => i18n.baseText('agents.n8nChatPage.picker.assistantDescription')),
		personalisation: N8N_ASSISTANT_PERSONALISATION,
	};
}
