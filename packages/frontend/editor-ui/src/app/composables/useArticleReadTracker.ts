import { onScopeDispose, watch, type Ref } from 'vue';

/**
 * Decides which articles in a scrolling list the reader has reached.
 *
 * Opening the list at one article scrolls past the others, and that must
 * not count as reading them. So an article counts only once the reader
 * scrolls on their own and the reading position rests on it. The reading
 * position is a line some way down the viewport: the article whose top has
 * crossed that line is the one being read. At the end of the list, the
 * last articles may be too short to ever reach the line, so every article
 * that is fully in view counts there too.
 */

export interface TrackedArticle {
	id: number;
	el: HTMLElement;
}

interface Edges {
	top: number;
	bottom: number;
}

interface ViewportEdges extends Edges {
	/** The container is scrolled to its end. */
	atEnd: boolean;
}

/**
 * Pure part of the tracker: which article ids are at the reading position.
 * `readingLine` is an absolute y coordinate in the same space as the edges.
 */
export function articlesAtReadingPosition(
	viewport: ViewportEdges,
	articles: Array<{ id: number } & Edges>,
	readingLine: number,
): number[] {
	const ids: number[] = [];

	const current = articles.filter((article) => article.top <= readingLine).at(-1);
	if (current) ids.push(current.id);

	if (viewport.atEnd) {
		for (const article of articles) {
			const fullyVisible = article.top >= viewport.top - 1 && article.bottom <= viewport.bottom + 1;
			if (fullyVisible && !ids.includes(article.id)) ids.push(article.id);
		}
	}

	return ids;
}

export interface ArticleReadTrackerOptions {
	/** The element that scrolls the articles. */
	container: Readonly<Ref<HTMLElement | null | undefined>>;
	/** The articles in reading order. */
	articles: () => TrackedArticle[];
	onRead: (id: number) => void;
	/** How long the reading position must rest before an article counts as read. */
	dwellMs?: number;
	/** Where the reading position sits, as a fraction of the viewport height from its top. */
	readingLine?: number;
}

const DEFAULT_DWELL_MS = 800;
const DEFAULT_READING_LINE = 0.35;
/** A programmatic scroll that has not moved by then is not going to. */
const SCROLL_START_GRACE_MS = 100;
/** Fallback for browsers without `scrollend`. */
const SCROLL_SETTLE_MAX_MS = 1200;

export function useArticleReadTracker(options: ArticleReadTrackerOptions) {
	const dwellMs = options.dwellMs ?? DEFAULT_DWELL_MS;
	const readingLine = options.readingLine ?? DEFAULT_READING_LINE;

	let dwellTimer: ReturnType<typeof setTimeout> | undefined;
	let suspended = false;

	function evaluate() {
		const container = options.container.value;
		if (!container) return;

		const rect = container.getBoundingClientRect();
		const atEnd = container.scrollTop + container.clientHeight >= container.scrollHeight - 1;
		const articles = options.articles().map(({ id, el }) => {
			const { top, bottom } = el.getBoundingClientRect();
			return { id, top, bottom };
		});
		const line = rect.top + rect.height * readingLine;
		// DOMRect keeps its edges on the prototype, so spread would drop them.
		const viewport = { top: rect.top, bottom: rect.bottom, atEnd };

		for (const id of articlesAtReadingPosition(viewport, articles, line)) {
			options.onRead(id);
		}
	}

	function onScroll() {
		if (suspended) return;
		clearTimeout(dwellTimer);
		dwellTimer = setTimeout(evaluate, dwellMs);
	}

	/**
	 * Run a scroll the reader did not ask for, such as jumping to an
	 * article, without the articles it passes counting as read.
	 */
	async function scrollQuietly(scroll: () => void) {
		const container = options.container.value;
		suspended = true;
		clearTimeout(dwellTimer);

		await new Promise<void>((resolve) => {
			if (!container) {
				scroll();
				resolve();
				return;
			}

			let moved = false;
			let settled = false;
			const timers: Array<ReturnType<typeof setTimeout>> = [];
			const onMove = () => {
				moved = true;
			};
			const finish = () => {
				if (settled) return;
				settled = true;
				container.removeEventListener('scroll', onMove);
				container.removeEventListener('scrollend', finish);
				timers.forEach(clearTimeout);
				resolve();
			};

			container.addEventListener('scroll', onMove, { passive: true });
			container.addEventListener('scrollend', finish);
			timers.push(
				setTimeout(() => {
					if (!moved) finish();
				}, SCROLL_START_GRACE_MS),
				setTimeout(finish, SCROLL_SETTLE_MAX_MS),
			);
			scroll();
		});

		suspended = false;
	}

	watch(
		options.container,
		(container, previous) => {
			previous?.removeEventListener('scroll', onScroll);
			container?.addEventListener('scroll', onScroll, { passive: true });
		},
		{ immediate: true },
	);

	onScopeDispose(() => {
		clearTimeout(dwellTimer);
		options.container.value?.removeEventListener('scroll', onScroll);
	});

	return { scrollQuietly };
}
