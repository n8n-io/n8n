import { ForeignFrames } from './foreignFrames';

const OURS = 'ourextensionid';
const OFFENDING = 'offendingextensionid';

const chrome = {
	runtime: { id: OURS },
	webNavigation: { getAllFrames: vi.fn().mockResolvedValue([]) },
};
Object.assign(globalThis, { chrome });

const menuUrl = (id = OFFENDING) => `chrome-extension://${id}/inline/menu/menu.html`;

let frames: ForeignFrames;

beforeEach(() => {
	vi.clearAllMocks();
	chrome.webNavigation.getAllFrames.mockReset().mockResolvedValue([]);
	frames = new ForeignFrames();
});

describe('ForeignFrames.isDenial', () => {
	it.each([
		'Detached while handling command.',
		'Cannot access a chrome-extension:// URL of a different extension',
		'Cannot attach to this target.',
	])('recognises %s', (message) => {
		expect(ForeignFrames.isDenial(new Error(message))).toBe(true);
	});

	it('leaves ordinary failures alone', () => {
		expect(ForeignFrames.isDenial(new Error('No node with given id'))).toBe(false);
	});

	it('is safe on a non-Error', () => {
		expect(ForeignFrames.isDenial('Detached while handling command.')).toBe(false);
	});
});

describe('ForeignFrames tracking', () => {
	// All three carry the URL, and which one Chrome emits varies by navigation.
	it.each([
		['Page.frameRequestedNavigation', { frameId: 'f1', url: menuUrl() }],
		['Page.frameStartedNavigating', { frameId: 'f1', url: menuUrl() }],
		['Page.frameNavigated', { frame: { id: 'f1', url: menuUrl() } }],
	])('records a foreign frame from %s', async (method, params) => {
		frames.track(1, method, params);

		await expect(frames.owners(1)).resolves.toEqual([OFFENDING]);
	});

	it('ignores frames belonging to us', async () => {
		frames.track(1, 'Page.frameNavigated', { frame: { id: 'f1', url: menuUrl(OURS) } });

		await expect(frames.owners(1)).resolves.toEqual([]);
	});

	it('ignores ordinary page frames', async () => {
		frames.track(1, 'Page.frameNavigated', {
			frame: { id: 'f1', url: 'https://console.anthropic.com' },
		});

		await expect(frames.owners(1)).resolves.toEqual([]);
	});

	it('forgets a frame that detaches', async () => {
		frames.track(1, 'Page.frameRequestedNavigation', { frameId: 'f1', url: menuUrl() });
		frames.track(1, 'Page.frameDetached', { frameId: 'f1' });

		await expect(frames.owners(1)).resolves.toEqual([]);
	});

	it('forgets a frame that navigates off the extension origin', async () => {
		frames.track(1, 'Page.frameRequestedNavigation', { frameId: 'f1', url: menuUrl() });
		frames.track(1, 'Page.frameNavigated', {
			frame: { id: 'f1', url: 'https://console.anthropic.com' },
		});

		await expect(frames.owners(1)).resolves.toEqual([]);
	});

	it('keeps a second frame when only the first detaches', async () => {
		frames.track(1, 'Page.frameRequestedNavigation', { frameId: 'f1', url: menuUrl() });
		frames.track(1, 'Page.frameRequestedNavigation', { frameId: 'f2', url: menuUrl() });
		frames.track(1, 'Page.frameDetached', { frameId: 'f1' });

		await expect(frames.owners(1)).resolves.toEqual([OFFENDING]);
	});

	it('keeps tabs apart', async () => {
		frames.track(1, 'Page.frameRequestedNavigation', { frameId: 'f1', url: menuUrl() });

		await expect(frames.owners(2)).resolves.toEqual([]);
	});

	it('keeps a frame that passes through about:blank on its way to the real URL', async () => {
		frames.track(1, 'Page.frameRequestedNavigation', { frameId: 'f1', url: menuUrl() });
		frames.track(1, 'Page.frameNavigated', { frame: { id: 'f1', url: 'about:blank' } });

		await expect(frames.owners(1)).resolves.toEqual([OFFENDING]);
	});

	it('forgets every tab on clear', async () => {
		frames.track(1, 'Page.frameRequestedNavigation', { frameId: 'f1', url: menuUrl() });
		frames.track(2, 'Page.frameRequestedNavigation', { frameId: 'f1', url: menuUrl() });
		frames.clear();

		await expect(frames.owners(1)).resolves.toEqual([]);
		await expect(frames.owners(2)).resolves.toEqual([]);
	});

	it('forgets everything for a tab on request', async () => {
		frames.track(1, 'Page.frameRequestedNavigation', { frameId: 'f1', url: menuUrl() });
		frames.forget(1);

		await expect(frames.owners(1)).resolves.toEqual([]);
	});
});

describe('ForeignFrames.owners', () => {
	it('falls back to the frame tree when no event was seen', async () => {
		// A frame already open before we attached emits no navigation event, but is
		// committed and therefore readable.
		chrome.webNavigation.getAllFrames.mockResolvedValueOnce([
			{ frameId: 0, url: 'https://console.anthropic.com' },
			{ frameId: 1, url: menuUrl() },
		]);

		await expect(frames.owners(1)).resolves.toEqual([OFFENDING]);
	});

	it('prefers tracked frames over the frame tree', async () => {
		// The tree reports about:blank for a frame that is still committing, which
		// is exactly when the menu opens under us.
		frames.track(1, 'Page.frameRequestedNavigation', { frameId: 'f1', url: menuUrl() });
		chrome.webNavigation.getAllFrames.mockResolvedValueOnce([{ frameId: 1, url: 'about:blank' }]);

		await expect(frames.owners(1)).resolves.toEqual([OFFENDING]);
		expect(chrome.webNavigation.getAllFrames).not.toHaveBeenCalled();
	});

	it('reports nothing when the tab is gone', async () => {
		chrome.webNavigation.getAllFrames.mockRejectedValueOnce(new Error('No tab with id: 1'));

		await expect(frames.owners(1)).resolves.toEqual([]);
	});
});

describe('ForeignFrames.describeDenial', () => {
	it('names the extension and keeps the original message', async () => {
		frames.track(1, 'Page.frameRequestedNavigation', { frameId: 'f1', url: menuUrl() });

		const described = await frames.describeDenial(1, new Error('Detached while handling command.'));

		expect(described.message).toContain(OFFENDING);
		expect(described.message).toContain('Detached while handling command.');
	});

	it('returns the original untouched when nothing can be named', async () => {
		const original = new Error('Detached while handling command.');

		expect(await frames.describeDenial(1, original)).toBe(original);
	});
});
