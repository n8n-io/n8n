import { isRecord } from './gym-admin';

const UNTITLED = 'Untitled';

const needsTitle = (item: unknown): item is Record<string, unknown> =>
	isRecord(item) && (typeof item.title !== 'string' || item.title.trim() === '');

const MAX_TITLE = 200;
const TITLE_LINE = /The title of this (?:Database|Data Source) is: ([^\n]+)/;

// A pointer to the whole fetch text can put that text in a title. Real Notion has the title in one line.
function shortTitle(title: string): string {
	if (title.length <= MAX_TITLE && !title.includes('\n')) return title;
	const named = TITLE_LINE.exec(title)?.[1]?.trim();
	return named ?? title.split('\n')[0].slice(0, MAX_TITLE);
}

/**
 * The gym refuses a page or a database without a title. Real Notion allows it, and shows
 * "Untitled": the ancestors of a page often have an empty title. Give them that name.
 */
export function withTitles(overlay: Record<string, unknown>): Record<string, unknown> {
	const { native } = overlay;
	if (!isRecord(native) || !isRecord(native.notion)) return overlay;
	const { notion } = native;
	const titled = (items: unknown): unknown =>
		Array.isArray(items)
			? items.map((item: unknown) => {
					if (needsTitle(item)) return { ...item, title: UNTITLED };
					return isRecord(item) && typeof item.title === 'string'
						? { ...item, title: shortTitle(item.title) }
						: item;
				})
			: items;
	return {
		...overlay,
		native: {
			...native,
			notion: { ...notion, pages: titled(notion.pages), databases: titled(notion.databases) },
		},
	};
}
