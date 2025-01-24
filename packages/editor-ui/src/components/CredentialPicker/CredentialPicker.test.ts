import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useCredentialsStore } from '@/stores/credentials.store';
import { createTestingPinia } from '@pinia/testing';
import CredentialPicker from './CredentialPicker.vue';
import {
	PERSONAL_OPENAI_CREDENTIAL,
	PROJECT_OPENAI_CREDENTIAL,
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

	it('should only render personal credentials of the specified type', async () => {
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
		// OpenAI credential that belong to other project should not be in the dropdown
		expect(
			screen.queryByTestId(`node-credentials-select-item-${PROJECT_OPENAI_CREDENTIAL.id}`),
		).not.toBeInTheDocument();
	});
});
