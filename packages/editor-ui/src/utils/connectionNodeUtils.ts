import { type INode } from 'n8n-workflow';
import { AI_MEMORY_NODE_TYPES, AI_ROOT_NODE_TYPES, CHAT_TRIGGER_NODE_TYPE } from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { AddedNode } from '@/Interface';

const PROMPT_PROVIDER_NODE_NAMES = [CHAT_TRIGGER_NODE_TYPE];

export function adjustNewNodes(
	parent: AddedNode,
	child: AddedNode,
	{ parentIsNew = true, childIsNew = true } = {},
) {
	if (childIsNew) adjustNewChild(parent, child);
	if (parentIsNew) adjustNewParent(parent, child);
}

function adjustNewChild(parent: AddedNode, child: AddedNode) {
	if (AI_ROOT_NODE_TYPES.includes(child.type) && PROMPT_PROVIDER_NODE_NAMES.includes(parent.type)) {
		Object.assign<AddedNode, Partial<INode>>(child, {
			parameters: { ...child.parameters, promptType: 'auto', text: '={{ $json.chatInput }}' },
		});
	}
}

function adjustNewParent(parent: AddedNode, child: AddedNode) {
	if (AI_MEMORY_NODE_TYPES.includes(parent.type) && child.name) {
		const { getCurrentWorkflow } = useWorkflowsStore();
		const workflow = getCurrentWorkflow();

		// If a memory node is added to an Agent, the memory node is actually a parent since it provides input
		// So we need to look for the Agent's (other) parents to determine if there is a sessionId provider
		const ps = workflow.getParentNodesByDepth(child.name, 1);
		if (
			!ps.some((x) => PROMPT_PROVIDER_NODE_NAMES.includes(workflow.getNode(x.name)?.type ?? ''))
		) {
			Object.assign<AddedNode, Partial<INode>>(parent, {
				parameters: { ...parent.parameters, sessionIdType: 'customKey' },
			});
		}
	}
}
