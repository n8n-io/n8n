export interface ChatbotOptions {
	webhookUrl: string;
	target?: string | Element;
	mode?: 'window' | 'fullscreen';
	defaultLanguage: 'en';
	messages: Record<
		string,
		{
			title: string;
			subtitle: string;
			footer: string;
			button: string;
			[message: string]: string;
		}
	>;
	poweredBy?: boolean;
	theme?: {};
}
