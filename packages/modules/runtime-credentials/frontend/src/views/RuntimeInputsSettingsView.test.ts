import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, within } from '@testing-library/vue';

import type { CredentialTypeInfo, NodeTypeInfo } from '../runtime-credentials.catalog';
import type { RuntimeCredentialRule } from '../runtime-credentials.api';
import RuntimeInputsSettingsView from './RuntimeInputsSettingsView.vue';

const route = vi.hoisted(() => ({ query: {} as Record<string, string> }));
const replace = vi.hoisted(() => vi.fn());
vi.mock('vue-router', () => ({
	useRoute: () => route,
	useRouter: () => ({ replace }),
	RouterLink: { props: ['to'], template: '<a><slot /></a>' },
}));

const showMessage = vi.fn();
const showError = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showMessage, showError }) }));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: '' }, baseUrl: '/' }),
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

const fetchCredentialTypeCatalog =
	vi.fn<(baseUrl: string) => Promise<Map<string, CredentialTypeInfo>>>();
const fetchNodeTypeCatalog = vi.fn<(baseUrl: string) => Promise<Map<string, NodeTypeInfo>>>();
vi.mock('../runtime-credentials.catalog', () => ({
	fetchCredentialTypeCatalog: async (baseUrl: string) => await fetchCredentialTypeCatalog(baseUrl),
	fetchNodeTypeCatalog: async (baseUrl: string) => await fetchNodeTypeCatalog(baseUrl),
}));

const property = (name: string, type = 'string') => ({ name, displayName: name, type });
const credentialTypes = new Map<string, CredentialTypeInfo>(
	(
		[
			{ name: 'oAuth2Api', displayName: 'OAuth2 API', properties: [property('clientId')] },
			{
				name: 'googleOAuth2Api',
				displayName: 'Google OAuth2 API',
				extends: ['oAuth2Api'],
				properties: [],
			},
			{
				name: 'gmailOAuth2',
				displayName: 'Gmail OAuth2 API',
				extends: ['googleOAuth2Api'],
				properties: [],
			},
			{
				name: 'anthropicApi',
				displayName: 'Anthropic',
				properties: [
					property('apiKey'),
					property('url'),
					property('hiddenThing', 'hidden'),
					property('allowedDomains'),
				],
			},
			{
				name: 'httpBearerAuth',
				displayName: 'Bearer Auth',
				properties: [property('token')],
			},
		] satisfies CredentialTypeInfo[]
	).map((type) => [type.name, type]),
);

const dbRule: RuntimeCredentialRule = {
	alias: 'gmail-caller',
	nodeType: 'n8n-nodes-base.webhook',
	path: 'headers.authorization',
	credentialType: 'gmailOAuth2',
	transform: 'bearer',
	source: 'database',
	stubCredentialId: 's1',
};
const envRule: RuntimeCredentialRule = {
	...dbRule,
	alias: 'env-rule',
	path: 'headers.x-env',
	source: 'environment',
};

const renderView = createComponentRenderer(RuntimeInputsSettingsView);

const click = async (testId: string) => await userEvent.click(screen.getByTestId(testId));

/** Opens the action menu of a rule card and picks one action. */
async function pickAction(alias: string, label: string) {
	const card = screen.getByTestId(`runtime-rule-${alias}`);
	await userEvent.click(within(within(card).getByTestId('action-toggle')).getByRole('button'));
	await userEvent.click(await screen.findByText(label));
}

describe('RuntimeInputsSettingsView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		route.query = {};
		fetchRules.mockResolvedValue([dbRule, envRule]);
		fetchRuleImpact.mockResolvedValue({ workflows: [], truncated: false });
		fetchCredentialTypeCatalog.mockResolvedValue(credentialTypes);
		fetchNodeTypeCatalog.mockResolvedValue(new Map());
	});

	describe('empty state', () => {
		it('shows the three templates and a way to start from scratch', async () => {
			fetchRules.mockResolvedValue([]);
			renderView();

			const empty = await screen.findByTestId('runtime-rules-empty');
			expect(empty).toHaveTextContent('No run-time input rules yet');
			expect(within(empty).getByTestId('runtime-template-gmail')).toHaveTextContent('Google token');
			expect(within(empty).getByTestId('runtime-template-bearer')).toHaveTextContent(
				'Bearer token',
			);
			expect(within(empty).getByTestId('runtime-template-anthropic')).toHaveTextContent(
				'Anthropic key',
			);
			expect(screen.getByTestId('runtime-rules-empty-scratch')).toBeInTheDocument();
		});

		it('adds a rule from the Google template in three clicks', async () => {
			fetchRules.mockResolvedValue([]);
			createRule.mockResolvedValue(dbRule);
			renderView();

			await userEvent.click(await screen.findByTestId('runtime-template-gmail'));

			expect(await screen.findByTestId('runtime-wizard-step-source')).toBeInTheDocument();
			expect(
				within(screen.getByTestId('runtime-wizard-step-source')).getByTestId('runtime-path-chip'),
			).toHaveTextContent('headersgmail-authorization');
			await click('runtime-wizard-next');
			expect(await screen.findByTestId('runtime-wizard-step-credential')).toBeInTheDocument();
			await click('runtime-wizard-next');
			await click('runtime-wizard-save');

			await waitFor(() =>
				expect(createRule).toHaveBeenCalledWith(expect.anything(), {
					alias: 'google-token',
					nodeType: 'n8n-nodes-base.webhook',
					path: 'headers.gmail-authorization',
					credentialType: 'gmailOAuth2',
					transform: 'bearer',
				}),
			);
			expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ title: 'Rule added' }));
		});

		it('fills the bearer template with a field transform', async () => {
			fetchRules.mockResolvedValue([]);
			createRule.mockResolvedValue(dbRule);
			renderView();

			await userEvent.click(await screen.findByTestId('runtime-template-bearer'));
			await click('runtime-wizard-next');
			await click('runtime-wizard-next');
			await click('runtime-wizard-save');

			await waitFor(() =>
				expect(createRule).toHaveBeenCalledWith(
					expect.anything(),
					expect.objectContaining({
						alias: 'bearer-token',
						path: 'headers.x-api-token',
						credentialType: 'httpBearerAuth',
						transform: 'field:token',
					}),
				),
			);
		});
	});

	it('shows an error and retries', async () => {
		fetchRules.mockRejectedValueOnce(new Error('boom'));
		renderView();

		expect(await screen.findByTestId('runtime-rules-error')).toBeInTheDocument();

		await userEvent.click(screen.getByTestId('runtime-rules-retry'));

		expect(await screen.findByTestId('runtime-rule-gmail-caller')).toBeInTheDocument();
		expect(fetchRules).toHaveBeenCalledTimes(2);
	});

	describe('rule list', () => {
		it('summarizes the rules without inventing numbers', async () => {
			renderView();

			await screen.findByTestId('runtime-rule-gmail-caller');
			expect(screen.getByTestId('runtime-rules-stat-rules')).toHaveTextContent('2');
			expect(screen.getByTestId('runtime-rules-stat-credential-types')).toHaveTextContent('1');
			expect(screen.getByTestId('runtime-rules-stat-environment')).toHaveTextContent('1');
		});

		it('warns about the matched paths and locks environment rules', async () => {
			renderView();

			await screen.findByTestId('runtime-rule-gmail-caller');
			expect(screen.getByTestId('runtime-rules-warning')).toHaveTextContent(
				'headers.authorization on n8n-nodes-base.webhook',
			);
			expect(screen.getAllByTestId('runtime-rule-env-badge')).toHaveLength(1);
			// Only the database rule has an action menu.
			expect(screen.getAllByTestId('action-toggle')).toHaveLength(1);
			expect(
				within(screen.getByTestId('runtime-rule-env-rule')).queryByTestId('action-toggle'),
			).not.toBeInTheDocument();
		});

		it('opens a read-only dialog for an environment rule', async () => {
			renderView();
			await screen.findByTestId('runtime-rule-env-rule');

			await click('runtime-rule-open-env-rule');

			expect(await screen.findByTestId('runtime-rule-detail-note')).toHaveTextContent(
				'The environment sets this rule',
			);
			expect(screen.queryByTestId('runtime-wizard-save')).not.toBeInTheDocument();
		});

		it('shows allowed endpoints as chips with an overflow count, and "Any host" when empty', async () => {
			fetchRules.mockResolvedValue([
				{ ...dbRule, allowedDomains: 'a.example.com, b.example.com, c.example.com, d.example.com' },
				{ ...envRule, allowedDomains: undefined },
			]);
			renderView();

			const restricted = await screen.findByTestId('runtime-rule-domains-gmail-caller');
			expect(within(restricted).getAllByTestId('runtime-rule-domain')).toHaveLength(2);
			expect(within(restricted).getByTestId('runtime-rule-domains-more')).toHaveTextContent('+2');
			expect(screen.getByTestId('runtime-rule-domains-env-rule')).toHaveTextContent('Any host');
			expect(screen.getAllByTestId('runtime-rule-any-host')).toHaveLength(1);
		});

		it('shows no status on a rule without a definite problem', async () => {
			fetchRules.mockResolvedValue([dbRule]);
			renderView();

			const card = await screen.findByTestId('runtime-rule-gmail-caller');
			expect(within(card).queryByTestId('runtime-rule-status')).not.toBeInTheDocument();
			expect(within(card).queryByText('Active')).not.toBeInTheDocument();
		});

		it('marks a rule whose credential type n8n does not know', async () => {
			fetchRules.mockResolvedValue([{ ...dbRule, credentialType: 'removedApi' }]);
			renderView();

			const card = await screen.findByTestId('runtime-rule-gmail-caller');
			await waitFor(() =>
				expect(within(card).getByTestId('runtime-rule-status')).toHaveTextContent(
					'Needs attention',
				),
			);
		});

		it('marks a rule that targets a field n8n controls', async () => {
			fetchRules.mockResolvedValue([
				{ ...dbRule, credentialType: 'anthropicApi', transform: 'field:allowedDomains' },
			]);
			renderView();

			const card = await screen.findByTestId('runtime-rule-gmail-caller');
			await waitFor(() =>
				expect(within(card).getByTestId('runtime-rule-status')).toHaveTextContent(
					'Needs attention',
				),
			);
		});

		it('shows a search box after five rules and filters by credential name', async () => {
			const many = ['a', 'b', 'c', 'd', 'e', 'f'].map((alias) => ({
				...dbRule,
				alias,
				credentialType: alias === 'f' ? 'anthropicApi' : 'gmailOAuth2',
				transform: alias === 'f' ? ('field:apiKey' as const) : ('bearer' as const),
			}));
			fetchRules.mockResolvedValue(many);
			renderView();

			const search = await screen.findByTestId('runtime-rules-search');
			await userEvent.type(search, 'anthropic');

			expect(screen.getByTestId('runtime-rule-f')).toBeInTheDocument();
			expect(screen.queryByTestId('runtime-rule-a')).not.toBeInTheDocument();

			await userEvent.clear(search);
			await userEvent.type(search, 'zzz');
			expect(await screen.findByTestId('runtime-rules-no-match')).toBeInTheDocument();
		});

		it('hides the search box for a short list', async () => {
			renderView();
			await screen.findByTestId('runtime-rule-gmail-caller');

			expect(screen.queryByTestId('runtime-rules-search')).not.toBeInTheDocument();
		});
	});

	describe('row actions', () => {
		it('edits a rule without sending alias or credential type', async () => {
			updateRule.mockResolvedValue(dbRule);
			renderView();
			await screen.findByTestId('runtime-rule-gmail-caller');

			await pickAction('gmail-caller', 'Edit rule');
			expect(await screen.findByTestId('runtime-rule-alias')).toBeDisabled();
			await userEvent.click(screen.getByTestId('runtime-path-preset-header'));
			await userEvent.type(screen.getByTestId('runtime-path-name'), 'X-Other');
			await click('runtime-wizard-save');

			await waitFor(() =>
				expect(updateRule).toHaveBeenCalledWith(expect.anything(), 'gmail-caller', {
					nodeType: 'n8n-nodes-base.webhook',
					path: 'headers.x-other',
					transform: 'bearer',
					allowedDomains: null,
				}),
			);
			expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ title: 'Rule updated' }));
		});

		it('opens a step directly from the matching chip', async () => {
			renderView();
			const card = await screen.findByTestId('runtime-rule-gmail-caller');

			await userEvent.click(within(card).getByTestId('runtime-rule-flow-credential'));

			expect(await screen.findByTestId('runtime-wizard-step-credential')).toBeInTheDocument();
			expect(screen.queryByTestId('runtime-wizard-step-source')).not.toBeInTheDocument();
		});

		it('duplicates a rule into a new rule with a copy alias', async () => {
			createRule.mockResolvedValue(dbRule);
			renderView();
			await screen.findByTestId('runtime-rule-gmail-caller');

			await pickAction('gmail-caller', 'Duplicate rule');

			expect(await screen.findByTestId('runtime-rule-alias')).toHaveValue('gmail-caller-copy');
			expect(screen.getByTestId('runtime-rule-alias')).not.toBeDisabled();
			await click('runtime-wizard-next');
			await click('runtime-wizard-next');
			await click('runtime-wizard-save');
			await waitFor(() =>
				expect(createRule).toHaveBeenCalledWith(
					expect.anything(),
					expect.objectContaining({ alias: 'gmail-caller-copy', credentialType: 'gmailOAuth2' }),
				),
			);
		});

		it('deletes a rule after confirmation', async () => {
			deleteRule.mockResolvedValue(undefined);
			renderView();
			await screen.findByTestId('runtime-rule-gmail-caller');

			await pickAction('gmail-caller', 'Delete rule');
			expect(await screen.findByText('Delete rule?')).toBeInTheDocument();
			expect(deleteRule).not.toHaveBeenCalled();
			// The menu item closed with the menu, so the dialog action is the only button left.
			await userEvent.click(screen.getAllByRole('button', { name: 'Delete rule' }).at(-1)!);

			await waitFor(() =>
				expect(deleteRule).toHaveBeenCalledWith(expect.anything(), 'gmail-caller'),
			);
		});
	});

	describe('wizard', () => {
		async function openWizard() {
			renderView();
			await screen.findByTestId('runtime-rule-gmail-caller');
			await click('runtime-rule-add');
			await screen.findByTestId('runtime-wizard-step-source');
		}

		it('builds a custom header path and shows it in a sample request', async () => {
			await openWizard();

			await userEvent.click(screen.getByTestId('runtime-path-preset-header'));
			await userEvent.type(screen.getByTestId('runtime-path-name'), 'X-Api-Token');

			expect(
				within(screen.getByTestId('runtime-wizard-step-source')).getByTestId('runtime-path-chip'),
			).toHaveTextContent('headersx-api-token');
			const sample = screen.getByTestId('runtime-sample-request');
			expect(sample).toHaveTextContent('X-Api-Token: <secret>');
			expect(sample.querySelector('[data-mark="true"]')).toHaveTextContent('X-Api-Token: <secret>');
		});

		it('builds body and query paths from presets', async () => {
			await openWizard();

			await userEvent.click(screen.getByTestId('runtime-path-preset-body'));
			await userEvent.type(screen.getByTestId('runtime-path-name'), 'user.key');
			expect(screen.getByTestId('runtime-sample-request')).toHaveTextContent('"key": "<secret>"');

			await userEvent.click(screen.getByTestId('runtime-path-preset-query'));
			expect(screen.getByTestId('runtime-path-name')).toHaveValue('user.key');
			await userEvent.clear(screen.getByTestId('runtime-path-name'));
			await userEvent.type(screen.getByTestId('runtime-path-name'), 'token');
			expect(screen.getByTestId('runtime-sample-request')).toHaveTextContent('?token=<secret>');
		});

		it('explains an invalid custom path and blocks the next step', async () => {
			await openWizard();

			await userEvent.click(screen.getByTestId('runtime-path-preset-custom'));
			await userEvent.type(screen.getByTestId('runtime-path-custom'), 'a.__proto__.b');

			expect(screen.getByTestId('runtime-path-error')).toHaveTextContent('__proto__');
			expect(screen.getByTestId('runtime-wizard-next')).toBeDisabled();

			await userEvent.clear(screen.getByTestId('runtime-path-custom'));
			await userEvent.type(screen.getByTestId('runtime-path-custom'), 'a..b');
			expect(screen.getByTestId('runtime-path-error')).toHaveTextContent('empty part');
		});

		it('picks the trigger by node type id', async () => {
			createRule.mockResolvedValue(dbRule);
			await openWizard();

			await userEvent.click(screen.getByTestId('runtime-trigger-form'));
			await userEvent.click(screen.getByTestId('runtime-path-preset-body'));
			await userEvent.type(screen.getByTestId('runtime-path-name'), 'password');
			await click('runtime-wizard-next');
			await userEvent.click(await screen.findByTestId('runtime-credential-option-httpBearerAuth'));
			await click('runtime-wizard-next');
			await click('runtime-wizard-save');

			await waitFor(() =>
				expect(createRule).toHaveBeenCalledWith(
					expect.anything(),
					expect.objectContaining({
						nodeType: 'n8n-nodes-base.formTrigger',
						path: 'body.password',
					}),
				),
			);
		});

		it('supports the any-trigger and chat-trigger ids', async () => {
			createRule.mockResolvedValue(dbRule);
			await openWizard();

			await userEvent.click(screen.getByTestId('runtime-trigger-chat'));
			await userEvent.click(screen.getByTestId('runtime-trigger-any'));
			await click('runtime-wizard-next');
			await userEvent.click(await screen.findByTestId('runtime-credential-option-gmailOAuth2'));
			expect(
				within(screen.getByTestId('runtime-wizard-review')).getByTestId('runtime-rule-flow-source'),
			).toHaveTextContent('Any trigger');
		});

		it('suggests a bearer token for an OAuth2 type and a field for the others', async () => {
			await openWizard();
			await click('runtime-wizard-next');

			await userEvent.click(await screen.findByTestId('runtime-credential-option-gmailOAuth2'));
			expect(screen.getByTestId('runtime-transform-suggestion')).toHaveTextContent('OAuth2');
			expect(screen.getByTestId('runtime-transform-bearer')).toBeChecked();

			await userEvent.click(screen.getByTestId('runtime-credential-option-anthropicApi'));
			expect(screen.getByTestId('runtime-transform-field')).toBeChecked();
			expect(screen.getByTestId('runtime-field-select')).toBeInTheDocument();
			expect(screen.getByTestId('runtime-transform-suggestion')).toHaveTextContent('field');
		});

		it('searches credential types by name', async () => {
			await openWizard();
			await click('runtime-wizard-next');

			await userEvent.type(await screen.findByTestId('runtime-credential-search'), 'bearer');

			expect(screen.getByTestId('runtime-credential-option-httpBearerAuth')).toBeInTheDocument();
			expect(
				screen.queryByTestId('runtime-credential-option-anthropicApi'),
			).not.toBeInTheDocument();

			await userEvent.clear(screen.getByTestId('runtime-credential-search'));
			await userEvent.type(screen.getByTestId('runtime-credential-search'), 'nothing');
			expect(screen.getByTestId('runtime-credential-no-match')).toHaveTextContent('nothing');
		});

		it('falls back to a typed credential type when the list does not load', async () => {
			fetchCredentialTypeCatalog.mockRejectedValue(new Error('offline'));
			createRule.mockResolvedValue(dbRule);
			await openWizard();
			await click('runtime-wizard-next');

			expect(await screen.findByTestId('runtime-credential-fallback-note')).toBeInTheDocument();
			await userEvent.type(screen.getByTestId('runtime-credential-type-input'), 'slackApi');
			await userEvent.click(screen.getByTestId('runtime-transform-field'));
			await userEvent.type(await screen.findByTestId('runtime-field-input'), 'accessToken');
			await click('runtime-wizard-next');
			await click('runtime-wizard-save');

			await waitFor(() =>
				expect(createRule).toHaveBeenCalledWith(
					expect.anything(),
					expect.objectContaining({ credentialType: 'slackApi', transform: 'field:accessToken' }),
				),
			);
		});

		it('adds a rule with a custom header, a suggested field, endpoints, and a suggested alias', async () => {
			createRule.mockResolvedValue(dbRule);
			await openWizard();

			await userEvent.click(screen.getByTestId('runtime-path-preset-header'));
			await userEvent.type(screen.getByTestId('runtime-path-name'), 'x-anthropic-key');
			await click('runtime-wizard-next');
			await userEvent.click(await screen.findByTestId('runtime-credential-option-anthropicApi'));
			await click('runtime-wizard-next');
			const hosts = await screen.findByTestId('runtime-rule-allowed-domains');
			await userEvent.type(hosts, ' api.anthropic.com ,');
			await userEvent.type(hosts, '*.example.com{Enter}');
			expect(screen.getAllByTestId('runtime-endpoint-chip')).toHaveLength(2);
			expect(screen.getByTestId('runtime-rule-alias')).toHaveValue('anthropic');
			expect(screen.getByTestId('runtime-wizard-sentence')).toHaveTextContent(
				'n8n reads the value at headers.x-anthropic-key, uses it as the field apiKey for Anthropic, and sends it only to api.anthropic.com, *.example.com.',
			);
			await click('runtime-wizard-save');

			await waitFor(() =>
				expect(createRule).toHaveBeenCalledWith(expect.anything(), {
					alias: 'anthropic',
					nodeType: 'n8n-nodes-base.webhook',
					path: 'headers.x-anthropic-key',
					credentialType: 'anthropicApi',
					transform: 'field:apiKey',
					allowedDomains: 'api.anthropic.com, *.example.com',
				}),
			);
		});

		it('omits allowed endpoints when none are set', async () => {
			createRule.mockResolvedValue(dbRule);
			await openWizard();
			await click('runtime-wizard-next');
			await userEvent.click(await screen.findByTestId('runtime-credential-option-gmailOAuth2'));
			await click('runtime-wizard-next');
			await click('runtime-wizard-save');

			await waitFor(() => expect(createRule).toHaveBeenCalled());
			expect(createRule.mock.calls[0][1]).not.toHaveProperty('allowedDomains');
		});

		it('keeps a manual alias when the credential type changes', async () => {
			await openWizard();
			await userEvent.type(screen.getByTestId('runtime-rule-alias'), 'mine');
			await click('runtime-wizard-next');
			await userEvent.click(await screen.findByTestId('runtime-credential-option-gmailOAuth2'));

			expect(screen.getByTestId('runtime-rule-alias')).toHaveValue('mine');
		});

		it('blocks an alias that is taken', async () => {
			await openWizard();
			await userEvent.type(screen.getByTestId('runtime-rule-alias'), 'gmail-caller');
			await click('runtime-wizard-next');
			await userEvent.click(await screen.findByTestId('runtime-credential-option-gmailOAuth2'));
			await click('runtime-wizard-next');

			expect(screen.getByTestId('runtime-wizard-alias-error')).toHaveTextContent(
				"A rule named 'gmail-caller' already exists",
			);
			expect(screen.getByTestId('runtime-wizard-save')).toBeDisabled();
		});

		it('blocks saving a host that is not a bare host', async () => {
			await openWizard();
			await userEvent.type(screen.getByTestId('runtime-rule-alias'), 'a1');
			await click('runtime-wizard-next');
			await userEvent.click(await screen.findByTestId('runtime-credential-option-gmailOAuth2'));
			await click('runtime-wizard-next');
			const input = await screen.findByTestId('runtime-rule-allowed-domains');

			for (const bad of ['https://api.example.com', 'a/b', 'a:80', 'u@a.com', 'a b.com']) {
				await userEvent.clear(input);
				await userEvent.type(input, bad);
				expect(screen.getByTestId('runtime-rule-allowed-domains-error')).toBeInTheDocument();
				expect(screen.getByTestId('runtime-wizard-save')).toBeDisabled();
			}
		});

		it('prefills allowed endpoints on edit and sends null when all are removed', async () => {
			fetchRules.mockResolvedValue([{ ...dbRule, allowedDomains: 'api.example.com' }]);
			updateRule.mockResolvedValue(dbRule);
			renderView();
			await screen.findByTestId('runtime-rule-gmail-caller');

			await pickAction('gmail-caller', 'Edit rule');
			await click('runtime-wizard-next');
			await click('runtime-wizard-next');
			expect(screen.getByTestId('runtime-endpoint-chip')).toHaveTextContent('api.example.com');
			await userEvent.click(screen.getByRole('button', { name: 'Remove api.example.com' }));
			await click('runtime-wizard-save');

			await waitFor(() =>
				expect(updateRule).toHaveBeenCalledWith(
					expect.anything(),
					'gmail-caller',
					expect.objectContaining({ allowedDomains: null }),
				),
			);
		});

		it('tells the admin which nodes enforce the allowed endpoints', async () => {
			await openWizard();
			await click('runtime-wizard-next');
			await userEvent.click(await screen.findByTestId('runtime-credential-option-gmailOAuth2'));
			await click('runtime-wizard-next');

			expect(await screen.findByTestId('runtime-rule-allowed-domains-scope')).toHaveTextContent(
				'not for example the Gmail node or the Anthropic chat model',
			);
		});
	});

	describe('server errors', () => {
		async function fillAndSave() {
			renderView();
			await screen.findByTestId('runtime-rule-gmail-caller');
			await click('runtime-rule-add');
			await userEvent.type(await screen.findByTestId('runtime-rule-alias'), 'fresh');
			await click('runtime-wizard-next');
			await userEvent.click(await screen.findByTestId('runtime-credential-option-gmailOAuth2'));
			await click('runtime-wizard-next');
			await click('runtime-wizard-save');
		}

		it('shows an actionable error for a duplicate alias', async () => {
			createRule.mockRejectedValue(Object.assign(new Error('conflict'), { httpStatusCode: 409 }));
			await fillAndSave();

			expect(await screen.findByTestId('runtime-rule-error')).toHaveTextContent(
				"A rule named 'fresh' already exists. Use a different alias.",
			);
		});

		it('returns to the credential step for a field problem', async () => {
			createRule.mockRejectedValue(
				Object.assign(new Error('The field "x" of credential type "y" is controlled by n8n'), {
					httpStatusCode: 400,
				}),
			);
			await fillAndSave();

			expect(await screen.findByTestId('runtime-wizard-error-credential')).toHaveTextContent(
				'is controlled by n8n',
			);
			expect(screen.getByTestId('runtime-wizard-step-credential')).toBeInTheDocument();
		});

		it('returns to the source step for a path problem', async () => {
			createRule.mockRejectedValue(
				Object.assign(new Error('The path has an unsafe segment'), { httpStatusCode: 400 }),
			);
			await fillAndSave();

			expect(await screen.findByTestId('runtime-wizard-error-source')).toHaveTextContent(
				'unsafe segment',
			);
			expect(screen.getByTestId('runtime-wizard-step-source')).toBeInTheDocument();
		});

		it('returns to the endpoints step for a host problem', async () => {
			createRule.mockRejectedValue(
				Object.assign(new Error('"a/b" must be a host only'), { httpStatusCode: 400 }),
			);
			await fillAndSave();

			expect(await screen.findByTestId('runtime-wizard-error-endpoints')).toBeInTheDocument();
		});

		it('shows a generic error for an unrecognized reason', async () => {
			createRule.mockRejectedValue(
				Object.assign(new Error('{"json":true}'), { httpStatusCode: 400 }),
			);
			await fillAndSave();

			expect(await screen.findByTestId('runtime-rule-error')).toHaveTextContent(
				"The rule isn't valid. Fill in every field and try again.",
			);
		});

		it('tells the admin that environment rules cannot change', async () => {
			updateRule.mockRejectedValue(Object.assign(new Error('no'), { httpStatusCode: 403 }));
			renderView();
			await screen.findByTestId('runtime-rule-gmail-caller');
			await pickAction('gmail-caller', 'Edit rule');
			await click('runtime-wizard-save');

			expect(await screen.findByTestId('runtime-rule-error')).toHaveTextContent(
				"Environment rules can't be changed here",
			);
		});
	});

	describe('deep links', () => {
		it('opens the editor for ?rule=<alias>', async () => {
			route.query = { rule: 'gmail-caller' };
			renderView();

			expect(await screen.findByTestId('runtime-rule-alias')).toHaveValue('gmail-caller');
			expect(screen.getByTestId('runtime-rule-alias')).toBeDisabled();
		});

		it('opens the read-only dialog for an environment rule', async () => {
			route.query = { rule: 'env-rule' };
			renderView();

			expect(await screen.findByTestId('runtime-rule-detail-note')).toBeInTheDocument();
		});

		it('opens the wizard prefilled for ?new=<template>', async () => {
			route.query = { new: 'anthropic' };
			renderView();

			expect(await screen.findByTestId('runtime-path-name')).toHaveValue('x-anthropic-key');
			expect(screen.getByTestId('runtime-rule-alias')).toHaveValue('anthropic-key');
		});

		it('removes a link that matches nothing', async () => {
			route.query = { rule: 'missing', other: '1' };
			renderView();

			await waitFor(() => expect(replace).toHaveBeenCalledWith({ query: { other: '1' } }));
			expect(screen.queryByTestId('runtime-rule-wizard')).not.toBeInTheDocument();
		});

		it('removes the link when the wizard closes', async () => {
			route.query = { new: 'gmail' };
			renderView();
			await screen.findByTestId('runtime-wizard-step-source');

			await click('runtime-wizard-cancel');

			await waitFor(() => expect(replace).toHaveBeenCalledWith({ query: {} }));
		});
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

		async function openEndpointsStep(path = 'x-token') {
			renderView();
			await screen.findByTestId('runtime-rule-gmail-caller');
			await click('runtime-rule-add');
			await userEvent.click(await screen.findByTestId('runtime-path-preset-header'));
			await userEvent.type(screen.getByTestId('runtime-path-name'), path);
			await click('runtime-wizard-next');
			await userEvent.click(await screen.findByTestId('runtime-credential-option-gmailOAuth2'));
			await click('runtime-wizard-next');
		}

		it('shows the affected workflows and a truncation note after the debounce', async () => {
			fetchRuleImpact.mockResolvedValue(impactResult);
			await openEndpointsStep();

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
			expect(screen.getByTestId('runtime-rule-path-warning')).toHaveTextContent('headers.x-token');
		});

		it('uses the singular text for one workflow', async () => {
			fetchRuleImpact.mockResolvedValue({
				workflows: [impactResult.workflows[0]],
				truncated: false,
			});
			await openEndpointsStep();

			expect(await screen.findByTestId('runtime-rule-impact-title')).toHaveTextContent(
				'1 workflow reads this value',
			);
			expect(screen.queryByTestId('runtime-rule-impact-truncated')).not.toBeInTheDocument();
		});

		it('shows nothing when no workflow is affected', async () => {
			await openEndpointsStep();

			await waitFor(() => expect(fetchRuleImpact).toHaveBeenCalled());
			expect(screen.queryByTestId('runtime-rule-impact')).not.toBeInTheDocument();
		});

		it('does not check an edit until the path or node type changes', async () => {
			fetchRuleImpact.mockResolvedValue(impactResult);
			renderView();
			await screen.findByTestId('runtime-rule-gmail-caller');
			await pickAction('gmail-caller', 'Edit rule');
			await click('runtime-wizard-next');
			await click('runtime-wizard-next');
			await new Promise((resolve) => setTimeout(resolve, 600));
			expect(fetchRuleImpact).not.toHaveBeenCalled();
			expect(screen.queryByTestId('runtime-rule-impact')).not.toBeInTheDocument();
		});

		it('still saves when the check fails', async () => {
			fetchRuleImpact.mockRejectedValue(new Error('boom'));
			createRule.mockResolvedValue(dbRule);
			await openEndpointsStep();

			await waitFor(() => expect(fetchRuleImpact).toHaveBeenCalled());
			expect(screen.queryByTestId('runtime-rule-impact')).not.toBeInTheDocument();
			await click('runtime-wizard-save');

			await waitFor(() => expect(createRule).toHaveBeenCalled());
		});
	});
});
