export interface ChatbotOptions {
	webhookUrl: string;
	target?: string | Element;
	mode?: 'window' | 'fullscreen';
	defaultLanguage: 'en';
	initialMessages?: string[];
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
	poweredBy?: boolean;
	theme?: {};
}
