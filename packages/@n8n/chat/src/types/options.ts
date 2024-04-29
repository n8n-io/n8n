export interface ChatOptions {
	webhookUrl: string;
	webhookConfig?: {
		method?: 'GET' | 'POST';
		headers?: Record<string, string>;
	};
	target?: string | Element;
	mode?: 'window' | 'fullscreen';
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
			[message: string]: string;
		}
	>;
	theme?: {};
}
