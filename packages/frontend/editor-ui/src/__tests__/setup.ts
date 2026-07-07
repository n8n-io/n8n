import '@testing-library/jest-dom/vitest';
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

loadLanguage('en', englishBaseText as unknown as LocaleMessages);

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

// DEVP-206: leaked-timer guard — make the recurring leaked-timer class
// deterministic and local (pre-merge), instead of a flaky post-merge crash.
//
// Lineage: DEVP-201 (bare-global rAF) → DEVP-206 (CodeMirror leaked timers),
// the same class the rAF polyfill above defends against. A debounce, interval
// or timeout scheduled during a test but never cancelled or flushed fires
// AFTER Vitest 4 tears down the jsdom environment; the callback then reads a
// revoked global and throws `ReferenceError: document is not defined` /
// `EnvironmentTeardownError`, which Vitest promotes to a run-level failure.
// Because editor-ui tests run on real timers, such a leak escapes the PR's own
// `vitest related` scope and only surfaces — non-deterministically — in the
// post-merge full suite (e.g. `autoSaveWorkflowDebounced`, a 1500ms debounce,
// in useWorkflowSaving).
//
// The guard puts every test that doesn't manage its own timers onto fake
// timers, then after the test asserts no non-trivial timer is still pending. A
// leaked debounce/interval/timeout becomes a reliable RED in the changed file's
// OWN `vitest related` scope, pre-merge, naming this lineage so the fix lands
// at the source. (It also drops fake timers in afterEach, so even an unflagged
// leak can no longer fire post-teardown — the assertion is the signal, the
// teardown is defence-in-depth.)
//
// Blast radius is deliberately kept small — three carve-outs:
//  1. Only take over when the test is on the DEFAULT (real) timers. If the test
//     or its file already installed fake timers (e.g. a module-scope
//     `vi.useFakeTimers({ now })`), we don't clobber that config, don't assert,
//     and don't restore. Tracked by `guardOwnsTimers`.
//  2. Stand down the moment a test touches timer control itself. We wrap
//     `vi.useFakeTimers` / `vi.useRealTimers` so any call from test code flips
//     `testManagesTimers` and exempts that test — tests that advance/flush and
//     clean up their own timers (or intentionally leave fake timers pending,
//     which never crash) are untouched, no edits needed.
//  3. `shouldAdvanceTime: true` lets the fake clock track real wall-clock, so
//     tests that await real short async (`setTimeout(0)`, testing-library
//     `waitFor`) still resolve instead of hanging, and the ~0ms timers the rAF
//     polyfill / jsdom storage events schedule fire on their own. A short drain
//     in afterEach mops up any immediate stragglers before the check, so only
//     timers with a real delay (the smallest debounce in use is 300ms; autosave
//     is 1500ms) survive to be flagged.
//
// Genuine real-timer needs (or an intentional pending timer) opt out via
// `useRealTimersForTest()` below, rather than us mass-editing every test.

// Bound originals so the guard's own timer calls don't count as the test
// managing timers (carve-out 2).
const guardUseFakeTimers = vi.useFakeTimers.bind(vi);
const guardUseRealTimers = vi.useRealTimers.bind(vi);

let guardOwnsTimers = false;
let testManagesTimers = false;
let leakedTimerGuardOptOut = false;

// Detect test code taking over timer control. Same object as `vitest.*`, so
// tests using either alias are covered.
vi.useFakeTimers = (...args: Parameters<typeof guardUseFakeTimers>) => {
	testManagesTimers = true;
	return guardUseFakeTimers(...args);
};
vi.useRealTimers = () => {
	testManagesTimers = true;
	return guardUseRealTimers();
};

// How far we advance the fake clock in afterEach to drain benign, immediate
// environment timers before checking for leaks. Kept far below the smallest
// real debounce/interval delay (300ms) so genuine leaks still survive the drain.
const LEAKED_TIMER_DRAIN_MS = 5;

/**
 * Opt a single test out of the DEVP-206 leaked-timer guard: switch back to real
 * timers (so real async keeps working) and skip the pending-timer assertion for
 * the current test. Call at the top of the test or a scoped `beforeEach`:
 *
 *   import { useRealTimersForTest } from '@/__tests__/setup';
 *   it('waits on real async', async () => {
 *     useRealTimersForTest();
 *     // ...
 *   });
 */
export function useRealTimersForTest() {
	leakedTimerGuardOptOut = true;
	guardUseRealTimers();
}

beforeEach(() => {
	leakedTimerGuardOptOut = false;
	testManagesTimers = false;
	// Carve-out 1: only take over when nothing else already installed fake
	// timers (e.g. a module-scope `vi.useFakeTimers`). Otherwise leave that
	// config — and its clock — untouched.
	guardOwnsTimers = !vi.isFakeTimers();
	if (guardOwnsTimers) {
		guardUseFakeTimers({ shouldAdvanceTime: true });
	}
});

afterEach(() => {
	// Nothing to do (and nothing to restore) unless the guard installed the
	// fake timers for this test.
	if (!guardOwnsTimers) return;
	try {
		// Carve-outs 2 & 3: skip when the test took timer control itself or opted
		// out — its timers aren't ours to police.
		if (!leakedTimerGuardOptOut && !testManagesTimers && vi.isFakeTimers()) {
			// Drain the benign, immediate (~0ms) timers the environment schedules
			// on its own — jsdom's `storage` event dispatch on Storage.setItem, the
			// rAF polyfill above (setTimeout(cb, 0)), microtask shims — which would
			// otherwise trip the assertion in almost every test. jsdom is still
			// alive here so these fire harmlessly. The window is well under any real
			// debounce delay, so a genuinely leaked debounce/interval survives and
			// is still flagged below.
			vi.advanceTimersByTime(LEAKED_TIMER_DRAIN_MS);
			const leaked = vi.getTimerCount();
			if (leaked > 0) {
				throw new Error(
					`DEVP-206 leaked-timer guard: ${leaked} timer(s) still pending after the test. A ` +
						'debounce/interval/timeout was scheduled but never cancelled or flushed. Left ' +
						'leaked, it fires after jsdom teardown and crashes an unrelated test ' +
						'(ReferenceError: document is not defined / EnvironmentTeardownError). This is the ' +
						'recurring leaked-timer class (lineage DEVP-201 → DEVP-206). Fix it at the source ' +
						'(cancel the timer on scope dispose / in an afterEach), or, if the test legitimately ' +
						"needs real timers, opt out with useRealTimersForTest() from '@/__tests__/setup'.",
				);
			}
		}
	} finally {
		// Always drop the fake timers we installed so nothing bleeds into the
		// next test (and no leaked timer can fire post-teardown).
		guardUseRealTimers();
	}
});

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
