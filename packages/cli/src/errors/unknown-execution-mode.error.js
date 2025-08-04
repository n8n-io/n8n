'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.UnknownExecutionModeError = void 0;
const n8n_workflow_1 = require('n8n-workflow');
class UnknownExecutionModeError extends n8n_workflow_1.UnexpectedError {
	constructor(mode) {
		super('Unknown execution mode', { extra: { mode } });
	}
}
exports.UnknownExecutionModeError = UnknownExecutionModeError;
//# sourceMappingURL=unknown-execution-mode.error.js.map
