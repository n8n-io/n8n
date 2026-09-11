import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';

import AddAppModal from '../AddAppModal.vue';
import { useAppsStore } from '../../apps.store';
import { ADD_APP_MODAL_KEY, APP_DETAILS } from '../../apps.constants';

const createAppArtifactThread = vi.hoisted(() => vi.fn());
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
	useInstanceAiHandoff: () => ({ createAppArtifactThread }),
}));

const ModalStub = {
	template: '<div><slot name="header" /><slot name="content" /><slot name="footer" /></div>',
};

const renderModal = createComponentRenderer(AddAppModal, {
	props: { modalName: ADD_APP_MODAL_KEY, data: { projectId: 'proj-1' } },
	global: { stubs: { Modal: ModalStub } },
});

// `N8nFormInput` carries the test id on its wrapper, not on the `<input>`.
function getInput(container: HTMLElement) {
	const input = container.querySelector('input');
	if (!input) throw new Error('Input element not found');
	return input;
}

describe('AddAppModal', () => {
	let appsStore: MockedStore<typeof useAppsStore>;
	let uiStore: MockedStore<typeof useUIStore>;

	beforeEach(() => {
		createTestingPinia();
		appsStore = mockedStore(useAppsStore);
		uiStore = mockedStore(useUIStore);
		createAppArtifactThread.mockReset();
		routerPush.mockReset();
		instanceAiReady.value = true;
	});

	async function fillAndSubmit() {
		const { getByTestId } = renderModal();
		await userEvent.type(getInput(getByTestId('apps-new-name')), 'Greeter');
		await userEvent.click(getByTestId('apps-new-submit'));
	}

	it('suggests the namespace from the name', async () => {
		const { getByTestId } = renderModal();

		await userEvent.type(getInput(getByTestId('apps-new-name')), '  My Greeter -- App 2!');

		expect(getInput(getByTestId('apps-new-namespace'))).toHaveValue('my-greeter-app-2');
	});

	it('stops syncing the namespace once the user edits it', async () => {
		const { getByTestId } = renderModal();
		const nameInput = getInput(getByTestId('apps-new-name'));
		const namespaceInput = getInput(getByTestId('apps-new-namespace'));

		await userEvent.type(nameInput, 'Greeter');
		await userEvent.clear(namespaceInput);
		await userEvent.type(namespaceInput, 'hello');
		await userEvent.type(nameInput, ' Two');

		expect(nameInput).toHaveValue('Greeter Two');
		expect(namespaceInput).toHaveValue('hello');
	});

	it('blocks the handoff while the edited namespace is not a valid slug', async () => {
		const { getByTestId, getByText } = renderModal();
		const namespaceInput = getInput(getByTestId('apps-new-namespace'));

		await userEvent.type(getInput(getByTestId('apps-new-name')), 'Greeter');
		await userEvent.clear(namespaceInput);
		await userEvent.type(namespaceInput, 'foo_bar{enter}');
		await userEvent.tab();

		expect(
			getByText('Only lowercase letters, numbers, and single hyphens between them are allowed.'),
		).toBeInTheDocument();
		expect(getByTestId('apps-new-submit')).toBeDisabled();
		expect(appsStore.createApp).not.toHaveBeenCalled();
	});

	it('blocks the handoff while the name is longer than 128 characters', async () => {
		const { getByTestId, getByText } = renderModal();
		const nameInput = getInput(getByTestId('apps-new-name'));

		await userEvent.click(nameInput);
		await userEvent.paste('a'.repeat(129));
		await userEvent.tab();

		expect(getByText('Must be at most 128 characters')).toBeInTheDocument();
		expect(getByTestId('apps-new-submit')).toBeDisabled();
	});

	const createdApp = {
		id: 'app-1',
		name: 'Greeter',
		namespace: 'greeter',
		theme: null,
		projectId: 'proj-1',
		activeVersionId: null,
		hasUnpublishedChanges: false,
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-04-01T00:00:00.000Z',
	};

	it('creates the app, binds a thread to it and opens the app page in that thread', async () => {
		appsStore.createApp.mockResolvedValue(createdApp);
		createAppArtifactThread.mockResolvedValue('thread-1');

		await fillAndSubmit();

		expect(appsStore.createApp).toHaveBeenCalledWith('proj-1', 'Greeter', 'greeter');
		expect(createAppArtifactThread).toHaveBeenCalledWith(
			{ type: 'app', appId: 'app-1', projectId: 'proj-1', name: 'Greeter', namespace: 'greeter' },
			{ source: 'app_builder_page', origin: 'internal', sourceContext: { namespace: 'greeter' } },
		);
		expect(uiStore.closeModal).toHaveBeenCalledWith(ADD_APP_MODAL_KEY);
		expect(routerPush).toHaveBeenCalledWith({
			name: APP_DETAILS,
			params: { projectId: 'proj-1', appId: 'app-1' },
			query: { thread: 'thread-1' },
		});
	});

	it('opens the app page without a thread when the thread could not be created', async () => {
		appsStore.createApp.mockResolvedValue(createdApp);
		createAppArtifactThread.mockResolvedValue(undefined);

		await fillAndSubmit();

		expect(routerPush).toHaveBeenCalledWith({
			name: APP_DETAILS,
			params: { projectId: 'proj-1', appId: 'app-1' },
		});
	});

	it('creates the app and opens it without a thread when the assistant is not ready', async () => {
		instanceAiReady.value = false;
		appsStore.createApp.mockResolvedValue(createdApp);

		await fillAndSubmit();

		expect(createAppArtifactThread).not.toHaveBeenCalled();
		expect(appsStore.createApp).toHaveBeenCalledWith('proj-1', 'Greeter', 'greeter');
		expect(uiStore.closeModal).toHaveBeenCalledWith(ADD_APP_MODAL_KEY);
		expect(routerPush).toHaveBeenCalledWith({
			name: APP_DETAILS,
			params: { projectId: 'proj-1', appId: 'app-1' },
		});
	});
});
