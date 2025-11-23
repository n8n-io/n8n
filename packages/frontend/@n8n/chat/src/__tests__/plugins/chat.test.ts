import { vi, describe, it, expect } from 'vitest';
import { createApp } from 'vue';

import * as api from '@n8n/chat/api';

import { ChatPlugin } from '../../plugins/chat';

vi.mock('@n8n/chat/api');

describe('ChatPlugin', () => {
	it('should return sendMessageResponse when executionStarted is true', async () => {
		const app = createApp({});
		const options = {
			webhookUrl: 'test',
			i18n: {
				en: {
					message: 'message',
					title: 'title',
					subtitle: 'subtitle',
					footer: 'footer',
					getStarted: 'getStarted',
					inputPlaceholder: 'inputPlaceholder',
					closeButtonTooltip: 'closeButtonTooltip',
				},
			},
		};

		(api.sendMessage as jest.Mock).mockResolvedValue({ executionStarted: true });

		app.use(ChatPlugin, options);

		const chatStore = app.config.globalProperties.$chat;

		const result = await chatStore.sendMessage('test message');

		expect(result).toEqual({ executionStarted: true });
	});

	it('should return null when sendMessageResponse is null', async () => {
		const app = createApp({});
		const options = {
			webhookUrl: 'test',
			i18n: {
				en: {
					message: 'message',
					title: 'title',
					subtitle: 'subtitle',
					footer: 'footer',
					getStarted: 'getStarted',
					inputPlaceholder: 'inputPlaceholder',
					closeButtonTooltip: 'closeButtonTooltip',
				},
			},
		};

		(api.sendMessage as jest.Mock).mockResolvedValue({});

		app.use(ChatPlugin, options);

		const chatStore = app.config.globalProperties.$chat;

		const result = await chatStore.sendMessage('test message');

		expect(result).toEqual(null);
	});
});
