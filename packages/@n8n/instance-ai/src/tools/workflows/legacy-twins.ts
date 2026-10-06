import { isRecord } from '@n8n/utils/is-record';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

type NamedNode = WorkflowJSON['nodes'][number] & { name: string };

const WAIT_NODE_TYPE = 'n8n-nodes-base.wait';

const codeOf = (node: NamedNode) =>
	isRecord(node.parameters) && typeof node.parameters.code === 'string' ? node.parameters.code : '';

/**
 * Node contracts that verification must judge as their legacy node: a wait can outlast the
 * verification, and code can name I/O. Their declared effect alone says `execute`.
 */
const LEGACY_TWINS = new Map<string, (node: NamedNode) => NamedNode>([
	[
		'@n8n/nodes-core.waitInterval',
		(node: NamedNode) => ({
			...node,
			type: WAIT_NODE_TYPE,
			parameters: { ...node.parameters, resume: 'timeInterval' },
		}),
	],
	[
		'@n8n/nodes-core.waitUntil',
		(node: NamedNode) => ({
			...node,
			type: WAIT_NODE_TYPE,
			parameters: { resume: 'specificTime' },
		}),
	],
	[
		'@n8n/nodes-core.codeJavaScript',
		(node: NamedNode) => ({
			...node,
			type: 'n8n-nodes-base.code',
			parameters: { jsCode: codeOf(node) },
		}),
	],
	[
		'@n8n/nodes-core.codePython',
		(node: NamedNode) => ({
			...node,
			type: 'n8n-nodes-base.code',
			parameters: { pythonCode: codeOf(node) },
		}),
	],
]);

/** The legacy node a contract node is judged as, or the node itself. */
export const legacyTwinOf = (node: NamedNode): NamedNode =>
	LEGACY_TWINS.get(node.type)?.(node) ?? node;
