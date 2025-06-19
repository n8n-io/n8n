import config from '@/config';

import { toSaveSettings } from '../to-save-settings';

afterEach(() => {
	config.load(config.default);
});

describe('failed production executions', () => {
	it('should favor workflow settings over defaults', () => {
		config.set('executions.saveDataOnError', 'none');

		const saveSettings = toSaveSettings({ saveDataErrorExecution: 'all' });

		expect(saveSettings.error).toBe(true);

		config.set('executions.saveDataOnError', 'all');

		const _saveSettings = toSaveSettings({ saveDataErrorExecution: 'none' });

		expect(_saveSettings.error).toBe(false);
	});

	it('should fall back to default if no workflow setting', () => {
		config.set('executions.saveDataOnError', 'all');

		const saveSettings = toSaveSettings();

		expect(saveSettings.error).toBe(true);

		config.set('executions.saveDataOnError', 'none');

		const _saveSettings = toSaveSettings();

		expect(_saveSettings.error).toBe(false);
	});
});

describe('successful production executions', () => {
	it('should favor workflow settings over defaults', () => {
		config.set('executions.saveDataOnSuccess', 'none');

		const saveSettings = toSaveSettings({ saveDataSuccessExecution: 'all' });

		expect(saveSettings.success).toBe(true);

		config.set('executions.saveDataOnSuccess', 'all');

		const _saveSettings = toSaveSettings({ saveDataSuccessExecution: 'none' });

		expect(_saveSettings.success).toBe(false);
	});

	it('should fall back to default if no workflow setting', () => {
		config.set('executions.saveDataOnSuccess', 'all');

		const saveSettings = toSaveSettings();

		expect(saveSettings.success).toBe(true);

		config.set('executions.saveDataOnSuccess', 'none');

		const _saveSettings = toSaveSettings();

		expect(_saveSettings.success).toBe(false);
	});
});

describe('manual executions', () => {
	it('should favor workflow setting over default', () => {
		config.set('executions.saveDataManualExecutions', false);

		const saveSettings = toSaveSettings({ saveManualExecutions: true });

		expect(saveSettings.manual).toBe(true);

		config.set('executions.saveDataManualExecutions', true);

		const _saveSettings = toSaveSettings({ saveManualExecutions: false });

		expect(_saveSettings.manual).toBe(false);
	});

	it('should favor fall back to default if workflow setting is explicit default', () => {
		config.set('executions.saveDataManualExecutions', true);

		const saveSettings = toSaveSettings({ saveManualExecutions: 'DEFAULT' });

		expect(saveSettings.manual).toBe(true);

		config.set('executions.saveDataManualExecutions', false);

		const _saveSettings = toSaveSettings({ saveManualExecutions: 'DEFAULT' });

		expect(_saveSettings.manual).toBe(false);
	});

	it('should fall back to default if no workflow setting', () => {
		config.set('executions.saveDataManualExecutions', true);

		const saveSettings = toSaveSettings();

		expect(saveSettings.manual).toBe(true);

		config.set('executions.saveDataManualExecutions', false);

		const _saveSettings = toSaveSettings();

		expect(_saveSettings.manual).toBe(false);
	});
});

describe('execution progress', () => {
	it('should favor workflow setting over default', () => {
		config.set('executions.saveExecutionProgress', false);

		const saveSettings = toSaveSettings({ saveExecutionProgress: true });

		expect(saveSettings.progress).toBe(true);

		config.set('executions.saveExecutionProgress', true);

		const _saveSettings = toSaveSettings({ saveExecutionProgress: false });

		expect(_saveSettings.progress).toBe(false);
	});

	it('should favor fall back to default if workflow setting is explicit default', () => {
		config.set('executions.saveExecutionProgress', true);

		const saveSettings = toSaveSettings({ saveExecutionProgress: 'DEFAULT' });

		expect(saveSettings.progress).toBe(true);

		config.set('executions.saveExecutionProgress', false);

		const _saveSettings = toSaveSettings({ saveExecutionProgress: 'DEFAULT' });

		expect(_saveSettings.progress).toBe(false);
	});

	it('should fall back to default if no workflow setting', () => {
		config.set('executions.saveExecutionProgress', true);

		const saveSettings = toSaveSettings();

		expect(saveSettings.progress).toBe(true);

		config.set('executions.saveExecutionProgress', false);

		const _saveSettings = toSaveSettings();

		expect(_saveSettings.progress).toBe(false);
	});
});
