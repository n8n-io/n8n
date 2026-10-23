import type * as AiImport from 'ai';

import { AgentRuntime } from '../loop/agent-runtime';
import {
	createObservationLogObserveFn,
	createObservationLogReflectFn,
} from '../memory/observation-log-defaults';
import { generateTitleFromMessage } from '../memory/title-generation';
import { AgentEventBus } from '../state/event-bus';

vi.mock('@ai-sdk/anthropic', () => ({
	createAnthropic: () => (model: string) => ({
		provider: 'anthropic',
		modelId: model,
		specificationVersion: 'v3',
		supportedUrls: {},
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

const sentHeaders = () => mockGenerateText.mock.calls.map(([call]) => call.headers);

const observerInput = {
	observationScopeId: 'thread-1',
	now: new Date('2026-05-12T14:30:00.000Z'),
	deltaMessages: [],
	transcript: '',
	transcriptTokenCount: 0,
	observationLogTail: [],
	renderedObservationLogTail: null,
};

const reflectorInput = {
	observationScopeId: 'thread-1',
	now: new Date('2026-05-12T14:30:00.000Z'),
	activeObservationLog: [],
	renderedObservationLog: '',
	tokenCount: 10,
	tokenBudget: 12_000,
};

describe('x-n8n-function-id header', () => {
	beforeEach(() => mockGenerateText.mockReset());

	it('names agent loop calls with the runtime functionId', async () => {
		mockGenerateText.mockResolvedValue({
			finishReason: 'stop',
			usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
			response: { messages: [{ role: 'assistant', content: [{ type: 'text', text: 'OK' }] }] },
			responseMessages: [{ role: 'assistant', content: [{ type: 'text', text: 'OK' }] }],
			toolCalls: [],
		});
		const runtime = (functionId?: string) =>
			new AgentRuntime({
				name: 'header-test',
				model: MODEL,
				instructions: 'test',
				eventBus: new AgentEventBus(),
				...(functionId ? { functionId } : {}),
			});

		await runtime('feature.orchestrator').generate('hello');
		await runtime().generate('hello');

		expect(sentHeaders()).toEqual([{ 'x-n8n-function-id': 'feature.orchestrator' }, undefined]);
	});

	it('names memory and title calls with a task suffix', async () => {
		mockGenerateText.mockResolvedValueOnce({ text: '' });
		await createObservationLogObserveFn(MODEL)({ ...observerInput, functionId: 'feature.agent' });
		mockGenerateText.mockResolvedValueOnce({ text: '{"drop":[],"merge":[]}' });
		await createObservationLogReflectFn(MODEL)({ ...reflectorInput, functionId: 'feature.agent' });
		mockGenerateText.mockResolvedValueOnce({ text: 'Slack alerts' });
		await generateTitleFromMessage(
			MODEL as never,
			'Build a workflow that posts new Jira issues to Slack',
			{ functionId: 'feature.thread_title' },
		);

		expect(sentHeaders()).toEqual([
			{ 'x-n8n-function-id': 'feature.agent.memory-observer' },
			{ 'x-n8n-function-id': 'feature.agent.memory-reflector' },
			{ 'x-n8n-function-id': 'feature.thread_title' },
		]);
	});

	it('sends no header from memory tasks without a functionId', async () => {
		mockGenerateText.mockResolvedValueOnce({ text: '' });
		await createObservationLogObserveFn(MODEL)(observerInput);

		expect(sentHeaders()).toEqual([undefined]);
	});
});
