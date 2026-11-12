import { createPinia, setActivePinia } from 'pinia';
import { screen } from '@testing-library/vue';
import { modalRegistry } from '@n8n/frontend-module-sdk';

import Modals from '@/app/components/Modals.vue';
import { ABOUT_MODAL_KEY } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { createComponentRenderer } from '@/__tests__/render';

/**
 * Vitest runs a `vi.mock` factory when the module is first imported. A static import in
 * `Modals.vue` runs it when this file loads. A lazy import runs it only when the modal opens.
 * The factory records the module name, so the test can see which modal code was loaded.
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

vi.mock('@/app/components/AboutModal.vue', () => stubModal('AboutModal'));
vi.mock('@/features/credentials/components/CredentialEdit/CredentialEdit.vue', () =>
	stubModal('CredentialEdit'),
);
vi.mock('@/features/workflows/components/WorkflowSettings/WorkflowSettings.vue', () =>
	stubModal('WorkflowSettings'),
);
vi.mock('@/features/integrations/sourceControl.ee/components/SourceControlPushModal.vue', () =>
	stubModal('SourceControlPushModal'),
);
vi.mock('@/features/workflows/workflowDiff/WorkflowDiffModal.vue', () =>
	stubModal('WorkflowDiffModal'),
);
vi.mock('@/app/components/UpdatesPanel.vue', () => stubModal('UpdatesPanel'));
vi.mock('@/app/components/NpsSurvey.vue', () => stubModal('NpsSurvey'));

const renderModals = createComponentRenderer(Modals);

describe('Modals', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		modalRegistry.clear();
	});

	it.each(['CredentialEdit', 'WorkflowSettings', 'SourceControlPushModal', 'WorkflowDiffModal'])(
		'does not load the %s code while its modal is closed',
		async (name) => {
			renderModals();
			await vi.dynamicImportSettled();

			expect(loadedModals).not.toContain(name);
			expect(screen.queryByTestId(name)).not.toBeInTheDocument();
		},
	);

	it('loads and renders a modal component when the modal opens', async () => {
		renderModals();
		await vi.dynamicImportSettled();
		expect(loadedModals).not.toContain('AboutModal');

		useUIStore().openModal(ABOUT_MODAL_KEY);

		expect(await screen.findByTestId('AboutModal')).toBeInTheDocument();
		expect(loadedModals).toContain('AboutModal');
	});

	it('renders the updates panel and the NPS survey on the first render', () => {
		renderModals();

		expect(screen.getByTestId('UpdatesPanel')).toBeInTheDocument();
		expect(screen.getByTestId('NpsSurvey')).toBeInTheDocument();
	});
});
