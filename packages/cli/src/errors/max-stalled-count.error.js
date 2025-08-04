'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.MaxStalledCountError = void 0;
const n8n_workflow_1 = require('n8n-workflow');
class MaxStalledCountError extends n8n_workflow_1.OperationalError {
	constructor(cause) {
		super(
			'This execution failed to be processed too many times and will no longer retry. To allow this execution to complete, please break down your workflow or scale up your workers or adjust your worker settings.',
			{
				level: 'warning',
				cause,
			},
		);
	}
}
exports.MaxStalledCountError = MaxStalledCountError;
//# sourceMappingURL=max-stalled-count.error.js.map
