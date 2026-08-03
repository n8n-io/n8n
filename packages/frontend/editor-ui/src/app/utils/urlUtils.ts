// Strips an existing `redirect` query param to avoid infinite-redirect nesting.
export function getSanitizedCurrentPath(): string {
	const url = new URL(window.location.href);
	url.searchParams.delete('redirect');
	return `${url.pathname}${url.search}`;
}
