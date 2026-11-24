import * as aiModule from 'ai';
import type { Mock } from 'vitest';

import type { BuiltTelemetry } from '../../types';
import { Agent } from '../agent';

// Mock provider packages so createModel() doesn't fail when no API key is set.
vi.mock('@ai-sdk/openai', () => ({
	createOpenAI: () => () => ({ provider: 'openai', modelId: 'mock', specificationVersion: 'v3' }),
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type AiImport = typeof import('ai');

vi.mock('ai', async () => {
	const actual = await vi.importActual<AiImport>('ai');
	return {
		...actual,
		generateText: vi.fn(),
	};
});

const { generateText } = aiModule as unknown as {
	generateText: Mock;
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
		tracer: { startSpan: vi.fn() },
	};
}

describe('Agent telemetry', () => {
	beforeEach(() => {
		vi.clearAllMocks();
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

		const firstCall = generateText.mock.calls[0][0] as Record<string, unknown>;

		const secondCall = generateText.mock.calls[1][0] as Record<string, unknown>;
		const firstTelemetry = firstCall.telemetry as Record<string, unknown>;
		const secondTelemetry = secondCall.telemetry as Record<string, unknown>;

		expect(firstTelemetry.functionId).toBe('initial-agent');
		expect(secondTelemetry.functionId).toBe('updated-agent');
	});
});

describe('Agent.functionId', () => {
	it('accepts ids made of letters, digits, dots, dashes and underscores', () => {
		expect(() => new Agent('a').functionId('instance-ai.orchestrator_v2')).not.toThrow();
	});

	it.each(['', 'has space', 'naïve', 'line\nbreak'])(
		'rejects %j, which fetch cannot send as a header',
		(id) => {
			expect(() => new Agent('a').functionId(id)).toThrow(/functionId/);
		},
	);
});
