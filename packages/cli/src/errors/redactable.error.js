'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.RedactableError = void 0;
const n8n_workflow_1 = require('n8n-workflow');
class RedactableError extends n8n_workflow_1.UnexpectedError {
	constructor(fieldName, args) {
		super(
			`Failed to find "${fieldName}" property in argument "${args.toString()}". Please set the decorator \`@Redactable()\` only on \`LogStreamingEventRelay\` methods where the argument contains a "${fieldName}" property.`,
		);
	}
}
exports.RedactableError = RedactableError;
//# sourceMappingURL=redactable.error.js.map
