import type { GenerateNodeNameDto } from '@n8n/api-types';
import { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { OperationalError } from 'n8n-workflow';

import { InstanceAiModelService } from '@/modules/instance-ai/instance-ai-model.service';
import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';

const GENERATE_NODE_NAME_TIMEOUT_MS = 30_000;
const GENERATE_NODE_NAME_MAX_OUTPUT_TOKENS = 20;

@Service()
export class WorkflowNodeRenameService {
	constructor(
		private readonly modelService: InstanceAiModelService,
		private readonly outboundHttp: OutboundHttp,
	) {}

	/**
	 * Draft a short name for the given node. The node comes straight from the
	 * client's in-memory canvas state rather than a DB lookup — the workflow
	 * may have unsaved changes at the time the user right-clicks, so there's
	 * nothing else to read this from.
	 */
	async generateName(user: User, node: GenerateNodeNameDto['node']): Promise<{ name: string }> {
		const parameters = JSON.stringify(node.parameters);

		const prompt = [
			'Come up with a short, descriptive name for the n8n workflow node below, based on its type',
			'and configured parameters. Respond with the name only — a few words, title case, no',
			'punctuation, no quotes, no explanation.',
			'',
			'<node>',
			`${node.type}${node.disabled ? ' (disabled)' : ''} | ${parameters}`,
			'</node>',
		].join('\n');

		const modelConfig = await this.modelService.resolveAgentModelConfig(user);
		const { createModel } = await import('@n8n/agents');
		const { generateText } = await import('ai');

		const result = await generateText({
			model: createModel(modelConfig, createAiProxyFetch(this.outboundHttp)),
			prompt,
			maxOutputTokens: GENERATE_NODE_NAME_MAX_OUTPUT_TOKENS,
			abortSignal: AbortSignal.timeout(GENERATE_NODE_NAME_TIMEOUT_MS),
		});

		const name = result.text?.trim().replace(/^["']|["']$/g, '');
		if (!name) {
			throw new OperationalError('Instance AI returned an empty node name');
		}

		return { name };
	}
}
