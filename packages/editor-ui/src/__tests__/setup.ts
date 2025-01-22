import '@testing-library/jest-dom';
import { configure } from '@testing-library/vue';

configure({ testIdAttribute: 'data-test-id' });

window.ResizeObserver =
	window.ResizeObserver ||
	vi.fn().mockImplementation(() => ({
		disconnect: vi.fn(),
		observe: vi.fn(),
		unobserve: vi.fn(),
	}));

Element.prototype.scrollIntoView = vi.fn();

Range.prototype.getBoundingClientRect = vi.fn();
Range.prototype.getClientRects = vi.fn(() => ({
	item: vi.fn(),
	length: 0,
	[Symbol.iterator]: vi.fn(),
}));

export class IntersectionObserver {
	root = null;

	rootMargin = '';

	thresholds = [];

	disconnect() {
		return null;
	}

	observe() {
		return null;
	}

	takeRecords() {
		return [];
	}

	unobserve() {
		return null;
	}
}

window.IntersectionObserver = IntersectionObserver;
global.IntersectionObserver = IntersectionObserver;

// Mocks for useDeviceSupport
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: true,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

class Worker {
	onmessage: (message: string) => void;

	url: string;

	constructor(url: string) {
		this.url = url;
		this.onmessage = () => {};
	}

	postMessage(message: string) {
		this.onmessage(message);
	}

	addEventListener() {}
}

Object.defineProperty(window, 'Worker', {
	writable: true,
	value: Worker,
});
