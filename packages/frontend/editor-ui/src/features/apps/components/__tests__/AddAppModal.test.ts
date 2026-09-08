import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';

import AddAppModal from '../AddAppModal.vue';
import { useAppsStore } from '../../apps.store';
import { ADD_APP_MODAL_KEY, APP_DETAILS } from '../../apps.constants';

const openAppArtifactThread = vi.hoisted(() => vi.fn());
const instanceAiReady = vi.hoisted(() => ({ value: true }));
const routerPush = vi.hoisted(() => vi.fn());

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: routerPush }),
	useRoute: () => ({ params: {}, query: {} }),
	RouterLink: vi.fn(),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn() }),
}));

vi.mock('@/features/ai/instanceAi/composables/useInstanceAiAvailability', async () => {
	const { computed } = await import('vue');
	return { useInstanceAiReady: () => computed(() => instanceAiReady.value) };
});

vi.mock('@/features/ai/instanceAi/composables/useInstanceAiHandoff', () => ({
	useInstanceAiHandoff: () => ({ openAppArtifactThread }),
}));

const ModalStub = {
	template: '<div><slot name="header" /><slot name="content" /><slot name="footer" /></div>',
};

const renderModal = createComponentRenderer(AddAppModal, {
	props: { modalName: ADD_APP_MODAL_KEY, data: { projectId: 'proj-1' } },
	global: { stubs: { Modal: ModalStub } },
});

describe('AddAppModal', () => {
	let appsStore: MockedStore<typeof useAppsStore>;
	let uiStore: MockedStore<typeof useUIStore>;

	beforeEach(() => {
		createTestingPinia();
		appsStore = mockedStore(useAppsStore);
		uiStore = mockedStore(useUIStore);
		openAppArtifactThread.mockReset();
		routerPush.mockReset();
		instanceAiReady.value = true;
	});

	async function fillAndSubmit() {
		const { getByTestId } = renderModal();
		await userEvent.type(getByTestId('apps-new-name'), 'Greeter');
		await userEvent.click(getByTestId('apps-new-submit'));
	}

	it('suggests the namespace from the name', async () => {
		const { getByTestId } = renderModal();

		await userEvent.type(getByTestId('apps-new-name'), '  My Greeter -- App 2!');

		expect(getByTestId('apps-new-namespace')).toHaveValue('my-greeter-app-2');
	});

	it('stops syncing the namespace once the user edits it', async () => {
		const { getByTestId } = renderModal();
		const nameInput = getByTestId('apps-new-name');
		const namespaceInput = getByTestId('apps-new-namespace');

		await userEvent.type(nameInput, 'Greeter');
		await userEvent.clear(namespaceInput);
		await userEvent.type(namespaceInput, 'hello');
		await userEvent.type(nameInput, ' Two');

		expect(nameInput).toHaveValue('Greeter Two');
		expect(namespaceInput).toHaveValue('hello');
	});

	it('hands the new app off to the assistant instead of creating it when the assistant is ready', async () => {
		openAppArtifactThread.mockResolvedValue(true);

		await fillAndSubmit();

		expect(appsStore.createApp).not.toHaveBeenCalled();
		expect(openAppArtifactThread).toHaveBeenCalledWith(
			{ type: 'app', projectId: 'proj-1', name: 'Greeter', namespace: 'greeter', isNewApp: true },
			{ source: 'app_builder_page', origin: 'internal', sourceContext: { namespace: 'greeter' } },
		);
		expect(uiStore.closeModal).toHaveBeenCalledWith(ADD_APP_MODAL_KEY);
		expect(routerPush).not.toHaveBeenCalled();
	});

	it('creates the app and opens it when the assistant is not ready', async () => {
		instanceAiReady.value = false;
		appsStore.createApp.mockResolvedValue({
			id: 'app-1',
			name: 'Greeter',
			namespace: 'greeter',
			theme: null,
			projectId: 'proj-1',
			activeVersionId: null,
			createdAt: '2026-04-01T00:00:00.000Z',
			updatedAt: '2026-04-01T00:00:00.000Z',
		});

		await fillAndSubmit();

		expect(openAppArtifactThread).not.toHaveBeenCalled();
		expect(appsStore.createApp).toHaveBeenCalledWith('proj-1', 'Greeter', 'greeter');
		expect(uiStore.closeModal).toHaveBeenCalledWith(ADD_APP_MODAL_KEY);
		expect(routerPush).toHaveBeenCalledWith({
			name: APP_DETAILS,
			params: { projectId: 'proj-1', appId: 'app-1' },
		});
	});
});
