import type { TranslationRequest } from './TranslationRequest';

export type TranslationResponse = TranslationRequest & {
	translation: string;
	detectedLanguage?: string;
	latency?: number;
};
