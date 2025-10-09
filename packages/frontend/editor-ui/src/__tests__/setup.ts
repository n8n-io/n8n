import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { configure } from '@testing-library/vue';
import 'core-js/proposals/set-methods-v2';
import englishBaseText from '@n8n/i18n/locales/en.json';
import { loadLanguage, type LocaleMessages } from '@n8n/i18n';
import { APP_MODALS_ELEMENT_ID } from '@/constants';

// Avoid tests failing because of difference between local and GitHub actions timezone
process.env.TZ = 'UTC';

configure({ testIdAttribute: 'data-test-id' });

// Create DOM containers for Element Plus components before each test
beforeEach(() => {
	// Create app-grid container for toasts
	const appGrid = document.createElement('div');
	appGrid.id = 'app-grid';
	document.body.appendChild(appGrid);

	// Create app-modals container for modals
	const appModals = document.createElement('div');
	appModals.id = APP_MODALS_ELEMENT_ID;
	document.body.appendChild(appModals);
});

afterEach(() => {
	// Clean up only our specific DOM containers to avoid interfering with Vue's unmounting
	const appGrid = document.getElementById('app-grid');
	const appModals = document.getElementById(APP_MODALS_ELEMENT_ID);

	if (appGrid) {
		appGrid.remove();
	}
	if (appModals) {
		appModals.remove();
	}
});

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

Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
	writable: true,
	value: vi.fn(),
});

loadLanguage('en', englishBaseText as LocaleMessages);
