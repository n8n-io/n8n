import type { BuiltTelemetry } from '../../types';
import { Agent } from '../agent';

// Mock provider packages so createModel() doesn't fail when no API key is set.
jest.mock('@ai-sdk/openai', () => ({
	createOpenAI: () => () => ({ provider: 'openai', modelId: 'mock', specificationVersion: 'v3' }),
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type AiImport = typeof import('ai');

jest.mock('ai', () => {
	const actual = jest.requireActual<AiImport>('ai');
	return {
		...actual,
		generateText: jest.fn(),
	};
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generateText } = require('ai') as {
	generateText: jest.Mock;
};

function makeGenerateSuccess(text = 'OK') {
	return {
		finishReason: 'stop',
		usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
		response: {
			messages: [
				{
					role: 'assistant',
					content: [{ type: 'text', text }],
				},
			],
		},
		toolCalls: [],
	};
}

function makeTelemetry(functionId: string): BuiltTelemetry {
	return {
		enabled: true,
		functionId,
		metadata: { functionId },
		recordInputs: true,
		recordOutputs: true,
		integrations: [],
		tracer: { startSpan: jest.fn() },
	};
}

describe('Agent telemetry', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('updates telemetry on an already-built runtime', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());
		const agent = new Agent('agent')
			.model('openai/gpt-4o-mini')
			.instructions('test')
			.telemetry(makeTelemetry('initial-agent'));

		await agent.generate('first');
		agent.telemetry(makeTelemetry('updated-agent'));
		await agent.generate('second');

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const firstCall = generateText.mock.calls[0][0] as Record<string, unknown>;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const secondCall = generateText.mock.calls[1][0] as Record<string, unknown>;
		const firstTelemetry = firstCall.experimental_telemetry as Record<string, unknown>;
		const secondTelemetry = secondCall.experimental_telemetry as Record<string, unknown>;

		expect(firstTelemetry.functionId).toBe('initial-agent');
		expect(secondTelemetry.functionId).toBe('updated-agent');
		expect(secondTelemetry.metadata).toEqual({ functionId: 'updated-agent' });
	});
});
