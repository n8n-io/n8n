import { describe, it, expect, vi } from 'vitest';
import { useWorkflowDocumentSettings, DEFAULT_SETTINGS } from './useWorkflowDocumentSettings';

vi.mock('../workflows.store', () => ({
	useWorkflowsStore: vi.fn(() => ({
		workflowObject: { setSettings: vi.fn() },
	})),
}));

function createSettings() {
	return useWorkflowDocumentSettings({ syncWorkflowObject: vi.fn() });
}

describe('useWorkflowDocumentSettings', () => {
	describe('initial state', () => {
		it('should start with default settings', () => {
			const { settings } = createSettings();
			expect(settings.value).toEqual(DEFAULT_SETTINGS);
		});
	});

	describe('setSettings', () => {
		it('should set settings merged with defaults and fire event hook', () => {
			const { settings, setSettings, onSettingsChange } = createSettings();
			const hookSpy = vi.fn();
			onSettingsChange(hookSpy);

			const newSettings = { executionOrder: 'v1' as const, timezone: 'UTC' };
			setSettings(newSettings);

			const expected = { ...DEFAULT_SETTINGS, ...newSettings };
			expect(settings.value).toEqual(expected);
			expect(hookSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: { settings: expected },
			});
		});

		it('should always include defaults when replacing settings', () => {
			const { settings, setSettings } = createSettings();
			setSettings({ executionOrder: 'v1' });

			setSettings({ timezone: 'UTC' });

			expect(settings.value).toEqual({ ...DEFAULT_SETTINGS, timezone: 'UTC' });
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

	describe('mergeSettings', () => {
		it('should merge partial settings with existing settings', () => {
			const { settings, setSettings, mergeSettings, onSettingsChange } = createSettings();
			const hookSpy = vi.fn();
			onSettingsChange(hookSpy);

			setSettings({ executionOrder: 'v1', timezone: 'UTC' });
			mergeSettings({ timezone: 'America/New_York' });

			expect(settings.value).toEqual({
				...DEFAULT_SETTINGS,
				executionOrder: 'v1',
				timezone: 'America/New_York',
			});
		});

		it('should add new fields without removing existing ones', () => {
			const { settings, setSettings, mergeSettings } = createSettings();
			setSettings({ executionOrder: 'v1' });

			mergeSettings({ timezone: 'UTC' });

			expect(settings.value).toEqual({
				...DEFAULT_SETTINGS,
				executionOrder: 'v1',
				timezone: 'UTC',
			});
		});

		it('should fire event hook with merged settings', () => {
			const { setSettings, mergeSettings, onSettingsChange } = createSettings();
			const hookSpy = vi.fn();
			setSettings({ executionOrder: 'v1' });
			onSettingsChange(hookSpy);

			mergeSettings({ timezone: 'UTC' });

			expect(hookSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: { settings: { ...DEFAULT_SETTINGS, executionOrder: 'v1', timezone: 'UTC' } },
			});
		});
	});

	describe('getSettingsSnapshot', () => {
		it('should return a deep copy of settings', () => {
			const { settings, setSettings, getSettingsSnapshot } = createSettings();
			const original = { executionOrder: 'v1' as const, timezone: 'UTC' };
			setSettings(original);

			const snapshot = getSettingsSnapshot();

			expect(snapshot).toEqual({ ...DEFAULT_SETTINGS, ...original });
			expect(snapshot).not.toBe(settings.value);
		});

		it('should return default settings when no settings set', () => {
			const { getSettingsSnapshot } = createSettings();
			expect(getSettingsSnapshot()).toEqual(DEFAULT_SETTINGS);
		});
	});
});
