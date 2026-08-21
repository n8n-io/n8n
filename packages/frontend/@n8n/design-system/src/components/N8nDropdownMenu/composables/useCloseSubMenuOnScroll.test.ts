import { nextTick } from 'vue';

import { useCloseSubMenuOnScroll } from './useCloseSubMenuOnScroll';

type ObserverCallback = IntersectionObserverCallback;

class MockIntersectionObserver {
	static instances: MockIntersectionObserver[] = [];

	readonly observerHandler: ObserverCallback;
	readonly root: Element | Document | null;

	constructor(observerHandler: ObserverCallback, options?: IntersectionObserverInit) {
		this.observerHandler = observerHandler;
		this.root = options?.root ?? null;
		MockIntersectionObserver.instances.push(this);
	}

	observe() {}

	disconnect() {}

	unobserve() {}

	takeRecords(): IntersectionObserverEntry[] {
		return [];
	}
}

describe('useCloseSubMenuOnScroll', () => {
	beforeEach(() => {
		MockIntersectionObserver.instances = [];
		vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('closes the submenu when its trigger leaves the scroll container', async () => {
		const scrollContainer = document.createElement('div');
		const item = document.createElement('div');
		const onItemHidden = vi.fn();
		const { observe } = useCloseSubMenuOnScroll({
			getScrollContainer: function getScrollContainer() {
				return scrollContainer;
			},
			getItem: function getItem() {
				return item;
			},
			onItemHidden,
		});

		void observe(2);
		await nextTick();

		const observer = MockIntersectionObserver.instances[0];
		expect(observer.root).toBe(scrollContainer);

		observer.observerHandler(
			[
				{
					isIntersecting: true,
					intersectionRatio: 1,
				} as IntersectionObserverEntry,
			],
			observer as unknown as IntersectionObserver,
		);
		expect(onItemHidden).not.toHaveBeenCalled();

		observer.observerHandler(
			[
				{
					isIntersecting: false,
					intersectionRatio: 0,
				} as IntersectionObserverEntry,
			],
			observer as unknown as IntersectionObserver,
		);

		expect(onItemHidden).toHaveBeenCalledTimes(1);
		expect(onItemHidden).toHaveBeenCalledWith(2);
	});
});
