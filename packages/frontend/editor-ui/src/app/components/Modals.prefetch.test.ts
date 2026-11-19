import { createPinia, setActivePinia } from 'pinia';
import { screen } from '@testing-library/vue';
import { modalRegistry } from '@n8n/frontend-module-sdk';

import Modals from '@/app/components/Modals.vue';
import { lazyModalLoaders } from '@/app/modals/lazyModals';
import { useUIStore } from '@/app/stores/ui.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { createComponentRenderer } from '@/__tests__/render';

/**
 * This file is separate from `Modals.test.ts`, because there the loaded modules and the
 * resolved async components build up from case to case. Here each module starts unloaded.
 *
 * Vitest runs a `vi.mock` factory once, when the module is first imported, and the factory
 * records the module name. So the test can see when the modal code loads.
 */
const { loadedModals, stubModal } = vi.hoisted(() => {
	const loaded: string[] = [];
	return {
		loadedModals: loaded,
		stubModal: (name: string) => {
			loaded.push(name);
			// `defineAsyncComponent` takes `default` only from a module it recognises as ES.
			return {
				__esModule: true,
				default: { name, template: `<div data-test-id="${name}" />` },
			};
		},
	};
});

vi.mock('@/features/credentials/components/CredentialEdit/CredentialEdit.vue', () =>
	stubModal('CredentialEdit'),
);
vi.mock('@/app/components/UpdatesPanel.vue', () => stubModal('UpdatesPanel'));
vi.mock('@/app/components/NpsSurvey.vue', () => stubModal('NpsSurvey'));

// Wrap each real loader in a spy, so the test sees every call that `Modals.vue` makes.
vi.mock('@/app/modals/lazyModals', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/app/modals/lazyModals')>();
	const loaders = Object.fromEntries(
		Object.entries(actual.lazyModalLoaders).map(([key, load]) => [key, vi.fn(load)]),
	);
	return { ...actual, lazyModalLoaders: loaders };
});

const renderModals = createComponentRenderer(Modals);

describe('Modals with a prefetched modal', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		modalRegistry.clear();
	});

	it('opens a prefetched modal with the same loader, so it loads no code again', async () => {
		const loadCredentialEdit = vi.mocked(lazyModalLoaders[CREDENTIAL_EDIT_MODAL_KEY]);
		expect(loadedModals).not.toContain('CredentialEdit');

		await loadCredentialEdit();
		expect(loadedModals).toContain('CredentialEdit');

		renderModals();
		useUIStore().openModal(CREDENTIAL_EDIT_MODAL_KEY);

		expect(await screen.findByTestId('CredentialEdit')).toBeInTheDocument();
		// One call for the prefetch, one for the open. Both get the module from the cache.
		expect(loadCredentialEdit).toHaveBeenCalledTimes(2);
		expect(loadedModals.filter((name) => name === 'CredentialEdit')).toHaveLength(1);
	});
});
