'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const config_1 = __importDefault(require('@/config'));
const to_save_settings_1 = require('../to-save-settings');
afterEach(() => {
	config_1.default.load(config_1.default.default);
});
describe('failed production executions', () => {
	it('should favor workflow settings over defaults', () => {
		config_1.default.set('executions.saveDataOnError', 'none');
		const saveSettings = (0, to_save_settings_1.toSaveSettings)({ saveDataErrorExecution: 'all' });
		expect(saveSettings.error).toBe(true);
		config_1.default.set('executions.saveDataOnError', 'all');
		const _saveSettings = (0, to_save_settings_1.toSaveSettings)({
			saveDataErrorExecution: 'none',
		});
		expect(_saveSettings.error).toBe(false);
	});
	it('should fall back to default if no workflow setting', () => {
		config_1.default.set('executions.saveDataOnError', 'all');
		const saveSettings = (0, to_save_settings_1.toSaveSettings)();
		expect(saveSettings.error).toBe(true);
		config_1.default.set('executions.saveDataOnError', 'none');
		const _saveSettings = (0, to_save_settings_1.toSaveSettings)();
		expect(_saveSettings.error).toBe(false);
	});
});
describe('successful production executions', () => {
	it('should favor workflow settings over defaults', () => {
		config_1.default.set('executions.saveDataOnSuccess', 'none');
		const saveSettings = (0, to_save_settings_1.toSaveSettings)({
			saveDataSuccessExecution: 'all',
		});
		expect(saveSettings.success).toBe(true);
		config_1.default.set('executions.saveDataOnSuccess', 'all');
		const _saveSettings = (0, to_save_settings_1.toSaveSettings)({
			saveDataSuccessExecution: 'none',
		});
		expect(_saveSettings.success).toBe(false);
	});
	it('should fall back to default if no workflow setting', () => {
		config_1.default.set('executions.saveDataOnSuccess', 'all');
		const saveSettings = (0, to_save_settings_1.toSaveSettings)();
		expect(saveSettings.success).toBe(true);
		config_1.default.set('executions.saveDataOnSuccess', 'none');
		const _saveSettings = (0, to_save_settings_1.toSaveSettings)();
		expect(_saveSettings.success).toBe(false);
	});
});
describe('manual executions', () => {
	it('should favor workflow setting over default', () => {
		config_1.default.set('executions.saveDataManualExecutions', false);
		const saveSettings = (0, to_save_settings_1.toSaveSettings)({ saveManualExecutions: true });
		expect(saveSettings.manual).toBe(true);
		config_1.default.set('executions.saveDataManualExecutions', true);
		const _saveSettings = (0, to_save_settings_1.toSaveSettings)({ saveManualExecutions: false });
		expect(_saveSettings.manual).toBe(false);
	});
	it('should favor fall back to default if workflow setting is explicit default', () => {
		config_1.default.set('executions.saveDataManualExecutions', true);
		const saveSettings = (0, to_save_settings_1.toSaveSettings)({
			saveManualExecutions: 'DEFAULT',
		});
		expect(saveSettings.manual).toBe(true);
		config_1.default.set('executions.saveDataManualExecutions', false);
		const _saveSettings = (0, to_save_settings_1.toSaveSettings)({
			saveManualExecutions: 'DEFAULT',
		});
		expect(_saveSettings.manual).toBe(false);
	});
	it('should fall back to default if no workflow setting', () => {
		config_1.default.set('executions.saveDataManualExecutions', true);
		const saveSettings = (0, to_save_settings_1.toSaveSettings)();
		expect(saveSettings.manual).toBe(true);
		config_1.default.set('executions.saveDataManualExecutions', false);
		const _saveSettings = (0, to_save_settings_1.toSaveSettings)();
		expect(_saveSettings.manual).toBe(false);
	});
});
describe('execution progress', () => {
	it('should favor workflow setting over default', () => {
		config_1.default.set('executions.saveExecutionProgress', false);
		const saveSettings = (0, to_save_settings_1.toSaveSettings)({ saveExecutionProgress: true });
		expect(saveSettings.progress).toBe(true);
		config_1.default.set('executions.saveExecutionProgress', true);
		const _saveSettings = (0, to_save_settings_1.toSaveSettings)({ saveExecutionProgress: false });
		expect(_saveSettings.progress).toBe(false);
	});
	it('should favor fall back to default if workflow setting is explicit default', () => {
		config_1.default.set('executions.saveExecutionProgress', true);
		const saveSettings = (0, to_save_settings_1.toSaveSettings)({
			saveExecutionProgress: 'DEFAULT',
		});
		expect(saveSettings.progress).toBe(true);
		config_1.default.set('executions.saveExecutionProgress', false);
		const _saveSettings = (0, to_save_settings_1.toSaveSettings)({
			saveExecutionProgress: 'DEFAULT',
		});
		expect(_saveSettings.progress).toBe(false);
	});
	it('should fall back to default if no workflow setting', () => {
		config_1.default.set('executions.saveExecutionProgress', true);
		const saveSettings = (0, to_save_settings_1.toSaveSettings)();
		expect(saveSettings.progress).toBe(true);
		config_1.default.set('executions.saveExecutionProgress', false);
		const _saveSettings = (0, to_save_settings_1.toSaveSettings)();
		expect(_saveSettings.progress).toBe(false);
	});
});
//# sourceMappingURL=to-save-settings.test.js.map
