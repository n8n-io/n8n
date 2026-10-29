import { effectScope, nextTick, ref } from 'vue';
import { articlesAtReadingPosition, useArticleReadTracker } from './useArticleReadTracker';

describe('articlesAtReadingPosition', () => {
	const viewport = { top: 0, bottom: 600, atEnd: false };

	it('returns the last article whose top crossed the reading line', () => {
		const articles = [
			{ id: 1, top: -400, bottom: 100 },
			{ id: 2, top: 100, bottom: 700 },
			{ id: 3, top: 700, bottom: 1200 },
		];
		expect(articlesAtReadingPosition(viewport, articles, 210)).toEqual([2]);
	});

	it('returns nothing when no article has reached the line', () => {
		const articles = [{ id: 1, top: 300, bottom: 900 }];
		expect(articlesAtReadingPosition(viewport, articles, 210)).toEqual([]);
	});

	it('also counts every fully visible article at the end of the list', () => {
		const articles = [
			{ id: 1, top: -900, bottom: 50 },
			{ id: 2, top: 50, bottom: 350 },
			{ id: 3, top: 350, bottom: 590 },
		];
		expect(articlesAtReadingPosition({ ...viewport, atEnd: true }, articles, 210)).toEqual([2, 3]);
	});

	it('does not count a partly visible article at the end of the list', () => {
		const articles = [
			{ id: 1, top: -100, bottom: 400 },
			{ id: 2, top: 400, bottom: 650 },
		];
		expect(articlesAtReadingPosition({ ...viewport, atEnd: true }, articles, 210)).toEqual([1]);
	});
});

describe('useArticleReadTracker', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	function rect(top: number, bottom: number): DOMRect {
		return {
			top,
			bottom,
			height: bottom - top,
			left: 0,
			right: 0,
			width: 0,
			x: 0,
			y: top,
			toJSON: () => ({}),
		};
	}

	function setup(layout: { articles: Array<[number, number]>; atEnd?: boolean }) {
		const container = document.createElement('div');
		vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(rect(0, 600));
		Object.defineProperties(container, {
			scrollTop: { value: layout.atEnd ? 400 : 0, writable: true },
			clientHeight: { value: 600 },
			scrollHeight: { value: 1000 },
		});

		const articles = layout.articles.map(([top, bottom], index) => {
			const el = document.createElement('article');
			vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(rect(top, bottom));
			return { id: index + 1, el };
		});

		const onRead = vi.fn();
		const scope = effectScope();
		const tracker = scope.run(() =>
			useArticleReadTracker({
				container: ref(container),
				articles: () => articles,
				onRead,
				dwellMs: 500,
			}),
		);
		if (!tracker) throw new Error('tracker did not initialise');

		return { container, onRead, tracker, scope };
	}

	it('marks the article at the reading position once the scroll rests', async () => {
		const { container, onRead } = setup({
			articles: [
				[-400, 100],
				[100, 700],
			],
		});
		await nextTick();

		container.dispatchEvent(new Event('scroll'));
		vi.advanceTimersByTime(499);
		expect(onRead).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1);
		expect(onRead).toHaveBeenCalledTimes(1);
		expect(onRead).toHaveBeenCalledWith(2);
	});

	it('restarts the dwell while the reader keeps scrolling', async () => {
		const { container, onRead } = setup({ articles: [[0, 600]] });
		await nextTick();

		for (let i = 0; i < 5; i++) {
			container.dispatchEvent(new Event('scroll'));
			vi.advanceTimersByTime(300);
		}
		expect(onRead).not.toHaveBeenCalled();

		vi.advanceTimersByTime(200);
		expect(onRead).toHaveBeenCalledWith(1);
	});

	it('ignores the scroll events of a quiet scroll', async () => {
		const { container, onRead, tracker } = setup({ articles: [[0, 600]] });
		await nextTick();

		const settled = tracker.scrollQuietly(() => {
			container.dispatchEvent(new Event('scroll'));
			container.dispatchEvent(new Event('scroll'));
		});
		container.dispatchEvent(new Event('scrollend'));
		await settled;
		vi.advanceTimersByTime(1000);
		expect(onRead).not.toHaveBeenCalled();

		container.dispatchEvent(new Event('scroll'));
		vi.advanceTimersByTime(500);
		expect(onRead).toHaveBeenCalledWith(1);
	});

	it('stops listening when its scope is disposed', async () => {
		const { container, onRead, scope } = setup({ articles: [[0, 600]] });
		await nextTick();

		scope.stop();
		container.dispatchEvent(new Event('scroll'));
		vi.advanceTimersByTime(500);
		expect(onRead).not.toHaveBeenCalled();
	});

	it('resumes after a quiet scroll that did not move', async () => {
		const { container, onRead, tracker } = setup({ articles: [[0, 600]] });
		await nextTick();

		const settled = tracker.scrollQuietly(() => {});
		vi.advanceTimersByTime(100);
		await settled;

		container.dispatchEvent(new Event('scroll'));
		vi.advanceTimersByTime(500);
		expect(onRead).toHaveBeenCalledWith(1);
	});
});
