import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useOpenWorkflowInAssistantStore } from '../stores/openWorkflowInAssistant.store';
import OpenWorkflowInAssistantNotification from './OpenWorkflowInAssistantNotification.vue';

const push = vi.fn();
vi.mock('vue-router', () => ({
	useRouter: () => ({ push }),
	useRoute: () => ({ params: {}, query: {} }),
}));

const renderComponent = createComponentRenderer(OpenWorkflowInAssistantNotification, {
	pinia: createTestingPinia(),
});

describe('OpenWorkflowInAssistantNotification', () => {
	let store: ReturnType<typeof mockedStore<typeof useOpenWorkflowInAssistantStore>>;

	beforeEach(() => {
		vi.clearAllMocks();
		store = mockedStore(useOpenWorkflowInAssistantStore);
		store.isNotificationVisibleFor.mockReturnValue(true);
	});

	it('renders nothing when the store hides it', () => {
		store.isNotificationVisibleFor.mockReturnValue(false);
		const { queryByTestId } = renderComponent({ props: { threadId: 't1' } });
		expect(queryByTestId('open-in-assistant-notification')).not.toBeInTheDocument();
	});

	it('closes on Got it', async () => {
		const { getByTestId } = renderComponent({ props: { threadId: 't1' } });
		await userEvent.click(getByTestId('open-in-assistant-notification-got-it'));
		expect(store.closeNotification).toHaveBeenCalledWith('got_it');
	});

	it('silences forever on Never show again', async () => {
		const { getByTestId } = renderComponent({ props: { threadId: 't1' } });
		await userEvent.click(getByTestId('open-in-assistant-notification-never'));
		expect(store.neverShowAgain).toHaveBeenCalled();
	});

	it('navigates to the highlighted setting from the link', async () => {
		const { getByTestId } = renderComponent({ props: { threadId: 't1' } });
		await userEvent.click(getByTestId('open-in-assistant-notification-settings-link'));
		expect(store.closeNotification).toHaveBeenCalledWith('settings_link');
		expect(store.requestSettingHighlight).toHaveBeenCalled();
		expect(push).toHaveBeenCalledWith({ name: 'InstanceAiSettings' });
	});
});
