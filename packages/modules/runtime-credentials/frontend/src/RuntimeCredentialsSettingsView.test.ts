import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';

import RuntimeCredentialsSettingsView from './RuntimeCredentialsSettingsView.vue';
import { IMPACT_DEBOUNCE_MS } from './runtime-credentials.constants';

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
const getImpactMock = vi.fn<ApiMock>();

vi.mock('./runtime-credentials.api', () => ({
	getRuntimeCredentialRules: async (...args: unknown[]) => await getRulesMock(...args),
	updateRuntimeCredentialRules: async (...args: unknown[]) => await updateRulesMock(...args),
	getRuntimeCredentialRuleImpact: async (...args: unknown[]) => await getImpactMock(...args),
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

async function openAddDialog() {
	await screen.findByTestId('runtime-credentials-rule-tenant_key');
	await userEvent.click(screen.getByTestId('runtime-credentials-add'));
	await screen.findByTestId('runtime-credentials-form');
}

const renderView = createComponentRenderer(RuntimeCredentialsSettingsView, {
	pinia: createTestingPinia({ stubActions: false }),
});

describe('RuntimeCredentialsSettingsView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getRulesMock.mockResolvedValue({ rules: [envRule, savedRule] });
		getImpactMock.mockResolvedValue({ count: 0, workflows: [] });
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

	it('offers a retry and blocks changes until the rules load', async () => {
		getRulesMock.mockRejectedValueOnce(new Error('offline'));
		renderView({ pinia: createTestingPinia({ stubActions: false }) });

		await screen.findByTestId('runtime-credentials-load-error');
		expect(screen.getByTestId('runtime-credentials-add')).toBeDisabled();

		await userEvent.click(screen.getByTestId('runtime-credentials-retry'));

		expect(await screen.findByTestId('runtime-credentials-rule-tenant_key')).toBeInTheDocument();
		expect(screen.getByTestId('runtime-credentials-add')).toBeEnabled();
	});

	it('blocks an alias that credentials cannot reference', async () => {
		renderView({ pinia: createTestingPinia({ stubActions: false }) });
		await openAddDialog();

		await userEvent.type(inputOf('runtime-credentials-alias'), 'bad-alias');
		await userEvent.type(inputOf('runtime-credentials-path'), 'body.key');

		expect(screen.getByText(/start with a letter/)).toBeInTheDocument();
		expect(screen.getByTestId('runtime-credentials-submit')).toBeDisabled();
	});

	it('adds a rule next to the saved ones', async () => {
		renderView({ pinia: createTestingPinia({ stubActions: false }) });
		await openAddDialog();

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
		await waitFor(() => expect(screen.queryByTestId('runtime-credentials-form')).toBeNull());
	});

	it('edits a saved rule in the same dialog', async () => {
		renderView({ pinia: createTestingPinia({ stubActions: false }) });
		const savedRow = await screen.findByTestId('runtime-credentials-rule-tenant_key');

		await userEvent.click(savedRow.querySelector('[data-test-id="runtime-credentials-edit"]')!);
		await screen.findByTestId('runtime-credentials-form');
		expect(screen.getByText('Edit rule')).toBeInTheDocument();
		expect(inputOf('runtime-credentials-path')).toHaveValue('headers.x-tenant-key');
		await new Promise((resolve) => setTimeout(resolve, IMPACT_DEBOUNCE_MS + 100));
		expect(getImpactMock).not.toHaveBeenCalled();

		await userEvent.clear(inputOf('runtime-credentials-path'));
		await userEvent.type(inputOf('runtime-credentials-path'), 'headers.x-key');
		await userEvent.click(screen.getByTestId('runtime-credentials-submit'));

		await waitFor(() =>
			expect(updateRulesMock).toHaveBeenCalledWith(expect.anything(), [
				{ alias: 'tenant_key', nodeType: 'n8n-nodes-base.webhook', path: 'headers.x-key' },
			]),
		);
	});

	it('warns about workflows that read the field today', async () => {
		getImpactMock.mockResolvedValue({
			count: 2,
			workflows: [
				{ id: '1', name: 'Billing sync' },
				{ id: '2', name: 'CRM import' },
			],
		});
		renderView({ pinia: createTestingPinia({ stubActions: false }) });
		await openAddDialog();

		await userEvent.type(inputOf('runtime-credentials-path'), 'headers.x-api-key');

		expect(
			await screen.findByTestId('runtime-credentials-impact', {}, { timeout: 3000 }),
		).toHaveTextContent('2 workflow(s) read this field today');
		expect(getImpactMock).toHaveBeenLastCalledWith(expect.anything(), '*', 'headers.x-api-key');
	});
});
