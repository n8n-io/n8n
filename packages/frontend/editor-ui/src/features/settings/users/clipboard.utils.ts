type CopyFn = (value: string) => Promise<void> | void;

/**
 * Copies text to the clipboard and, if the primary write fails, retries via
 * ClipboardItem.
 *
 * Invite / password-reset links are copied after awaiting a network request, so
 * the write no longer runs in the original user gesture. Safari rejects
 * writeText() in that context (NotAllowedError), leaving the clipboard empty;
 * WebKit still permits ClipboardItem here. Browsers without ClipboardItem keep
 * the primary path untouched. If the fallback also fails, the original error is
 * rethrown so callers surface a consistent message.
 *
 * This fixes a Safari issue that affects a small number of users
 * when copying invite links.
 */
export async function copyLinkWithFallback(copy: CopyFn, value: string) {
	try {
		await copy(value);
	} catch (error) {
		if (typeof ClipboardItem === 'undefined' || !window.navigator?.clipboard?.write) {
			throw error;
		}
		try {
			await window.navigator.clipboard.write([
				new ClipboardItem({ 'text/plain': new Blob([value], { type: 'text/plain' }) }),
			]);
		} catch {
			throw error;
		}
	}
}
