import { execFile } from 'node:child_process';

import {
	deriveKind,
	detectActiveContext,
	detectActiveWindow,
	detectFinderFolder,
	detectOpenContexts,
} from './detect';

const activeWindowMock = vi.fn<() => Promise<unknown>>();
const openWindowsMock = vi.fn<() => Promise<unknown>>();
vi.mock('get-windows', () => ({
	activeWindow: async () => await activeWindowMock(),
	openWindows: async () => await openWindowsMock(),
}));

vi.mock('node:child_process', () => ({
	execFile: vi.fn(),
}));

const execFileMock = vi.mocked(execFile);

/** Make the mocked execFile invoke its callback as if osascript succeeded/failed. */
function mockOsascript(result: { stdout?: string; error?: Error }) {
	execFileMock.mockImplementation(((
		_cmd: string,
		_args: string[],
		_opts: unknown,
		onResult: (error: Error | null, stdout: string, stderr: string) => void,
	) => {
		onResult(result.error ?? null, result.stdout ?? '', '');
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
});

afterAll(() => {
	setPlatform(originalPlatform);
});

describe('deriveKind', () => {
	test.each([
		['com.apple.finder', undefined, 'finder'],
		['com.google.Chrome', undefined, 'browser'],
		['com.apple.Safari', undefined, 'browser'],
		['company.thebrowser.Browser', undefined, 'browser'],
		['com.operasoftware.Opera', undefined, 'browser'],
		['org.mozilla.firefox', undefined, 'browser'],
		['com.apple.Preview', undefined, 'pdf'],
		['com.unknown.app', 'Report.pdf', 'pdf'],
		['com.unknown.app', 'Some doc', 'other'],
		['', undefined, 'other'],
	])('bundleId %s / title %s -> %s', (bundleId, windowTitle, expected) => {
		expect(deriveKind({ bundleId, windowTitle })).toBe(expected);
	});
});

describe('detectActiveWindow', () => {
	test('returns {} on non-macOS without calling get-windows', async () => {
		setPlatform('win32');
		const result = await detectActiveWindow();
		expect(result).toEqual({});
		expect(activeWindowMock).not.toHaveBeenCalled();
	});

	test('maps app, bundleId, title and url for a browser window', async () => {
		activeWindowMock.mockResolvedValue({
			title: 'Unicorns - Google Search',
			owner: { name: 'Google Chrome', bundleId: 'com.google.Chrome' },
			url: 'https://example.com',
		});
		const result = await detectActiveWindow();
		expect(result).toEqual({
			app: 'Google Chrome',
			bundleId: 'com.google.Chrome',
			windowTitle: 'Unicorns - Google Search',
			url: 'https://example.com',
		});
	});

	test('retries without the permission gate and still returns app + bundleId', async () => {
		// First (full) call fails its permission check; retry without the gate
		// succeeds but yields no title/URL.
		activeWindowMock
			.mockRejectedValueOnce(new Error('Command failed: .../main'))
			.mockResolvedValueOnce({
				title: '',
				owner: { name: 'Safari', bundleId: 'com.apple.Safari' },
			});
		const result = await detectActiveWindow();
		expect(result).toEqual({ app: 'Safari', bundleId: 'com.apple.Safari' });
		expect(activeWindowMock).toHaveBeenCalledTimes(2);
	});

	test('degrades to {} when both the full call and the retry throw', async () => {
		activeWindowMock.mockRejectedValue(new Error('no screen recording permission'));
		const result = await detectActiveWindow();
		expect(result).toEqual({});
	});
});

describe('detectFinderFolder', () => {
	test('returns the POSIX path from osascript stdout', async () => {
		mockOsascript({ stdout: '/Users/me/Downloads\n' });
		expect(await detectFinderFolder()).toBe('/Users/me/Downloads');
	});

	test('returns undefined when osascript errors', async () => {
		mockOsascript({ error: new Error('not authorized') });
		expect(await detectFinderFolder()).toBeUndefined();
	});

	test('returns undefined on non-macOS', async () => {
		setPlatform('linux');
		expect(await detectFinderFolder()).toBeUndefined();
		expect(execFileMock).not.toHaveBeenCalled();
	});
});

describe('detectActiveContext', () => {
	test('non-macOS returns { kind: "other" } and never throws', async () => {
		setPlatform('linux');
		expect(await detectActiveContext()).toEqual({ kind: 'other' });
	});

	test('enriches a Finder window with the current folder path', async () => {
		activeWindowMock.mockResolvedValue({
			title: 'Downloads',
			owner: { name: 'Finder', bundleId: 'com.apple.finder' },
		});
		mockOsascript({ stdout: '/Users/me/Downloads' });
		const result = await detectActiveContext();
		expect(result).toMatchObject({
			kind: 'finder',
			app: 'Finder',
			path: '/Users/me/Downloads',
		});
	});

	test('passes browser url through without an osascript call', async () => {
		activeWindowMock.mockResolvedValue({
			title: 'The Atlantic',
			owner: { name: 'Safari', bundleId: 'com.apple.Safari' },
			url: 'https://theatlantic.com/article',
		});
		const result = await detectActiveContext();
		expect(result).toMatchObject({ kind: 'browser', url: 'https://theatlantic.com/article' });
		expect(execFileMock).not.toHaveBeenCalled();
	});
});

describe('detectOpenContexts', () => {
	test('returns [] on non-macOS', async () => {
		setPlatform('win32');
		expect(await detectOpenContexts()).toEqual([]);
	});

	test('lists one context per app, front-to-back, with ids and kinds', async () => {
		openWindowsMock.mockResolvedValue([
			{
				id: 1,
				title: 'The Atlantic',
				owner: { name: 'Safari', bundleId: 'com.apple.Safari' },
				url: 'https://theatlantic.com',
			},
			{ id: 2, title: 'Downloads', owner: { name: 'Finder', bundleId: 'com.apple.finder' } },
			{ id: 3, title: 'Q2.pdf', owner: { name: 'Preview', bundleId: 'com.apple.Preview' } },
		]);
		mockOsascript({ stdout: '/Users/me/Downloads' }); // Finder folder + Preview doc path

		const result = await detectOpenContexts();
		expect(result.map((c) => ({ id: c.id, kind: c.kind, app: c.app }))).toEqual([
			{ id: '1', kind: 'browser', app: 'Safari' },
			{ id: '2', kind: 'finder', app: 'Finder' },
			{ id: '3', kind: 'pdf', app: 'Preview' },
		]);
		expect(result[0].url).toBe('https://theatlantic.com');
		expect(result[1].path).toBe('/Users/me/Downloads');
	});

	test('dedupes multiple windows of the same app to the frontmost', async () => {
		openWindowsMock.mockResolvedValue([
			{ id: 1, title: 'Tab A', owner: { name: 'Safari', bundleId: 'com.apple.Safari' } },
			{ id: 2, title: 'Tab B', owner: { name: 'Safari', bundleId: 'com.apple.Safari' } },
		]);
		const result = await detectOpenContexts();
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({ id: '1', windowTitle: 'Tab A' });
	});

	test('skips windows without an app name', async () => {
		openWindowsMock.mockResolvedValue([{ id: 1, title: 'orphan', owner: { name: '' } }]);
		expect(await detectOpenContexts()).toEqual([]);
	});

	test('returns [] when openWindows throws on both attempts', async () => {
		openWindowsMock.mockRejectedValue(new Error('Command failed: .../main'));
		expect(await detectOpenContexts()).toEqual([]);
	});
});
