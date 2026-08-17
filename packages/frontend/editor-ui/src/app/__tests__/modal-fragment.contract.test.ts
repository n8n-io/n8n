import { modalRegistry } from '@n8n/frontend-module-sdk';
import { screen, waitFor } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';

import { createComponentRenderer } from '@/__tests__/render';
import DynamicModalLoader from '@/app/components/DynamicModalLoader.vue';
import * as shellConstants from '@/app/constants/modals';
import { SHELL_MODAL_INITIAL_STATE } from '@/app/stores/defaults/modals';
import { useUIStore } from '@/app/stores/ui.store';

import { EXAMPLE_FEATURE_MODAL_KEY } from './fixtures/exampleFeature/exampleFeature.constants';
import { EXAMPLE_FEATURE_MODALS } from './fixtures/exampleFeature/modals';

/**
 * CAT-3688 AC #3 — a new modal needs no edit to `ui.store` or `app/constants`.
 *
 * The behavioural test drives a fixture modal to the screen. The structural test
 * makes sure the shell does not back it, so the first cannot pass for the wrong
 * reason. The fixture sits outside `src/features/` because `modals.manifest.ts`
 * reaches every real feature.
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
		// `registerEagerModals` and `registerModuleModals` run this loop over real
		// fragments. `modals.manifest.test.ts` and `moduleInitializer.test.ts` cover them.
		EXAMPLE_FEATURE_MODALS.forEach((modal) => modalRegistry.register(modal));
	};

	it('registers, renders and opens — with no shell edit anywhere in the path', async () => {
		const uiStore = useUIStore();

		expect(modalRegistry.has(EXAMPLE_FEATURE_MODAL_KEY)).toBe(false);
		expect(uiStore.modalsById[EXAMPLE_FEATURE_MODAL_KEY]).toEqual({ open: false });

		registerFixtureFragment();

		expect(modalRegistry.has(EXAMPLE_FEATURE_MODAL_KEY)).toBe(true);
		expect(uiStore.modalsById[EXAMPLE_FEATURE_MODAL_KEY]).toEqual({ open: false });

		// A second pinia would give the component a different ui.store.
		renderLoader({ pinia });

		expect(screen.queryByTestId('example-feature-modal')).not.toBeInTheDocument();

		uiStore.openModal(EXAMPLE_FEATURE_MODAL_KEY);

		await waitFor(() => {
			expect(screen.queryByTestId('example-feature-modal')).toBeInTheDocument();
		});
		expect(uiStore.isModalActiveById[EXAMPLE_FEATURE_MODAL_KEY]).toBe(true);

		uiStore.closeModal(EXAMPLE_FEATURE_MODAL_KEY);

		await waitFor(() => {
			expect(screen.queryByTestId('example-feature-modal')).not.toBeInTheDocument();
		});
	});

	it('opens without tripping the unknown-key warning', () => {
		// A warning here means the fixture opened through `openModal`'s
		// self-registration, not through the fragment.
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		registerFixtureFragment();
		useUIStore().openModal(EXAMPLE_FEATURE_MODAL_KEY);

		expect(warn).not.toHaveBeenCalled();

		warn.mockRestore();
	});

	it('is defined in neither shell surface', () => {
		expect(Object.keys(shellConstants)).not.toContain('EXAMPLE_FEATURE_MODAL_KEY');
		expect(Object.keys(SHELL_MODAL_INITIAL_STATE)).not.toContain(EXAMPLE_FEATURE_MODAL_KEY);
	});
});
