import { NodeConnectionTypes } from 'n8n-workflow';

import type { InstanceAiNodeService } from '../../types';

const MODEL_ACTION_NODE_TYPES = new Set([
	'@n8n/n8n-nodes-langchain.openAi',
	'@n8n/n8n-nodes-langchain.anthropic',
	'@n8n/n8n-nodes-langchain.googleGemini',
]);

export async function needsModelSelection(
	nodeService: InstanceAiNodeService,
	definitions: ReadonlyArray<{ nodeType: string; content: string; error?: string }>,
): Promise<boolean> {
	const available = definitions.filter((definition) => !definition.error);
	if (
		available.some(
			({ nodeType, content }) =>
				MODEL_ACTION_NODE_TYPES.has(nodeType) && /^\s*model(?:Id|Name)?\??:/m.test(content),
		)
	) {
		return true;
	}
	if (available.length === 0) return false;

	const requested = new Set(available.map(({ nodeType }) => nodeType));
	const nodes = await nodeService.listSearchable();
	return nodes.some(
		(node) =>
			requested.has(node.name) &&
			(Array.isArray(node.outputs)
				? node.outputs.includes(NodeConnectionTypes.AiLanguageModel)
				: node.outputs === NodeConnectionTypes.AiLanguageModel),
	);
}
