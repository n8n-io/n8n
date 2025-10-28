import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useIntersectionObserver } from './useIntersectionObserver';
import { ref } from 'vue';

interface MockIntersectionObserverConstructor {
	__callback?: IntersectionObserverCallback;
	new (callback: IntersectionObserverCallback): IntersectionObserver;
}

describe('useIntersectionObserver()', () => {
	let mockIntersectionObserver: {
		observe: ReturnType<typeof vi.fn>;
		disconnect: ReturnType<typeof vi.fn>;
		unobserve: ReturnType<typeof vi.fn>;
	};
	let mockCallback: ReturnType<typeof vi.fn>;
	let mockRoot: Element;
	let mockConstructor: MockIntersectionObserverConstructor;

	beforeEach(() => {
		// Mock IntersectionObserver
		mockIntersectionObserver = {
			observe: vi.fn(),
			disconnect: vi.fn(),
			unobserve: vi.fn(),
		};

		mockConstructor = vi.fn((callback) => {
			// Store callback for manual triggering
			mockConstructor.__callback = callback;
			return mockIntersectionObserver;
		}) as unknown as MockIntersectionObserverConstructor;

		global.IntersectionObserver = mockConstructor as unknown as typeof IntersectionObserver;

		mockCallback = vi.fn();
		mockRoot = document.createElement('div');
	});

	afterEach(() => {
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

		expect(global.IntersectionObserver).toHaveBeenCalledWith(
			expect.any(Function),
			expect.objectContaining({
				root: mockRoot,
				threshold: 0.01,
			}),
		);
		expect(mockIntersectionObserver.observe).toHaveBeenCalledWith(element);
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
		const callback = mockConstructor.__callback;
		if (callback) {
			callback(
				[{ isIntersecting: true, target: element }] as IntersectionObserverEntry[],
				{} as IntersectionObserver,
			);
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
		const callback = mockConstructor.__callback;
		if (callback) {
			callback(
				[{ isIntersecting: false, target: element }] as IntersectionObserverEntry[],
				{} as IntersectionObserver,
			);
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
		const callback = mockConstructor.__callback;
		if (callback) {
			callback(
				[{ isIntersecting: true, target: element }] as IntersectionObserverEntry[],
				{} as IntersectionObserver,
			);
		}

		expect(mockIntersectionObserver.disconnect).toHaveBeenCalledTimes(1);
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
		const callback = mockConstructor.__callback;
		if (callback) {
			callback(
				[{ isIntersecting: true, target: element }] as IntersectionObserverEntry[],
				{} as IntersectionObserver,
			);
		}

		expect(mockIntersectionObserver.disconnect).not.toHaveBeenCalled();
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

		expect(global.IntersectionObserver).toHaveBeenCalledWith(
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
		const firstObserver = mockIntersectionObserver.disconnect;

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

		expect(global.IntersectionObserver).not.toHaveBeenCalled();
	});

	it('does nothing when observing undefined element', () => {
		const root = ref(mockRoot);
		const { observe } = useIntersectionObserver({
			root,
			onIntersect: mockCallback,
		});

		observe(undefined);

		expect(global.IntersectionObserver).not.toHaveBeenCalled();
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

		expect(mockIntersectionObserver.disconnect).toHaveBeenCalledTimes(1);
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

		expect(mockIntersectionObserver.disconnect).toHaveBeenCalledTimes(1);
	});
});
