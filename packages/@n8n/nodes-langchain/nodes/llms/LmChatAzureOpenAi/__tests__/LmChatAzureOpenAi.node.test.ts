import { getProxyAgent } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import { LmChatAzureOpenAi } from '../LmChatAzureOpenAi.node';

vi.mock('@langchain/openai');
vi.mock('@n8n/ai-utilities');

const mockNode: INode = {
	id: '1',
	name: 'Azure OpenAI Chat Model',
	typeVersion: 1,
	type: '@n8n/n8n-nodes-langchain.lmChatAzureOpenAi',
	position: [0, 0],
	parameters: {},
};

const apiKeyCredential = {
	apiKey: 'test-key',
	resourceName: 'my-resource',
	apiVersion: '2024-08-01-preview',
};

const entraCredential = {
	resourceName: 'my-resource',
	apiVersion: '2024-08-01-preview',
	oauthTokenData: { access_token: 'test-token' },
};

const setupMockContext = (authentication: string, credential: object) => {
	const ctx = createMockExecuteFunction<ISupplyDataFunctions>({}, mockNode);
	ctx.getCredentials = vi.fn().mockResolvedValue(credential);
	ctx.getNode = vi.fn().mockReturnValue(mockNode);
	ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
		if (paramName === 'authentication') return authentication;
		if (paramName === 'model') return 'gpt-4o';
		if (paramName === 'options') return {};
		return undefined;
	});
	ctx.logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
	return ctx;
};

describe('LmChatAzureOpenAi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('node identity', () => {
		const { description } = new LmChatAzureOpenAi();

		it('should be labelled for the whole Foundry catalogue, not just OpenAI', () => {
			expect(description.displayName).toBe('Azure AI Foundry Chat Model');
			expect(description.defaults.name).toBe('Azure AI Foundry Chat Model');
		});

		// A saved workflow resolves its nodes by type, so the rename is only safe while this is
		// untouched. Changing it would orphan every existing Azure OpenAI Chat Model node.
		it('should keep the node type, which saved workflows resolve by', () => {
			expect(description.name).toBe('lmChatAzureOpenAi');
		});

		// Without this the old label finds nothing at all, which is the one way the rename
		// could actually cost a user something.
		it('should still be findable by the old name', () => {
			expect(description.codex?.alias).toContain('Azure OpenAI');
		});

		it.each(['Azure AI Foundry', 'Foundry'])('should be findable by %s', (term) => {
			expect(description.codex?.alias).toContain(term);
		});
	});

	it.each([
		[
			'API key with custom endpoint',
			'azureOpenAiApi',
			{ ...apiKeyCredential, endpoint: 'https://custom.openai.azure.com' },
			'https://custom.openai.azure.com',
		],
		[
			'API key without endpoint',
			'azureOpenAiApi',
			apiKeyCredential,
			'https://my-resource.openai.azure.com',
		],
		// The Entra handler turns a missing endpoint into '' rather than undefined
		[
			'Entra ID without endpoint',
			'azureEntraCognitiveServicesOAuth2Api',
			entraCredential,
			'https://my-resource.openai.azure.com',
		],
	])(
		'resolves the proxy against the Azure host it dials (%s)',
		async (_, authentication, credential, expectedUrl) => {
			const ctx = setupMockContext(authentication, credential);

			await new LmChatAzureOpenAi().supplyData.call(ctx, 0);

			expect(vi.mocked(getProxyAgent)).toHaveBeenCalledWith(
				expectedUrl,
				expect.any(Object),
				expect.any(Object),
			);
		},
	);
});
