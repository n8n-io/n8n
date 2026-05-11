import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import { toSaveSettings } from '../to-save-settings';

const globalConfig = Container.get(GlobalConfig);

afterEach(() => {
	globalConfig.executions.saveDataOnError = 'all';
	globalConfig.executions.saveDataOnSuccess = 'all';
	globalConfig.executions.saveExecutionProgress = false;
	globalConfig.executions.saveDataManualExecutions = true;
});

describe('failed production executions', () => {
	it('should favor workflow settings over defaults', () => {
		globalConfig.executions.saveDataOnError = 'none';

		const saveSettings = toSaveSettings({ saveDataErrorExecution: 'all' });

		expect(saveSettings.error).toBe(true);

		globalConfig.executions.saveDataOnError = 'all';

		const _saveSettings = toSaveSettings({ saveDataErrorExecution: 'none' });

		expect(_saveSettings.error).toBe(false);
	});

	it('should fall back to default if no workflow setting', () => {
		globalConfig.executions.saveDataOnError = 'all';

		const saveSettings = toSaveSettings();

		expect(saveSettings.error).toBe(true);

		globalConfig.executions.saveDataOnError = 'none';

		const _saveSettings = toSaveSettings();

		expect(_saveSettings.error).toBe(false);
	});
});

describe('successful production executions', () => {
	it('should favor workflow settings over defaults', () => {
		globalConfig.executions.saveDataOnSuccess = 'none';

		const saveSettings = toSaveSettings({ saveDataSuccessExecution: 'all' });

		expect(saveSettings.success).toBe(true);

		globalConfig.executions.saveDataOnSuccess = 'all';

		const _saveSettings = toSaveSettings({ saveDataSuccessExecution: 'none' });

		expect(_saveSettings.success).toBe(false);
	});

	it('should fall back to default if no workflow setting', () => {
		globalConfig.executions.saveDataOnSuccess = 'all';

		const saveSettings = toSaveSettings();

		expect(saveSettings.success).toBe(true);

		globalConfig.executions.saveDataOnSuccess = 'none';

		const _saveSettings = toSaveSettings();

		expect(_saveSettings.success).toBe(false);
	});
});

describe('manual executions', () => {
	it('should favor workflow setting over default', () => {
		globalConfig.executions.saveDataManualExecutions = false;

		const saveSettings = toSaveSettings({ saveManualExecutions: true });

		expect(saveSettings.manual).toBe(true);

		globalConfig.executions.saveDataManualExecutions = true;

		const _saveSettings = toSaveSettings({ saveManualExecutions: false });

		expect(_saveSettings.manual).toBe(false);
	});

	it('should favor fall back to default if workflow setting is explicit default', () => {
		globalConfig.executions.saveDataManualExecutions = true;

		const saveSettings = toSaveSettings({ saveManualExecutions: 'DEFAULT' });

		expect(saveSettings.manual).toBe(true);

		globalConfig.executions.saveDataManualExecutions = false;

		const _saveSettings = toSaveSettings({ saveManualExecutions: 'DEFAULT' });

		expect(_saveSettings.manual).toBe(false);
	});

	it('should fall back to default if no workflow setting', () => {
		globalConfig.executions.saveDataManualExecutions = true;

		const saveSettings = toSaveSettings();

		expect(saveSettings.manual).toBe(true);

		globalConfig.executions.saveDataManualExecutions = false;

		const _saveSettings = toSaveSettings();

		expect(_saveSettings.manual).toBe(false);
	});
});

describe('execution progress', () => {
	it('should favor workflow setting over default', () => {
		globalConfig.executions.saveExecutionProgress = false;

		const saveSettings = toSaveSettings({ saveExecutionProgress: true });

		expect(saveSettings.progress).toBe(true);

		globalConfig.executions.saveExecutionProgress = true;

		const _saveSettings = toSaveSettings({ saveExecutionProgress: false });

		expect(_saveSettings.progress).toBe(false);
	});

	it('should favor fall back to default if workflow setting is explicit default', () => {
		globalConfig.executions.saveExecutionProgress = true;

		const saveSettings = toSaveSettings({ saveExecutionProgress: 'DEFAULT' });

		expect(saveSettings.progress).toBe(true);

		globalConfig.executions.saveExecutionProgress = false;

		const _saveSettings = toSaveSettings({ saveExecutionProgress: 'DEFAULT' });

		expect(_saveSettings.progress).toBe(false);
	});

	it('should fall back to default if no workflow setting', () => {
		globalConfig.executions.saveExecutionProgress = true;

		const saveSettings = toSaveSettings();

		expect(saveSettings.progress).toBe(true);

		globalConfig.executions.saveExecutionProgress = false;

		const _saveSettings = toSaveSettings();

		expect(_saveSettings.progress).toBe(false);
	});
});

describe('null workflow settings', () => {
	it('should handle null workflow settings without throwing', () => {
		expect(() => toSaveSettings(null)).not.toThrow();

		// Should use defaults from config when settings are null
		globalConfig.executions.saveDataOnError = 'all';
		globalConfig.executions.saveDataOnSuccess = 'all';
		globalConfig.executions.saveDataManualExecutions = true;
		globalConfig.executions.saveExecutionProgress = true;

		const settingsWithNull = toSaveSettings(null);
		expect(settingsWithNull.error).toBe(true);
		expect(settingsWithNull.success).toBe(true);
		expect(settingsWithNull.manual).toBe(true);
		expect(settingsWithNull.progress).toBe(true);
	});
});
