import { isRecord } from './gym-admin';

const UNTITLED = 'Untitled';

const needsTitle = (item: unknown): item is Record<string, unknown> =>
	isRecord(item) && (typeof item.title !== 'string' || item.title.trim() === '');

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
			? items.map((item: unknown) => (needsTitle(item) ? { ...item, title: UNTITLED } : item))
			: items;
	return {
		...overlay,
		native: {
			...native,
			notion: { ...notion, pages: titled(notion.pages), databases: titled(notion.databases) },
		},
	};
}
