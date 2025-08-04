'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.NodeCrashedError = void 0;
const n8n_workflow_1 = require('n8n-workflow');
class NodeCrashedError extends n8n_workflow_1.NodeOperationError {
	constructor(node) {
		super(node, 'Node crashed, possible out-of-memory issue', {
			message: 'Execution stopped at this node',
			description:
				"n8n may have run out of memory while running this execution. More context and tips on how to avoid this <a href='https://docs.n8n.io/hosting/scaling/memory-errors/' target='_blank'>in the docs</a>",
		});
	}
}
exports.NodeCrashedError = NodeCrashedError;
//# sourceMappingURL=node-crashed.error.js.map
