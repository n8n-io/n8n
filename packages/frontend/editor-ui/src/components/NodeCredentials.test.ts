import { describe, it } from 'vitest';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import NodeCredentials from './NodeCredentials.vue';
import type { RenderOptions } from '@/__tests__/render';
import { createComponentRenderer } from '@/__tests__/render';
import { useCredentialsStore } from '@/stores/credentials.store';
import { mockedStore } from '@/__tests__/utils';
import type { INodeUi } from '@/Interface';
import { useNDVStore } from '@/stores/ndv.store';
import { useUIStore } from '../stores/ui.store';

const httpNode: INodeUi = {
	parameters: {
		curlImport: '',
		method: 'GET',
		url: '',
		authentication: 'predefinedCredentialType',
		nodeCredentialType: 'openAiApi',
		provideSslCertificates: false,
		sendQuery: false,
		sendHeaders: false,
		sendBody: false,
		options: {},
		infoMessage: '',
	},
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 4.2,
	position: [-200, -160],
	id: '416988b5-e994-42c7-8576-6ef28a7619b2',
	name: 'HTTP Request',
	credentials: { openAiApi: { id: 'c8vqdPpPClh4TgIO', name: 'OpenAi account 2' } },
	issues: { parameters: { url: ['Parameter "URL" is required.'] } },
};

const openAiNode: INodeUi = {
	parameters: {
		resource: 'text',
		operation: 'message',
		modelId: { __rl: true, mode: 'list', value: '' },
		messages: { values: [{ content: '', role: 'user' }] },
		simplify: true,
		jsonOutput: false,
		options: {},
	},
	type: '@n8n/n8n-nodes-langchain.openAi',
	typeVersion: 1.8,
	position: [440, 0],
	id: '17241295-a277-4cdf-8c46-6c3f85b335e9',
	name: 'OpenAI',
	credentials: { openAiApi: { id: 'byDFnd7vN5GzMVD2', name: 'n8n free OpenAI API credits' } },
	issues: { parameters: { modelId: ['Parameter "Model" is required.'] } },
};

describe('NodeCredentials', () => {
	const defaultRenderOptions: RenderOptions<typeof NodeCredentials> = {
		pinia: createTestingPinia({ stubActions: false }),
		props: {
			overrideCredType: 'openAiApi',
			node: httpNode,
			readonly: false,
			showAll: false,
			hideIssues: false,
		},
	};

	const renderComponent = createComponentRenderer(NodeCredentials, defaultRenderOptions);

	const credentialsStore = mockedStore(useCredentialsStore);
	const ndvStore = mockedStore(useNDVStore);
	const uiStore = mockedStore(useUIStore);

	beforeAll(() => {
		credentialsStore.state.credentialTypes = {
			openAiApi: {
				name: 'openAiApi',
				displayName: 'OpenAi',
				documentationUrl: 'openAi',
				properties: [
					{
						displayName: 'API Key',
						name: 'apiKey',
						type: 'string',
						typeOptions: { password: true },
						required: true,
						default: '',
					},
				],
				authenticate: {
					type: 'generic',
					properties: {
						headers: {
							Authorization: '=Bearer {{$credentials.apiKey}}',
							'OpenAI-Organization': '={{$credentials.organizationId}}',
						},
					},
				},
				test: { request: { baseURL: '={{$credentials?.url}}', url: '/models' } },
				supportedNodes: ['openAi'],
				iconUrl: {
					light: 'icons/n8n-nodes-base/dist/nodes/OpenAi/openAi.svg',
					dark: 'icons/n8n-nodes-base/dist/nodes/OpenAi/openAi.dark.svg',
				},
			},
		};
	});

	it('should display available credentials in the dropdown', async () => {
		ndvStore.activeNode = httpNode;
		credentialsStore.state.credentials = {
			c8vqdPpPClh4TgIO: {
				id: 'c8vqdPpPClh4TgIO',
				name: 'OpenAi account',
				type: 'openAiApi',
				isManaged: false,
				createdAt: '',
				updatedAt: '',
			},
		};

		renderComponent();

		const credentialsSelect = screen.getByTestId('node-credentials-select');

		await userEvent.click(credentialsSelect);

		expect(screen.queryByText('OpenAi account')).toBeInTheDocument();
	});

	it('should ignore managed credentials in the dropdown if active node is the HTTP node', async () => {
		ndvStore.activeNode = httpNode;
		credentialsStore.state.credentials = {
			c8vqdPpPClh4TgIO: {
				id: 'c8vqdPpPClh4TgIO',
				name: 'OpenAi account',
				type: 'openAiApi',
				isManaged: false,
				createdAt: '',
				updatedAt: '',
			},
			SkXM3oUkQvvYS31c: {
				id: 'c8vqdPpPClh4TgIO',
				name: 'OpenAi account 2',
				type: 'openAiApi',
				isManaged: true,
				createdAt: '',
				updatedAt: '',
			},
		};

		renderComponent();

		const credentialsSelect = screen.getByTestId('node-credentials-select');

		await userEvent.click(credentialsSelect);

		expect(screen.queryByText('OpenAi account')).toBeInTheDocument();
		expect(screen.queryByText('OpenAi account 2')).not.toBeInTheDocument();
	});

	it('should not ignored managed credentials in the dropdown if active node is not the HTTP node', async () => {
		ndvStore.activeNode = openAiNode;
		credentialsStore.state.credentials = {
			c8vqdPpPClh4TgIO: {
				id: 'c8vqdPpPClh4TgIO',
				name: 'OpenAi account',
				type: 'openAiApi',
				isManaged: false,
				createdAt: '',
				updatedAt: '',
			},
			SkXM3oUkQvvYS31c: {
				id: 'c8vqdPpPClh4TgIO',
				name: 'OpenAi account 2',
				type: 'openAiApi',
				isManaged: true,
				createdAt: '',
				updatedAt: '',
			},
		};

		renderComponent(
			{
				props: {
					node: openAiNode,
				},
			},
			{ merge: true },
		);

		const credentialsSelect = screen.getByTestId('node-credentials-select');

		await userEvent.click(credentialsSelect);

		expect(screen.queryByText('OpenAi account')).toBeInTheDocument();
		expect(screen.queryByText('OpenAi account 2')).toBeInTheDocument();
	});

	it('should filter available credentials in the dropdown', async () => {
		ndvStore.activeNode = httpNode;
		credentialsStore.state.credentials = {
			c8vqdPpPClh4TgIO: {
				id: 'c8vqdPpPClh4TgIO',
				name: 'OpenAi account',
				type: 'openAiApi',
				isManaged: false,
				createdAt: '',
				updatedAt: '',
			},
			test: {
				id: 'test',
				name: 'Test OpenAi account',
				type: 'openAiApi',
				isManaged: false,
				createdAt: '',
				updatedAt: '',
			},
		};

		renderComponent();

		const credentialsSelect = screen.getByTestId('node-credentials-select');

		await userEvent.click(credentialsSelect);

		expect(screen.queryByText('OpenAi account')).toBeInTheDocument();
		expect(screen.queryByText('Test OpenAi account')).toBeInTheDocument();

		const credentialSearch = credentialsSelect.querySelector('input') as HTMLElement;
		await userEvent.type(credentialSearch, 'test');

		expect(screen.queryByText('OpenAi account')).not.toBeInTheDocument();
		expect(screen.queryByText('Test OpenAi account')).toBeInTheDocument();

		await userEvent.keyboard('{Escape}');

		await userEvent.click(credentialsSelect);

		await userEvent.type(credentialSearch, 'Test');

		expect(screen.queryByText('OpenAi account')).not.toBeInTheDocument();
		expect(screen.queryByText('Test OpenAi account')).toBeInTheDocument();
	});

	it('should open the new credential modal when clicked', async () => {
		ndvStore.activeNode = httpNode;
		credentialsStore.state.credentials = {
			c8vqdPpPClh4TgIO: {
				id: 'c8vqdPpPClh4TgIO',
				name: 'OpenAi account',
				type: 'openAiApi',
				isManaged: false,
				createdAt: '',
				updatedAt: '',
			},
		};

		renderComponent();

		const credentialsSelect = screen.getByTestId('node-credentials-select');

		await userEvent.click(credentialsSelect);
		await userEvent.click(screen.getByTestId('node-credentials-select-item-new'));

		expect(uiStore.openNewCredential).toHaveBeenCalledWith('openAiApi', true);
	});
});
