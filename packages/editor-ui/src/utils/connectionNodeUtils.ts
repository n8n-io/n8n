import { type INode } from 'n8n-workflow';
import { AI_MEMORY_NODE_TYPES, AI_ROOT_NODE_TYPES, CHAT_TRIGGER_NODE_TYPE } from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { AddedNode } from '@/Interface';

const PROMPT_PROVIDER_NODE_NAMES = [CHAT_TRIGGER_NODE_TYPE];

/** Adjust new Source->Target connection */
export function adjustNewNodes(
	source: AddedNode,
	target: AddedNode,
	{ sourceIsNew = true, targetIsNew = true } = {},
) {
	if (sourceIsNew) adjustNewSource(source, target);
	if (targetIsNew) adjustNewTarget(source, target);
}

function adjustNewTarget(source: AddedNode, target: AddedNode) {
	if (
		AI_ROOT_NODE_TYPES.includes(target.type) &&
		PROMPT_PROVIDER_NODE_NAMES.includes(source.type)
	) {
		// Need to re-set text to support disabled parameter value for prompt text.
		Object.assign<AddedNode, Partial<INode>>(target, {
			parameters: { ...target.parameters, promptType: 'auto', text: '={{ $json.chatInput }}' },
		});
	}
}

function adjustNewSource(source: AddedNode, target: AddedNode) {
	if (AI_MEMORY_NODE_TYPES.includes(source.type) && target.name) {
		const { getCurrentWorkflow } = useWorkflowsStore();
		const workflow = getCurrentWorkflow();

		// If a memory node is added to an Agent, the memory node is actually the source since it provides input
		// So we need to look for the Agent's (other) parents to determine if there is a sessionId provider
		const ps = workflow.getParentNodesByDepth(target.name, 1);
		if (
			!ps.some((x) => PROMPT_PROVIDER_NODE_NAMES.includes(workflow.getNode(x.name)?.type ?? ''))
		) {
			Object.assign<AddedNode, Partial<INode>>(source, {
				parameters: { ...source.parameters, sessionIdType: 'customKey' },
			});
		}
	}
}
