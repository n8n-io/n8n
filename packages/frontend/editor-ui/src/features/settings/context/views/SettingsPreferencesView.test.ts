import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { useUIStore } from '@/app/stores/ui.store';

import { TELEMETRY_EVENT } from '@n8n/telemetry';

import SettingsPreferencesView from './SettingsPreferencesView.vue';
import { PREFERENCE_MODAL_KEY } from '../context.constants';
import { useContextStore } from '../context.store';
import type { Preference } from '../context.types';

const push = vi.fn();
const trackMock = vi.fn();
const confirmMock = vi.fn().mockResolvedValue('confirm');

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm: confirmMock, alert: vi.fn(), prompt: vi.fn() }),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({ push }),
	useRoute: () => ({ params: {}, query: {} }),
	RouterLink: vi.fn(),
}));

function preference(overrides: Partial<Preference> = {}): Preference {
	return {
		id: 'p1',
		content: 'Keep replies short.',
		userId: 'user-1',
		projectId: null,
		project: null,
		scopes: ['aiPreference:read', 'aiPreference:update', 'aiPreference:delete'],
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
		trackMock.mockReset();
		confirmMock.mockClear();
		confirmMock.mockResolvedValue('confirm');
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

	it('reports a single-row delete', async () => {
		contextStore.preferences = [preference({ userId: 'user-1' })];
		contextStore.count = 1;

		const { getByTestId } = renderView();
		await new Promise(process.nextTick);

		await userEvent.click(getByTestId('preference-delete-button'));
		await new Promise(process.nextTick);

		expect(contextStore.deletePreference).toHaveBeenCalledWith('p1');
		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_DELETED_PREFERENCES, {
			count: 1,
			source: 'row',
			scope_types: ['user'],
		});
	});

	it('deletes nothing when the confirmation is dismissed', async () => {
		confirmMock.mockResolvedValue('cancel');
		contextStore.preferences = [preference()];
		contextStore.count = 1;

		const { getByTestId } = renderView();
		await new Promise(process.nextTick);

		await userEvent.click(getByTestId('preference-delete-button'));
		await new Promise(process.nextTick);

		expect(contextStore.deletePreference).not.toHaveBeenCalled();
		expect(trackMock).not.toHaveBeenCalled();
	});

	it('reloads the page it is showing after a write', async () => {
		contextStore.preferences = [];
		contextStore.count = 0;

		renderView();
		await new Promise(process.nextTick);
		expect(contextStore.fetchPreferences).toHaveBeenCalledTimes(1);

		// The modal lives in the global modal root, so a save reaches the list only
		// through the store's change signal.
		contextStore.changeVersion = 1;
		await new Promise(process.nextTick);

		expect(contextStore.fetchPreferences).toHaveBeenCalledTimes(2);
	});

	it('hides the empty state when the load failed', async () => {
		contextStore.preferences = [];
		contextStore.count = 0;
		contextStore.fetchPreferences.mockRejectedValueOnce(new Error('offline'));

		const { queryByTestId } = renderView();
		await new Promise(process.nextTick);

		// Zero rows here means "we do not know", not "there are none".
		expect(queryByTestId('preferences-empty-state')).not.toBeInTheDocument();
	});

	it('shows the empty state again once a load succeeds', async () => {
		contextStore.preferences = [];
		contextStore.count = 0;
		contextStore.fetchPreferences.mockRejectedValueOnce(new Error('offline'));

		const { queryByTestId } = renderView();
		await new Promise(process.nextTick);
		expect(queryByTestId('preferences-empty-state')).not.toBeInTheDocument();

		contextStore.changeVersion = 1;
		await new Promise(process.nextTick);

		expect(queryByTestId('preferences-empty-state')).toBeInTheDocument();
	});

	it('falls back to the last page when the collection shrinks under it', async () => {
		contextStore.preferences = [preference()];
		contextStore.count = 60; // two pages at the default size of 50

		const { getByTestId } = renderView();
		await new Promise(process.nextTick);

		await userEvent.click(getByTestId('pagination-next'));
		await new Promise(process.nextTick);
		expect(contextStore.fetchPreferences).toHaveBeenLastCalledWith({ skip: 50, take: 50 });

		// Everything on the second page goes; page 1 no longer exists.
		contextStore.count = 5;
		contextStore.changeVersion = 1;
		await new Promise(process.nextTick);

		expect(contextStore.fetchPreferences).toHaveBeenLastCalledWith({ skip: 0, take: 50 });
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
