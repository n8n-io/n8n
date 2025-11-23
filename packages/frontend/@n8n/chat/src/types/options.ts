import type { Component, Ref } from 'vue';

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
	chatInputKey?: string;
	chatSessionKey?: string;
	defaultLanguage?: 'en';
	initialMessages?: string[];
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
}
