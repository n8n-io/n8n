import { describe, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import NodeCredentials from './NodeCredentials.vue';
import type { RenderOptions } from '@/__tests__/render';
import { createComponentRenderer } from '@/__tests__/render';
import { useCredentialsStore } from '@/stores/credentials.store';
import { mockedStore } from '@/__tests__/utils';
import type { INodeUi } from '@/Interface';

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

describe('NodeCredentials', () => {
	const defaultRenderOptions: RenderOptions = {
		pinia: createTestingPinia(),
		props: {
			overrideCredType: 'openAiApi',
			node: httpNode,
			readonly: false,
			showAll: false,
			hideIssues: false,
		},
	};

	const renderComponent = createComponentRenderer(NodeCredentials, defaultRenderOptions);

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

	const credentialsStore = mockedStore(useCredentialsStore);

	it('should display available credentials in the dropdown', async () => {
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

		await fireEvent.click(credentialsSelect);

		expect(screen.queryByText('OpenAi account')).toBeInTheDocument();
	});

	it('should ignore managed credentials in the dropdown', async () => {
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

		await fireEvent.click(credentialsSelect);

		expect(screen.queryByText('OpenAi account')).toBeInTheDocument();
		expect(screen.queryByText('OpenAi account 2')).not.toBeInTheDocument();
	});
});
