/**
 * Adds the Markdown extension because macOS does not recognize Markdown MIME types reliably.
 */
export function enrichMimeTypesWithExtensions(mimeTypes: string): string {
	const tokens = mimeTypes.split(',').map((token) => token.trim());
	if (tokens.some((token) => token === '*' || token === '*/*')) {
		return '*/*';
	}
	if (mimeTypes && (mimeTypes.includes('text/*') || mimeTypes.includes('text/markdown'))) {
		return `${mimeTypes},.md`;
	}
	return mimeTypes;
}

/**
 * Applies the HTML `accept` attribute rules to a file.
 */
export function isFileAcceptedByAccept(
	fileName: string,
	fileMimeType: string,
	acceptString: string,
): boolean {
	if (!acceptString) return true;
	const tokens = acceptString
		.split(',')
		.map((token) => token.trim())
		.filter(Boolean);
	if (tokens.some((token) => token === '*' || token === '*/*')) return true;
	const lowerName = fileName.toLowerCase();
	const lowerType = fileMimeType.toLowerCase();

	for (const rawToken of tokens) {
		const token = rawToken.toLowerCase();
		if (token.startsWith('.')) {
			if (lowerName.endsWith(token)) return true;
			continue;
		}
		if (!lowerType) continue;
		if (token === lowerType) return true;
		if (token.endsWith('/*')) {
			const prefix = token.slice(0, token.indexOf('/'));
			if (lowerType.startsWith(`${prefix}/`)) return true;
		}
	}

	return false;
}
