import type {
	ICredentialDataDecryptedObject,
	ICredentialsHelper,
	IExecuteData,
	INode,
	INodeCredentialsDetails,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';

import { EvalMockedCredentialsHelper } from '../eval-mocked-credentials-helper';
import { LlmWireServer } from '../llm-wire-server';

// End-to-end: boot wire server, rewrite openAiApi.url to /eval/<root>/v1,
// POST to the rewritten URL, verify root-token attribution + envelope shape.
describe('Credential rewrite + wire server round-trip with root token', () => {
	let server: LlmWireServer;
	const subNode: INode = {
		id: 'sub-node-1',
		name: 'OpenAI Chat Model',
		type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	beforeEach(async () => {
		server = new LlmWireServer({
			rootToSubNode: new Map([['LLM Chain', subNode]]),
		});
		await server.start();
	});

	afterEach(async () => {
		await server.stop();
	});

	function makeInner(credentials: ICredentialDataDecryptedObject): ICredentialsHelper {
		return {
			getParentTypes: jest.fn().mockReturnValue([]),
			authenticate: jest.fn(),
			preAuthentication: jest.fn(),
			runPreAuthentication: jest.fn(),
			getCredentials: jest.fn(),
			getDecrypted: jest.fn().mockResolvedValue(credentials),
			updateCredentials: jest.fn(),
			updateCredentialsOauthTokenData: jest.fn(),
			getCredentialsProperties: jest.fn().mockReturnValue([]),
		} as ICredentialsHelper;
	}

	it('rewrites the openAiApi base URL to include the root token', async () => {
		const realCreds: ICredentialDataDecryptedObject = {
			apiKey: 'sk-real-secret',
			url: 'https://api.openai.com/v1',
		};
		const subNodeToRoot = new Map([['OpenAI Chat Model', 'LLM Chain']]);
		const helper = new EvalMockedCredentialsHelper(
			makeInner(realCreds),
			server.url,
			undefined,
			subNodeToRoot,
		);
		const nodeCreds: INodeCredentialsDetails = { id: 'cred-1', name: 'OpenAI' };

		const result = await helper.getDecrypted(
			{} as IWorkflowExecuteAdditionalData,
			nodeCreds,
			'openAiApi',
			'manual',
			{ node: { name: 'OpenAI Chat Model', id: 'node-1' } as INode } as IExecuteData,
		);

		expect(result.url).toBe(`${server.url}/eval/LLM%20Chain/v1`);
		expect(result.apiKey).toBe('sk-real-secret');
		expect(helper.rewrittenCredentials).toEqual([
			{
				nodeName: 'OpenAI Chat Model',
				credentialType: 'openAiApi',
				credentialId: 'cred-1',
				field: 'url',
			},
		]);
	});

	it('mirrors the OpenAI SDK baseURL contract — appending /chat/completions reaches the wire server', async () => {
		const realCreds: ICredentialDataDecryptedObject = {
			apiKey: 'sk-real-secret',
			url: 'https://api.openai.com/v1',
		};
		const subNodeToRoot = new Map([['OpenAI Chat Model', 'LLM Chain']]);
		const helper = new EvalMockedCredentialsHelper(
			makeInner(realCreds),
			server.url,
			undefined,
			subNodeToRoot,
		);
		const nodeCreds: INodeCredentialsDetails = { id: 'cred-1', name: 'OpenAI' };

		const rewritten = await helper.getDecrypted(
			{} as IWorkflowExecuteAdditionalData,
			nodeCreds,
			'openAiApi',
			'manual',
			{ node: { name: 'OpenAI Chat Model', id: 'node-1' } as INode } as IExecuteData,
		);

		// Mirror the LangChain OpenAI node behaviour: `credentials.url` becomes
		// the SDK's `baseURL` verbatim (LmChatOpenAi.node.ts:765), and the SDK
		// appends `/chat/completions`. So this is the exact URL the SDK would
		// post to — if the rewrite dropped `/v1` the SDK would 404, and if it
		// dropped `/eval/<root>/` the wire server's unrouted handler would
		// return a 500 explaining the misconfiguration.
		const baseUrl = String(rewritten.url);
		const response = await fetch(`${baseUrl}/chat/completions`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: 'gpt-4o-mini',
				messages: [{ role: 'user', content: 'roundtrip check' }],
			}),
		});
		const body = (await response.json()) as {
			object: string;
			model: string;
			choices: Array<{ message: { role: string; content: string }; finish_reason: string }>;
		};

		expect(response.status).toBe(200);
		expect(body.object).toBe('chat.completion');
		expect(body.choices[0].message.role).toBe('assistant');
	});

	it('leaves the URL alone for credential types not in the provider map', async () => {
		const realCreds: ICredentialDataDecryptedObject = { accessToken: 'real-token' };
		const subNodeToRoot = new Map([['OpenAI Chat Model', 'LLM Chain']]);
		const helper = new EvalMockedCredentialsHelper(
			makeInner(realCreds),
			server.url,
			undefined,
			subNodeToRoot,
		);

		const result = await helper.getDecrypted(
			{} as IWorkflowExecuteAdditionalData,
			{ id: 'cred-2', name: 'Telegram' },
			'telegramApi',
			'manual',
		);

		expect(result).toEqual({ accessToken: 'real-token' });
		expect(helper.rewrittenCredentials).toEqual([]);
	});
});
