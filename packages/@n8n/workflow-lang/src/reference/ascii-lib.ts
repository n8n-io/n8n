/** `Ascii.is` and `Ascii.isPrintable` (spec section 4.3): every UTF-16 unit is in [lo, hi]. */
export function asciiRange(text: string, lo: number, hi: number): boolean {
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		if (code < lo || code > hi) return false;
	}
	return true;
}

export const asciiIs = (text: unknown): boolean => asciiRange(String(text), 0x00, 0x7f);
/** `Base64.encodeUtf8`: the composite of JavaScript codecs that it replaces, with its errors. */
export const base64Utf8 = (text: unknown): string =>
	// oxlint-disable-next-line typescript/no-deprecated -- the definition of the native (spec section 4.3).
	btoa(unescape(encodeURIComponent(String(text))));

export const asciiIsPrintable = (text: unknown): boolean => asciiRange(String(text), 0x20, 0x7e);
