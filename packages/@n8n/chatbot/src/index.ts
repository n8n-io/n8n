import './main.scss';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import type { ChatbotOptions } from '@/types';
import { ChatbotOptionsSymbol, defaultMountingTarget, defaultOptions } from '@/constants';

function createDefaultMountingTarget(mountingTarget: string) {
	const mountingTargetNode = document.querySelector(mountingTarget);
	if (!mountingTargetNode) {
		const generatedMountingTargetNode = document.createElement('div');

		if (mountingTarget.startsWith('#')) {
			generatedMountingTargetNode.id = mountingTarget.replace('#', '');
		}

		if (mountingTarget.startsWith('.')) {
			generatedMountingTargetNode.className = mountingTarget.replace('.', '');
		}

		document.body.appendChild(generatedMountingTargetNode);
	}
}

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
