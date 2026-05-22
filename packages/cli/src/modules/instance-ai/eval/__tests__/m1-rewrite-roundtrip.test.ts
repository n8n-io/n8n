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

/**
 * M1 acceptance fixture (mechanism). Proves end-to-end that:
 *   1. `LlmWireServer` boots on a real loopback port.
 *   2. `EvalMockedCredentialsHelper` rewrites the resolved `openAiApi`
 *      credential's `url` field to that exact URL.
 *   3. A POST against the rewritten URL hits the live server and gets back a
 *      well-formed OpenAI chat-completion envelope.
 *
 * The full LangChain SDK round-trip (vendor SDK as the caller, not raw fetch)
 * lands in TRUST-115's M3 fixture — see the master spec.
 */
describe('TRUST-113 M1: helper + wire server end-to-end rewrite', () => {
	let server: LlmWireServer;

	beforeEach(async () => {
		server = new LlmWireServer();
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

	it('rewrites the openAiApi base URL to the wire server with the /v1 path', async () => {
		const realCreds: ICredentialDataDecryptedObject = {
			apiKey: 'sk-real-secret',
			url: 'https://api.openai.com/v1',
		};
		const helper = new EvalMockedCredentialsHelper(makeInner(realCreds), server.url);
		const nodeCreds: INodeCredentialsDetails = { id: 'cred-1', name: 'OpenAI' };

		const result = await helper.getDecrypted(
			{} as IWorkflowExecuteAdditionalData,
			nodeCreds,
			'openAiApi',
			'manual',
			{ node: { name: 'OpenAI Chat Model', id: 'node-1' } as INode } as IExecuteData,
		);

		expect(result.url).toBe(`${server.url}/v1`);
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
		const helper = new EvalMockedCredentialsHelper(makeInner(realCreds), server.url);
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
		// post to — if the rewrite were missing `/v1`, this would 404.
		const baseUrl = String(rewritten.url);
		const response = await fetch(`${baseUrl}/chat/completions`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: 'gpt-4o-mini',
				messages: [{ role: 'user', content: 'M1 mechanism check' }],
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
		const helper = new EvalMockedCredentialsHelper(makeInner(realCreds), server.url);

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
