import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { ChatAnthropic } from '@langchain/anthropic';

@Service()
export class PromptImprovementService {
	constructor(private readonly globalConfig: GlobalConfig) {}

	async improvePrompt(
		prompt: string,
		toolDescription?: boolean,
		nodeContext?: {
			nodeName?: string;
			nodeType?: string;
			parameters?: Array<Record<string, unknown>>;
			fromAIFields?: string[];
		},
	): Promise<string> {
		console.log('[PromptImprovement] Starting prompt improvement');
		console.log('[PromptImprovement] Original prompt:', prompt);
		console.log('[PromptImprovement] Is tool description:', toolDescription);
		console.log('[PromptImprovement] Node context received:');
		console.log('[PromptImprovement]   - Node name:', nodeContext?.nodeName);
		console.log('[PromptImprovement]   - Node type:', nodeContext?.nodeType);
		console.log('[PromptImprovement]   - Parameters count:', nodeContext?.parameters?.length);
		console.log('[PromptImprovement]   - fromAI fields:', nodeContext?.fromAIFields);
		if (nodeContext?.parameters && nodeContext.parameters.length > 0) {
			console.log(
				'[PromptImprovement]   - First few params:',
				JSON.stringify(nodeContext.parameters.slice(0, 3), null, 2),
			);
		}

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

		// Build context information about the tool/node
		let contextInfo = '';
		if (nodeContext) {
			contextInfo = '\n\nContext about this tool:';
			if (nodeContext.nodeType) {
				contextInfo += `\n- Node type: ${nodeContext.nodeType}`;
			}

			if (nodeContext.parameters && nodeContext.parameters.length > 0) {
				contextInfo += '\n- Available parameters:';
				for (const param of nodeContext.parameters) {
					const name = param.name as string;
					const displayName = param.displayName as string;
					const type = param.type as string;
					const description = param.description as string;
					const currentValue = param.currentValue;
					const isFromAI = nodeContext.fromAIFields?.includes(name);

					contextInfo += `\n  * ${displayName} (${name}): ${type}`;
					if (description) {
						contextInfo += ` - ${description}`;
					}
					if (currentValue !== undefined && currentValue !== null && currentValue !== '') {
						// Show current value (truncate if too long)
						const valueStr =
							typeof currentValue === 'string' ? currentValue : JSON.stringify(currentValue);
						const truncatedValue =
							valueStr.length > 100 ? valueStr.substring(0, 100) + '...' : valueStr;
						contextInfo += ` | Current value: ${truncatedValue}`;
					}
					if (isFromAI) {
						contextInfo += ' [AI-generated using $fromAI]';
					}
				}
			}

			if (nodeContext.fromAIFields && nodeContext.fromAIFields.length > 0) {
				contextInfo += `\n- AI-generated fields: ${nodeContext.fromAIFields.join(', ')}`;
			}
		}

		// Use different prompts based on whether it's a tool description or regular prompt
		const systemPrompt = toolDescription
			? `You are helping to improve a tool description for an AI agent. Tool descriptions should be:
- Concise (1-3 sentences)
- Clear about what the tool does and what data it returns
- Focus ONLY on the parameters marked with $fromAI - these are the ONLY inputs the AI agent can provide when calling this tool
- All other parameters are already pre-configured and define the tool's behavior (what it fetches, filters, etc.)
- Explain what kind of values the AI agent should provide for the $fromAI parameters
- Make it clear when to use this tool based on the pre-configured settings

IMPORTANT: Parameters NOT marked with $fromAI are already set and cannot be changed by the AI agent. They define what the tool does.
Parameters marked with $fromAI are the tool's inputs that the AI agent must provide.

Return ONLY the improved tool description without any explanations or additional text.${contextInfo}`
			: `You are helping to improve a prompt to make it more effective for AI models. Improved prompts should be:
- Clear and specific about the desired outcome
- Include relevant context and constraints
- Use concrete examples when helpful
- Be well-structured and detailed

Return ONLY the improved prompt without any explanations or additional text.${contextInfo}`;

		// Call Claude to improve the prompt
		const response = await model.invoke([
			{
				role: 'user',
				content: `${systemPrompt}\n\nOriginal text:\n${prompt}`,
			},
		]);

		const improvedPrompt = response.content.toString();
		console.log('[PromptImprovement] Improved prompt received');
		console.log('[PromptImprovement] Improved prompt length:', improvedPrompt.length);

		return improvedPrompt;
	}
}
