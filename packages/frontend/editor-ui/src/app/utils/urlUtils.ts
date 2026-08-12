// Strips an existing `redirect` query param to avoid infinite-redirect nesting.
export function getSanitizedCurrentPath(route: { fullPath: string }): string {
	const url = new URL(route.fullPath, 'http://placeholder');
	url.searchParams.delete('redirect');
	return `${url.pathname}${url.search}`;
}
