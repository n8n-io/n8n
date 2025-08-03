import { describe, it, expect } from 'vitest';

import { defaultOptions, defaultMountingTarget } from '@/constants/defaults';

describe('constants/defaults', () => {
	describe('defaultOptions', () => {
		it('should have correct default webhook configuration', () => {
			expect(defaultOptions.webhookUrl).toBe('http://localhost:5678');
			expect(defaultOptions.webhookConfig?.method).toBe('POST');
			expect(defaultOptions.webhookConfig?.headers).toEqual({});
		});

		it('should have correct default UI configuration', () => {
			expect(defaultOptions.target).toBe('#n8n-chat');
			expect(defaultOptions.mode).toBe('window');
			expect(defaultOptions.showWelcomeScreen).toBe(false);
		});

		it('should have correct session management defaults', () => {
			expect(defaultOptions.loadPreviousSession).toBe(true);
			expect(defaultOptions.chatInputKey).toBe('chatInput');
			expect(defaultOptions.chatSessionKey).toBe('sessionId');
		});

		it('should have correct internationalization defaults', () => {
			expect(defaultOptions.defaultLanguage).toBe('en');
			expect(defaultOptions.i18n.en.title).toBe('Hi there! 👋');
			expect(defaultOptions.i18n.en.subtitle).toBe("Start a chat. We're here to help you 24/7.");
			expect(defaultOptions.i18n.en.inputPlaceholder).toBe('Type your question..');
			expect(defaultOptions.i18n.en.getStarted).toBe('New Conversation');
			expect(defaultOptions.i18n.en.closeButtonTooltip).toBe('Close chat');
		});

		it('should have correct initial messages', () => {
			expect(defaultOptions.initialMessages).toEqual([
				'Hi there! 👋',
				'My name is Nathan. How can I assist you today?',
			]);
		});

		it('should have streaming disabled by default', () => {
			expect(defaultOptions.enableStreaming).toBe(false);
		});

		it('should have empty theme object by default', () => {
			expect(defaultOptions.theme).toEqual({});
		});

		it('should be a valid ChatOptions object structure', () => {
			// Verify all required properties exist
			expect(defaultOptions).toHaveProperty('webhookUrl');
			expect(defaultOptions).toHaveProperty('webhookConfig');
			expect(defaultOptions).toHaveProperty('target');
			expect(defaultOptions).toHaveProperty('mode');
			expect(defaultOptions).toHaveProperty('loadPreviousSession');
			expect(defaultOptions).toHaveProperty('chatInputKey');
			expect(defaultOptions).toHaveProperty('chatSessionKey');
			expect(defaultOptions).toHaveProperty('defaultLanguage');
			expect(defaultOptions).toHaveProperty('showWelcomeScreen');
			expect(defaultOptions).toHaveProperty('initialMessages');
			expect(defaultOptions).toHaveProperty('i18n');
			expect(defaultOptions).toHaveProperty('theme');
			expect(defaultOptions).toHaveProperty('enableStreaming');
		});

		it('should have immutable reference equality', async () => {
			// Each import should return the same reference
			const module1 = await import('@/constants/defaults');
			const module2 = await import('@/constants/defaults');

			expect(module1.defaultOptions).toBe(module2.defaultOptions);
		});
	});

	describe('defaultMountingTarget', () => {
		it('should have correct default mounting target', () => {
			expect(defaultMountingTarget).toBe('#n8n-chat');
		});

		it('should be a string selector', () => {
			expect(typeof defaultMountingTarget).toBe('string');
			expect(defaultMountingTarget.startsWith('#')).toBe(true);
		});
	});
});
