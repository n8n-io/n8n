import '@n8n/vitest-config/setup/frontend';
import 'fake-indexeddb/auto';
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
//
// Stays here rather than in `@n8n/vitest-config/setup/frontend`: `reka-ui` is a
// dependency of editor-ui alone, and `vi.mock`'s specifier resolves relative to
// the file that calls it — a shared config package cannot mock a module it
// cannot resolve.
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
				// Capture phase avoids Vue's "event fired before listener attached" guard
				// (`e._vts <= invoker.attached`), which flakily skips a bubble-phase onClick
				// when a test renders and clicks within the same millisecond.
				return () =>
					h(
						'div',
						{ onClickCapture: () => context?.setOpen(!context.isOpen.value) },
						slots.default?.(),
					);
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

// Mocks for useDeviceSupport. The shared harness answers `false` to every media
// query (the safe default — see its comment); editor-ui's suite has always run
// with every query matching, so keep that here rather than in the shared file.
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

loadLanguage('en', englishBaseText as unknown as LocaleMessages);
