import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';

import AppBasicsEditor from '../AppBasicsEditor.vue';
import { useAppsStore } from '../../apps.store';
import type { App } from '../../apps.types';

const showError = vi.hoisted(() => vi.fn());
const showMessage = vi.hoisted(() => vi.fn());

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError, showMessage }),
}));

function makeApp(overrides: Partial<App> = {}): App {
	return {
		id: 'app-1',
		name: 'Greeter',
		namespace: 'greeter',
		theme: null,
		projectId: 'proj-1',
		activeVersionId: 'v-1',
		hasUnpublishedChanges: false,
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-04-01T00:00:00.000Z',
		...overrides,
	};
}

const getInput = (wrapper: HTMLElement) => wrapper.querySelector('input') as HTMLInputElement;

const renderEditor = createComponentRenderer(AppBasicsEditor);

describe('AppBasicsEditor', () => {
	let appsStore: MockedStore<typeof useAppsStore>;

	beforeEach(() => {
		createTestingPinia();
		appsStore = mockedStore(useAppsStore);
		showError.mockReset();
		showMessage.mockReset();
	});

	it('keeps Save disabled until a field differs from the app', async () => {
		const { getByTestId } = renderEditor({ props: { projectId: 'proj-1', app: makeApp() } });

		expect(getByTestId('app-basics-save')).toBeDisabled();

		await userEvent.type(getInput(getByTestId('app-basics-name')), ' 2');
		expect(getByTestId('app-basics-save')).toBeEnabled();

		await userEvent.type(getInput(getByTestId('app-basics-name')), '{backspace}{backspace}');
		expect(getByTestId('app-basics-save')).toBeDisabled();
	});

	it('saves the edited name and namespace and emits the updated app', async () => {
		const updated = makeApp({ name: 'Greeter 2', namespace: 'greeter-2' });
		appsStore.updateApp.mockResolvedValue(updated);
		const { getByTestId, emitted } = renderEditor({
			props: { projectId: 'proj-1', app: makeApp() },
		});

		await userEvent.type(getInput(getByTestId('app-basics-name')), ' 2');
		await userEvent.type(getInput(getByTestId('app-basics-namespace')), '-2');
		await userEvent.click(getByTestId('app-basics-save'));

		expect(appsStore.updateApp).toHaveBeenCalledWith('proj-1', 'app-1', {
			name: 'Greeter 2',
			namespace: 'greeter-2',
		});
		expect(emitted('saved')).toEqual([[updated]]);
		expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
	});

	it('shows the error toast when the request fails', async () => {
		const error = new Error('nope');
		appsStore.updateApp.mockRejectedValue(error);
		const { getByTestId, emitted } = renderEditor({
			props: { projectId: 'proj-1', app: makeApp() },
		});

		await userEvent.type(getInput(getByTestId('app-basics-name')), ' 2');
		await userEvent.click(getByTestId('app-basics-save'));

		expect(showError).toHaveBeenCalledWith(error, "Couldn't save the app details");
		expect(emitted('saved')).toBeUndefined();
		expect(getByTestId('app-basics-save')).toBeEnabled();
	});
});
