import { capabilities, capabilityRegistry, componentRegistry } from '@n8n/frontend-module-sdk';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { fireEvent, waitFor } from '@testing-library/vue';
import { defineComponent, h } from 'vue';

import HttpActionView from './HttpActionView.vue';
import { configOf, emptyForm, type HttpActionForm } from '../next-nodes-instance.config';

const scopes = vi.hoisted(() => new Set<string>());
const route = vi.hoisted(() => ({ params: {} as Record<string, string> }));
const store = vi.hoisted(() => ({
	test: vi.fn(),
	publish: vi.fn(),
	importOpenApi: vi.fn(),
	fetchParents: vi.fn(),
	configOf: vi.fn(),
	parents: [
		{
			id: 'github',
			displayName: 'GitHub',
			credentialTypes: ['githubApi', 'githubOAuth2Api'],
			resources: { issue: ['owner', 'repository'] },
		},
	],
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({ push: vi.fn() }),
	useRoute: () => ({ name: 'test', params: route.params, query: {} }),
}));
vi.mock('@n8n/stores/rbac.store', () => ({
	useRBACStore: () => ({ hasScope: (scope: string) => scopes.has(scope) }),
}));
vi.mock('../next-nodes-instance.store', () => ({ useNextNodesInstanceStore: () => store }));

const renderView = createComponentRenderer(HttpActionView);

const draft = {
	appName: 'Acme',
	actionName: 'Get a greeting',
	summary: '',
	method: 'GET',
	baseUrl: 'https://api.acme.com',
	path: '/greet',
	query: [],
	headers: [],
	body: [],
	inputs: {},
	response: { kind: 'single' },
	advanced: {},
};

const fixture = { name: 'test', params: {}, responses: [{ text: 'Hi' }], output: [{ text: 'Hi' }] };

const CredentialPickerStub = defineComponent({
	emits: ['credentialSelected'],
	setup:
		(_, { emit }) =>
		() =>
			h('button', {
				'data-test-id': 'pick-credential',
				onClick: () => emit('credentialSelected', 'cred-1'),
			}),
});

describe('HttpActionView', () => {
	afterEach(() => {
		capabilityRegistry.clear();
		componentRegistry.clear();
	});

	beforeEach(() => {
		capabilityRegistry.provide(capabilities.credentialCatalog, {
			load: async () => {},
			types: () => [{ name: 'slackApi', displayName: 'Slack API', httpRequestNode: true }],
		});
		componentRegistry.register('credential-picker', CredentialPickerStub);
		scopes.clear();
		route.params = {};
		store.publish.mockResolvedValue({ id: 'acme.getAGreeting', semver: '1.0.0' });
		localStorage.setItem('N8N_NEXT_NODES_HTTP_ACTION_DRAFT', JSON.stringify(draft));
		store.test.mockResolvedValue({
			status: 'success',
			items: [{ text: 'Hi' }],
			fixture,
			outputSchema: { type: 'object', properties: { text: { type: 'string' } } },
		});
	});

	it('publishes with the fixture and trimmed output of a test of the current request', async () => {
		scopes.add('nodeDefinition:publish');
		const { getByTestId } = renderView();
		await fireEvent.click(getByTestId('http-action-run-test'));
		await waitFor(() => expect(store.test).toHaveBeenCalled());

		await fireEvent.click(getByTestId('http-action-publish'));
		await waitFor(() => expect(store.publish).toHaveBeenCalled());
		const [config, published] = store.publish.mock.calls[0] ?? [];
		expect(config.contract.output).toEqual({
			type: 'object',
			properties: { text: { type: 'string' } },
		});
		expect(published).toEqual(fixture);
	});

	it('publishes without a fixture when the request changed after the test', async () => {
		scopes.add('nodeDefinition:publish');
		const { getByTestId } = renderView();
		await fireEvent.click(getByTestId('http-action-run-test'));
		await waitFor(() => expect(store.test).toHaveBeenCalled());
		await fireEvent.update(getByTestId('http-action-path'), '/greet/again');

		await fireEvent.click(getByTestId('http-action-publish'));
		await waitFor(() => expect(store.publish).toHaveBeenCalled());
		const [config, published] = store.publish.mock.calls[0] ?? [];
		expect(config.contract.output).toEqual({ type: 'object' });
		expect(published).toBeUndefined();
	});

	it('publishes without a test run', async () => {
		scopes.add('nodeDefinition:publish');
		const { getByTestId } = renderView();

		await fireEvent.click(getByTestId('http-action-publish'));

		await waitFor(() => expect(store.publish).toHaveBeenCalledWith(expect.anything(), undefined));
	});

	it('imports an OpenAPI document and lists what it published and skipped', async () => {
		scopes.add('nodeDefinition:publish');
		store.importOpenApi.mockResolvedValue({
			node: { id: 'acme', displayName: 'Acme' },
			published: [{ actionId: 'acme.listTasks', semver: '1.0.0', action: 'List tasks' }],
			skipped: [{ operation: 'POST /import', reason: 'the body is text/csv, not JSON' }],
			credential: { type: 'httpHeaderAuth', header: 'X-Acme-Key' },
		});
		const { getByTestId } = renderView();

		await fireEvent.click(getByTestId('http-action-import-openapi'));
		await fireEvent.update(getByTestId('openapi-import-document'), 'openapi: 3.0.3');
		await fireEvent.click(getByTestId('openapi-import-submit'));

		await waitFor(() => expect(getByTestId('openapi-import-result')).toBeInTheDocument());
		expect(store.importOpenApi).toHaveBeenCalledWith('openapi: 3.0.3');
		expect(getByTestId('openapi-import-result')).toHaveTextContent('List tasks');
		expect(getByTestId('openapi-import-skipped')).toHaveTextContent(
			'the body is text/csv, not JSON',
		);
		expect(getByTestId('openapi-import-credential')).toHaveTextContent('X-Acme-Key');
	});

	it('does not offer an OpenAPI import to a user who may not publish', () => {
		const { queryByTestId } = renderView();

		expect(queryByTestId('http-action-import-openapi')).not.toBeInTheDocument();
	});

	it('lets a user without the publish scope test, but not publish', async () => {
		const { getByTestId } = renderView();
		await fireEvent.click(getByTestId('http-action-run-test'));
		await waitFor(() => expect(store.test).toHaveBeenCalled());

		expect(getByTestId('http-action-publish')).toBeDisabled();
	});

	it('tests with a credential of the type that the action sends', async () => {
		localStorage.setItem(
			'N8N_NEXT_NODES_HTTP_ACTION_DRAFT',
			JSON.stringify({ ...draft, credentialType: 'slackApi' }),
		);
		const { getByTestId } = renderView();

		expect(getByTestId('http-action-run-test')).toBeDisabled();
		await fireEvent.click(getByTestId('http-action-test-credential'));
		await fireEvent.click(getByTestId('http-action-run-test'));

		await waitFor(() => expect(store.test).toHaveBeenCalled());
		const [config, , credentialId] = store.test.mock.calls[0] ?? [];
		expect(config.contract.credentials).toEqual(['slackApi']);
		expect(credentialId).toBe('cred-1');
	});

	it('adds an action to a shipped node, with its credential types and resource inputs', async () => {
		localStorage.setItem(
			'N8N_NEXT_NODES_HTTP_ACTION_DRAFT',
			JSON.stringify({
				...draft,
				appName: '',
				baseUrl: '',
				actionName: 'Lock an issue',
				path: '/repos/{owner}/{repository}/issues/{issueNumber}/lock',
				extends: {
					node: 'github',
					displayName: 'GitHub',
					credentialTypes: ['githubApi', 'githubOAuth2Api'],
					resource: 'issue',
					resourceFields: ['owner', 'repository'],
				},
			}),
		);
		const { getByTestId, queryByTestId } = renderView();

		expect(queryByTestId('http-action-base-url')).not.toBeInTheDocument();
		expect(getByTestId('http-action-test-credential-type')).toBeInTheDocument();
		await fireEvent.click(getByTestId('http-action-test-credential'));
		await fireEvent.click(getByTestId('http-action-run-test'));

		await waitFor(() => expect(store.test).toHaveBeenCalled());
		const [config] = store.test.mock.calls[0] ?? [];
		expect(config).toMatchObject({
			extends: 'github',
			contract: { id: 'github.issue.lockAnIssue' },
		});
		expect(config.baseUrl).toBeUndefined();
	});

	it('opens the newest version of an action, and keeps its id', async () => {
		route.params = { actionId: 'acme.wave' };
		localStorage.removeItem('N8N_NEXT_NODES_HTTP_ACTION_DRAFT:acme.wave');
		store.configOf.mockResolvedValue({
			semver: '1.2.0',
			config: configOf({
				...emptyForm(),
				...draft,
				actionName: 'Wave',
				advanced: { id: 'acme.wave' },
			} as HttpActionForm),
		});
		const { getByTestId } = renderView();

		await waitFor(() => expect(getByTestId('http-action-action-name')).toHaveValue('Wave'));
		expect(store.configOf).toHaveBeenCalledWith('acme.wave');
		expect(getByTestId('http-action-id')).toBeDisabled();
		expect(getByTestId('http-action-id')).toHaveValue('acme.wave');
		expect(getByTestId('http-action-publish')).toHaveTextContent('Publish new version');
	});
});
