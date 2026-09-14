import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { TELEMETRY_EVENT } from '@n8n/telemetry';

import SettingsPreferencesView from './SettingsPreferencesView.vue';
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
		user: null,
		projectId: null,
		project: null,
		scopes: ['aiPreference:read', 'aiPreference:update', 'aiPreference:delete'],
		createdAt: '2026-09-08T00:00:00.000Z',
		updatedAt: '2026-09-08T00:00:00.000Z',
		...overrides,
	};
}

/**
 * The dialog is a page-local child. The stub exposes what the page hands it and
 * a button that plays the dialog's `saved` event back to the page.
 */
const PreferenceModalStub = {
	props: ['open', 'preference'],
	emits: ['saved', 'update:open'],
	template: `
		<div
			data-test-id="preference-modal-stub"
			:data-open="String(open)"
			:data-preference-id="preference?.id ?? ''"
		>
			<button data-test-id="preference-modal-stub-saved" @click="$emit('saved')" />
		</div>
	`,
};

const renderComponent = createComponentRenderer(SettingsPreferencesView, {
	global: { stubs: { PreferenceModal: PreferenceModalStub } },
});
const renderView = () => renderComponent();

let contextStore: MockedStore<typeof useContextStore>;

describe('SettingsPreferencesView', () => {
	beforeEach(() => {
		createTestingPinia();
		contextStore = mockedStore(useContextStore);
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

		expect(getByTestId('preference-modal-stub')).toHaveAttribute('data-open', 'true');
		expect(getByTestId('preference-modal-stub')).toHaveAttribute('data-preference-id', '');
	});

	it('opens the edit modal with the row it was triggered from', async () => {
		const row = preference();
		contextStore.preferences = [row];
		contextStore.count = 1;

		const { getByTestId } = renderView();
		await new Promise(process.nextTick);

		await userEvent.click(getByTestId('preference-edit-button'));

		expect(getByTestId('preference-modal-stub')).toHaveAttribute('data-open', 'true');
		expect(getByTestId('preference-modal-stub')).toHaveAttribute('data-preference-id', row.id);
	});

	it('closes the dialog and reloads the page when it saves', async () => {
		contextStore.preferences = [preference()];
		contextStore.count = 1;

		const { getByTestId } = renderView();
		await new Promise(process.nextTick);
		await userEvent.click(getByTestId('preferences-create-button'));
		expect(contextStore.fetchPreferences).toHaveBeenCalledTimes(1);

		await userEvent.click(getByTestId('preference-modal-stub-saved'));
		await new Promise(process.nextTick);

		expect(getByTestId('preference-modal-stub')).toHaveAttribute('data-open', 'false');
		expect(contextStore.fetchPreferences).toHaveBeenCalledTimes(2);
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

	it('drops only the deleted rows from the selection when a bulk delete fails part way', async () => {
		const rows = [preference({ id: 'a' }), preference({ id: 'b' }), preference({ id: 'c' })];
		contextStore.preferences = rows;
		contextStore.count = 3;
		contextStore.deletePreferences.mockImplementation(async () => {
			// The reload after the delete replaces the page with the survivor.
			contextStore.fetchPreferences.mockImplementation(async () => {
				contextStore.preferences = rows.filter((row) => row.id === 'b');
				return { count: 1, data: contextStore.preferences };
			});
			return { deleted: ['a', 'c'], failed: [{ id: 'b', error: new Error('gone') }] };
		});

		const { getByTestId, getAllByRole } = renderView();
		await new Promise(process.nextTick);

		// The first checkbox selects every row.
		await userEvent.click(getAllByRole('checkbox')[0]);
		await userEvent.click(getByTestId('preferences-delete-selected-button'));
		await new Promise(process.nextTick);

		expect(contextStore.deletePreferences).toHaveBeenCalledWith(['a', 'b', 'c']);
		// Only the survivor stays selected, so the toolbar counts one and a retry hits it alone.
		expect(getByTestId('settings-preferences-view')).toHaveTextContent('1 selected');

		contextStore.deletePreferences.mockResolvedValue({ deleted: ['b'], failed: [] });
		await userEvent.click(getByTestId('preferences-delete-selected-button'));
		await new Promise(process.nextTick);

		expect(contextStore.deletePreferences).toHaveBeenLastCalledWith(['b']);
		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_DELETED_PREFERENCES, {
			count: 2,
			source: 'bulk',
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

		const { getByTestId } = renderView();
		await new Promise(process.nextTick);
		expect(contextStore.fetchPreferences).toHaveBeenCalledTimes(1);

		await userEvent.click(getByTestId('preference-modal-stub-saved'));
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

		const { queryByTestId, getByTestId } = renderView();
		await new Promise(process.nextTick);
		expect(queryByTestId('preferences-empty-state')).not.toBeInTheDocument();

		await userEvent.click(getByTestId('preference-modal-stub-saved'));
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
		await userEvent.click(getByTestId('preference-modal-stub-saved'));
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
