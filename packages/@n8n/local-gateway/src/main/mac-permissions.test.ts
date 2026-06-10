import { execFile } from 'node:child_process';

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

vi.mock('node:child_process', () => ({ execFile: vi.fn() }));

vi.mock('@n8n/computer-use/logger', () => ({
	logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { getMacPermissionStatus, openMacPermissionSettings } from './mac-permissions';

const execFileMock = vi.mocked(execFile);

/** Make the mocked osascript probe resolve as granted (no error) or denied (an error). */
function mockAutomation(result: { error?: Error }) {
	execFileMock.mockImplementation(((
		_cmd: string,
		_args: string[],
		_opts: unknown,
		onResult: (error: Error | null, stdout: string, stderr: string) => void,
	) => {
		onResult(result.error ?? null, 'true', result.error ? 'execution error: -1743' : '');
		return {} as never;
	}) as never);
}

const originalPlatform = process.platform;
function setPlatform(platform: NodeJS.Platform) {
	Object.defineProperty(process, 'platform', { value: platform, configurable: true });
}

beforeEach(() => {
	vi.clearAllMocks();
	setPlatform('darwin');
	mockAutomation({}); // automation granted by default
});

afterAll(() => setPlatform(originalPlatform));

describe('getMacPermissionStatus', () => {
	test('off macOS reports unsupported and probes nothing', async () => {
		setPlatform('win32');
		expect(await getMacPermissionStatus()).toEqual({
			supported: false,
			accessibility: 'unknown',
			screenRecording: 'unknown',
			automation: 'unknown',
		});
		expect(isTrustedAccessibilityClient).not.toHaveBeenCalled();
		expect(execFileMock).not.toHaveBeenCalled();
	});

	test('maps granted permissions', async () => {
		isTrustedAccessibilityClient.mockReturnValue(true);
		getMediaAccessStatus.mockReturnValue('granted');
		expect(await getMacPermissionStatus()).toEqual({
			supported: true,
			accessibility: 'granted',
			screenRecording: 'granted',
			automation: 'granted',
		});
		// status check must not prompt
		expect(isTrustedAccessibilityClient).toHaveBeenCalledWith(false);
	});

	test('maps denied / not-determined / denied-automation', async () => {
		isTrustedAccessibilityClient.mockReturnValue(false);
		getMediaAccessStatus.mockReturnValue('denied');
		mockAutomation({ error: new Error('Not authorized to send Apple events to Finder. (-1743)') });
		expect(await getMacPermissionStatus()).toMatchObject({
			accessibility: 'denied',
			screenRecording: 'denied',
			automation: 'denied',
		});

		getMediaAccessStatus.mockReturnValue('not-determined');
		expect((await getMacPermissionStatus()).screenRecording).toBe('unknown');
	});

	test('degrades to unknown when a check throws', async () => {
		isTrustedAccessibilityClient.mockImplementation(() => {
			throw new Error('boom');
		});
		getMediaAccessStatus.mockImplementation(() => {
			throw new Error('boom');
		});
		expect(await getMacPermissionStatus()).toMatchObject({
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

	test('opens the Automation pane', async () => {
		await openMacPermissionSettings('automation');
		expect(openExternal).toHaveBeenCalledWith(
			'x-apple.systempreferences:com.apple.preference.security?Privacy_Automation',
		);
	});

	test('no-op off macOS', async () => {
		setPlatform('linux');
		await openMacPermissionSettings('accessibility');
		expect(openExternal).not.toHaveBeenCalled();
	});
});
