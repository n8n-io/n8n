import type express from 'express';
import type {
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	IWebhookFunctions,
	IWorkflowMetadata,
	NodeParameterValueType,
} from 'n8n-workflow';
import { WAIT_INDEFINITELY } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { AgentHumanReview } from '../AgentHumanReview.node';
import * as runner from '../helpers/runAgentOnce';
import type { AgentTrace } from '../helpers/trace';

vi.mock('../helpers/runAgentOnce', async () => ({
	...(await vi.importActual('../helpers/runAgentOnce')),
	runAgentOnce: vi.fn(),
}));

const RESUME_URL = 'http://localhost:5678/webhook-waiting/31/a1?signature=abc';
const DRAFT = { output: 'Seventeen times twenty-three is 391.' };
const TRACE: AgentTrace = {
	schemaVersion: 2,
	startedAt: '2026-09-19T10:00:00.000Z',
	endedAt: '2026-09-19T10:00:00.900Z',
	latencyMs: 900,
	model: { provider: 'anthropic', name: 'claude-sonnet-4-6', params: {} },
	prompt: { input: 'What is 17 times 23?', systemMessage: 'Be brief' },
	llmCalls: [],
	toolCalls: [],
	usage: { input: 40, output: 12, cacheRead: 0, cacheWrite: 0, total: 52, llmCalls: 0 },
	tools: { available: [], memory: { connected: false }, outputParser: { connected: false } },
	context: { executionId: '31', nodeName: 'AI Agent with Human Review' },
	errors: [],
};
const ACK = { requestId: 'req-1', status: 'registered', threadId: 'thread-1', round: 0 };

const node = mock<INode>({
	id: 'a1',
	name: 'AI Agent with Human Review',
	type: 'agentHumanReview',
});
const workflow = mock<IWorkflowMetadata>({ id: 'wf-1', name: 'Reviewed answers' });

const header = (name: string, value: string) => ({ name, value });

/** Node parameters shared by the execute and webhook contexts. */
const parameters: Record<string, unknown> = {
	reviewMode: 'sync',
	promptType: 'auto',
	url: 'http://localhost:3100/hitl',
	sendHeaders: false,
	includeContext: false,
	includeAgentTrace: true,
	limitWaitTime: false,
	options: { systemMessage: 'Be brief' },
	needsFallback: false,
	hasOutputParser: false,
};

function executeContext(overrides: Record<string, unknown> = {}) {
	const params = { ...parameters, ...overrides };
	const helpers = mock<IExecuteFunctions['helpers']>();
	const ctx = mock<IExecuteFunctions>({ helpers, logger: mock() });
	ctx.getInputData.mockReturnValue([{ json: { chatInput: 'What is 17 times 23?' } }]);
	ctx.getNodeParameter.mockImplementation(
		(name, _index, fallback?: unknown) => (params[name] ?? fallback) as NodeParameterValueType,
	);
	ctx.evaluateExpression.mockReturnValue('What is 17 times 23?');
	ctx.getNode.mockReturnValue(node);
	ctx.getWorkflow.mockReturnValue(workflow);
	ctx.getExecutionId.mockReturnValue('31');
	ctx.getSignedResumeUrl.mockReturnValue(RESUME_URL);
	helpers.httpRequest.mockResolvedValue(ACK);
	helpers.prepareBinaryData.mockImplementation(async (buffer, fileName, mimeType) => ({
		data: Buffer.from(buffer as Buffer).toString('base64'),
		fileName: fileName ?? '',
		mimeType: mimeType ?? 'application/octet-stream',
	}));
	ctx.putExecutionToWait.mockResolvedValue(undefined);
	return Object.assign(ctx, { helpers });
}

function webhookContext(body: IDataObject, overrides: Record<string, unknown> = {}) {
	const params = { ...parameters, ...overrides };
	const helpers = mock<IWebhookFunctions['helpers']>();
	const ctx = mock<IWebhookFunctions>({ helpers, logger: mock() });
	ctx.getWebhookName.mockReturnValue('default');
	ctx.getRequestObject.mockReturnValue({ method: 'POST' } as express.Request);
	ctx.getBodyData.mockReturnValue(body);
	// The webhook signature has no item index: (name, fallback)
	ctx.getNodeParameter.mockImplementation(
		(name, fallback?: unknown) => (params[name] ?? fallback) as NodeParameterValueType,
	);
	ctx.getNode.mockReturnValue(node);
	ctx.getWorkflow.mockReturnValue(workflow);
	ctx.getExecutionId.mockReturnValue('31');
	ctx.getSignedResumeUrl.mockReturnValue(RESUME_URL);
	helpers.prepareBinaryData.mockImplementation(async (buffer, fileName, mimeType) => ({
		data: Buffer.from(buffer as Buffer).toString('base64'),
		fileName: fileName ?? '',
		mimeType: mimeType ?? 'application/octet-stream',
	}));
	return Object.assign(ctx, { helpers });
}

/** Decodes the JSON file attached to an item under the `trace` binary key. */
const attachedTrace = (item: INodeExecutionData | undefined) => {
	const bin = item?.binary?.trace;
	if (!bin) return undefined;
	return {
		fileName: bin.fileName,
		mimeType: bin.mimeType,
		content: JSON.parse(Buffer.from(bin.data, 'base64').toString('utf8')) as IDataObject,
	};
};

describe('AgentHumanReview', () => {
	const agentNode = new AgentHumanReview();
	const runAgentOnce = runner.runAgentOnce as unknown as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		runAgentOnce.mockResolvedValue({ output: DRAFT, trace: TRACE });
	});

	describe('description', () => {
		it('should expose Approved and Rejected outputs', () => {
			expect(agentNode.description.outputs).toHaveLength(2);
			expect(agentNode.description.outputNames).toEqual(['Approved', 'Rejected']);
		});

		it('should declare resume webhooks with the send-and-wait operation', () => {
			const operation = agentNode.description.properties.find((p) => p.name === 'operation');
			expect(operation?.default).toBe('sendAndWait');
			expect(agentNode.description.webhooks?.every((w) => w.restartWebhook)).toBe(true);
		});
	});

	describe('execute', () => {
		it('should run the agent, register the draft with the trace, and park the execution', async () => {
			const ctx = executeContext();

			const result = await agentNode.execute.call(ctx);

			expect(runAgentOnce).toHaveBeenCalledWith(
				ctx,
				'What is 17 times 23?',
				{ systemMessage: 'Be brief' },
				expect.objectContaining({
					executionId: '31',
					workflowId: 'wf-1',
					nodeId: 'a1',
					round: 0,
					promptType: 'auto',
				}),
			);

			// 1. registration, 2. OTLP export of the round's spans
			expect(ctx.helpers.httpRequest).toHaveBeenCalledTimes(2);
			const request = ctx.helpers.httpRequest.mock.calls[0][0];
			expect(request.method).toBe('POST');
			expect(request.url).toBe('http://localhost:3100/hitl');
			expect(request.body).toMatchObject({
				executionId: '31',
				workflowId: 'wf-1',
				workflowName: 'Reviewed answers',
				nodeName: 'AI Agent with Human Review',
				nodeId: 'a1',
				resumeUrl: RESUME_URL,
				data: DRAFT,
				otel: {
					traceId: expect.stringMatching(/^[0-9a-f]{32}$/),
					spanId: expect.stringMatching(/^[0-9a-f]{16}$/),
				},
			});
			expect((request.body as IDataObject).agent).toBeUndefined();

			const otlp = ctx.helpers.httpRequest.mock.calls[1][0];
			expect(otlp.url).toBe('http://localhost:3100/v1/traces');
			const spans = (
				otlp.body as {
					resourceSpans: Array<{
						scopeSpans: Array<{
							spans: Array<{ traceId: string; attributes: Array<{ key: string; value: unknown }> }>;
						}>;
					}>;
				}
			).resourceSpans[0].scopeSpans[0].spans;
			expect(spans[0].traceId).toBe((request.body as { otel: { traceId: string } }).otel.traceId);
			expect(spans[0].attributes).toContainEqual({
				key: 'hitl.request_id',
				value: { stringValue: 'req-1' },
			});

			expect(ctx.putExecutionToWait).toHaveBeenCalledWith(WAIT_INDEFINITELY);
			// Nothing reaches Approved before a decision; the timeout fallback goes to Rejected
			expect(result[0]).toEqual([]);
			expect(result[1][0].json).toMatchObject({ ...DRAFT, round: 0, threadId: 'thread-1' });
		});

		it('should not attach a file when Attach Full Trace as File is off', async () => {
			const ctx = executeContext({ reviewMode: 'async', options: { attachTraceFile: false } });

			const result = await agentNode.execute.call(ctx);

			expect(result[0][0].binary).toBeUndefined();
			expect(ctx.helpers.prepareBinaryData).not.toHaveBeenCalled();
		});

		it('should skip the OTLP export when includeAgentTrace is off', async () => {
			const ctx = executeContext({ includeAgentTrace: false });

			await agentNode.execute.call(ctx);

			expect(ctx.helpers.httpRequest).toHaveBeenCalledTimes(1);
			const body = ctx.helpers.httpRequest.mock.calls[0][0].body as IDataObject;
			expect(body.otel).toBeUndefined();
		});

		it('should send OTLP to a custom endpoint with extra headers', async () => {
			const ctx = executeContext({
				options: {
					otlpEndpoint: 'http://localhost:3000/api/public/otel/v1/traces',
					otlpHeaders: 'Authorization=Basic abc=',
				},
			});

			await agentNode.execute.call(ctx);

			const otlp = ctx.helpers.httpRequest.mock.calls[1][0];
			expect(otlp.url).toBe('http://localhost:3000/api/public/otel/v1/traces');
			expect(otlp.headers).toMatchObject({ Authorization: 'Basic abc=' });
		});

		it('should still park when the OTLP export fails', async () => {
			const ctx = executeContext();
			ctx.helpers.httpRequest
				.mockResolvedValueOnce(ACK)
				.mockRejectedValueOnce(new Error('collector down'));

			await agentNode.execute.call(ctx);

			expect(ctx.putExecutionToWait).toHaveBeenCalled();
		});

		it('should send configured headers', async () => {
			const ctx = executeContext({
				sendHeaders: true,
				headerParameters: {
					parameters: [header('x-hitl-token', 'secret'), header('__proto__', 'no')],
				},
			});

			await agentNode.execute.call(ctx);

			expect(ctx.helpers.httpRequest.mock.calls[0][0].headers).toEqual({
				'x-hitl-token': 'secret',
			});
		});

		it('should bound the wait when limitWaitTime is on', async () => {
			const ctx = executeContext({ limitWaitTime: true, maxWaitMinutes: 5 });
			const before = Date.now();

			await agentNode.execute.call(ctx);

			const waitTill = ctx.putExecutionToWait.mock.calls[0][0];
			expect(waitTill.getTime()).toBeGreaterThanOrEqual(before + 5 * 60 * 1000);
			expect(waitTill.getTime()).toBeLessThan(before + 6 * 60 * 1000);
		});

		it('should not park when registration fails', async () => {
			const ctx = executeContext();
			ctx.helpers.httpRequest.mockRejectedValue(new Error('connect ECONNREFUSED'));

			await expect(agentNode.execute.call(ctx)).rejects.toThrow(
				'Could not register the draft with the review service',
			);
			expect(ctx.putExecutionToWait).not.toHaveBeenCalled();
		});

		it('should make no service calls and emit the draft immediately in "none" mode', async () => {
			// the URL parameter is hidden in this mode, so it resolves to its fallback
			const ctx = executeContext({ reviewMode: 'none', url: '' });

			const result = await agentNode.execute.call(ctx);

			expect(runAgentOnce).toHaveBeenCalledTimes(1);
			expect(ctx.helpers.httpRequest).not.toHaveBeenCalled();
			expect(ctx.getSignedResumeUrl).not.toHaveBeenCalled();
			expect(ctx.putExecutionToWait).not.toHaveBeenCalled();
			// the JSON output is just the answer; the preview lives in the Binary tab
			expect(result[0][0].json).toEqual(DRAFT);
			const file = attachedTrace(result[0][0]);
			expect(file).toMatchObject({ fileName: 'review-preview.json', mimeType: 'application/json' });
			const preview = file!.content as {
				reviewMode: string;
				registration: { url: string; body: IDataObject };
				trace: { url: string; body: { resourceSpans: unknown[] } };
			};
			expect(preview.reviewMode).toBe('none');
			expect(preview.registration.url).toBe('http://localhost:3100/hitl');
			expect(preview.registration.body).toMatchObject({
				executionId: '31',
				nodeId: 'a1',
				data: DRAFT,
				resumeUrl: '<signed resume URL, generated only when review is enabled>',
			});
			expect(preview.trace.url).toBe('http://localhost:3100/v1/traces');
			expect(preview.trace.body.resourceSpans).toHaveLength(1);
			expect(result[1]).toEqual([]);
		});

		it('should register as a background review and continue without parking in "async" mode', async () => {
			const ctx = executeContext({ reviewMode: 'async' });

			const result = await agentNode.execute.call(ctx);

			// registration + OTLP export, but no wait
			expect(ctx.helpers.httpRequest).toHaveBeenCalledTimes(2);
			expect(ctx.helpers.httpRequest.mock.calls[0][0].body).toMatchObject({
				mode: 'async',
				data: DRAFT,
			});
			expect(ctx.putExecutionToWait).not.toHaveBeenCalled();
			expect(result[0][0].json).toMatchObject({
				...DRAFT,
				review: {
					mode: 'async',
					status: 'pending',
					requestId: 'req-1',
					threadId: 'thread-1',
					round: 0,
				},
			});
			// the JSON output carries only the review ids; the payloads are in the attached file
			expect((result[0][0].json.review as IDataObject).sent).toBeUndefined();
			const file = attachedTrace(result[0][0]);
			expect(file?.fileName).toBe('review-trace.json');
			const sent = file!.content as {
				registration: { url: string; body: IDataObject };
				trace: { url: string; delivered: boolean; body: { resourceSpans: unknown[] } };
			};
			expect(sent.registration.url).toBe('http://localhost:3100/hitl');
			expect(sent.registration.body).toMatchObject({
				executionId: '31',
				mode: 'async',
				data: DRAFT,
				resumeUrl: 'http://localhost:5678/webhook-waiting/31/a1?signature=<hmac-signature-masked>',
			});
			expect(sent.trace.url).toBe('http://localhost:3100/v1/traces');
			expect(sent.trace.delivered).toBe(true);
			// identical to what was actually posted (minus the masked signature)
			const posted = ctx.helpers.httpRequest.mock.calls[0][0].body as IDataObject;
			expect({ ...posted, resumeUrl: undefined }).toEqual({
				...sent.registration.body,
				resumeUrl: undefined,
			});
			expect(ctx.helpers.httpRequest.mock.calls[1][0].body).toEqual(sent.trace.body);
			expect(result[1]).toEqual([]);
		});

		it('should not send a mode field in "sync" mode', async () => {
			const ctx = executeContext();

			await agentNode.execute.call(ctx);

			expect((ctx.helpers.httpRequest.mock.calls[0][0].body as IDataObject).mode).toBeUndefined();
		});

		it('should refuse more than one item', async () => {
			const ctx = executeContext();
			ctx.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);

			await expect(agentNode.execute.call(ctx)).rejects.toThrow('exactly one item');
			expect(runAgentOnce).not.toHaveBeenCalled();
		});
	});

	describe('webhook', () => {
		it('should resume on the Approved output with every round read back from the service', async () => {
			const ctx = webhookContext({
				decision: 'approved',
				data: DRAFT,
				round: 1,
				threadId: 'thread-1',
			});
			const thread = {
				threadId: 'thread-1',
				workflowId: 'wf-1',
				workflowName: 'Reviewed answers',
				nodeName: 'AI Agent with Human Review',
				nodeId: 'a1',
				rounds: [
					{
						requestId: 'r0',
						round: 0,
						state: 'processed',
						registeredAt: 't0',
						executionId: '31',
						output: { output: 'draft 0' },
						decision: 'revise',
						suggestions: 'Shorter.',
						otel: { traceId: 'tid-0', spanId: 's0', spanCount: 1 },
					},
					{
						requestId: 'r1',
						round: 1,
						state: 'registered',
						registeredAt: 't1',
						executionId: '31',
						output: { output: 'draft 1' },
						otel: { traceId: 'tid-1', spanId: 's1', spanCount: 1 },
					},
				],
			};
			ctx.helpers.httpRequest.mockImplementation(async (opts: { url: string }) => {
				if (opts.url.endsWith('/api/threads')) return { threads: [thread] };
				if (opts.url.includes('/otel')) return { spans: [{ name: 'invoke_agent' }] };
				return {};
			});

			const result = await agentNode.webhook.call(ctx);

			expect(result.workflowData?.[0][0].json).toEqual({
				...DRAFT,
				round: 1,
				threadId: 'thread-1',
				suggestionsHistory: ['Shorter.'],
			});
			// n8n drops the run that sent the data, so the payloads come back from the
			// service and are attached as a file rather than mixed into the answer
			const review = attachedTrace(result.workflowData?.[0][0])!.content as {
				rounds: Array<{
					round: number;
					registration: { body: IDataObject };
					trace: { traceId: string; spans: unknown[] };
				}>;
			};
			expect(attachedTrace(result.workflowData?.[0][0])?.fileName).toBe('review-trace.json');
			expect(review.rounds).toHaveLength(2);
			expect(review.rounds[0].registration.body).toMatchObject({
				data: { output: 'draft 0' },
				executionId: '31',
				nodeId: 'a1',
			});
			expect(review.rounds[1].trace).toMatchObject({
				traceId: 'tid-1',
				spans: [{ name: 'invoke_agent' }],
			});
			expect(review.rounds[1].registration.body).toMatchObject({ data: { output: 'draft 1' } });
			expect(result.workflowData?.[1]).toEqual([]);
			expect(runAgentOnce).not.toHaveBeenCalled();
		});

		it('should resume on the Rejected output with the reason', async () => {
			const ctx = webhookContext({
				decision: 'rejected',
				data: DRAFT,
				suggestions: 'Still wrong.',
				round: 2,
				threadId: 'thread-1',
			});
			ctx.helpers.httpRequest.mockResolvedValue({
				threads: [
					{ threadId: 'thread-1', rounds: [{ suggestions: 'A' }, { suggestions: 'B' }, {}] },
				],
			});

			const result = await agentNode.webhook.call(ctx);

			expect(result.workflowData?.[0]).toEqual([]);
			expect(result.workflowData?.[1][0].json).toMatchObject({
				...DRAFT,
				reason: 'Still wrong.',
				round: 2,
				threadId: 'thread-1',
				suggestionsHistory: ['A', 'B', 'Still wrong.'],
			});
			expect((result.workflowData?.[1][0].json as IDataObject).review).toBeUndefined();
		});

		it('should re-run the agent and re-register on revise without resuming', async () => {
			const ctx = webhookContext({
				decision: 'revise',
				chatInput: '[Reviewer feedback]\nShorter.',
				suggestions: 'Shorter.',
				round: 0,
				threadId: 'thread-1',
			});
			ctx.helpers.httpRequest
				.mockResolvedValueOnce({ threads: [] }) // history lookup
				.mockResolvedValueOnce({ ...ACK, round: 1 }) // re-registration
				.mockResolvedValueOnce({ partialSuccess: {} }); // OTLP export

			const result = await agentNode.webhook.call(ctx);

			expect(runAgentOnce).toHaveBeenCalledWith(
				ctx,
				'[Reviewer feedback]\nShorter.',
				{ systemMessage: 'Be brief' },
				expect.objectContaining({
					executionId: '31',
					round: 1,
					threadId: 'thread-1',
					reviewerFeedback: 'Shorter.',
				}),
			);
			const registration = ctx.helpers.httpRequest.mock.calls[1][0];
			expect(registration.url).toBe('http://localhost:3100/hitl');
			expect(registration.body).toMatchObject({
				executionId: '31',
				nodeId: 'a1',
				resumeUrl: RESUME_URL,
				data: DRAFT,
				otel: { traceId: expect.any(String) },
			});
			expect(ctx.helpers.httpRequest.mock.calls[2][0].url).toBe('http://localhost:3100/v1/traces');
			// No workflowData: the execution stays parked for the next decision
			expect(result.workflowData).toBeUndefined();
			expect(result.webhookResponse).toMatchObject({
				status: 'revised',
				round: 1,
				threadId: 'thread-1',
			});
			// the revise round's exact payloads go back to the service in the response
			const sent = (
				result.webhookResponse as {
					sent: { registration: { body: IDataObject }; trace: { delivered: boolean } };
				}
			).sent;
			expect(sent.registration.body).toMatchObject({ data: DRAFT, executionId: '31' });
			expect(sent.trace.delivered).toBe(true);
		});

		it('should still fall back to the current feedback when the history lookup fails', async () => {
			const ctx = webhookContext({
				decision: 'rejected',
				data: DRAFT,
				suggestions: 'No.',
				round: 0,
				threadId: 'thread-1',
			});
			ctx.helpers.httpRequest.mockRejectedValue(new Error('boom'));

			const result = await agentNode.webhook.call(ctx);

			expect(result.workflowData?.[1][0].json).toMatchObject({ suggestionsHistory: ['No.'] });
		});

		it('should reject a revise without a prompt', async () => {
			const ctx = webhookContext({ decision: 'revise', threadId: 'thread-1' });
			ctx.helpers.httpRequest.mockResolvedValue({ threads: [] });

			await expect(agentNode.webhook.call(ctx)).rejects.toThrow('must carry "chatInput"');
		});

		it('should not resume on a GET', async () => {
			const ctx = webhookContext({});
			ctx.getRequestObject.mockReturnValue({ method: 'GET' } as express.Request);

			const result = await agentNode.webhook.call(ctx);

			expect(result.workflowData).toBeUndefined();
			expect(result.webhookResponse).toEqual({ status: 'waiting' });
		});
	});
});
