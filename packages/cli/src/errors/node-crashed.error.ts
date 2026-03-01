import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export class NodeCrashedError extends NodeOperationError {
	constructor(node: INode) {
		super(node, 'Node crashed, possible out-of-memory issue', {
			message: 'Execution stopped at this node',
			description:
				"n8n may have run out of memory while running this execution. More context and tips on how to avoid this <a href='https://docs.n8n.io/hosting/scaling/memory-errors/' target='_blank'>in the docs</a>",
		});
	}
}
