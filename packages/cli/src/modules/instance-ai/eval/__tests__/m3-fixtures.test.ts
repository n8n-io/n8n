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

const mockLogger = {
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
} as never;

/**
 * Integration-shaped unit test exercising credential rewrite + path-based
 * root attribution + envelope correctness end-to-end. Boots a real
 * `LlmWireServer` on a loopback port, instantiates a real
 * `EvalMockedCredentialsHelper`, scripts mock-handler responses turn-by-turn,
 * and drives the Agent loop with raw `fetch`. Envelope shape is locked down
 * separately in `llm-wire-server.test.ts` and `openai-envelope.test.ts`.
 *
 *  - **Mechanism** — tool IS connected. Asserts the ledger ends with model
 *    turns attributed to the Agent root and tool HTTP attributed to the tool
 *    node, with no cross-contamination.
 *  - **Regression-catch** — tool is disconnected. With un-pinning the eval
 *    must fail because the Agent's mocked output can't produce the tool-
 *    shaped result the grader expects. A counterfactual passes when the
 *    tool IS connected, proving the check is meaningful.
 */
describe('M3 fixtures — Agent + Chat Model + HTTP tool + MemoryBufferWindow', () => {
	const llmSubNode: INode = {
		id: 'sub-1',
		name: 'OpenAI Chat Model',
		type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
		typeVersion: 1,
		position: [0, 0],
		parameters: { model: 'gpt-4o-mini' },
	};
	const toolNode: INode = {
		id: 'tool-1',
		name: 'Get Order Status Tool',
		type: 'n8n-nodes-base.httpRequestTool',
		typeVersion: 1,
		position: [200, 0],
		parameters: { url: 'https://orders.example.com/v1/orders/{{ $fromAI("orderId") }}' },
	};
	const rootName = 'Agent';

	function makeInnerHelper(credentials: ICredentialDataDecryptedObject): ICredentialsHelper {
		return {
			getParentTypes: vi.fn().mockReturnValue([]),
			authenticate: vi.fn(),
			preAuthentication: vi.fn(),
			runPreAuthentication: vi.fn(),
			getCredentials: vi.fn(),
			getDecrypted: vi.fn().mockResolvedValue(credentials),
			updateCredentials: vi.fn(),
			updateCredentialsOauthTokenData: vi.fn(),
			getCredentialsProperties: vi.fn().mockReturnValue([]),
			isCredentialUsableByNode: vi.fn().mockReturnValue(true),
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
		const response = await fetch(`${baseUrl}/chat/completions`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody),
		});
		const body = (await response.json()) as Record<string, unknown>;
		expect(baseUrl.startsWith(serverBaseUrl)).toBe(true);
		return { rewrittenUrl: baseUrl, response, body };
	}

	/**
	 * Build the eval-side glue that the M3 fixture exercises:
	 *   - real LlmWireServer with a programmable mockHandler
	 *   - real EvalMockedCredentialsHelper wired to the rewrite map
	 *   - ledger accumulators for both model turns and tool HTTP
	 *
	 * The model-turn ledger mirrors what `execution.service.ts`'s
	 * `recordWireServerTurn` writes; the tool-HTTP ledger mirrors what its
	 * `createInterceptingHandler` writes. The split between the two is
	 * what the M3 mechanism fixture proves.
	 */
	async function bootM3Harness() {
		const modelTurns: InterceptedTurn[] = [];
		const toolHttpCalls: Array<{ nodeName: string; url: string; mockResponse: unknown }> = [];

		// Programmable mock handler — the M3 mechanism case feeds it a
		// scripted sequence of returns, one per call. The value/regression
		// case feeds it a single "plain content" return that lacks the
		// tool-shaped output the grader looks for.
		const scriptedResponses: EvalMockHttpResponse[] = [];
		const mockHandler = vi
			.fn<(...args: Parameters<EvalLlmMockHandler>) => Promise<EvalMockHttpResponse>>()
			.mockImplementation(async () => {
				const next = scriptedResponses.shift();
				if (!next) {
					throw new Error(
						'M3 fixture mock handler ran out of scripted responses — fixture script is wrong',
					);
				}
				return next;
			});

		const wireServer = new LlmWireServer({
			logger: mockLogger,
			mockHandler,
			rootToSubNode: new Map([[rootName, llmSubNode]]),
			onIntercept: (t) => modelTurns.push(t),
		});
		await wireServer.start();

		const helper = new EvalMockedCredentialsHelper(
			makeInnerHelper({ apiKey: 'sk-real', url: 'https://api.openai.com/v1' }),
			wireServer.url,
			mockLogger,
			new Map([[llmSubNode.name, rootName]]),
		);

		// Mirror of `execution.service.ts:createInterceptingHandler` for the
		// tool side — captures HTTP attributed to the tool's node identity.
		const toolHttpInterceptor = async (
			request: IHttpRequestOptions,
			node: INode,
		): Promise<EvalMockHttpResponse> => {
			const mockResponse: EvalMockHttpResponse = {
				body: {
					orderId: 'ORD-42',
					status: 'shipped',
					eta: '2026-05-25T00:00:00Z',
				},
				headers: { 'content-type': 'application/json' },
				statusCode: 200,
			};
			toolHttpCalls.push({
				nodeName: node.name,
				url: request.url,
				mockResponse: mockResponse.body,
			});
			return mockResponse;
		};

		return {
			wireServer,
			helper,
			scriptedResponses,
			modelTurns,
			toolHttpCalls,
			toolHttpInterceptor,
			mockHandler,
		};
	}

	// ── M3 mechanism ────────────────────────────────────────────────────

	describe('mechanism (tool connected to Agent)', () => {
		it('drives a full Agent loop: tool_calls turn → tool HTTP → follow-up turn → final answer', async () => {
			const harness = await bootM3Harness();
			try {
				// Turn 1: Agent posts with tools array; wire server's mock handler
				// returns a tool_calls envelope.
				harness.scriptedResponses.push({
					body: {
						tool_calls: [
							{
								id: 'call_1',
								function: { name: 'get_order_status', arguments: '{"orderId":"ORD-42"}' },
							},
						],
					},
					headers: { 'content-type': 'application/json' },
					statusCode: 200,
				});
				// Turn 2: Agent re-posts with the tool result; mock returns the
				// final natural-language answer.
				harness.scriptedResponses.push({
					body: {
						content: 'Your order ORD-42 has shipped and arrives 2026-05-25.',
					},
					headers: { 'content-type': 'application/json' },
					statusCode: 200,
				});

				const turn1 = await postViaRewrittenCredentials(
					harness.helper,
					harness.wireServer.url,
					{
						model: 'gpt-4o-mini',
						messages: [{ role: 'user', content: 'Where is my order ORD-42?' }],
						tools: [
							{
								type: 'function',
								function: {
									name: 'get_order_status',
									description: 'Look up an order by id',
									parameters: { type: 'object' },
								},
							},
						],
					},
					llmSubNode.name,
				);

				const choice1 = (
					turn1.body.choices as Array<{
						message: {
							content: string | null;
							tool_calls?: Array<{
								id: string;
								function: { name: string; arguments: string };
							}>;
						};
						finish_reason: string;
					}>
				)[0];
				expect(choice1.finish_reason).toBe('tool_calls');
				expect(choice1.message.tool_calls?.[0].function.name).toBe('get_order_status');
				const toolCallArgs = JSON.parse(choice1.message.tool_calls?.[0].function.arguments ?? '{}');
				expect(toolCallArgs).toEqual({ orderId: 'ORD-42' });

				// Tool runs — `helpers.httpRequest` interception fires. The
				// nodeType is the tool's `httpRequestTool`, not the Agent.
				const toolResult = await harness.toolHttpInterceptor(
					{
						url: `https://orders.example.com/v1/orders/${toolCallArgs.orderId}`,
						method: 'GET',
					},
					toolNode,
				);

				// Turn 2: Agent threads the tool result back into messages and
				// asks the model for a final answer. This mirrors what
				// `AgentExecutor` does between tool calls and final response.
				const turn2 = await postViaRewrittenCredentials(
					harness.helper,
					harness.wireServer.url,
					{
						model: 'gpt-4o-mini',
						messages: [
							{ role: 'user', content: 'Where is my order ORD-42?' },
							{
								role: 'assistant',
								content: null,
								tool_calls: choice1.message.tool_calls,
							},
							{
								role: 'tool',
								tool_call_id: 'call_1',
								content: JSON.stringify(toolResult.body),
							},
						],
					},
					llmSubNode.name,
				);

				const choice2 = (
					turn2.body.choices as Array<{
						message: { content: string | null };
						finish_reason: string;
					}>
				)[0];
				expect(choice2.finish_reason).toBe('stop');
				expect(choice2.message.content).toContain('ORD-42');
				expect(choice2.message.content).toContain('shipped');

				// Ledger assertions — the headline M3 split.
				expect(harness.modelTurns).toHaveLength(2);
				expect(harness.modelTurns.every((t) => t.rootName === rootName)).toBe(true);
				expect(harness.modelTurns.every((t) => t.nodeType === llmSubNode.type)).toBe(true);

				expect(harness.toolHttpCalls).toHaveLength(1);
				expect(harness.toolHttpCalls[0].nodeName).toBe(toolNode.name);
				expect(harness.toolHttpCalls[0].url).toContain('orders.example.com');

				// Cross-check: tool HTTP didn't leak into model-turn attribution.
				const modelUrls = harness.modelTurns.map((t) => t.url);
				expect(modelUrls.every((u) => u.includes('api.openai.com'))).toBe(true);
			} finally {
				await harness.wireServer.stop();
			}
		});

		it('passes the connected tools array through to the mock handler', async () => {
			// Tool-list awareness: the mock handler must see the request `tools`
			// array so it can emit a realistic tool_calls block. This is the
			// "hard-coded tool-list awareness in the wire-server prompt"
			// behaviour from the spec — the wire server just passes the inbound
			// body through, and the handler reads it from `req.body.tools`.
			const harness = await bootM3Harness();
			try {
				harness.scriptedResponses.push({
					body: { content: 'ok' },
					headers: {},
					statusCode: 200,
				});

				await postViaRewrittenCredentials(
					harness.helper,
					harness.wireServer.url,
					{
						model: 'gpt-4o-mini',
						messages: [{ role: 'user', content: 'hi' }],
						tools: [
							{
								type: 'function',
								function: { name: 'get_order_status', parameters: { type: 'object' } },
							},
						],
					},
					llmSubNode.name,
				);

				expect(harness.mockHandler).toHaveBeenCalledTimes(1);
				const [requestOptions] = harness.mockHandler.mock.calls[0];
				const body = requestOptions.body as {
					tools?: Array<{ function: { name: string } }>;
				};
				expect(body.tools).toBeDefined();
				expect(body.tools?.[0].function.name).toBe('get_order_status');
			} finally {
				await harness.wireServer.stop();
			}
		});
	});

	// ── M3 value (regression-catch fixture) ─────────────────────────────

	describe('value / regression-catch (tool disconnected from Agent)', () => {
		// Substring grader — a deliberately lightweight stand-in for whatever
		// the real eval grader does downstream. It looks for `ORD-42` AND
		// `shipped` in the final answer; both substrings together can only
		// appear when the Agent (a) saw the user's order id AND (b) saw the
		// tool's HTTP response (`{ status: 'shipped' }`). Plain-text content
		// without the tool result fails. The substring shape is intentionally
		// simple — a more structural schema check would be a Tier 5 follow-up
		// (`MockHints.toolHints` quality work); the contract this fixture
		// proves is "the spike makes the grader fail when pinning would have
		// hidden the regression", not "this is a production-grade grader".
		function graderCheck(finalAnswer: unknown): { passed: boolean; reason?: string } {
			if (typeof finalAnswer !== 'string') {
				return { passed: false, reason: 'final answer was not a string' };
			}
			const hasOrderId = finalAnswer.includes('ORD-42');
			const hasShipped = finalAnswer.toLowerCase().includes('shipped');
			if (hasOrderId && hasShipped) return { passed: true };
			return {
				passed: false,
				reason: `grader expected order id + status substrings; got: ${JSON.stringify(finalAnswer)}`,
			};
		}

		it('the grader fails when the Agent has no tool connection — only the spike catches this', async () => {
			const harness = await bootM3Harness();
			try {
				// Mock handler returns plain content WITHOUT a tool_calls block
				// (because the disconnected workflow has no tools to call).
				// The Agent gives up and emits an apology — the grader sees
				// none of the tool-derived fields and reports failure.
				harness.scriptedResponses.push({
					body: {
						content: "I'd love to help, but I don't have an order-lookup tool available right now.",
					},
					headers: { 'content-type': 'application/json' },
					statusCode: 200,
				});

				const turn = await postViaRewrittenCredentials(
					harness.helper,
					harness.wireServer.url,
					{
						model: 'gpt-4o-mini',
						messages: [{ role: 'user', content: 'Where is my order ORD-42?' }],
						// IMPORTANT: no `tools` array — the tool is disconnected.
					},
					llmSubNode.name,
				);

				const choice = (
					turn.body.choices as Array<{ message: { content: string }; finish_reason: string }>
				)[0];
				expect(choice.finish_reason).toBe('stop');

				const verdict = graderCheck(choice.message.content);
				// This is the M3 value assertion — pinning today would pass;
				// the spike must fail because the Agent's mocked output can't
				// produce the substrings the grader expects (which only
				// appear once the tool's HTTP response threads back through
				// turn 2 — see the counterfactual test below).
				expect(verdict.passed).toBe(false);
				expect(verdict.reason).toContain('order id + status');

				// No tool HTTP fired — confirms the tool was actually disconnected.
				expect(harness.toolHttpCalls).toHaveLength(0);

				// Model turn ran (this is the headline behavioural delta vs.
				// today's pinned path, where no model turn would fire at all).
				expect(harness.modelTurns).toHaveLength(1);
			} finally {
				await harness.wireServer.stop();
			}
		});

		// Counterfactual: the same grader passes for the connected fixture.
		// Without this assertion, the regression-catch could be a false
		// negative (a perpetually-failing grader proves nothing).
		it('the grader passes when the tool IS connected — confirms the check is meaningful', async () => {
			const harness = await bootM3Harness();
			try {
				harness.scriptedResponses.push({
					body: {
						tool_calls: [
							{
								id: 'call_1',
								function: { name: 'get_order_status', arguments: '{"orderId":"ORD-42"}' },
							},
						],
					},
					headers: { 'content-type': 'application/json' },
					statusCode: 200,
				});
				harness.scriptedResponses.push({
					body: { content: 'Your order ORD-42 has shipped — eta 2026-05-25.' },
					headers: { 'content-type': 'application/json' },
					statusCode: 200,
				});

				// Turn 1.
				const turn1 = await postViaRewrittenCredentials(
					harness.helper,
					harness.wireServer.url,
					{
						model: 'gpt-4o-mini',
						messages: [{ role: 'user', content: 'Where is my order ORD-42?' }],
						tools: [
							{
								type: 'function',
								function: { name: 'get_order_status', parameters: { type: 'object' } },
							},
						],
					},
					llmSubNode.name,
				);

				const choice1 = (
					turn1.body.choices as Array<{
						message: { tool_calls?: Array<{ id: string }> };
					}>
				)[0];
				await harness.toolHttpInterceptor(
					{ url: 'https://orders.example.com/v1/orders/ORD-42', method: 'GET' },
					toolNode,
				);

				// Turn 2.
				const turn2 = await postViaRewrittenCredentials(
					harness.helper,
					harness.wireServer.url,
					{
						model: 'gpt-4o-mini',
						messages: [
							{ role: 'user', content: 'Where is my order ORD-42?' },
							{
								role: 'assistant',
								content: null,
								tool_calls: choice1.message.tool_calls,
							},
							{ role: 'tool', tool_call_id: 'call_1', content: '{"status":"shipped"}' },
						],
					},
					llmSubNode.name,
				);

				const choice2 = (turn2.body.choices as Array<{ message: { content: string } }>)[0];

				expect(graderCheck(choice2.message.content).passed).toBe(true);
			} finally {
				await harness.wireServer.stop();
			}
		});
	});
});
