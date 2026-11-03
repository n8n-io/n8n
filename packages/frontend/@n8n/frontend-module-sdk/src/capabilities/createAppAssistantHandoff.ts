import { computed } from 'vue';

import { declareCapability } from '../declareCapability';
import type { AppAssistantHandoff } from '../types/capability';

/** Call during component setup so the shell can capture its router context. */
export const createAppAssistantHandoff = declareCapability<() => AppAssistantHandoff>(
	'create-app-assistant-handoff',
	{
		fallback: () => ({
			available: computed(() => false),
			openApp: async () => false,
			createApp: async () => {},
		}),
	},
);
