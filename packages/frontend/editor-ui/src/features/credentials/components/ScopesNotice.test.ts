import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { useCredentialsStore } from '../credentials.store';
import ScopesNotice from './ScopesNotice.vue';

const renderComponent = createComponentRenderer(ScopesNotice);

describe('ScopesNotice', () => {
	beforeEach(() => {
		createTestingPinia();
		useCredentialsStore().state.credentialTypes = {
			testOAuth2Api: {
				name: 'testOAuth2Api',
				displayName: 'Test OAuth2 API',
				properties: [],
			},
		};
	});

	it('reveals the available scopes when clicking the scope count', async () => {
		const { getByText, getByRole } = renderComponent({
			props: {
				activeCredentialType: 'testOAuth2Api',
				scopes: ['read:items', 'write:items'],
			},
		});

		expect(getByRole('region')).not.toHaveTextContent('read:items');
		expect(getByRole('region')).not.toHaveTextContent('write:items');

		await userEvent.click(getByText('2 scopes'));

		expect(getByRole('region')).toHaveTextContent('read:items');
		expect(getByRole('region')).toHaveTextContent('write:items');
		expect(getByText('Show less')).toBeVisible();
	});

	// NODE-5622: Users expect the "scopes available" control to reveal the scope list.
	it('reveals the available scopes when clicking the available label', async () => {
		const { getByText, getByRole } = renderComponent({
			props: {
				activeCredentialType: 'testOAuth2Api',
				scopes: ['read:items', 'write:items'],
			},
		});

		expect(getByRole('region')).not.toHaveTextContent('read:items');
		expect(getByRole('region')).not.toHaveTextContent('write:items');

		await userEvent.click(getByText('available for Test credentials', { exact: false }));

		expect(getByRole('region')).toHaveTextContent('read:items');
		expect(getByRole('region')).toHaveTextContent('write:items');
		expect(getByText('Show less')).toBeVisible();
	});
});
