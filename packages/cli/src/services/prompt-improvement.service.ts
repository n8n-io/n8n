import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { ChatAnthropic } from '@langchain/anthropic';

@Service()
export class PromptImprovementService {
	constructor(private readonly globalConfig: GlobalConfig) {}

	async improvePrompt(prompt: string): Promise<string> {
		console.log('[PromptImprovement] Starting prompt improvement');
		console.log('[PromptImprovement] Original prompt:', prompt);

		const apiKey = this.globalConfig.ai.anthropicApiKey;
		console.log('[PromptImprovement] API key configured:', !!apiKey);

		if (!apiKey) {
			throw new Error(
				'Anthropic API key not configured. Please set N8N_AI_ANTHROPIC_KEY environment variable.',
			);
		}

		// Create a Claude instance with Sonnet 4.5
		const model = new ChatAnthropic({
			anthropicApiKey: apiKey,
			modelName: 'claude-sonnet-4-20250514',
			temperature: 0.7,
		});

		console.log('[PromptImprovement] Calling Claude API...');

		// Call Claude to improve the prompt
		const response = await model.invoke([
			{
				role: 'user',
				content: `Please improve the following prompt to make it more effective, clear, and detailed. Return ONLY the improved prompt without any explanations or additional text:\n\n${prompt}`,
			},
		]);

		const improvedPrompt = response.content.toString();
		console.log('[PromptImprovement] Improved prompt received');
		console.log('[PromptImprovement] Improved prompt length:', improvedPrompt.length);

		return improvedPrompt;
	}
}
