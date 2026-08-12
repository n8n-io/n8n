import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';

import { AI_ERROR_EXPLANATION_MODAL_KEY } from './constants';

export const AiAssistantModule: FrontendModuleDescription = {
	id: 'ai-assistant',
	name: 'AI Assistant',
	description: 'AI help in the workflow editor.',
	icon: 'sparkles',
	modals: [
		{
			key: AI_ERROR_EXPLANATION_MODAL_KEY,
			component: async () => await import('./components/AiErrorExplanationModal.vue'),
			initialState: {
				open: false,
				data: {
					loadExplanation: async () => ({ detailed: '' }),
					applyFix: async () => {},
				},
			},
		},
	],
};
