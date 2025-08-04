'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.objectToError = objectToError;
const backend_common_1 = require('@n8n/backend-common');
const n8n_workflow_1 = require('n8n-workflow');
const errorProperties = ['description', 'stack', 'executionId', 'workflowId'];
function objectToError(errorObject, workflow) {
	if (errorObject instanceof Error) {
		return errorObject;
	} else if (
		(0, backend_common_1.isObjectLiteral)(errorObject) &&
		'message' in errorObject &&
		typeof errorObject.message === 'string'
	) {
		let error;
		if (
			'node' in errorObject &&
			(0, backend_common_1.isObjectLiteral)(errorObject.node) &&
			typeof errorObject.node.name === 'string'
		) {
			const node = workflow.getNode(errorObject.node.name);
			if (node) {
				error = new n8n_workflow_1.NodeOperationError(node, errorObject, errorObject);
			}
		}
		if (error === undefined) {
			error = new Error(errorObject.message);
		}
		for (const field of errorProperties) {
			if (field in errorObject && errorObject[field]) {
				error[field] = errorObject[field];
			}
		}
		return error;
	} else {
		return new Error('An error occurred');
	}
}
//# sourceMappingURL=object-to-error.js.map
