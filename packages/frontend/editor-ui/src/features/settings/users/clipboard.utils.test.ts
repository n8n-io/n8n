import { copyLinkWithFallback } from './clipboard.utils';

const link = 'https://example.com/signup?token=abc';

class ClipboardItemStub {
	constructor(readonly data: Record<string, Blob>) {}
}

describe('copyLinkWithFallback', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		Reflect.deleteProperty(window.navigator, 'clipboard');
	});

	it('uses the primary copy and never touches the fallback on success', async () => {
		const copy = vi.fn().mockResolvedValue(undefined);
		const write = vi.fn();
		vi.stubGlobal('ClipboardItem', ClipboardItemStub);
		Object.defineProperty(window.navigator, 'clipboard', { value: { write }, configurable: true });

		await copyLinkWithFallback(copy, link);

		expect(copy).toHaveBeenCalledWith(link);
		expect(write).not.toHaveBeenCalled();
	});

	it('falls back to ClipboardItem when the primary copy rejects', async () => {
		const copy = vi.fn().mockRejectedValue(new DOMException('nope', 'NotAllowedError'));
		const write = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal('ClipboardItem', ClipboardItemStub);
		Object.defineProperty(window.navigator, 'clipboard', { value: { write }, configurable: true });

		await expect(copyLinkWithFallback(copy, link)).resolves.toBeUndefined();

		expect(write).toHaveBeenCalledTimes(1);
		const [items] = write.mock.calls[0] as [ClipboardItemStub[]];
		expect(items[0]).toBeInstanceOf(ClipboardItemStub);
		expect(items[0].data['text/plain']).toBeInstanceOf(Blob);
	});

	it('rethrows the original error when the fallback also fails', async () => {
		const originalError = new DOMException('nope', 'NotAllowedError');
		const copy = vi.fn().mockRejectedValue(originalError);
		const write = vi.fn().mockRejectedValue(new Error('fallback failed'));
		vi.stubGlobal('ClipboardItem', ClipboardItemStub);
		Object.defineProperty(window.navigator, 'clipboard', { value: { write }, configurable: true });

		await expect(copyLinkWithFallback(copy, link)).rejects.toBe(originalError);
	});

	it('rethrows the original error when ClipboardItem is unsupported', async () => {
		const originalError = new DOMException('nope', 'NotAllowedError');
		const copy = vi.fn().mockRejectedValue(originalError);
		// ClipboardItem left undefined (jsdom default).
		Object.defineProperty(window.navigator, 'clipboard', {
			value: { write: vi.fn() },
			configurable: true,
		});

		await expect(copyLinkWithFallback(copy, link)).rejects.toBe(originalError);
	});
});
