import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';

import type { RuntimeCredentialRule } from '../runtime-credentials.api';
import RuntimeInputsSettingsView from './RuntimeInputsSettingsView.vue';

const showMessage = vi.fn();
const showError = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showMessage, showError }) }));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: '' } }),
}));

type ApiMock = (...args: unknown[]) => Promise<unknown>;
const fetchRules = vi.fn<ApiMock>();
const createRule = vi.fn<ApiMock>();
const updateRule = vi.fn<ApiMock>();
const deleteRule = vi.fn<ApiMock>();
const fetchRuleImpact = vi.fn<ApiMock>();

vi.mock('../runtime-credentials.api', () => ({
	fetchRules: async (...args: unknown[]) => await fetchRules(...args),
	createRule: async (...args: unknown[]) => await createRule(...args),
	updateRule: async (...args: unknown[]) => await updateRule(...args),
	deleteRule: async (...args: unknown[]) => await deleteRule(...args),
	fetchRuleImpact: async (...args: unknown[]) => await fetchRuleImpact(...args),
	fetchInstancePolicy: vi.fn(),
	fetchProjectPolicy: vi.fn(),
	saveProjectPolicy: vi.fn(),
}));

const dbRule: RuntimeCredentialRule = {
	alias: 'gmail-caller',
	nodeType: 'n8n-nodes-base.webhook',
	path: 'headers.authorization',
	credentialType: 'gmailOAuth2Api',
	transform: 'bearer',
	source: 'database',
	stubCredentialId: 's1',
};
const envRule: RuntimeCredentialRule = { ...dbRule, alias: 'env-rule', source: 'environment' };

const renderView = createComponentRenderer(RuntimeInputsSettingsView);

describe('RuntimeInputsSettingsView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fetchRules.mockResolvedValue([dbRule, envRule]);
		fetchRuleImpact.mockResolvedValue({ workflows: [], truncated: false });
	});

	it('shows the empty state when there are no rules', async () => {
		fetchRules.mockResolvedValue([]);
		renderView();

		expect(await screen.findByTestId('runtime-rules-empty')).toHaveTextContent(
			'No run-time input rules yet',
		);
	});

	it('shows an error and retries', async () => {
		fetchRules.mockRejectedValueOnce(new Error('boom'));
		renderView();

		expect(await screen.findByTestId('runtime-rules-error')).toBeInTheDocument();

		await userEvent.click(screen.getByTestId('runtime-rules-retry'));

		expect(await screen.findByTestId('runtime-rule-gmail-caller')).toBeInTheDocument();
		expect(fetchRules).toHaveBeenCalledTimes(2);
	});

	it('lists rules, warns about the matched paths, and locks environment rules', async () => {
		renderView();

		expect(await screen.findByTestId('runtime-rule-gmail-caller')).toBeInTheDocument();
		expect(screen.getByTestId('runtime-rules-warning')).toHaveTextContent(
			'headers.authorization on n8n-nodes-base.webhook',
		);
		expect(screen.getAllByTestId('runtime-rule-env-badge')).toHaveLength(1);
		// Only the database rule has actions.
		expect(screen.getAllByTestId('runtime-rule-edit')).toHaveLength(1);
		expect(screen.getAllByTestId('runtime-rule-delete')).toHaveLength(1);
	});

	it('adds a rule', async () => {
		createRule.mockResolvedValue(dbRule);
		renderView();
		await screen.findByTestId('runtime-rule-gmail-caller');

		await userEvent.click(screen.getByTestId('runtime-rule-add'));
		await userEvent.type(await screen.findByTestId('runtime-rule-alias'), 'new-alias');
		await userEvent.type(screen.getByTestId('runtime-rule-node-type'), 'n8n-nodes-base.webhook');
		await userEvent.type(screen.getByTestId('runtime-rule-path'), 'headers.x-token');
		await userEvent.type(screen.getByTestId('runtime-rule-credential-type'), 'slackApi');
		expect(screen.getByTestId('runtime-rule-path-warning')).toHaveTextContent('headers.x-token');
		await userEvent.click(screen.getByTestId('runtime-rule-save'));

		await waitFor(() =>
			expect(createRule).toHaveBeenCalledWith(expect.anything(), {
				alias: 'new-alias',
				nodeType: 'n8n-nodes-base.webhook',
				path: 'headers.x-token',
				credentialType: 'slackApi',
				transform: undefined,
			}),
		);
		expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ title: 'Rule added' }));
	});

	it('shows an actionable error for a duplicate alias', async () => {
		createRule.mockRejectedValue(Object.assign(new Error('conflict'), { httpStatusCode: 409 }));
		renderView();
		await screen.findByTestId('runtime-rule-gmail-caller');

		await userEvent.click(screen.getByTestId('runtime-rule-add'));
		await userEvent.type(await screen.findByTestId('runtime-rule-alias'), 'gmail-caller');
		await userEvent.type(screen.getByTestId('runtime-rule-node-type'), 'n');
		await userEvent.type(screen.getByTestId('runtime-rule-path'), 'p');
		await userEvent.type(screen.getByTestId('runtime-rule-credential-type'), 'c');
		await userEvent.click(screen.getByTestId('runtime-rule-save'));

		expect(await screen.findByTestId('runtime-rule-error')).toHaveTextContent(
			"A rule named 'gmail-caller' already exists. Use a different alias.",
		);
	});

	it('edits a rule without sending alias or credential type', async () => {
		updateRule.mockResolvedValue(dbRule);
		renderView();
		await screen.findByTestId('runtime-rule-gmail-caller');

		await userEvent.click(screen.getByTestId('runtime-rule-edit'));
		const path = await screen.findByTestId('runtime-rule-path');
		await userEvent.clear(path);
		await userEvent.type(path, 'headers.x-other');
		await userEvent.click(screen.getByTestId('runtime-rule-save'));

		await waitFor(() =>
			expect(updateRule).toHaveBeenCalledWith(expect.anything(), 'gmail-caller', {
				nodeType: 'n8n-nodes-base.webhook',
				path: 'headers.x-other',
				transform: 'bearer',
				allowedDomains: null,
			}),
		);
	});

	it('shows allowed endpoints as tags and a muted "Any host" when empty', async () => {
		fetchRules.mockResolvedValue([
			{ ...dbRule, allowedDomains: 'api.example.com, *.example.org' },
			{ ...envRule, allowedDomains: undefined },
		]);
		renderView();

		const restricted = await screen.findByTestId('runtime-rule-domains-gmail-caller');
		expect(restricted).toHaveTextContent('api.example.com');
		expect(restricted).toHaveTextContent('*.example.org');
		expect(screen.getByTestId('runtime-rule-domains-env-rule')).toHaveTextContent('Any host');
		expect(screen.getAllByTestId('runtime-rule-any-host')).toHaveLength(1);
	});

	it('sends allowed endpoints when adding a rule', async () => {
		createRule.mockResolvedValue(dbRule);
		renderView();
		await screen.findByTestId('runtime-rule-gmail-caller');

		await userEvent.click(screen.getByTestId('runtime-rule-add'));
		await userEvent.type(await screen.findByTestId('runtime-rule-alias'), 'a1');
		await userEvent.type(screen.getByTestId('runtime-rule-node-type'), 'n');
		await userEvent.type(screen.getByTestId('runtime-rule-path'), 'p');
		await userEvent.type(screen.getByTestId('runtime-rule-credential-type'), 'c');
		await userEvent.type(
			screen.getByTestId('runtime-rule-allowed-domains'),
			' api.example.com ,, *.example.com ',
		);
		await userEvent.click(screen.getByTestId('runtime-rule-save'));

		await waitFor(() =>
			expect(createRule).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ allowedDomains: 'api.example.com, *.example.com' }),
			),
		);
	});

	it('omits allowed endpoints when adding a rule with an empty field', async () => {
		createRule.mockResolvedValue(dbRule);
		renderView();
		await screen.findByTestId('runtime-rule-gmail-caller');

		await userEvent.click(screen.getByTestId('runtime-rule-add'));
		await userEvent.type(await screen.findByTestId('runtime-rule-alias'), 'a1');
		await userEvent.type(screen.getByTestId('runtime-rule-node-type'), 'n');
		await userEvent.type(screen.getByTestId('runtime-rule-path'), 'p');
		await userEvent.type(screen.getByTestId('runtime-rule-credential-type'), 'c');
		await userEvent.click(screen.getByTestId('runtime-rule-save'));

		await waitFor(() => expect(createRule).toHaveBeenCalled());
		expect(createRule.mock.calls[0][1]).not.toHaveProperty('allowedDomains');
	});

	it('blocks saving an entry that is not a bare host', async () => {
		renderView();
		await screen.findByTestId('runtime-rule-gmail-caller');

		await userEvent.click(screen.getByTestId('runtime-rule-edit'));
		const input = await screen.findByTestId('runtime-rule-allowed-domains');
		await userEvent.type(input, 'https://api.example.com');

		expect(screen.getByTestId('runtime-rule-allowed-domains-error')).toHaveTextContent(
			'https://api.example.com',
		);
		expect(screen.getByTestId('runtime-rule-save')).toBeDisabled();
		for (const bad of ['a/b', 'a:80', 'u@a.com', 'a\\b', 'a b.com']) {
			await userEvent.clear(input);
			await userEvent.type(input, bad);
			expect(screen.getByTestId('runtime-rule-allowed-domains-error')).toBeInTheDocument();
		}
	});

	it('prefills allowed endpoints on edit and sends null when cleared', async () => {
		fetchRules.mockResolvedValue([{ ...dbRule, allowedDomains: 'api.example.com' }]);
		updateRule.mockResolvedValue(dbRule);
		renderView();
		await screen.findByTestId('runtime-rule-gmail-caller');

		await userEvent.click(screen.getByTestId('runtime-rule-edit'));
		const input = await screen.findByTestId('runtime-rule-allowed-domains');
		expect(input).toHaveValue('api.example.com');
		await userEvent.clear(input);
		await userEvent.click(screen.getByTestId('runtime-rule-save'));

		await waitFor(() =>
			expect(updateRule).toHaveBeenCalledWith(
				expect.anything(),
				'gmail-caller',
				expect.objectContaining({ allowedDomains: null }),
			),
		);
	});

	it('sends changed allowed endpoints on edit', async () => {
		updateRule.mockResolvedValue(dbRule);
		renderView();
		await screen.findByTestId('runtime-rule-gmail-caller');

		await userEvent.click(screen.getByTestId('runtime-rule-edit'));
		await userEvent.type(
			await screen.findByTestId('runtime-rule-allowed-domains'),
			'*.example.com',
		);
		await userEvent.click(screen.getByTestId('runtime-rule-save'));

		await waitFor(() =>
			expect(updateRule).toHaveBeenCalledWith(
				expect.anything(),
				'gmail-caller',
				expect.objectContaining({ allowedDomains: '*.example.com' }),
			),
		);
	});

	it('deletes a rule after confirmation', async () => {
		deleteRule.mockResolvedValue(undefined);
		renderView();
		await screen.findByTestId('runtime-rule-gmail-caller');

		await userEvent.click(screen.getByTestId('runtime-rule-delete'));
		expect(await screen.findByText('Delete rule?')).toBeInTheDocument();
		expect(deleteRule).not.toHaveBeenCalled();
		// The row icon button and the dialog action share the label. The dialog renders last.
		await userEvent.click(screen.getAllByRole('button', { name: 'Delete rule' }).at(-1)!);

		await waitFor(() => expect(deleteRule).toHaveBeenCalledWith(expect.anything(), 'gmail-caller'));
	});

	describe('impact warning', () => {
		const impactResult = {
			workflows: [
				{
					id: 'w1',
					name: 'Send invoice',
					projectId: 'p1',
					projectName: 'Finance',
					nodeNames: ['HTTP Request', 'Set'],
				},
				{ id: 'w2', name: 'Sync CRM', projectId: 'p2', projectName: 'Sales', nodeNames: ['Code'] },
			],
			truncated: true,
		};

		async function fillAddForm(path: string) {
			await userEvent.click(screen.getByTestId('runtime-rule-add'));
			await userEvent.type(
				await screen.findByTestId('runtime-rule-node-type'),
				'n8n-nodes-base.webhook',
			);
			await userEvent.type(screen.getByTestId('runtime-rule-path'), path);
		}

		it('shows the affected workflows and a truncation note after the debounce', async () => {
			fetchRuleImpact.mockResolvedValue(impactResult);
			renderView();
			await screen.findByTestId('runtime-rule-gmail-caller');

			await fillAddForm('headers.x-token');

			expect(await screen.findByTestId('runtime-rule-impact-title')).toHaveTextContent(
				'2 workflows read this value in an expression. After you save, it is replaced by a marker and those expressions stop working.',
			);
			expect(fetchRuleImpact).toHaveBeenLastCalledWith(expect.anything(), {
				nodeType: 'n8n-nodes-base.webhook',
				path: 'headers.x-token',
			});
			const items = screen.getAllByTestId('runtime-rule-impact-workflow');
			expect(items).toHaveLength(2);
			expect(items[0]).toHaveTextContent('Send invoice');
			expect(items[0]).toHaveTextContent('Finance');
			expect(items[0]).toHaveTextContent('HTTP Request, Set');
			expect(screen.getByTestId('runtime-rule-impact-truncated')).toHaveTextContent(
				'More workflows are not shown.',
			);
		});

		it('uses the singular text for one workflow', async () => {
			fetchRuleImpact.mockResolvedValue({
				workflows: [impactResult.workflows[0]],
				truncated: false,
			});
			renderView();
			await screen.findByTestId('runtime-rule-gmail-caller');

			await fillAddForm('p');

			expect(await screen.findByTestId('runtime-rule-impact-title')).toHaveTextContent(
				'1 workflow reads this value',
			);
			expect(screen.queryByTestId('runtime-rule-impact-truncated')).not.toBeInTheDocument();
		});

		it('shows nothing when no workflow is affected', async () => {
			renderView();
			await screen.findByTestId('runtime-rule-gmail-caller');

			await fillAddForm('p');

			await waitFor(() => expect(fetchRuleImpact).toHaveBeenCalled());
			expect(screen.queryByTestId('runtime-rule-impact')).not.toBeInTheDocument();
		});

		it('does not call the endpoint for an invalid path', async () => {
			renderView();
			await screen.findByTestId('runtime-rule-gmail-caller');

			await fillAddForm('a.__proto__.b');
			await new Promise((resolve) => setTimeout(resolve, 600));

			expect(fetchRuleImpact).not.toHaveBeenCalled();
		});

		it('does not check an edit until the path or node type changes', async () => {
			fetchRuleImpact.mockResolvedValue(impactResult);
			renderView();
			await screen.findByTestId('runtime-rule-gmail-caller');

			await userEvent.click(screen.getByTestId('runtime-rule-edit'));
			const path = await screen.findByTestId('runtime-rule-path');
			await new Promise((resolve) => setTimeout(resolve, 600));
			expect(fetchRuleImpact).not.toHaveBeenCalled();
			expect(screen.queryByTestId('runtime-rule-impact')).not.toBeInTheDocument();

			await userEvent.type(path, 'x');

			expect(await screen.findByTestId('runtime-rule-impact')).toBeInTheDocument();
			expect(fetchRuleImpact).toHaveBeenLastCalledWith(expect.anything(), {
				nodeType: 'n8n-nodes-base.webhook',
				path: 'headers.authorizationx',
			});
		});

		it('still saves when the check fails', async () => {
			fetchRuleImpact.mockRejectedValue(new Error('boom'));
			createRule.mockResolvedValue(dbRule);
			renderView();
			await screen.findByTestId('runtime-rule-gmail-caller');

			await fillAddForm('p');
			await userEvent.type(screen.getByTestId('runtime-rule-alias'), 'a1');
			await userEvent.type(screen.getByTestId('runtime-rule-credential-type'), 'c');
			await waitFor(() => expect(fetchRuleImpact).toHaveBeenCalled());
			expect(screen.queryByTestId('runtime-rule-impact')).not.toBeInTheDocument();
			await userEvent.click(screen.getByTestId('runtime-rule-save'));

			await waitFor(() => expect(createRule).toHaveBeenCalled());
		});
	});

	it('tells the admin which nodes enforce the allowed endpoints', async () => {
		renderView();
		await screen.findByTestId('runtime-rule-gmail-caller');

		await userEvent.click(screen.getByTestId('runtime-rule-add'));

		expect(await screen.findByTestId('runtime-rule-allowed-domains-scope')).toHaveTextContent(
			'not for example the Gmail node or the Anthropic chat model',
		);
	});
});
