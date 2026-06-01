import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';
import { useIntersectionObserver } from './useIntersectionObserver';
import { ref } from 'vue';

function createMockEntry(element: Element, isIntersecting: boolean): IntersectionObserverEntry {
	return {
		isIntersecting,
		target: element,
		boundingClientRect: {} as DOMRectReadOnly,
		intersectionRatio: isIntersecting ? 1 : 0,
		intersectionRect: {} as DOMRectReadOnly,
		rootBounds: null,
		time: Date.now(),
	};
}

class MockIntersectionObserver extends IntersectionObserver {
	constructor(handler: IntersectionObserverCallback, options?: IntersectionObserverInit) {
		super(handler, options);

		this.__callback = handler;
		MockIntersectionObserver._instance = this;
		MockIntersectionObserver.init(handler, options);
	}

	static _instance: MockIntersectionObserver;

	static getInstance() {
		return MockIntersectionObserver._instance;
	}

	__callback: IntersectionObserverCallback;

	static init = vi.fn();

	observe = vi.fn();

	disconnect = vi.fn();

	unobserve = vi.fn();
}

describe('useIntersectionObserver()', () => {
	let mockCallback: Mock;
	let mockRoot: Element;
	let originalIntersectionObserver: typeof IntersectionObserver;

	beforeEach(() => {
		vi.clearAllMocks();
		// Cache original IntersectionObserver
		originalIntersectionObserver = global.IntersectionObserver;

		vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

		mockCallback = vi.fn();
		mockRoot = document.createElement('div');
	});

	afterEach(() => {
		// Restore original IntersectionObserver
		global.IntersectionObserver = originalIntersectionObserver;
		vi.restoreAllMocks();
	});

	it('creates an IntersectionObserver when observe is called', () => {
		const root = ref(mockRoot);
		const { observe } = useIntersectionObserver({
			root,
			onIntersect: mockCallback,
		});

		const element = document.createElement('div');
		observe(element);

		expect(MockIntersectionObserver.init).toHaveBeenCalledWith(
			expect.any(Function),
			expect.objectContaining({
				root: mockRoot,
				threshold: 0.01,
			}),
		);
		expect(MockIntersectionObserver.getInstance().observe).toHaveBeenCalledWith(element);
	});

	it('executes callback when element intersects', () => {
		const root = ref(mockRoot);
		const { observe } = useIntersectionObserver({
			root,
			onIntersect: mockCallback,
		});

		const element = document.createElement('div');
		observe(element);

		// Simulate intersection
		const callback = MockIntersectionObserver.getInstance().__callback;
		if (callback) {
			callback([createMockEntry(element, true)], {} as IntersectionObserver);
		}

		expect(mockCallback).toHaveBeenCalledTimes(1);
	});

	it('does not execute callback when element does not intersect', () => {
		const root = ref(mockRoot);
		const { observe } = useIntersectionObserver({
			root,
			onIntersect: mockCallback,
		});

		const element = document.createElement('div');
		observe(element);

		// Simulate no intersection
		const callback = MockIntersectionObserver.getInstance().__callback;
		if (callback) {
			callback([createMockEntry(element, false)], {} as IntersectionObserver);
		}

		expect(mockCallback).not.toHaveBeenCalled();
	});

	it('disconnects observer after first intersection by default', () => {
		const root = ref(mockRoot);
		const { observe } = useIntersectionObserver({
			root,
			onIntersect: mockCallback,
		});

		const element = document.createElement('div');
		observe(element);

		// Simulate intersection
		const callback = MockIntersectionObserver.getInstance().__callback;
		if (callback) {
			callback([createMockEntry(element, true)], {} as IntersectionObserver);
		}

		expect(MockIntersectionObserver.getInstance().disconnect).toHaveBeenCalledTimes(1);
	});

	it('continues observing when once is false', () => {
		const root = ref(mockRoot);
		const { observe } = useIntersectionObserver({
			root,
			onIntersect: mockCallback,
			once: false,
		});

		const element = document.createElement('div');
		observe(element);

		// Simulate intersection
		const callback = MockIntersectionObserver.getInstance().__callback;
		if (callback) {
			callback([createMockEntry(element, true)], {} as IntersectionObserver);
		}

		expect(MockIntersectionObserver.getInstance().disconnect).not.toHaveBeenCalled();
	});

	it('uses custom threshold when provided', () => {
		const root = ref(mockRoot);
		const customThreshold = 0.5;
		const { observe } = useIntersectionObserver({
			root,
			threshold: customThreshold,
			onIntersect: mockCallback,
		});

		const element = document.createElement('div');
		observe(element);

		expect(MockIntersectionObserver.init).toHaveBeenCalledWith(
			expect.any(Function),
			expect.objectContaining({
				threshold: customThreshold,
			}),
		);
	});

	it('cleans up existing observer when observing a new element', () => {
		const root = ref(mockRoot);
		const { observe } = useIntersectionObserver({
			root,
			onIntersect: mockCallback,
		});

		const element1 = document.createElement('div');
		const element2 = document.createElement('div');

		observe(element1);
		const firstObserver = MockIntersectionObserver.getInstance().disconnect;

		observe(element2);

		expect(firstObserver).toHaveBeenCalledTimes(1);
	});

	it('does nothing when observing null element', () => {
		const root = ref(mockRoot);
		const { observe } = useIntersectionObserver({
			root,
			onIntersect: mockCallback,
		});

		observe(null);

		expect(MockIntersectionObserver.init).not.toHaveBeenCalled();
	});

	it('does nothing when observing undefined element', () => {
		const root = ref(mockRoot);
		const { observe } = useIntersectionObserver({
			root,
			onIntersect: mockCallback,
		});

		observe(undefined);

		expect(MockIntersectionObserver.init).not.toHaveBeenCalled();
	});

	it('exposes disconnect method for manual cleanup', () => {
		const root = ref(mockRoot);
		const { observe, disconnect } = useIntersectionObserver({
			root,
			onIntersect: mockCallback,
		});

		const element = document.createElement('div');
		observe(element);

		disconnect();

		expect(MockIntersectionObserver.getInstance().disconnect).toHaveBeenCalledTimes(1);
	});

	it('safely handles multiple disconnect calls', () => {
		const root = ref(mockRoot);
		const { observe, disconnect } = useIntersectionObserver({
			root,
			onIntersect: mockCallback,
		});

		const element = document.createElement('div');
		observe(element);

		disconnect();
		disconnect(); // Second call should not error

		expect(MockIntersectionObserver.getInstance().disconnect).toHaveBeenCalledTimes(1);
	});
});
