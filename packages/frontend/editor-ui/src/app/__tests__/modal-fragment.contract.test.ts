import { modalRegistry } from '@n8n/frontend-module-sdk';
import { screen, waitFor } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';

import { createComponentRenderer } from '@/__tests__/render';
import DynamicModalLoader from '@/app/components/DynamicModalLoader.vue';
import { useUIStore } from '@/app/stores/ui.store';

import { EXAMPLE_FEATURE_MODAL_KEY } from './fixtures/exampleFeature/exampleFeature.constants';
import { EXAMPLE_FEATURE_MODALS } from './fixtures/exampleFeature/modals';

// eslint-disable-next-line import-x/extensions
import shellConstantsSource from '@/app/constants/modals.ts?raw';
// eslint-disable-next-line import-x/extensions
import shellCatalogueSource from '@/app/stores/defaults/modals.ts?raw';

/**
 * CAT-3688 AC #3 — "a new modal can be added without touching `ui.store` or
 * `app/constants`" — proven rather than asserted.
 *
 * The proof has two halves, and it needs both. The behavioural half registers a
 * fixture modal through a fragment and drives it to the screen. The structural
 * half checks that the fixture is absent from the two shell files, so the first
 * half cannot be passing because something in the shell quietly backs it.
 *
 * The fixture deliberately lives outside `src/features/` — a real feature would
 * be reachable from `modals.manifest.ts` and could pass on the shell's wiring
 * rather than its own.
 */

const renderLoader = createComponentRenderer(DynamicModalLoader);

describe('adding a modal through a fragment', () => {
	let pinia: ReturnType<typeof createPinia>;

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		modalRegistry.clear();
	});

	const registerFixtureFragment = () => {
		// Hand-rolled rather than calling `registerEagerModals`, so the fixture does not
		// have to be reachable from `modals.manifest.ts` — see the note above on why it
		// stays outside `src/features/`. The trade: this proves the registry contract a
		// fragment relies on, not the real callers. Those are covered by
		// `modals.manifest.test.ts` and `moduleInitializer/moduleInitializer.test.ts`.
		EXAMPLE_FEATURE_MODALS.forEach((modal) => modalRegistry.register(modal));
	};

	it('registers, renders and opens — with no shell edit anywhere in the path', async () => {
		const uiStore = useUIStore();

		// Before registration: unknown to the registry, and closed rather than
		// undefined — the Seam A fallback.
		expect(modalRegistry.has(EXAMPLE_FEATURE_MODAL_KEY)).toBe(false);
		expect(uiStore.modalsById[EXAMPLE_FEATURE_MODAL_KEY]).toEqual({ open: false });

		registerFixtureFragment();

		// Registers.
		expect(modalRegistry.has(EXAMPLE_FEATURE_MODAL_KEY)).toBe(true);
		expect(uiStore.modalsById[EXAMPLE_FEATURE_MODAL_KEY]).toEqual({ open: false });

		// Same pinia the store above resolves from — a second one would give the
		// component a different ui.store and the open below would never reach it.
		renderLoader({ pinia });

		// Renders: the loader picked the key up from the registry, and a closed modal
		// draws nothing.
		expect(screen.queryByTestId('example-feature-modal')).not.toBeInTheDocument();

		// Opens.
		uiStore.openModal(EXAMPLE_FEATURE_MODAL_KEY);

		await waitFor(() => {
			expect(screen.queryByTestId('example-feature-modal')).toBeInTheDocument();
		});
		expect(uiStore.isModalActiveById[EXAMPLE_FEATURE_MODAL_KEY]).toBe(true);

		// And closes, so the open above is state-driven rather than mount-once.
		uiStore.closeModal(EXAMPLE_FEATURE_MODAL_KEY);

		await waitFor(() => {
			expect(screen.queryByTestId('example-feature-modal')).not.toBeInTheDocument();
		});
	});

	it('opens without tripping the unknown-key warning', () => {
		// A registered fragment modal must take the sanctioned path. If this warns, the
		// fixture is opening through `openModal`'s self-registration escape hatch and
		// the test above would pass for the wrong reason.
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		registerFixtureFragment();
		useUIStore().openModal(EXAMPLE_FEATURE_MODAL_KEY);

		expect(warn).not.toHaveBeenCalled();

		warn.mockRestore();
	});

	it('is defined in neither shell file', () => {
		// The structural half. Read as source text because an import would only prove
		// the symbol is absent from what the shell re-exports, not from the files.
		expect(shellConstantsSource).not.toContain('EXAMPLE_FEATURE_MODAL_KEY');
		expect(shellConstantsSource).not.toContain(EXAMPLE_FEATURE_MODAL_KEY);
		expect(shellCatalogueSource).not.toContain('EXAMPLE_FEATURE_MODAL_KEY');
		expect(shellCatalogueSource).not.toContain(EXAMPLE_FEATURE_MODAL_KEY);
	});

	it('reads the shell files it claims to check', () => {
		// Guards the two `?raw` imports: if either path breaks, the emptiness would
		// pass the check above silently.
		expect(shellConstantsSource).toContain('MODAL_CONFIRM');
		expect(shellCatalogueSource).toContain('SHELL_MODAL_INITIAL_STATE');
	});
});
