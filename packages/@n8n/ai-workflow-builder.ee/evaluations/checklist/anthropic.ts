import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
	apiKey: process.env.N8N_AI_ANTHROPIC_KEY ?? process.env.ANTHROPIC_API_KEY,
});

export interface Message {
	role: 'user' | 'assistant';
	content: string;
}

export interface LLMResponse {
	content: string;
	inputTokens: number;
	outputTokens: number;
	durationMs: number;
}

export async function callLLM(opts: {
	model: string;
	systemPrompt: string;
	messages: Message[];
	maxTokens?: number;
}): Promise<LLMResponse> {
	const start = Date.now();

	const response = await client.messages.create({
		model: opts.model,
		max_tokens: opts.maxTokens ?? 16_384,
		system: [{ type: 'text', text: opts.systemPrompt, cache_control: { type: 'ephemeral' } }],
		messages: opts.messages,
	});

	const durationMs = Date.now() - start;

	const content = response.content
		.filter((block): block is Anthropic.TextBlock => block.type === 'text')
		.map((block) => block.text)
		.join('');

	return {
		content,
		inputTokens: response.usage.input_tokens,
		outputTokens: response.usage.output_tokens,
		durationMs,
	};
}
