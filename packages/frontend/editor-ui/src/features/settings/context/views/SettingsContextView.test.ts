import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import SettingsContextView from './SettingsContextView.vue';
import { useContextStore } from '../context.store';

const push = vi.fn();
const showErrorMock = vi.fn();

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorMock, showMessage: vi.fn() }),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({ push }),
	useRoute: () => ({ params: {}, query: {} }),
	RouterLink: vi.fn(),
}));

const renderView = createComponentRenderer(SettingsContextView);

describe('SettingsContextView', () => {
	beforeEach(() => {
		createTestingPinia();
		push.mockClear();
		showErrorMock.mockClear();
	});

	it('reports a failed count instead of leaving the row at zero', async () => {
		const contextStore = mockedStore(useContextStore);
		contextStore.fetchPreferenceCount.mockRejectedValueOnce(new Error('offline'));

		renderView();
		await new Promise(process.nextTick);

		expect(showErrorMock).toHaveBeenCalled();
	});

	it('lists Preferences, Skills and Sources', () => {
		const { getByTestId } = renderView();

		expect(getByTestId('settings-context-preferences-row')).toBeInTheDocument();
		expect(getByTestId('settings-context-skills-row')).toBeInTheDocument();
		expect(getByTestId('settings-context-sources-row')).toBeInTheDocument();
	});

	it('marks Skills and Sources as unavailable', () => {
		const { getByTestId } = renderView();

		expect(getByTestId('settings-context-skills-row')).toHaveTextContent('Coming soon');
		expect(getByTestId('settings-context-sources-row')).toHaveTextContent('Coming soon');
	});

	it.each([
		[0, '0 preferences'],
		[1, '1 preference'],
		[2, '2 preferences'],
	])('shows the count for %i as "%s"', (count, expected) => {
		const contextStore = mockedStore(useContextStore);
		contextStore.count = count;

		const { getByTestId } = renderView();

		expect(getByTestId('settings-context-preferences-row')).toHaveTextContent(expected);
	});

	it('opens the preferences list when the row is clicked', async () => {
		const { getByTestId } = renderView();

		await userEvent.click(getByTestId('settings-context-preferences-row'));

		expect(push).toHaveBeenCalledWith({ name: 'SettingsContextPreferences' });
	});
});
