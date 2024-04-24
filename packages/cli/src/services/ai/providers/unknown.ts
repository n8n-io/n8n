import { ApplicationError } from 'n8n-workflow';
import type { N8nAIProvider } from '@/types/ai.types';

export class AIProviderUnknown implements N8nAIProvider {
	async prompt() {
		throw new ApplicationError('Unknown AI provider. Please check the configuration.');
		return '';
	}
}
