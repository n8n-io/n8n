import { hintCatalogType } from './nodeActionMap';
import { followUpSystemPrompt, systemPrompt } from './prompts';
import type { WorkflowUiPayload } from './workflowPayload';

export type GenerateSpecErrorCode = 'unauthorized' | 'request-failed' | 'invalid-response';

export class GenerateSpecError extends Error {
	constructor(
		public readonly code: GenerateSpecErrorCode,
		message: string,
	) {
		super(message);
		this.name = 'GenerateSpecError';
	}
}

type GenerateSpecInput = {
	apiKey: string;
	view: 'story' | 'play';
	payload: WorkflowUiPayload;
	currentSpec?: unknown;
	instruction?: string;
	signal?: AbortSignal;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function responseText(value: unknown): string {
	if (!isRecord(value) || !Array.isArray(value.content)) {
		throw new GenerateSpecError('invalid-response', 'Anthropic returned an invalid response');
	}

	const firstContent = value.content[0];
	if (
		!isRecord(firstContent) ||
		firstContent.type !== 'text' ||
		typeof firstContent.text !== 'string'
	) {
		throw new GenerateSpecError('invalid-response', 'Anthropic returned no text content');
	}

	return firstContent.text;
}

function stripJsonFence(text: string): string {
	return text
		.trim()
		.replace(/^```json\s*/i, '')
		.replace(/\s*```$/, '')
		.trim();
}

export async function generateSpec(input: GenerateSpecInput): Promise<unknown> {
	const hints = input.payload.nodes.map((node) => ({
		nodeId: node.id,
		hint: hintCatalogType({
			type: node.type,
			resource: node.resource,
			operation: node.operation,
		}),
	}));
	const response = await fetch('/dev/anthropic', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-api-key': input.apiKey,
			'anthropic-version': '2023-06-01',
		},
		body: JSON.stringify({
			model: 'claude-sonnet-4-5',
			max_tokens: 8192,
			temperature: 0.2,
			system:
				input.currentSpec === undefined && input.instruction === undefined
					? systemPrompt(input.view)
					: followUpSystemPrompt(),
			messages: [
				{
					role: 'user',
					content: JSON.stringify({
						payload: input.payload,
						view: input.view,
						currentSpec: input.currentSpec,
						instruction: input.instruction,
						hints,
					}),
				},
			],
		}),
		signal: input.signal,
	});

	if (!response.ok) {
		if (response.status === 401) {
			throw new GenerateSpecError('unauthorized', 'Anthropic rejected the API key');
		}
		throw new GenerateSpecError(
			'request-failed',
			`Anthropic request failed with ${response.status}`,
		);
	}

	try {
		return JSON.parse(stripJsonFence(responseText(await response.json())));
	} catch (error) {
		if (error instanceof GenerateSpecError) throw error;
		throw new GenerateSpecError('invalid-response', 'Anthropic returned invalid JSON');
	}
}
