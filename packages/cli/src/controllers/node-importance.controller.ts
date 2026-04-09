import { AuthenticatedRequest } from '@n8n/db';
import { Post, RestController } from '@n8n/decorators';
import { Response } from 'express';

/**
 * POC controller: proxies node importance classification and group description
 * requests to OpenRouter so the API key stays server-side.
 */
@RestController('/node-importance')
export class NodeImportanceController {
	private get apiKey(): string {
		return process.env.OPENROUTER_API_KEY ?? '';
	}

	private get model(): string {
		return process.env.OPENROUTER_MODEL ?? 'google/gemini-3-flash-preview';
	}

	private async proxyToOpenRouter(prompt: string, fallback: string): Promise<{ content: string }> {
		if (!this.apiKey) {
			return { content: fallback };
		}

		const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.apiKey}`,
			},
			body: JSON.stringify({
				model: this.model,
				messages: [{ role: 'user', content: prompt }],
				temperature: 0,
			}),
		});

		const data = (await response.json()) as {
			choices?: Array<{ message?: { content?: string } }>;
		};
		return { content: data.choices?.[0]?.message?.content ?? fallback };
	}

	@Post('/classify')
	async classify(req: AuthenticatedRequest, _res: Response): Promise<{ content: string }> {
		const { prompt } = req.body as { prompt: string };
		return await this.proxyToOpenRouter(prompt, '{}');
	}

	@Post('/describe-groups')
	async describeGroups(req: AuthenticatedRequest, _res: Response): Promise<{ content: string }> {
		const { prompt } = req.body as { prompt: string };
		return await this.proxyToOpenRouter(prompt, '[]');
	}
}
