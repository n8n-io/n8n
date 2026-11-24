import { mockDeep } from 'vitest-mock-extended';
import type {
	IDataObject,
	IHookFunctions,
	ILoadOptionsFunctions,
	INode,
	IRequestOptions,
} from 'n8n-workflow';

import { BitbucketTrigger } from '../BitbucketTrigger.node';

describe('BitbucketTrigger request URLs', () => {
	const node = new BitbucketTrigger();
	const mockNode: INode = {
		id: 'test-node-id',
		name: 'Bitbucket Trigger',
		type: 'n8n-nodes-base.bitbucketTrigger',
		typeVersion: 1.1,
		position: [0, 0],
		parameters: {},
	};
	const webhookId = '7c2a1f40-3b5e-4d8a-9f61-2e0b8c4d7a13';

	const hookContext = (parameters: IDataObject) => {
		const context = mockDeep<IHookFunctions>();
		context.getNode.mockReturnValue(mockNode);
		context.getNodeWebhookUrl.mockReturnValue('https://n8n.example.com/webhook/bitbucket');
		context.getWorkflowStaticData.mockReturnValue({ webhookId });
		context.getNodeParameter.mockImplementation(((name: string) => parameters[name]) as never);
		context.getCredentials.mockResolvedValue({ username: 'jdoe', appPassword: 'app-password' });
		context.helpers.httpRequestWithAuthentication.mockResolvedValue({
			values: [],
			uuid: `{${webhookId}}`,
		});
		context.helpers.request.mockResolvedValue({ values: [], uuid: `{${webhookId}}` });
		return context;
	};

	const tokenUrls = (context: IHookFunctions | ILoadOptionsFunctions) =>
		vi
			.mocked(context.helpers.httpRequestWithAuthentication)
			.mock.calls.map(([, options]) => String(options.url));

	const passwordUrls = (context: IHookFunctions | ILoadOptionsFunctions) =>
		vi
			.mocked(context.helpers.request)
			.mock.calls.map(([options]) => String((options as IRequestOptions).uri));

	const workspaceParameters = {
		authentication: 'accessToken',
		resource: 'workspace',
		workspace: 'acme-corp',
		events: ['repo:push'],
	};
	const repositoryParameters = {
		authentication: 'password',
		resource: 'repository',
		workspace: 'acme-corp',
		repository: 'billing-service',
		events: ['repo:push'],
	};

	it('should send workspace webhook requests to the workspace hooks URL', async () => {
		const context = hookContext(workspaceParameters);

		await node.webhookMethods.default.checkExists.call(context);
		await node.webhookMethods.default.create.call(context);
		await node.webhookMethods.default.delete.call(context);

		expect(tokenUrls(context)).toEqual([
			'https://api.bitbucket.org/2.0/workspaces/acme-corp/hooks',
			'https://api.bitbucket.org/2.0/workspaces/acme-corp/hooks',
			`https://api.bitbucket.org/2.0/workspaces/acme-corp/hooks/${webhookId}`,
		]);
	});

	it('should send repository webhook requests to the repository hooks URL', async () => {
		const context = hookContext(repositoryParameters);

		await node.webhookMethods.default.checkExists.call(context);
		await node.webhookMethods.default.create.call(context);
		await node.webhookMethods.default.delete.call(context);

		expect(passwordUrls(context)).toEqual([
			'https://api.bitbucket.org/2.0/repositories/acme-corp/billing-service/hooks',
			'https://api.bitbucket.org/2.0/repositories/acme-corp/billing-service/hooks',
			`https://api.bitbucket.org/2.0/repositories/acme-corp/billing-service/hooks/${webhookId}`,
		]);
	});

	it('should load options from the list URLs and follow next page links', async () => {
		const context = mockDeep<ILoadOptionsFunctions>();
		context.getNode.mockReturnValue(mockNode);
		context.getNodeParameter.mockReturnValue('accessToken');
		context.getCurrentNodeParameter.mockReturnValue('acme-corp');
		context.helpers.httpRequestWithAuthentication
			.mockResolvedValueOnce({
				values: [],
				next: 'https://api.bitbucket.org/2.0/repositories/acme-corp?page=2',
			})
			.mockResolvedValue({ values: [] });

		await node.methods.loadOptions.getRepositories.call(context);
		await node.methods.loadOptions.getWorkspaces.call(context);
		await node.methods.loadOptions.getWorkspaceEvents.call(context);
		await node.methods.loadOptions.getRepositoriesEvents.call(context);

		expect(tokenUrls(context)).toEqual([
			'https://api.bitbucket.org/2.0/repositories/acme-corp',
			'https://api.bitbucket.org/2.0/repositories/acme-corp?page=2',
			'https://api.bitbucket.org/2.0/user/workspaces',
			'https://api.bitbucket.org/2.0/hook_events/workspace',
			'https://api.bitbucket.org/2.0/hook_events/repository',
		]);
	});
});
