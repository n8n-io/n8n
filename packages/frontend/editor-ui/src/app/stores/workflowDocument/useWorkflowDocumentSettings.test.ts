import { describe, it, expect, vi } from 'vitest';
import { useWorkflowDocumentSettings } from './useWorkflowDocumentSettings';

function createSettings() {
	return useWorkflowDocumentSettings();
}

describe('useWorkflowDocumentSettings', () => {
	describe('initial state', () => {
		it('should start with empty settings', () => {
			const { settings } = createSettings();
			expect(settings.value).toEqual({});
		});
	});

	describe('setSettings', () => {
		it('should set settings and fire event hook', () => {
			const { settings, setSettings, onSettingsChange } = createSettings();
			const hookSpy = vi.fn();
			onSettingsChange(hookSpy);

			const newSettings = { executionOrder: 'v1' as const, timezone: 'UTC' };
			setSettings(newSettings);

			expect(settings.value).toEqual(newSettings);
			expect(hookSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: { settings: newSettings },
			});
		});

		it('should replace existing settings', () => {
			const { settings, setSettings } = createSettings();
			setSettings({ executionOrder: 'v1' });

			setSettings({ timezone: 'UTC' });

			expect(settings.value).toEqual({ timezone: 'UTC' });
		});

		it('should fire event hook on every call', () => {
			const { setSettings, onSettingsChange } = createSettings();
			const hookSpy = vi.fn();
			onSettingsChange(hookSpy);

			setSettings({ executionOrder: 'v1' });
			setSettings({ timezone: 'UTC' });

			expect(hookSpy).toHaveBeenCalledTimes(2);
		});
	});

	describe('getSettingsSnapshot', () => {
		it('should return a deep copy of settings', () => {
			const { settings, setSettings, getSettingsSnapshot } = createSettings();
			const original = { executionOrder: 'v1' as const, timezone: 'UTC' };
			setSettings(original);

			const snapshot = getSettingsSnapshot();

			expect(snapshot).toEqual(original);
			expect(snapshot).not.toBe(settings.value);
		});

		it('should return empty object when no settings set', () => {
			const { getSettingsSnapshot } = createSettings();
			expect(getSettingsSnapshot()).toEqual({});
		});
	});
});
