import type { AppBindingsResponse } from '@n8n/api-types';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';

import { testApp } from '../../__tests__/fixtures';
import { getAppBindings } from '../../apps.api';
import AppFeedbackLink from './AppFeedbackLink.vue';

vi.mock('../../apps.api');

const FORM_URL = 'https://forms.example.com/apps-feedback';

const renderComponent = createComponentRenderer(AppFeedbackLink, {
	props: { app: testApp() },
});

function provideFormUrl(url: string | undefined) {
	capabilityRegistry.provide(capabilities.appsFeedbackFormUrl, () => url);
}

function stubWindowOpen() {
	const tab = { opener: {}, location: { href: '' } };
	vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
	return tab;
}

function signIn() {
	const usersStore = useUsersStore();
	usersStore.usersById = {
		'user-1': { id: 'user-1', email: 'ada@example.com', isPending: false, isDefaultUser: false },
	} as unknown as typeof usersStore.usersById;
	usersStore.currentUserId = 'user-1';
	useRootStore().setInstanceId('instance-1');
}

describe('AppFeedbackLink', () => {
	afterEach(() => {
		capabilityRegistry.clear();
		vi.restoreAllMocks();
	});

	it('stays hidden when no form URL is provided', () => {
		renderComponent();

		expect(screen.queryByTestId('app-preview-feedback')).not.toBeInTheDocument();
	});

	it('stays hidden when the form URL does not use HTTPS', () => {
		provideFormUrl('http://forms.example.com/apps-feedback');
		renderComponent();

		expect(screen.queryByTestId('app-preview-feedback')).not.toBeInTheDocument();
	});

	it('opens the form with the user, instance and app connections', async () => {
		provideFormUrl(`${FORM_URL}?ref=apps`);
		vi.mocked(getAppBindings).mockResolvedValue({
			bindings: [{ kind: 'workflow' }, { kind: 'workflow' }, { kind: 'dataTable' }],
		} as unknown as AppBindingsResponse);
		const tab = stubWindowOpen();
		renderComponent();
		signIn();

		await userEvent.click(screen.getByTestId('app-preview-feedback'));

		await waitFor(() => expect(tab.location.href).not.toBe(''));
		expect(window.open).toHaveBeenCalledWith('about:blank', '_blank');
		expect(tab.opener).toBeNull();
		const opened = new URL(tab.location.href);
		expect(opened.origin + opened.pathname).toBe(FORM_URL);
		expect(Object.fromEntries(opened.searchParams)).toEqual({
			ref: 'apps',
			source: 'apps',
			userId: 'user-1',
			email: 'ada@example.com',
			instanceId: 'instance-1',
			appId: 'app-1',
			workflows: '2',
			dataTables: '1',
			agents: '0',
		});
	});

	it('opens the form without connection counts when they cannot load', async () => {
		provideFormUrl(FORM_URL);
		vi.mocked(getAppBindings).mockRejectedValue(new Error('Forbidden'));
		const tab = stubWindowOpen();
		renderComponent();

		await userEvent.click(screen.getByTestId('app-preview-feedback'));

		await waitFor(() => expect(tab.location.href).not.toBe(''));
		const params = new URL(tab.location.href).searchParams;
		expect(params.get('appId')).toBe('app-1');
		expect(params.has('workflows')).toBe(false);
	});
});
