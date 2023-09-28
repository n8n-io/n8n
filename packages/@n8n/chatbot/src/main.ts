import './main.scss';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import type { ChatbotOptions } from '@/types';
import { ChatbotOptionsSymbol, defaultMountingTarget, defaultOptions } from '@/constants';

export function init(options?: Partial<ChatbotOptions>) {
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

	const app = createApp(App);
	app.use(createPinia());
	app.provide(ChatbotOptionsSymbol, resolvedOptions);
	app.mount(mountingTarget);
	return app;
}
