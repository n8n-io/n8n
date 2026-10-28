import { OutboundHttp, type HttpRequestClient } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import type { INode, INodeType, IWorkflowExecuteAdditionalData, Workflow } from 'n8n-workflow';
import { Readable } from 'node:stream';
import { text } from 'node:stream/consumers';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { LlmResponseInspector, LlmUsageHooks } from '@/execution-engine/llm-usage-context';

import { getRequestHelperFunctions } from '../factory';
import { withLlmUsageCapture } from '../llm-usage-capture';

describe('withLlmUsageCapture', () => {
	const node = mock<INode>({
		name: 'HTTP Request',
		type: 'n8n-nodes-base.httpRequest',
		credentials: { openAiApi: { id: '1', name: 'OpenAI' } },
	});
	const workflowWithOutputs = (outputs: unknown, resolvedOutputs: unknown = outputs) =>
		mock<Workflow>({
			id: 'wf-1',
			nodeTypes: {
				getByNameAndVersion: vi.fn(() => mock<INodeType>({ description: { outputs } as never })),
			},
			expression: { getSimpleParameterValue: () => resolvedOutputs as never },
		});
	const workflow = workflowWithOutputs(['main']);
	const requestBody = { model: 'gpt-x', messages: [] };

	let inspector: LlmResponseInspector;
	let inspectRequest: NonNullable<LlmUsageHooks['inspectRequest']>;
	let additionalData: IWorkflowExecuteAdditionalData;

	beforeEach(() => {
		inspector = { onResponse: vi.fn(), onStreamChunk: vi.fn(), onStreamEnd: vi.fn() };
		inspectRequest = vi.fn().mockReturnValue(inspector);
		additionalData = mock<IWorkflowExecuteAdditionalData>({
			executionId: 'exec-1',
			rootExecutionMode: undefined,
			// Workers do not set it, so the user comes from the run data.
			userId: undefined,
			evalLlmMockHandler: undefined,
			otel: undefined,
			'llm-usage': { inspectRequest },
		});
	});

	it('sends the request unchanged without the llm-usage hook', async () => {
		const result = await withLlmUsageCapture(
			{ workflow, node, additionalData: mock<IWorkflowExecuteAdditionalData>() },
			requestBody,
			async () => 'response',
		);

		expect(result).toBe('response');
	});

	it('passes a parsed response to the inspector, with the node context of the run', async () => {
		const body = { usage: { prompt_tokens: 1 } };

		await withLlmUsageCapture(
			{
				workflow,
				node,
				additionalData,
				llmUsageRun: {
					mode: 'manual',
					runExecutionData: { manualData: { userId: 'user-1' } } as never,
				},
			},
			requestBody,
			async () => body,
		);

		expect(inspectRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				context: expect.objectContaining({
					callerType: 'node',
					workflowId: 'wf-1',
					nodeName: 'HTTP Request',
					executionMode: 'manual',
					userId: 'user-1',
				}),
				credentialTypes: ['openAiApi'],
				requestBody,
			}),
		);
		// By reference: the mocked node answers the matcher lookups of a deep comparison.
		expect(vi.mocked(inspectRequest).mock.calls[0][0].credentials).toBe(node.credentials);
		expect(inspector.onResponse).toHaveBeenCalledWith(body);
	});

	it('passes the credential type that the helper authenticates with', async () => {
		await withLlmUsageCapture(
			{ workflow, node, additionalData, credentialType: 'openAiApi' },
			requestBody,
			async () => ({ usage: { prompt_tokens: 1 } }),
		);

		expect(inspectRequest).toHaveBeenCalledWith(
			expect.objectContaining({ credentialType: 'openAiApi' }),
		);
	});

	it('passes the body of a full response to the inspector', async () => {
		const body = { usage: { prompt_tokens: 1 } };

		await withLlmUsageCapture({ workflow, node, additionalData }, requestBody, async () => ({
			body,
			headers: {},
			statusCode: 200,
		}));

		expect(inspector.onResponse).toHaveBeenCalledWith(body);
	});

	it('hands each chunk of a streamed body to the inspector and keeps the content intact', async () => {
		const response = await withLlmUsageCapture(
			{ workflow, node, additionalData },
			requestBody,
			async () => ({
				body: Readable.from([Buffer.from('data: a\n'), Buffer.from('data: b\n')]),
				headers: { 'content-type': 'text/event-stream; charset=utf-8' },
				statusCode: 200,
			}),
		);

		expect(await text(response.body)).toBe('data: a\ndata: b\n');
		expect(inspector.onStreamChunk).toHaveBeenCalledTimes(2);
		expect(inspector.onStreamEnd).toHaveBeenCalledTimes(1);
	});

	it('leaves a stream that cannot carry usage, such as audio, as it is', async () => {
		const body = Readable.from([Buffer.from('audio')]);

		const response = await withLlmUsageCapture(
			{ workflow, node, additionalData },
			requestBody,
			async () => ({ body, headers: { 'content-type': 'audio/mpeg' }, statusCode: 200 }),
		);

		expect(response.body).toBe(body);
		expect(inspector.onStreamChunk).not.toHaveBeenCalled();
	});

	it('skips nodes that output a language model, because LangChain reports them', async () => {
		await withLlmUsageCapture(
			{ workflow: workflowWithOutputs(['ai_languageModel']), node, additionalData },
			requestBody,
			async () => ({}),
		);

		expect(inspector.onResponse).not.toHaveBeenCalled();
	});

	it('resolves the node outputs only for a request that looks like an LLM call', async () => {
		const workflow = workflowWithOutputs(['main']);
		vi.mocked(inspectRequest).mockReturnValue(undefined);

		await withLlmUsageCapture({ workflow, node, additionalData }, { query: 'x' }, async () => ({}));

		expect(workflow.nodeTypes.getByNameAndVersion).not.toHaveBeenCalled();
	});

	it("resolves expression outputs for the node's parameters before it skips a node", async () => {
		// The LangChain Code node names every connection type in its outputs expression.
		const expression = '={{ ["main", "ai_languageModel"].filter(...) }}';

		await withLlmUsageCapture(
			{ workflow: workflowWithOutputs(expression, ['main']), node, additionalData },
			requestBody,
			async () => ({}),
		);

		expect(inspector.onResponse).toHaveBeenCalled();
	});

	it('does not fail the request when the inspector throws', async () => {
		vi.mocked(inspector.onResponse).mockImplementation(() => {
			throw new Error('inspector failed');
		});

		await expect(
			withLlmUsageCapture({ workflow, node, additionalData }, requestBody, async () => ({
				a: 1,
			})),
		).resolves.toEqual({ a: 1 });
	});

	it('does not send the request when the check rejects it', async () => {
		const blocked = new Error('LLM budget reached');
		inspector.check = vi.fn().mockRejectedValue(blocked);
		const send = vi.fn();

		await expect(
			withLlmUsageCapture({ workflow, node, additionalData }, requestBody, send),
		).rejects.toBe(blocked);
		expect(send).not.toHaveBeenCalled();
	});

	it('does not check nodes that output a language model, because LangChain checks them', async () => {
		inspector.check = vi.fn();

		await withLlmUsageCapture(
			{ workflow: workflowWithOutputs(['ai_languageModel']), node, additionalData },
			requestBody,
			async () => ({}),
		);

		expect(inspector.check).not.toHaveBeenCalled();
	});

	it('is applied by the httpRequest helper', async () => {
		const request = vi.fn().mockResolvedValue({ usage: { prompt_tokens: 1 } });
		const outboundHttp = mock<OutboundHttp>();
		outboundHttp.requests.mockReturnValue(mock<HttpRequestClient>({ request }));
		Container.set(OutboundHttp, outboundHttp);
		const hooks: LlmUsageHooks = { inspectRequest };
		const data = mockDeep<IWorkflowExecuteAdditionalData>();
		data.evalLlmMockHandler = undefined;
		data.otel = undefined;
		(data as IWorkflowExecuteAdditionalData)['llm-usage'] = hooks;

		await getRequestHelperFunctions(workflow, node, data).httpRequest({
			url: 'https://llm.example.com/v1/chat/completions',
			method: 'POST',
			body: requestBody,
		});

		expect(inspectRequest).toHaveBeenCalledWith(expect.objectContaining({ requestBody }));
		expect(inspector.onResponse).toHaveBeenCalledWith({ usage: { prompt_tokens: 1 } });
	});

	it('is applied by the legacy request helper, with the run and the node credentials', async () => {
		const requestLegacy = vi.fn().mockResolvedValue({ usage: { prompt_tokens: 1 } });
		const outboundHttp = mock<OutboundHttp>();
		outboundHttp.requests.mockReturnValue(mock<HttpRequestClient>({ requestLegacy }));
		Container.set(OutboundHttp, outboundHttp);
		await getRequestHelperFunctions(workflow, node, additionalData, null, [], 'manual').request({
			uri: 'https://api.moonshot.ai/v1/chat/completions',
			method: 'POST',
			body: requestBody,
		});

		expect(inspectRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				context: expect.objectContaining({ executionMode: 'manual' }),
				credentialTypes: ['openAiApi'],
				requestBody,
			}),
		);
		expect(inspector.onResponse).toHaveBeenCalledWith({ usage: { prompt_tokens: 1 } });
	});

	it('reports a request once when a captured request sends through another helper', async () => {
		await withLlmUsageCapture(
			{ workflow, node, additionalData },
			requestBody,
			async () =>
				// As OAuth signing does: the outer helper sends through an inner one.
				await withLlmUsageCapture({ workflow, node, additionalData }, requestBody, async () => ({
					a: 1,
				})),
		);

		expect(inspectRequest).toHaveBeenCalledTimes(1);
		expect(inspector.onResponse).toHaveBeenCalledTimes(1);
	});

	it('does not capture an evaluation run with mocked LLM responses', async () => {
		additionalData.evalLlmMockHandler = vi.fn();

		await withLlmUsageCapture({ workflow, node, additionalData }, requestBody, async () => ({}));

		expect(inspectRequest).not.toHaveBeenCalled();
	});
});
