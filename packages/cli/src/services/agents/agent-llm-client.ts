import type { LlmConfig, LlmMessage } from './agents.types';

export async function callLlm(messages: LlmMessage[], config: LlmConfig): Promise<string> {
	const systemMessage = messages.find((m) => m.role === 'system')?.content ?? '';
	const conversationMessages = messages
		.filter((m) => m.role !== 'system')
		.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

	const response = await fetch(`${config.baseUrl}/v1/messages`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': config.apiKey,
			'anthropic-version': '2023-06-01',
		},
		body: JSON.stringify({
			model: config.model,
			system: systemMessage,
			messages: conversationMessages,
			temperature: 0.2,
			max_tokens: 1024,
		}),
	});

	if (!response.ok) {
		throw new Error(`LLM API returned ${response.status}: ${await response.text()}`);
	}

	const data = (await response.json()) as {
		content: Array<{ type: string; text: string }>;
	};
	return data.content.find((c) => c.type === 'text')?.text ?? '';
}
