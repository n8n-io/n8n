import type { BrowserRecordingCaptureSettings } from '@n8n/api-types';

const RECORDING_SETTINGS_KEY = 'browserRecordingCaptureSettings';

export const DEFAULT_RECORDING_SETTINGS: BrowserRecordingCaptureSettings = {
	networkRequests: false,
	screenshots: false,
};

export async function getRecordingSettings(): Promise<BrowserRecordingCaptureSettings> {
	const stored = await chrome.storage.local.get(RECORDING_SETTINGS_KEY);
	const value: unknown = stored[RECORDING_SETTINGS_KEY];
	if (!value || typeof value !== 'object') return { ...DEFAULT_RECORDING_SETTINGS };
	const settings = Object.fromEntries(Object.entries(value));
	return {
		networkRequests:
			typeof settings.networkRequests === 'boolean'
				? settings.networkRequests
				: DEFAULT_RECORDING_SETTINGS.networkRequests,
		screenshots:
			typeof settings.screenshots === 'boolean'
				? settings.screenshots
				: DEFAULT_RECORDING_SETTINGS.screenshots,
	};
}

export async function saveRecordingSettings(
	settings: BrowserRecordingCaptureSettings,
): Promise<void> {
	await chrome.storage.local.set({ [RECORDING_SETTINGS_KEY]: settings });
}
