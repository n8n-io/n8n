import type { GenerateStickyNoteDto } from '@n8n/api-types';
import { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { OperationalError } from 'n8n-workflow';

import { InstanceAiModelService } from '@/modules/instance-ai/instance-ai-model.service';
import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';

const GENERATE_STICKY_NOTE_TIMEOUT_MS = 30_000;
const GENERATE_STICKY_NOTE_MAX_OUTPUT_TOKENS = 400;

@Service()
export class WorkflowStickyNoteService {
	constructor(
		private readonly modelService: InstanceAiModelService,
		private readonly outboundHttp: OutboundHttp,
	) {}

	/**
	 * Draft sticky note content summarizing the given nodes. The nodes come
	 * straight from the client's in-memory canvas selection rather than a DB
	 * lookup — the workflow may have unsaved changes at the time the user
	 * right-clicks, so there's nothing else to read this from.
	 */
	async generateContent(
		user: User,
		nodes: GenerateStickyNoteDto['nodes'],
	): Promise<{ content: string }> {
		const nodeLines = nodes
			.map((node) => {
				const parameters = JSON.stringify(node.parameters);
				return `- ${node.name} (${node.type}${node.disabled ? ', disabled' : ''}) | ${parameters}`;
			})
			.join('\n');

		const prompt = [
			'Write the content for an n8n canvas sticky note documenting the selected workflow node(s)',
			'below. Summarize what they do, in plain language, for someone reading the workflow later.',
			'Use markdown — a short heading and/or a few bullet points is fine. Keep it brief: a couple of',
			'sentences, or up to about 5 short bullet points. Do not wrap the response in a code fence.',
			'Respond with the note content only.',
			'',
			'<nodes>',
			nodeLines,
			'</nodes>',
		].join('\n');

		const modelConfig = await this.modelService.resolveAgentModelConfig(user);
		const { createModel } = await import('@n8n/agents');
		const { generateText } = await import('ai');

		const result = await generateText({
			model: createModel(modelConfig, createAiProxyFetch(this.outboundHttp)),
			prompt,
			maxOutputTokens: GENERATE_STICKY_NOTE_MAX_OUTPUT_TOKENS,
			abortSignal: AbortSignal.timeout(GENERATE_STICKY_NOTE_TIMEOUT_MS),
		});

		const content = result.text?.trim();
		if (!content) {
			throw new OperationalError('Instance AI returned empty sticky note content');
		}

		return { content };
	}
}
