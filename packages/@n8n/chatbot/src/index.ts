import './main.scss';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import type { ChatbotOptions } from '@/types';
import { ChatbotOptionsSymbol, defaultMountingTarget, defaultOptions } from '@/constants';
import { createDefaultMountingTarget } from '@/utils';

export function createChatbot(options?: Partial<ChatbotOptions>) {
	const resolvedOptions: ChatbotOptions = {
		...defaultOptions,
		...options,
		messages: {
			...defaultOptions.messages,
			...options?.messages,
			en: {
				...defaultOptions.messages.en,
				...options?.messages?.en,
			},
		},
		theme: {
			...defaultOptions.theme,
			...options?.theme,
		},
	};

	const mountingTarget = resolvedOptions.target ?? defaultMountingTarget;
	if (typeof mountingTarget === 'string') {
		createDefaultMountingTarget(mountingTarget);
	}

	const app = createApp(App);
	app.use(createPinia());
	app.provide(ChatbotOptionsSymbol, resolvedOptions);
	app.mount(mountingTarget);
	return app;
}
