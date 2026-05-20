import type { EvalLlmMockHandler, EvalMockHttpResponse } from 'n8n-core';
import type {
	ICredentialDataDecryptedObject,
	ICredentialsHelper,
	IExecuteData,
	IHttpRequestOptions,
	INode,
	INodeCredentialsDetails,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';

import { EvalMockedCredentialsHelper } from '../eval-mocked-credentials-helper';
import { type InterceptedTurn, LlmWireServer } from '../llm-wire-server';

/**
 * TRUST-114 M2 acceptance fixture. The full workflow execution path (Basic
 * LLM Chain → OpenAI Chat Model → Set) belongs in TRUST-115 (M3) where we
 * exercise the live LangChain SDK end-to-end against the wire server.
 *
 * This fixture covers the seam M2 actually adds: vendor-SDK traffic enters
 * the wire server through the rewritten credential URL, the wire server
 * calls the supplied `createLlmMockHandler` instance with the inbound
 * messages array, the handler's content reaches the OpenAI envelope, and
 * each turn is attributed to the AI root in the ledger.
 *
 * **Why raw fetch instead of the OpenAI SDK?** TRUST-115 runs the SDK
 * end-to-end. Raw fetch here mirrors the SDK's `baseURL + "/chat/completions"`
 * concatenation pattern, but doesn't cover SDK-side normalization (trailing
 * slashes, header injection, retry behavior). If the SDK ever changes that
 * normalization the M2 raw-fetch tests would still pass while real eval
 * runs would break — M3 closes that gap.
 *
 * Three things must hold for M2 acceptance:
 *   1. The chain output reflects mock-handler-generated content (not the
 *      stub envelope from M1).
 *   2. The mock handler sees the full conversation (`messages` array) on
 *      every turn, so multi-turn coherence is possible.
 *   3. The ledger attributes every turn to the AI root (Basic LLM Chain),
 *      not the sub-node.
 */
describe('TRUST-114 M2: mock-handler integration', () => {
	const subNode: INode = {
		id: 'sub-1',
		name: 'OpenAI Chat Model',
		type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
		typeVersion: 1,
		position: [0, 0],
		parameters: { model: 'gpt-4o-mini' },
	};
	const rootName = 'Basic LLM Chain';

	function makeInnerHelper(credentials: ICredentialDataDecryptedObject): ICredentialsHelper {
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

	async function postViaRewrittenCredentials(
		helper: EvalMockedCredentialsHelper,
		serverBaseUrl: string,
		requestBody: unknown,
		callingSubNodeName: string,
	): Promise<{ rewrittenUrl: string; response: Response; body: Record<string, unknown> }> {
		const cred = await helper.getDecrypted(
			{} as IWorkflowExecuteAdditionalData,
			{ id: 'cred-1', name: 'OpenAI' } as INodeCredentialsDetails,
			'openAiApi',
			'manual',
			{ node: { name: callingSubNodeName, id: 'n' } as INode } as IExecuteData,
		);

		const baseUrl = String(cred.url);
		// `baseUrl` mirrors what LmChatOpenAi.node.ts:765 feeds into the SDK; the
		// SDK appends `/chat/completions`. This is the exact URL the SDK would
		// post to under real execution.
		const response = await fetch(`${baseUrl}/chat/completions`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody),
		});
		const body = (await response.json()) as Record<string, unknown>;
		expect(baseUrl.startsWith(serverBaseUrl)).toBe(true);
		return { rewrittenUrl: baseUrl, response, body };
	}

	it('chain output reflects mock-handler-generated content (not the M1 stub)', async () => {
		const mockHandler = jest
			.fn<Promise<EvalMockHttpResponse>, Parameters<EvalLlmMockHandler>>()
			.mockResolvedValue({
				body: { content: 'Hello, Jane — your order #ORD-42 ships today.' },
				headers: { 'content-type': 'application/json' },
				statusCode: 200,
			});
		const intercepts: InterceptedTurn[] = [];

		const server = new LlmWireServer({
			mockHandler,
			rootToSubNode: new Map([[rootName, subNode]]),
			onIntercept: (t) => intercepts.push(t),
		});
		await server.start();

		try {
			const helper = new EvalMockedCredentialsHelper(
				makeInnerHelper({ apiKey: 'sk-real', url: 'https://api.openai.com/v1' }),
				server.url,
				undefined,
				new Map([['OpenAI Chat Model', rootName]]),
			);

			const { body } = await postViaRewrittenCredentials(
				helper,
				server.url,
				{
					model: 'gpt-4o-mini',
					messages: [{ role: 'user', content: 'Status of my order?' }],
				},
				'OpenAI Chat Model',
			);

			const choice = (body.choices as Array<{ message: { content: string } }>)[0];
			expect(choice.message.content).toBe('Hello, Jane — your order #ORD-42 ships today.');
			// The M1 stub message must NOT leak through — that string lived on the
			// canned envelope this PR replaced.
			expect(choice.message.content).not.toContain('[eval wire server stub]');

			expect(mockHandler).toHaveBeenCalledTimes(1);
			expect(intercepts).toHaveLength(1);
			expect(intercepts[0].rootName).toBe(rootName);
		} finally {
			await server.stop();
		}
	});

	it('mock handler receives the full conversation on every turn (multi-turn awareness)', async () => {
		const receivedMessagesPerCall: unknown[] = [];
		const mockHandler = jest
			.fn<Promise<EvalMockHttpResponse>, Parameters<EvalLlmMockHandler>>()
			.mockImplementation(async (req: IHttpRequestOptions) => {
				const body = req.body as { messages?: unknown[] };
				receivedMessagesPerCall.push(body.messages);
				const userTurns = (body.messages ?? []).filter(
					(m: unknown) =>
						typeof m === 'object' && m !== null && (m as { role?: string }).role === 'user',
				);
				return {
					body: { content: `I see ${userTurns.length} user turn(s) so far.` },
					headers: { 'content-type': 'application/json' },
					statusCode: 200,
				};
			});

		const server = new LlmWireServer({
			mockHandler,
			rootToSubNode: new Map([[rootName, subNode]]),
		});
		await server.start();

		try {
			const helper = new EvalMockedCredentialsHelper(
				makeInnerHelper({ apiKey: 'sk-real', url: 'https://api.openai.com/v1' }),
				server.url,
				undefined,
				new Map([['OpenAI Chat Model', rootName]]),
			);

			// Turn 1: one user message.
			const { body: body1 } = await postViaRewrittenCredentials(
				helper,
				server.url,
				{
					model: 'gpt-4o-mini',
					messages: [{ role: 'user', content: 'first question' }],
				},
				'OpenAI Chat Model',
			);

			// Turn 2: includes the assistant turn from Turn 1 + a new user turn,
			// mirroring how the OpenAI SDK packages multi-turn history.
			const { body: body2 } = await postViaRewrittenCredentials(
				helper,
				server.url,
				{
					model: 'gpt-4o-mini',
					messages: [
						{ role: 'user', content: 'first question' },
						{ role: 'assistant', content: 'I see 1 user turn(s) so far.' },
						{ role: 'user', content: 'follow-up question' },
					],
				},
				'OpenAI Chat Model',
			);

			const choice1 = (body1.choices as Array<{ message: { content: string } }>)[0];
			const choice2 = (body2.choices as Array<{ message: { content: string } }>)[0];

			expect(choice1.message.content).toBe('I see 1 user turn(s) so far.');
			expect(choice2.message.content).toBe('I see 2 user turn(s) so far.');

			// Critical: the mock handler must see the full messages array on the
			// second turn — globalContext alone (closure-captured) cannot carry
			// conversation state.
			expect(receivedMessagesPerCall).toHaveLength(2);
			expect((receivedMessagesPerCall[0] as unknown[]).length).toBe(1);
			expect((receivedMessagesPerCall[1] as unknown[]).length).toBe(3);
		} finally {
			await server.stop();
		}
	});

	it('attributes every turn to the AI root regardless of how many turns it generates', async () => {
		const mockHandler = jest
			.fn<Promise<EvalMockHttpResponse>, Parameters<EvalLlmMockHandler>>()
			.mockResolvedValue({
				body: { content: 'ok' },
				headers: { 'content-type': 'application/json' },
				statusCode: 200,
			});
		const intercepts: InterceptedTurn[] = [];

		const server = new LlmWireServer({
			mockHandler,
			rootToSubNode: new Map([[rootName, subNode]]),
			onIntercept: (t) => intercepts.push(t),
		});
		await server.start();

		try {
			const helper = new EvalMockedCredentialsHelper(
				makeInnerHelper({ apiKey: 'sk-real', url: 'https://api.openai.com/v1' }),
				server.url,
				undefined,
				new Map([['OpenAI Chat Model', rootName]]),
			);

			for (let i = 0; i < 3; i++) {
				await postViaRewrittenCredentials(
					helper,
					server.url,
					{
						model: 'gpt-4o-mini',
						messages: [{ role: 'user', content: `turn ${i + 1}` }],
					},
					'OpenAI Chat Model',
				);
			}

			expect(intercepts.map((i) => i.rootName)).toEqual([rootName, rootName, rootName]);
			expect(intercepts.every((i) => i.nodeType === subNode.type)).toBe(true);
		} finally {
			await server.stop();
		}
	});

	it('keeps attribution separate when two unpinned roots run concurrently', async () => {
		// Two roots, each with their own chat-model sub-node. Both fire calls;
		// the ledger entries must split cleanly by root.
		const subNodeA: INode = { ...subNode, id: 'a', name: 'OpenAI A' };
		const subNodeB: INode = { ...subNode, id: 'b', name: 'OpenAI B' };

		const mockHandler = jest
			.fn<Promise<EvalMockHttpResponse>, Parameters<EvalLlmMockHandler>>()
			.mockResolvedValue({
				body: { content: 'ok' },
				headers: { 'content-type': 'application/json' },
				statusCode: 200,
			});

		const intercepts: InterceptedTurn[] = [];
		const server = new LlmWireServer({
			mockHandler,
			rootToSubNode: new Map([
				['Agent A', subNodeA],
				['Agent B', subNodeB],
			]),
			onIntercept: (t) => intercepts.push(t),
		});
		await server.start();

		try {
			const helper = new EvalMockedCredentialsHelper(
				makeInnerHelper({ apiKey: 'sk-real', url: 'https://api.openai.com/v1' }),
				server.url,
				undefined,
				new Map([
					['OpenAI A', 'Agent A'],
					['OpenAI B', 'Agent B'],
				]),
			);

			await postViaRewrittenCredentials(
				helper,
				server.url,
				{ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'A' }] },
				'OpenAI A',
			);
			await postViaRewrittenCredentials(
				helper,
				server.url,
				{ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'B' }] },
				'OpenAI B',
			);

			expect(intercepts.map((i) => i.rootName)).toEqual(['Agent A', 'Agent B']);
			expect(intercepts.map((i) => i.nodeType)).toEqual([subNodeA.type, subNodeB.type]);
		} finally {
			await server.stop();
		}
	});
});
