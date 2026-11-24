import { UserError } from '@n8n/errors';

import type { UnsupportedNodeInfo } from '../types';

export class UnsupportedWorkflowNodesError extends UserError {
	readonly unsupportedNodes: UnsupportedNodeInfo[];

	constructor(unsupportedNodes: UnsupportedNodeInfo[]) {
		const summary = unsupportedNodes
			.map((node) => `${node.nodeName} (${node.nodeType}): ${node.reason}`)
			.join('; ');
		super(`Workflow has unsupported nodes for simulation: ${summary}`);
		this.name = 'UnsupportedWorkflowNodesError';
		this.unsupportedNodes = unsupportedNodes;
	}
}
