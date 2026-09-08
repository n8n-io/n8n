import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { useUIStore } from '@/app/stores/ui.store';

import SettingsPreferencesView from './SettingsPreferencesView.vue';
import { PREFERENCE_MODAL_KEY } from '../context.constants';
import { useContextStore } from '../context.store';
import type { Preference } from '../context.types';

const push = vi.fn();

vi.mock('vue-router', () => ({
	useRouter: () => ({ push }),
	useRoute: () => ({ params: {}, query: {} }),
	RouterLink: vi.fn(),
}));

function preference(overrides: Partial<Preference> = {}): Preference {
	return {
		id: 'p1',
		text: 'Keep replies short.',
		scopeType: 'user',
		projectId: null,
		project: null,
		scopes: ['preference:read', 'preference:update', 'preference:delete'],
		createdAt: '2026-09-08T00:00:00.000Z',
		updatedAt: '2026-09-08T00:00:00.000Z',
		...overrides,
	};
}

const renderView = createComponentRenderer(SettingsPreferencesView);

let contextStore: MockedStore<typeof useContextStore>;
let uiStore: MockedStore<typeof useUIStore>;

describe('SettingsPreferencesView', () => {
	beforeEach(() => {
		createTestingPinia();
		contextStore = mockedStore(useContextStore);
		uiStore = mockedStore(useUIStore);
		contextStore.loading = false;
		push.mockClear();
	});

	it('shows the empty state when there are no preferences', async () => {
		contextStore.preferences = [];
		contextStore.count = 0;

		const { getByTestId } = renderView();
		await new Promise(process.nextTick);

		expect(getByTestId('preferences-empty-state')).toHaveTextContent('No preferences yet');
	});

	it('hides the empty state once a preference exists', async () => {
		contextStore.preferences = [preference()];
		contextStore.count = 1;

		const { queryByTestId, getByText } = renderView();
		await new Promise(process.nextTick);

		expect(queryByTestId('preferences-empty-state')).not.toBeInTheDocument();
		expect(getByText('Keep replies short.')).toBeInTheDocument();
	});

	it('loads the first page on mount', async () => {
		contextStore.preferences = [];
		contextStore.count = 0;

		renderView();
		await new Promise(process.nextTick);

		expect(contextStore.fetchPreferences).toHaveBeenCalledWith({ skip: 0, take: 50 });
	});

	it('opens the create modal from the toolbar', async () => {
		contextStore.preferences = [preference()];
		contextStore.count = 1;

		const { getByTestId } = renderView();
		await new Promise(process.nextTick);

		await userEvent.click(getByTestId('preferences-create-button'));

		expect(uiStore.openModalWithData).toHaveBeenCalledWith({
			name: PREFERENCE_MODAL_KEY,
			data: { mode: 'new' },
		});
	});

	it('opens the edit modal with the row it was triggered from', async () => {
		const row = preference();
		contextStore.preferences = [row];
		contextStore.count = 1;

		const { getByTestId } = renderView();
		await new Promise(process.nextTick);

		await userEvent.click(getByTestId('preference-edit-button'));

		expect(uiStore.openModalWithData).toHaveBeenCalledWith({
			name: PREFERENCE_MODAL_KEY,
			data: { mode: 'edit', preference: row },
		});
	});

	it('returns to the Context landing page', async () => {
		contextStore.preferences = [];
		contextStore.count = 0;

		const { getByTestId } = renderView();
		await new Promise(process.nextTick);

		await userEvent.click(getByTestId('settings-back-button'));

		expect(push).toHaveBeenCalledWith({ name: 'SettingsContext' });
	});
});
