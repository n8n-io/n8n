export type RedirectUriError = 'invalidUrl' | 'invalidProtocol' | 'httpsRequired';

/** Validates a single OAuth redirect URI; returns the error kind or null when valid. */
export function validateRedirectUri(uri: string): RedirectUriError | null {
	let url: URL;
	try {
		url = new URL(uri);
	} catch {
		return 'invalidUrl';
	}

	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		return 'invalidProtocol';
	}

	const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
	if (!isLocalhost && url.protocol !== 'https:') {
		return 'httpsRequired';
	}

	return null;
}
