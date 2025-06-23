import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { configure } from '@testing-library/vue';
import 'core-js/proposals/set-methods-v2';

// Avoid tests failing because of difference between local and GitHub actions timezone
process.env.TZ = 'UTC';

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
	value: vi.fn((query) => ({
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
	onmessage = vi.fn();

	url: string;

	constructor(url: string) {
		this.url = url;
	}

	postMessage = vi.fn((message: string) => {
		this.onmessage(message);
	});

	addEventListener = vi.fn();

	terminate = vi.fn();
}

class DataTransfer {
	private data: Record<string, unknown> = {};

	setData = vi.fn((type: string, data) => {
		this.data[type] = data;
	});

	getData = vi.fn((type) => {
		if (type.startsWith('text')) type = 'text';
		return this.data[type] ?? null;
	});
}

Object.defineProperty(window, 'Worker', {
	writable: true,
	value: Worker,
});

Object.defineProperty(window, 'DataTransfer', {
	writable: true,
	value: DataTransfer,
});

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
	writable: true,
	value: vi.fn(),
});
