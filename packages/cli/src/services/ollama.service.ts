import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { IWorkflowDb } from 'n8n-workflow';

interface OllamaMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

interface OllamaResponse {
	model: string;
	created_at: string;
	message: {
		role: string;
		content: string;
	};
	done: boolean;
}

@Service()
export class OllamaService {
	private baseUrl: string;
	private model: string;

	constructor(private readonly globalConfig: GlobalConfig) {
		// Load from environment or defaults
		this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
		this.model = process.env.OLLAMA_MODEL || 'codellama';
	}

	/**
	 * Chat with Ollama using streaming responses
	 */
	async *chat(
		messages: OllamaMessage[],
		signal?: AbortSignal,
	): AsyncGenerator<string, void, unknown> {
		try {
			const response = await fetch(`${this.baseUrl}/api/chat`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: this.model,
					messages,
					stream: true,
				}),
				signal,
			});

			if (!response.ok) {
				throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
			}

			if (!response.body) {
				throw new Error('No response body from Ollama');
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			try {
				while (true) {
					const { done, value } = await reader.read();

					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n');
					buffer = lines.pop() || '';

					for (const line of lines) {
						if (line.trim()) {
							try {
								const parsed = JSON.parse(line) as OllamaResponse;
								if (parsed.message?.content) {
									yield parsed.message.content;
								}
							} catch (parseError) {
								console.error('Failed to parse Ollama response line:', line);
							}
						}
					}
				}

				// Process remaining buffer
				if (buffer.trim()) {
					try {
						const parsed = JSON.parse(buffer) as OllamaResponse;
						if (parsed.message?.content) {
							yield parsed.message.content;
						}
					} catch (parseError) {
						console.error('Failed to parse final Ollama response:', buffer);
					}
				}
			} finally {
				reader.releaseLock();
			}
		} catch (error) {
			if (error instanceof Error) {
				if (error.name === 'AbortError') {
					throw new Error('Ollama request was cancelled');
				}
				throw new Error(`Failed to communicate with Ollama: ${error.message}`);
			}
			throw error;
		}
	}

	/**
	 * Test connection to Ollama server
	 */
	async testConnection(): Promise<boolean> {
		try {
			const response = await fetch(`${this.baseUrl}/api/tags`, {
				method: 'GET',
			});
			return response.ok;
		} catch {
			return false;
		}
	}

	/**
	 * Build prompt for workflow modifications
	 */
	buildWorkflowPrompt(workflow: IWorkflowDb, instruction: string): string {
		const workflowJson = JSON.stringify(
			{
				id: workflow.id,
				name: workflow.name,
				nodes: workflow.nodes,
				connections: workflow.connections,
			},
			null,
			2,
		);

		return `You are an n8n workflow automation assistant. You help users modify workflows by understanding their instructions.

Current workflow:
${workflowJson}

The user wants to: ${instruction}

Respond with a JSON object containing the changes to make:
{
  "explanation": "Brief explanation of changes",
  "changes": {
    "nodesToAdd": [{ "type": "n8n-nodes-base.slack", "name": "Slack", "parameters": {...}, "position": [x, y] }],
    "nodesToDelete": ["NodeName1"],
    "nodesToModify": [{ "name": "HTTP Request", "parameters": { "url": "new-url" } }],
    "connectionsToAdd": [{ "source": "Node1", "sourceOutput": 0, "target": "Node2", "targetInput": 0 }],
    "connectionsToDelete": []
  }
}

Only include arrays that have changes. Use empty arrays if no changes needed.
Position nodes intelligently based on existing node positions. If workflow is empty, start at [250, 300].`;
	}

	/**
	 * Update Ollama configuration
	 */
	updateConfig(baseUrl?: string, model?: string): void {
		if (baseUrl) {
			this.baseUrl = baseUrl;
		}
		if (model) {
			this.model = model;
		}
	}

	/**
	 * Get current configuration
	 */
	getConfig(): { baseUrl: string; model: string } {
		return {
			baseUrl: this.baseUrl,
			model: this.model,
		};
	}
}
