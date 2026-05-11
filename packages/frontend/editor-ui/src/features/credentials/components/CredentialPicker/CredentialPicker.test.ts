import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useCredentialsStore } from '../../credentials.store';
import { createTestingPinia } from '@pinia/testing';
import CredentialPicker from './CredentialPicker.vue';
import {
	PERSONAL_OPENAI_CREDENTIAL,
	PROJECT_OPENAI_CREDENTIAL,
	GLOBAL_OPENAI_CREDENTIAL,
	TEST_CREDENTIAL_TYPES,
	TEST_CREDENTIALS,
} from './CredentialPicker.test.constants';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/vue';

vi.mock('vue-router', () => {
	const push = vi.fn();
	const resolve = vi.fn().mockReturnValue({ href: 'https://test.com' });
	return {
		useRouter: () => ({
			push,
			resolve,
		}),
		useRoute: () => ({}),
		RouterLink: vi.fn(),
	};
});

let credentialsStore: ReturnType<typeof mockedStore<typeof useCredentialsStore>>;

const renderComponent = createComponentRenderer(CredentialPicker);

describe('CredentialPicker', () => {
	beforeEach(() => {
		createTestingPinia();
		credentialsStore = mockedStore(useCredentialsStore);
		credentialsStore.state.credentials = TEST_CREDENTIALS;
		credentialsStore.state.credentialTypes = TEST_CREDENTIAL_TYPES;
	});

	it('should render', () => {
		expect(() =>
			renderComponent({
				props: {
					appName: 'OpenAI',
					credentialType: 'openAiApi',
					selectedCredentialId: null,
				},
			}),
		).not.toThrowError();
	});

	it('should render all credentials of the specified type', async () => {
		const TEST_APP_NAME = 'OpenAI';
		const TEST_CREDENTIAL_TYPE = 'openAiApi';
		const { getByTestId } = renderComponent({
			props: {
				appName: TEST_APP_NAME,
				credentialType: TEST_CREDENTIAL_TYPE,
				selectedCredentialId: null,
			},
		});
		expect(getByTestId('credential-dropdown')).toBeInTheDocument();
		expect(getByTestId('credential-dropdown')).toHaveAttribute(
			'credential-type',
			TEST_CREDENTIAL_TYPE,
		);
		// Open the dropdown
		await userEvent.click(getByTestId('credential-dropdown'));
		// Personal openAI credential should be in the dropdown
		expect(
			screen.getByTestId(`node-credentials-select-item-${PERSONAL_OPENAI_CREDENTIAL.id}`),
		).toBeInTheDocument();
		// OpenAI credential that belong to other project should be in the dropdown
		expect(
			screen.queryByTestId(`node-credentials-select-item-${PROJECT_OPENAI_CREDENTIAL.id}`),
		).toBeInTheDocument();
		// Global OpenAI credential should be in the dropdown
		expect(
			screen.queryByTestId(`node-credentials-select-item-${GLOBAL_OPENAI_CREDENTIAL.id}`),
		).toBeInTheDocument();
	});

	it('should only render personal credentials of the specified type', async () => {
		const TEST_APP_NAME = 'OpenAI';
		const TEST_CREDENTIAL_TYPE = 'openAiApi';
		const { getByTestId } = renderComponent({
			props: {
				personalOnly: true,
				appName: TEST_APP_NAME,
				credentialType: TEST_CREDENTIAL_TYPE,
				selectedCredentialId: null,
			},
		});
		expect(getByTestId('credential-dropdown')).toBeInTheDocument();
		expect(getByTestId('credential-dropdown')).toHaveAttribute(
			'credential-type',
			TEST_CREDENTIAL_TYPE,
		);
		// Open the dropdown
		await userEvent.click(getByTestId('credential-dropdown'));
		// Personal openAI credential should be in the dropdown
		expect(
			screen.getByTestId(`node-credentials-select-item-${PERSONAL_OPENAI_CREDENTIAL.id}`),
		).toBeInTheDocument();
		// OpenAI credential that belong to other project should not be in the dropdown
		expect(
			screen.queryByTestId(`node-credentials-select-item-${PROJECT_OPENAI_CREDENTIAL.id}`),
		).not.toBeInTheDocument();
		// Global OpenAI credential should be in the dropdown
		expect(
			screen.queryByTestId(`node-credentials-select-item-${GLOBAL_OPENAI_CREDENTIAL.id}`),
		).toBeInTheDocument();
	});

	// IAM-630 / N8N-9888: Credentials don't refresh when added externally
	describe('credential refresh behavior', () => {
		it('should show credentials added by another user after refreshing the store', async () => {
			// IAM-630: This test demonstrates that when another user adds a credential,
			// the current user's browser doesn't see it until the store is refreshed.
			// The bug is that there's no automatic mechanism to refresh credentials
			// when reopening nodes.

			const TEST_APP_NAME = 'OpenAI';
			const TEST_CREDENTIAL_TYPE = 'openAiApi';

			// Render component with initial credentials (should show 3 OpenAI creds)
			const { getByTestId } = renderComponent({
				props: {
					appName: TEST_APP_NAME,
					credentialType: TEST_CREDENTIAL_TYPE,
					selectedCredentialId: null,
				},
			});

			// Open dropdown and count initial credentials
			await userEvent.click(getByTestId('credential-dropdown'));
			const initialCredentialNames = [
				PERSONAL_OPENAI_CREDENTIAL.name,
				PROJECT_OPENAI_CREDENTIAL.name,
				GLOBAL_OPENAI_CREDENTIAL.name,
			];

			// Verify all 3 are present
			for (const name of initialCredentialNames) {
				expect(screen.getByText(name)).toBeInTheDocument();
			}

			// Close dropdown
			await userEvent.click(getByTestId('credential-dropdown'));

			// Simulate: Another user adds a credential to the backend database
			// In reality, this would be done via API call by another user/tab
			// The credential exists in the database but NOT in the current browser's store
			const externalCredential = {
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				id: '999-external',
				name: 'Externally Added Credential',
				data: 'test999',
				type: 'openAiApi',
				isManaged: false,
				homeProject: {
					id: '3',
					type: 'team' as const,
					name: 'Another Users Project',
					icon: null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
				sharedWithProjects: [],
				scopes: [
					'credential:create',
					'credential:delete',
					'credential:list',
					'credential:move',
					'credential:read',
					'credential:share',
					'credential:update',
				],
			};

			// Reopen the dropdown WITHOUT refreshing the store
			// BUG: User won't see the externally added credential
			await userEvent.click(getByTestId('credential-dropdown'));

			// The external credential should NOT be visible yet (demonstrating the bug)
			expect(screen.queryByText(externalCredential.name)).not.toBeInTheDocument();

			// Close and simulate a store refresh (e.g., via fetchAllCredentials)
			// This is what SHOULD happen automatically when reopening nodes
			await userEvent.click(getByTestId('credential-dropdown'));
			credentialsStore.state.credentials['999-external'] = externalCredential;

			// Reopen after store refresh
			await userEvent.click(getByTestId('credential-dropdown'));

			// NOW the credential should be visible (after manual refresh)
			// This shows that the component IS reactive, but lacks automatic refresh
			expect(screen.getByText(externalCredential.name)).toBeInTheDocument();
		});
	});
});
