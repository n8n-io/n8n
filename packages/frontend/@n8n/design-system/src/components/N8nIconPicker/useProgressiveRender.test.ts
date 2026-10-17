import { render } from '@testing-library/vue';
import { defineComponent, nextTick, onMounted, ref } from 'vue';

import { useProgressiveRender } from './useProgressiveRender';

class MockIntersectionObserver {
	static instances: MockIntersectionObserver[] = [];

	readonly root: Element | Document | null;
	readonly rootMargin: string;
	observedElement: Element | undefined;
	disconnected = false;

	constructor(
		private readonly onIntersection: IntersectionObserverCallback,
		options?: IntersectionObserverInit,
	) {
		this.root = options?.root ?? null;
		this.rootMargin = options?.rootMargin ?? '0px';
		MockIntersectionObserver.instances.push(this);
	}

	observe(element: Element) {
		this.observedElement = element;
	}

	disconnect() {
		this.disconnected = true;
	}

	trigger(isIntersecting: boolean) {
		this.onIntersection(
			[{ isIntersecting } as IntersectionObserverEntry],
			this as unknown as IntersectionObserver,
		);
	}
}

function createTestComponent(items: number[]) {
	return defineComponent({
		setup() {
			const rows = ref(items);
			const isVisible = ref(true);
			const progressiveRender = useProgressiveRender(rows, isVisible);

			onMounted(progressiveRender.start);

			return { rows, ...progressiveRender };
		},
		template: `
			<div ref="scrollAreaRef" data-test-id="scroll-area">
				<div v-for="row in visibleRows" :key="row" data-test-id="row">{{ row }}</div>
				<div
					v-if="renderedRowCount < rows.length"
					ref="loadMoreRef"
					data-test-id="load-more"
				></div>
			</div>
		`,
	});
}

describe('useProgressiveRender', function () {
	beforeEach(function () {
		MockIntersectionObserver.instances = [];
		vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
	});

	afterEach(function () {
		vi.unstubAllGlobals();
	});

	it('loads the next batch when the sentinel intersects', async function () {
		const items = Array.from({ length: 20 }, function createItem(_, index) {
			return index;
		});
		const view = render(createTestComponent(items));
		await nextTick();

		expect(view.getAllByTestId('row')).toHaveLength(10);
		const loadMore = view.getByTestId('load-more');
		const observer = MockIntersectionObserver.instances[0];
		expect(observer?.root).toBe(view.getByTestId('scroll-area'));
		expect(observer?.observedElement).toBe(loadMore);

		observer?.trigger(true);
		await nextTick();

		expect(view.getAllByTestId('row')).toHaveLength(20);
		expect(view.queryByTestId('load-more')).not.toBeInTheDocument();
		expect(observer?.disconnected).toBe(true);
	});

	it('observes one viewport ahead so keyboard scrolling can load more rows', async function () {
		const items = Array.from({ length: 30 }, function createItem(_, index) {
			return index;
		});
		const view = render(createTestComponent(items));
		Object.defineProperty(view.getByTestId('scroll-area'), 'clientHeight', { value: 400 });
		await nextTick();

		const observer = MockIntersectionObserver.instances[0];
		expect(observer?.rootMargin).toBe('0px 0px 400px 0px');

		observer?.trigger(true);
		await nextTick();
		expect(view.getAllByTestId('row')).toHaveLength(20);

		expect(observer?.disconnected).toBe(true);
		const nextObserver = MockIntersectionObserver.instances[1];
		expect(nextObserver?.observedElement).toBe(view.getByTestId('load-more'));
		expect(nextObserver?.rootMargin).toBe('0px 0px 400px 0px');

		nextObserver?.trigger(true);
		await nextTick();
		expect(view.getAllByTestId('row')).toHaveLength(30);
		expect(nextObserver?.disconnected).toBe(true);
	});

	it('does not show or observe the sentinel when all items are visible', async function () {
		const items = Array.from({ length: 10 }, function createItem(_, index) {
			return index;
		});
		const view = render(createTestComponent(items));
		await nextTick();

		expect(view.getAllByTestId('row')).toHaveLength(10);
		expect(view.queryByTestId('load-more')).not.toBeInTheDocument();
		expect(MockIntersectionObserver.instances).toHaveLength(0);
	});
});
