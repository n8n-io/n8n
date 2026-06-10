const isTrustedAccessibilityClient = vi.fn<(prompt: boolean) => boolean>();
const getMediaAccessStatus = vi.fn<(media: string) => string>();
const openExternal = vi.fn<(url: string) => void>();

vi.mock('electron', () => ({
	systemPreferences: {
		isTrustedAccessibilityClient: (prompt: boolean) => isTrustedAccessibilityClient(prompt),
		getMediaAccessStatus: (media: string) => getMediaAccessStatus(media),
	},
	shell: { openExternal: (url: string) => openExternal(url) },
	desktopCapturer: { getSources: vi.fn() },
}));

vi.mock('@n8n/computer-use/logger', () => ({
	logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { getMacPermissionStatus, openMacPermissionSettings } from './mac-permissions';

const originalPlatform = process.platform;
function setPlatform(platform: NodeJS.Platform) {
	Object.defineProperty(process, 'platform', { value: platform, configurable: true });
}

beforeEach(() => {
	vi.clearAllMocks();
	setPlatform('darwin');
});

afterAll(() => setPlatform(originalPlatform));

describe('getMacPermissionStatus', () => {
	test('off macOS reports unsupported', () => {
		setPlatform('win32');
		expect(getMacPermissionStatus()).toEqual({
			supported: false,
			accessibility: 'unknown',
			screenRecording: 'unknown',
		});
		expect(isTrustedAccessibilityClient).not.toHaveBeenCalled();
	});

	test('maps granted permissions', () => {
		isTrustedAccessibilityClient.mockReturnValue(true);
		getMediaAccessStatus.mockReturnValue('granted');
		expect(getMacPermissionStatus()).toEqual({
			supported: true,
			accessibility: 'granted',
			screenRecording: 'granted',
		});
		// status check must not prompt
		expect(isTrustedAccessibilityClient).toHaveBeenCalledWith(false);
	});

	test('maps denied / not-determined screen recording', () => {
		isTrustedAccessibilityClient.mockReturnValue(false);
		getMediaAccessStatus.mockReturnValue('denied');
		expect(getMacPermissionStatus()).toMatchObject({
			accessibility: 'denied',
			screenRecording: 'denied',
		});

		getMediaAccessStatus.mockReturnValue('not-determined');
		expect(getMacPermissionStatus().screenRecording).toBe('unknown');
	});

	test('degrades to unknown when a check throws', () => {
		isTrustedAccessibilityClient.mockImplementation(() => {
			throw new Error('boom');
		});
		getMediaAccessStatus.mockImplementation(() => {
			throw new Error('boom');
		});
		expect(getMacPermissionStatus()).toEqual({
			supported: true,
			accessibility: 'unknown',
			screenRecording: 'unknown',
		});
	});
});

describe('openMacPermissionSettings', () => {
	test('opens the Screen Recording pane', async () => {
		await openMacPermissionSettings('screenRecording');
		expect(openExternal).toHaveBeenCalledWith(
			'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
		);
	});

	test('prompts and opens the Accessibility pane', async () => {
		await openMacPermissionSettings('accessibility');
		expect(isTrustedAccessibilityClient).toHaveBeenCalledWith(true);
		expect(openExternal).toHaveBeenCalledWith(
			'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
		);
	});

	test('no-op off macOS', async () => {
		setPlatform('linux');
		await openMacPermissionSettings('accessibility');
		expect(openExternal).not.toHaveBeenCalled();
	});
});
