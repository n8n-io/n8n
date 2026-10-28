import type * as AiImport from 'ai';

import type { BuiltTelemetry } from '../../types/telemetry';
import { AgentRuntime } from '../loop/agent-runtime';
import {
	createObservationLogObserveFn,
	createObservationLogReflectFn,
} from '../memory/observation-log-defaults';
import { AgentEventBus } from '../state/event-bus';

// The provider stub keeps the transport it is given, so each test can call the
// model's fetch and see whether a request span is recorded.
vi.mock('@ai-sdk/anthropic', () => ({
	createAnthropic: (opts?: { fetch?: typeof globalThis.fetch }) => (model: string) => ({
		provider: 'anthropic',
		modelId: model,
		specificationVersion: 'v3',
		supportedUrls: {},
		fetch: opts?.fetch,
	}),
}));

const { mockGenerateText } = vi.hoisted(() => ({
	mockGenerateText: vi.fn<(call: Record<string, unknown>) => Promise<Record<string, unknown>>>(),
}));

vi.mock('ai', async () => {
	const actual = await vi.importActual<typeof AiImport>('ai');
	return {
		...actual,
		generateText: async (call: Record<string, unknown>) => {
			const result = await mockGenerateText(call);
			return { ...result, finalStep: { providerMetadata: undefined } };
		},
	};
});

const MODEL = 'anthropic/claude-sonnet-4-5';

function tracedTelemetry() {
	const spans: Array<{ name: string; attributes: Record<string, unknown> }> = [];
	const telemetry: BuiltTelemetry = {
		enabled: true,
		traceModelRequests: true,
		functionId: 'wiring-test',
		recordInputs: false,
		recordOutputs: false,
		integrations: [],
		tracer: {
			startSpan(name: string, options: { attributes: Record<string, unknown> }) {
				spans.push({ name, attributes: options.attributes });
				return { setAttributes() {}, setStatus() {}, end() {} };
			},
		},
	};
	return { spans, telemetry };
}

/** Calls the transport of the model passed to the last generateText call. */
async function sendThroughLastModel() {
	const call = mockGenerateText.mock.calls.at(-1)?.[0];
	const model = call?.model as { fetch?: typeof globalThis.fetch } | undefined;
	if (!model?.fetch) throw new Error('model has no transport');
	await model.fetch('https://api.anthropic.test/v1/messages', { method: 'POST' });
}

const requestSpans = (spans: Array<{ name: string }>) =>
	spans.filter((span) => span.name === 'model.provider.request');

describe('model request tracing wiring', () => {
	beforeEach(() => {
		mockGenerateText.mockReset();
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('{}')),
		);
	});
	afterEach(() => vi.unstubAllGlobals());

	it('an agent run sends model requests through the traced transport', async () => {
		mockGenerateText.mockResolvedValue({
			finishReason: 'stop',
			usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
			response: { messages: [{ role: 'assistant', content: [{ type: 'text', text: 'OK' }] }] },
			responseMessages: [{ role: 'assistant', content: [{ type: 'text', text: 'OK' }] }],
			toolCalls: [],
		});
		const modelFetch = vi.fn(async () => new Response('{}'));
		const { spans, telemetry } = tracedTelemetry();
		const runtime = new AgentRuntime({
			name: 'wiring-test',
			model: MODEL,
			instructions: 'test',
			eventBus: new AgentEventBus(),
			telemetry,
			modelFetch,
		});

		await runtime.generate('hello');
		await sendThroughLastModel();

		expect(modelFetch).toHaveBeenCalledTimes(1);
		expect(requestSpans(spans)).toEqual([
			expect.objectContaining({
				attributes: expect.objectContaining({
					'gen_ai.system': 'anthropic',
					'gen_ai.provider.name': 'anthropic',
					'gen_ai.request.model': 'claude-sonnet-4-5',
				}),
			}),
		]);
	});

	it('the memory observer sends model requests through the traced transport', async () => {
		mockGenerateText.mockResolvedValue({ text: '' });
		const { spans, telemetry } = tracedTelemetry();

		await createObservationLogObserveFn(MODEL)({
			observationScopeId: 'thread-1',
			now: new Date('2026-05-12T14:30:00.000Z'),
			deltaMessages: [],
			transcript: '',
			transcriptTokenCount: 0,
			observationLogTail: [],
			renderedObservationLogTail: null,
			telemetry,
		});
		await sendThroughLastModel();

		expect(requestSpans(spans)).toHaveLength(1);
	});

	it('the memory reflector sends model requests through the traced transport', async () => {
		mockGenerateText.mockResolvedValue({ text: '{"drop":[],"merge":[]}' });
		const { spans, telemetry } = tracedTelemetry();

		await createObservationLogReflectFn(MODEL)({
			observationScopeId: 'thread-1',
			now: new Date('2026-05-12T14:30:00.000Z'),
			activeObservationLog: [],
			renderedObservationLog: '',
			tokenCount: 10,
			tokenBudget: 12_000,
			telemetry,
		});
		await sendThroughLastModel();

		expect(requestSpans(spans)).toHaveLength(1);
	});

	it('memory observer and reflector send model requests through the agent transport', async () => {
		const modelFetch = vi.fn(async () => new Response('{}'));

		mockGenerateText.mockResolvedValue({ text: '' });
		await createObservationLogObserveFn(MODEL)({
			observationScopeId: 'thread-1',
			now: new Date('2026-05-12T14:30:00.000Z'),
			deltaMessages: [],
			transcript: '',
			transcriptTokenCount: 0,
			observationLogTail: [],
			renderedObservationLogTail: null,
			modelFetch,
		});
		await sendThroughLastModel();

		mockGenerateText.mockResolvedValue({ text: '{"drop":[],"merge":[]}' });
		await createObservationLogReflectFn(MODEL)({
			observationScopeId: 'thread-1',
			now: new Date('2026-05-12T14:30:00.000Z'),
			activeObservationLog: [],
			renderedObservationLog: '',
			tokenCount: 10,
			tokenBudget: 12_000,
			modelFetch,
		});
		await sendThroughLastModel();

		expect(modelFetch).toHaveBeenCalledTimes(2);
		expect(globalThis.fetch).not.toHaveBeenCalled();
	});
});
