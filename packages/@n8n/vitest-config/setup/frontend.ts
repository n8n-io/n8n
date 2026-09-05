/**
 * Shared jsdom harness for every frontend package's vitest suite.
 *
 * Import it for side effects from a package's `src/__tests__/setup.ts` (the path
 * `@n8n/vitest-config/frontend` points `setupFiles` at):
 *
 * ```ts
 * import '@n8n/vitest-config/setup/frontend';
 * ```
 *
 * Everything here is framework-agnostic jsdom patching: it must not import
 * `vue`, `pinia`, `@n8n/i18n` or any other workspace package. `@n8n/i18n`,
 * `@n8n/stores` and friends already devDepend on `@n8n/vitest-config`, so a
 * dependency in that direction is a turbo build cycle. App-level boot (pinia,
 * i18n messages, plugins, app-specific polyfills) therefore stays in each
 * package's own setup file.
 */

import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/vue';
import { beforeAll, vi } from 'vitest';

// Avoid tests failing because of difference between local and GitHub actions timezone
process.env.TZ = 'UTC';

configure({ testIdAttribute: 'data-test-id' });

/**
 * Node >= 26 predefines `localStorage` and `sessionStorage` on globalThis
 * (Node's own web storage, undefined unless node runs with
 * --localstorage-file), and vitest's jsdom environment does not override
 * globals that already exist, so jsdom's storage never reaches tests
 * (`window` is the same global object here). Install a plain in-memory
 * Storage where the global is missing.
 */
class MemoryStorage implements Storage {
	private store = new Map<string, string>();

	get length() {
		return this.store.size;
	}

	clear() {
		this.store.clear();
	}

	getItem(key: string) {
		return this.store.get(key) ?? null;
	}

	key(index: number) {
		return [...this.store.keys()][index] ?? null;
	}

	removeItem(key: string) {
		this.store.delete(key);
	}

	setItem(key: string, value: string) {
		this.store.set(key, String(value));
	}
}

for (const key of ['localStorage', 'sessionStorage'] as const) {
	if ((globalThis as Record<string, unknown>)[key] === undefined) {
		Object.defineProperty(globalThis, key, {
			value: new MemoryStorage(),
			configurable: true,
			writable: true,
		});
	}
}

/**
 * PointerEvent polyfill for JSDOM
 * Required for Reka UI tooltip hover to work (checks event.pointerType)
 */
class JsonDomPointerEvent extends MouseEvent implements PointerEvent {
	readonly pointerId: number;

	readonly pointerType: string;

	readonly pressure: number;

	readonly tangentialPressure: number;

	readonly tiltX: number;

	readonly tiltY: number;

	readonly twist: number;

	readonly width: number;

	readonly height: number;

	readonly isPrimary: boolean;

	readonly altitudeAngle: number;

	readonly azimuthAngle: number;
	readonly persistentDeviceId: number;

	constructor(type: string, params: PointerEventInit = {}) {
		super(type, params);
		this.pointerId = params.pointerId ?? 0;
		this.pointerType = params.pointerType ?? 'mouse';
		this.pressure = params.pressure ?? 0;
		this.tangentialPressure = params.tangentialPressure ?? 0;
		this.tiltX = params.tiltX ?? 0;
		this.tiltY = params.tiltY ?? 0;
		this.twist = params.twist ?? 0;
		this.width = params.width ?? 1;
		this.height = params.height ?? 1;
		this.altitudeAngle = params.altitudeAngle ?? Math.PI / 2;
		this.azimuthAngle = params.azimuthAngle ?? 0;
		this.isPrimary = params.isPrimary ?? true;
		this.persistentDeviceId = 0;
	}

	getCoalescedEvents(): PointerEvent[] {
		return [];
	}

	getPredictedEvents(): PointerEvent[] {
		return [];
	}
}

// Always apply our PointerEvent polyfill - JSDOM's PointerEvent is incomplete
// and doesn't properly support pointerType which Reka UI requires for tooltips
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).PointerEvent = JsonDomPointerEvent;

/**
 * Fixes missing pointer APIs and defaultPrevented issues for jsdom + user-event
 * Required for Reka UI components (tooltips, etc.) to work properly in tests
 */
beforeAll(() => {
	// Patch missing pointer APIs
	const elementProto = HTMLElement.prototype as HTMLElement & {
		hasPointerCapture?: (pointerId: number) => boolean;
		setPointerCapture?: (pointerId: number) => void;
		releasePointerCapture?: (pointerId: number) => void;
	};

	if (!elementProto.hasPointerCapture) {
		Object.defineProperties(elementProto, {
			hasPointerCapture: {
				value: (_: number) => false,
				writable: true,
			},
			setPointerCapture: {
				value: (_: number) => {},
				writable: true,
			},
			releasePointerCapture: {
				value: (_: number) => {},
				writable: true,
			},
		});
	}
});

if (!window.ResizeObserver) {
	// Use function constructor instead of class to allow vi.spyOn to work
	function MockResizeObserver(this: ResizeObserver, _cb: ResizeObserverCallback) {
		this.disconnect = vi.fn();
		this.observe = vi.fn();
		this.unobserve = vi.fn();
	}
	window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
}

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

	scrollMargin = '';

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

// jsdom's MediaQueryList lacks the legacy addListener/removeListener pair that
// several libraries still feature-detect, so provide a complete stub.
//
// `matches: false` is deliberate — it must stay the shared default. A stub that
// answers `true` to every query silently opts every component into whichever
// branch a media query guards: `prefers-reduced-motion: reduce` disables
// animations, `prefers-color-scheme: dark` flips themes, print styles apply.
// editor-ui overrides this to `true` locally for `useDeviceSupport`; a package
// that needs a specific query to match should do the same rather than widening
// this default.
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn((query) => ({
		matches: false,
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

	// Echo the payload back in the shape the Worker contract promises: consumers
	// destructure `{ data }` off a MessageEvent (see editor-ui's safeRegex.ts), so
	// handing them the bare payload leaves `data` undefined and their promise never
	// settles. Stays synchronous — the handler runs before postMessage returns, so
	// tests need no timer flush.
	postMessage = vi.fn((message: unknown) => {
		this.onmessage(new MessageEvent('message', { data: message }));
	});

	addEventListener = vi.fn();

	terminate = vi.fn();
}

class MockMessagePort {
	onmessage = vi.fn();

	onmessageerror = vi.fn();

	postMessage = vi.fn();

	start = vi.fn();

	close = vi.fn();

	addEventListener = vi.fn();

	removeEventListener = vi.fn();

	dispatchEvent = vi.fn(() => true);
}

class SharedWorker {
	port: MockMessagePort;

	onerror = vi.fn();

	constructor(_url: string | URL, _options?: string | WorkerOptions) {
		this.port = new MockMessagePort();
	}

	addEventListener = vi.fn();

	removeEventListener = vi.fn();

	dispatchEvent = vi.fn(() => true);
}

/**
 * The DnD spec canonicalizes the two legacy shorthands on both `setData` and
 * `getData` — `text` → `text/plain`, `url` → `text/uri-list` — and lowercases
 * everything else. Normalizing on only one side loses the value: writing
 * `setData('text/plain', …)` stored `text/plain` while `getData('text/plain')`
 * looked under `text`. Collapsing every `text*` format to one key also merged
 * `text/html` and `text/plain` into a single slot, which paste handlers read
 * separately.
 * https://html.spec.whatwg.org/multipage/dnd.html#dom-datatransfer-setdata
 */
const canonicalizeDataTransferFormat = (format: string) => {
	const normalized = String(format).toLowerCase();
	if (normalized === 'text') return 'text/plain';
	if (normalized === 'url') return 'text/uri-list';
	return normalized;
};

class DataTransfer {
	private data: Record<string, unknown> = {};

	setData = vi.fn((type: string, data: unknown) => {
		this.data[canonicalizeDataTransferFormat(type)] = data;
	});

	getData = vi.fn((type: string) => this.data[canonicalizeDataTransferFormat(type)] ?? null);
}

Object.defineProperty(window, 'Worker', {
	writable: true,
	value: Worker,
});

Object.defineProperty(window, 'SharedWorker', {
	writable: true,
	value: SharedWorker,
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

// element-plus ElTable schedules a debounced doLayout that calls
// requestAnimationFrame on the trailing edge. When the timer fires after the
// test finishes, jsdom has torn down the window proxy and the bare
// requestAnimationFrame reference resolves to globalThis, where it is
// undefined — vitest 4 promotes the resulting ReferenceError to a run-level
// failure. Defining it on globalThis (not window) keeps it alive past teardown.
// Unconditional assignment (no ??=): jsdom seeds window.requestAnimationFrame
// at startup but revokes it during teardown, and consumers like CodeMirror
// capture the window reference at construction (this.win.requestAnimationFrame),
// so we need to own the property — not just fill in when absent — to survive
// teardown. The callback itself is guarded against post-teardown firing:
// Vue's whenTransitionEnds reads bare `window.getComputedStyle`, which throws
// ReferenceError once jsdom revokes `window`. Browsers don't fire rAF callbacks
// after the document is gone, so dropping them here matches that semantic.
// See DEVP-206 (and DEVP-201 for the original bare-global flavour).
globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
	setTimeout(() => {
		if (typeof window === 'undefined') return;
		cb(performance.now());
	}, 0) as unknown as number;
globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id);

// Block jsdom XHRs from making real network requests in tests. Unmocked store
// actions used to fire real /rest/* calls; on Node 22 the resulting dual-stack
// DNS AggregateError emits via socketErrorListener AFTER the test has finished,
// and vitest 4 promotes that to a test-run failure (~22% miss rate on shard 2).
// Short-circuiting send() means any unmocked request fails synchronously during
// the test instead of racing teardown.
XMLHttpRequest.prototype.send = function (this: XMLHttpRequest) {
	Object.defineProperty(this, 'readyState', { value: 4, configurable: true });
	Object.defineProperty(this, 'status', { value: 0, configurable: true });
	Object.defineProperty(this, 'statusText', { value: '', configurable: true });
	queueMicrotask(() => {
		this.dispatchEvent(new Event('readystatechange'));
		this.dispatchEvent(new Event('error'));
		this.dispatchEvent(new Event('loadend'));
	});
};

// DEVP-209: Vite emits Vue SFC `<style module lang="scss">` blocks as virtual
// modules (e.g. `Foo.vue?vue&type=style&index=0&lang.module.scss`). The SCSS
// preprocessor pipeline is async (worker-backed); if a resolution is still in
// flight when Vitest 4 tears down the worker environment, the loader throws
// EnvironmentTeardownError and Vitest promotes the unhandled rejection to a
// run-level failure. Test authors can't avoid this — the imports are static
// and the async pipeline is Vite plumbing, not test code.
//
// Filter ONLY the SCSS virtual-module URL pattern. Do NOT broaden to all
// EnvironmentTeardownError — DEVP-206 (CodeMirror leaked timers) surfaces as
// the same error class but the right fix there is code-side cleanup, and a
// broad filter would mask that signal. Sibling to the rAF polyfill (DEVP-201,
// DEVP-206) and the XHR short-circuit above — both narrow harness defences
// against Vitest 4's post-teardown rejection promotion.
//
// Match BOTH module and non-module SCSS style blocks. `@vitejs/plugin-vue`
// emits `<style lang="scss">` as `...?vue&type=style&index=N&lang.scss` and
// `<style module lang="scss">` as `...&lang.module.scss` (the CSS-modules
// codegen rewrites the request via `.replace(/\.(\w+)$/, '.module.$1')`). A
// component can ship both kinds (e.g. design-system's `Button.vue`), so the
// `.module.` segment must stay optional or the non-module block's teardown
// rejection slips through and gets re-thrown. The `?vue&type=style` anchor
// keeps this scoped to Vue SFC style virtual modules, so DEVP-206 timer
// errors (not style URLs) are still surfaced.
process.on('unhandledRejection', (reason) => {
	if (
		reason instanceof Error &&
		reason.name === 'EnvironmentTeardownError' &&
		/\?vue&type=style.*lang(\.module)?\.scss/.test(reason.message)
	) {
		return;
	}
	throw reason;
});
