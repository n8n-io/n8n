import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';

import RuntimeCredentialsSettingsView from './RuntimeCredentialsSettingsView.vue';

const showMessage = vi.fn();
const showError = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: '' } }),
}));

type ApiMock = (...args: unknown[]) => Promise<unknown>;
const getRulesMock = vi.fn<ApiMock>();
const updateRulesMock = vi.fn<ApiMock>();

vi.mock('./runtime-credentials.api', () => ({
	getRuntimeCredentialRules: async (...args: unknown[]) => await getRulesMock(...args),
	updateRuntimeCredentialRules: async (...args: unknown[]) => await updateRulesMock(...args),
}));

const envRule = { alias: 'env_key', nodeType: '*', path: 'headers.authorization', source: 'env' };
const savedRule = {
	alias: 'tenant_key',
	nodeType: 'n8n-nodes-base.webhook',
	path: 'headers.x-tenant-key',
	source: 'settings',
};

/** N8nInput puts the test id on the input itself in some versions and on a wrapper in others. */
const inputOf = (testId: string) => {
	const element = screen.getByTestId(testId);
	return element instanceof HTMLInputElement ? element : element.querySelector('input')!;
};

const renderView = createComponentRenderer(RuntimeCredentialsSettingsView, {
	pinia: createTestingPinia({ stubActions: false }),
});

describe('RuntimeCredentialsSettingsView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getRulesMock.mockResolvedValue({ rules: [envRule, savedRule] });
		updateRulesMock.mockImplementation(async (_context, rules) => ({
			rules: [envRule, ...(rules as object[]).map((rule) => ({ ...rule, source: 'settings' }))],
		}));
	});

	it('lists env rules as read-only and saved rules with actions', async () => {
		renderView({ pinia: createTestingPinia({ stubActions: false }) });

		const envRow = await screen.findByTestId('runtime-credentials-rule-env_key');
		const savedRow = screen.getByTestId('runtime-credentials-rule-tenant_key');

		expect(envRow).toHaveTextContent('Environment variable');
		expect(envRow.querySelector('[data-test-id="runtime-credentials-delete"]')).toBeNull();
		expect(savedRow).toHaveTextContent('{{ $runtimeCredentials.tenant_key }}');
		expect(savedRow.querySelector('[data-test-id="runtime-credentials-delete"]')).not.toBeNull();
	});

	it('blocks an alias that credentials cannot reference', async () => {
		renderView({ pinia: createTestingPinia({ stubActions: false }) });
		await screen.findByTestId('runtime-credentials-rule-tenant_key');

		await userEvent.type(inputOf('runtime-credentials-alias'), 'bad-alias');
		await userEvent.type(inputOf('runtime-credentials-path'), 'body.key');

		expect(screen.getByText(/start with a letter/)).toBeInTheDocument();
		expect(screen.getByTestId('runtime-credentials-submit')).toBeDisabled();
	});

	it('adds a rule next to the saved ones', async () => {
		renderView({ pinia: createTestingPinia({ stubActions: false }) });
		await screen.findByTestId('runtime-credentials-rule-tenant_key');

		await userEvent.type(inputOf('runtime-credentials-alias'), 'form_pw');
		await userEvent.type(inputOf('runtime-credentials-path'), 'body.password');
		await userEvent.click(screen.getByTestId('runtime-credentials-submit'));

		await waitFor(() =>
			expect(updateRulesMock).toHaveBeenCalledWith(expect.anything(), [
				{ alias: 'tenant_key', nodeType: 'n8n-nodes-base.webhook', path: 'headers.x-tenant-key' },
				{ alias: 'form_pw', nodeType: '*', path: 'body.password' },
			]),
		);
		expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		expect(await screen.findByTestId('runtime-credentials-rule-form_pw')).toBeInTheDocument();
	});
});
