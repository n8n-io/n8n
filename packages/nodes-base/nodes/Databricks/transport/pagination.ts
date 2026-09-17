export const DEFAULT_MAX_PAGES = 40;

export interface Page<T> {
	items: T[];
	nextPageToken?: string;
}

export interface PageLimits {
	deadlineEpochMs: number;
	maxPages?: number;
}

export function toPage<T>(items: T[] | undefined, nextPageToken: string | undefined): Page<T> {
	return { items: items ?? [], nextPageToken: nextPageToken || undefined };
}

export function clampPageSize(value: number | undefined, max: number): number | undefined {
	if (value === undefined || !Number.isFinite(value)) return undefined;
	return Math.min(Math.max(Math.trunc(value), 1), max);
}

export async function collectPages<T>(
	fetchPage: (pageToken?: string) => Promise<Page<T>>,
	{ deadlineEpochMs, maxPages = DEFAULT_MAX_PAGES }: PageLimits,
	startToken?: string,
): Promise<Page<T>> {
	const items: T[] = [];
	let pageToken = startToken;
	for (let page = 0; page < maxPages; page++) {
		const result = await fetchPage(pageToken);
		items.push(...result.items);
		pageToken = result.nextPageToken;
		if (pageToken === undefined || Date.now() >= deadlineEpochMs) break;
	}
	return { items, nextPageToken: pageToken };
}
