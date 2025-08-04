'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.toSaveSettings = toSaveSettings;
const config_1 = __importDefault(require('@/config'));
function toSaveSettings(workflowSettings = {}) {
	const DEFAULTS = {
		ERROR: config_1.default.getEnv('executions.saveDataOnError'),
		SUCCESS: config_1.default.getEnv('executions.saveDataOnSuccess'),
		MANUAL: config_1.default.getEnv('executions.saveDataManualExecutions'),
		PROGRESS: config_1.default.getEnv('executions.saveExecutionProgress'),
	};
	const {
		saveDataErrorExecution = DEFAULTS.ERROR,
		saveDataSuccessExecution = DEFAULTS.SUCCESS,
		saveManualExecutions = DEFAULTS.MANUAL,
		saveExecutionProgress = DEFAULTS.PROGRESS,
	} = workflowSettings;
	return {
		error: saveDataErrorExecution === 'DEFAULT' ? DEFAULTS.ERROR : saveDataErrorExecution === 'all',
		success:
			saveDataSuccessExecution === 'DEFAULT'
				? DEFAULTS.SUCCESS
				: saveDataSuccessExecution === 'all',
		manual: saveManualExecutions === 'DEFAULT' ? DEFAULTS.MANUAL : saveManualExecutions,
		progress: saveExecutionProgress === 'DEFAULT' ? DEFAULTS.PROGRESS : saveExecutionProgress,
	};
}
//# sourceMappingURL=to-save-settings.js.map
