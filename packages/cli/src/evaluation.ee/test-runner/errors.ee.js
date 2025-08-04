'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.TestRunError = exports.TestCaseExecutionError = void 0;
const n8n_workflow_1 = require('n8n-workflow');
class TestCaseExecutionError extends n8n_workflow_1.UnexpectedError {
	constructor(code, extra = {}) {
		super('Test Case execution failed with code ' + code, { extra });
		this.code = code;
	}
}
exports.TestCaseExecutionError = TestCaseExecutionError;
class TestRunError extends n8n_workflow_1.UnexpectedError {
	constructor(code, extra = {}) {
		super('Test Run failed with code ' + code, { extra });
		this.code = code;
	}
}
exports.TestRunError = TestRunError;
//# sourceMappingURL=errors.ee.js.map
