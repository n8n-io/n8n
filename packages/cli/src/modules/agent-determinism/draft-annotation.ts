import type { NodeJSON, WorkflowJSON } from '@n8n/workflow-sdk';
import { randomUUID } from 'node:crypto';

import { FALLBACK_NODE_NAME } from './agent-determinism.constants';

const STICKY_NOTE_TYPE = 'n8n-nodes-base.stickyNote';
const LANGCHAIN_PREFIX = '@n8n/n8n-nodes-langchain.';
const PADDING = 80;
const NODE_SIZE = 100;

type Group = { title: string; color: number; members: NodeJSON[] };

function isFallback(node: NodeJSON) {
	return node.name === FALLBACK_NODE_NAME || node.name?.startsWith('Fallback: ');
}

function stickyAround({ title, color, members }: Group): NodeJSON {
	const xs = members.map((node) => node.position[0]);
	const ys = members.map((node) => node.position[1]);
	const [left, top] = [Math.min(...xs) - PADDING, Math.min(...ys) - PADDING * 1.5];
	return {
		id: randomUUID(),
		name: title,
		type: STICKY_NOTE_TYPE,
		typeVersion: 1,
		position: [left, top],
		parameters: {
			content: `## ${title}`,
			color,
			width: Math.max(...xs) - Math.min(...xs) + NODE_SIZE + PADDING * 2,
			height: Math.max(...ys) - Math.min(...ys) + NODE_SIZE + PADDING * 2.5,
		},
	};
}

export function annotateDraft(draft: WorkflowJSON): WorkflowJSON {
	const nodes = draft.nodes.filter((node) => node.type !== STICKY_NOTE_TYPE);
	const groups: Group[] = [
		{
			// Sticky notes are nodes, so the title must not be FALLBACK_NODE_NAME.
			title: 'Agent fallback steps',
			color: 3,
			members: nodes.filter(isFallback),
		},
		{
			title: 'AI steps',
			color: 6,
			members: nodes.filter((node) => !isFallback(node) && node.type.startsWith(LANGCHAIN_PREFIX)),
		},
		{
			title: 'Fixed steps',
			color: 4,
			members: nodes.filter((node) => !isFallback(node) && !node.type.startsWith(LANGCHAIN_PREFIX)),
		},
	];

	return {
		...draft,
		nodes: [
			...groups.filter((group) => group.members.length > 0).map(stickyAround),
			...draft.nodes,
		],
	};
}
