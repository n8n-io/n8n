import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { configure } from '@testing-library/vue';
import 'core-js/proposals/set-methods-v2';
import englishBaseText from '@n8n/i18n/locales/en.json';
import { loadLanguage, type LocaleMessages } from '@n8n/i18n';
import { APP_MODALS_ELEMENT_ID } from '@/app/constants';

// Global stub for Reka UI Popover components used by N8nPopover.
// Unlike Element+ popover which always renders content regardless of visibility,
// Reka UI respects the `open` prop and only renders content when open.
// This stub implements realistic open/close behavior while rendering inline
// (no teleportation), so tests can interact with popovers naturally.
// - Controlled mode (open prop provided): respects open state
// - Uncontrolled mode (no open prop): clicking trigger toggles visibility
vi.mock('reka-ui', async (importOriginal) => {
	const actual = await importOriginal<object>();
	const { ref, provide, inject, computed, defineComponent, h } = await import('vue');

	const POPOVER_OPEN_KEY = Symbol('popover-open');

	return {
		...actual,
		PopoverRoot: defineComponent({
			name: 'PopoverRoot',
			props: { open: { type: Boolean, default: undefined } },
			emits: ['update:open'],
			setup(props, { slots, emit }) {
				const internalOpen = ref(false);
				// Controlled mode when open prop is explicitly provided
				const isControlled = computed(() => props.open !== undefined);
				const isOpen = computed(() => (isControlled.value ? props.open : internalOpen.value));
				const setOpen = (value: boolean) => {
					if (!isControlled.value) {
						internalOpen.value = value;
					}
					emit('update:open', value);
				};
				provide(POPOVER_OPEN_KEY, { isOpen, setOpen });
				return () => h('div', slots.default?.());
			},
		}),
		PopoverTrigger: defineComponent({
			name: 'PopoverTrigger',
			props: { asChild: Boolean },
			setup(_, { slots }) {
				const context = inject<{ isOpen: { value: boolean }; setOpen: (v: boolean) => void }>(
					POPOVER_OPEN_KEY,
				);
				return () =>
					h('div', { onClick: () => context?.setOpen(!context.isOpen.value) }, slots.default?.());
			},
		}),
		PopoverPortal: defineComponent({
			name: 'PopoverPortal',
			props: { disabled: Boolean },
			setup(_, { slots }) {
				return () => h('div', slots.default?.());
			},
		}),
		PopoverContent: defineComponent({
			name: 'PopoverContent',
			props: ['side', 'sideOffset', 'align', 'class', 'style', 'reference'],
			setup(_, { slots, attrs }) {
				const context = inject<{ isOpen: { value: boolean } }>(POPOVER_OPEN_KEY);
				return () => (context?.isOpen.value ? h('div', attrs, slots.default?.()) : null);
			},
		}),
		PopoverArrow: defineComponent({
			name: 'PopoverArrow',
			setup() {
				return () => h('div');
			},
		}),
	};
});

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

class SpeechSynthesisUtterance {
	text = '';
	lang = '';
	voice = null;
	volume = 1;
	rate = 1;
	pitch = 1;
	onstart = null;
	onend = null;
	onerror = null;
	onpause = null;
	onresume = null;
	onmark = null;
	onboundary = null;

	constructor(text?: string) {
		if (text) {
			this.text = text;
		}
	}

	addEventListener = vi.fn();
	removeEventListener = vi.fn();
	dispatchEvent = vi.fn(() => true);
}

Object.defineProperty(window, 'SpeechSynthesisUtterance', {
	writable: true,
	value: SpeechSynthesisUtterance,
});

Object.defineProperty(window, 'speechSynthesis', {
	writable: true,
	value: {
		cancel: vi.fn(),
		speak: vi.fn(),
		pause: vi.fn(),
		resume: vi.fn(),
		getVoices: vi.fn(() => []),
		pending: false,
		speaking: false,
		paused: false,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(() => true),
	},
});

loadLanguage('en', englishBaseText as LocaleMessages);
