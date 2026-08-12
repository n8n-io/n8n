import type { Component, Ref } from 'vue';

import type { ChatMessage } from './messages';
import type { SendMessageResponse } from './webhook';

export interface ChatOptions {
	webhookUrl: string;
	webhookConfig?: {
		method?: 'GET' | 'POST';
		headers?: Record<string, string>;
	};
	target?: string | Element;
	mode?: 'window' | 'fullscreen';
	showWindowCloseButton?: boolean;
	showWelcomeScreen?: boolean;
	loadPreviousSession?: boolean;
	sessionId?: string;
	chatInputKey?: string;
	chatSessionKey?: string;
	defaultLanguage?: 'en';
	initialMessages?: string[];
	messageHistory?: ChatMessage[];
	metadata?: Record<string, unknown>;
	i18n: Record<
		string,
		{
			title: string;
			subtitle: string;
			footer: string;
			getStarted: string;
			inputPlaceholder: string;
			closeButtonTooltip: string;
			[message: string]: string;
		}
	>;
	theme?: {};
	messageComponents?: Record<string, Component>;
	disabled?: Ref<boolean>;
	allowFileUploads?: Ref<boolean> | boolean;
	allowedFilesMimeTypes?: Ref<string> | string;
	enableStreaming?: boolean;
	// Event handlers for message lifecycle
	beforeMessageSent?: (message: string) => void | Promise<void>;
	afterMessageSent?: (message: string, response?: SendMessageResponse) => void | Promise<void>;
	// Message action options
	enableMessageActions?: boolean;
}
