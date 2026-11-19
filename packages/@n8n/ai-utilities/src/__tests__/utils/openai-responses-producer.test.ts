import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { HumanMessage } from '@langchain/core/messages';
import type { ChatGeneration, Generation, LLMResult } from '@langchain/core/outputs';
import { ChatOpenAI, type ChatOpenAIFields } from '@langchain/openai';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Mocked } from 'vitest';

import { N8nLlmTracing, openAiTokensUsageParser } from 'src/utils/n8n-llm-tracing';

// Recorded-shape Responses fixtures, not live recordings. They follow the shape at
// https://platform.openai.com/docs/api-reference/responses/object so CI stays hermetic.
// To re-record: POST /v1/responses, then repeat with "stream": true for the SSE file.
// Keep usage at 100/40/140 so the assertions stay meaningful.
import responsesFixture from '../fixtures/openai-responses-usage.json';

const STREAM_FIXTURE = readFileSync(
	join(__dirname, '../fixtures/openai-responses-usage.stream.txt'),
	'utf8',
);

const MESSAGE_USAGE = {
	input_tokens: responsesFixture.usage.input_tokens,
	output_tokens: responsesFixture.usage.output_tokens,
	total_tokens: responsesFixture.usage.total_tokens,
};

const PARSED_USAGE = {
	promptTokens: responsesFixture.usage.input_tokens,
	completionTokens: responsesFixture.usage.output_tokens,
	totalTokens: responsesFixture.usage.total_tokens,
};

type OpenAiFetch = NonNullable<NonNullable<ChatOpenAIFields['configuration']>['fetch']>;

/** Captures what N8nLlmTracing.handleLLMEnd receives: the raw `_generate` output. */
class RecordingHandler extends BaseCallbackHandler {
	name = 'RecordingHandler';

	readonly results: LLMResult[] = [];

	async handleLLMEnd(output: LLMResult): Promise<void> {
		this.results.push(output);
	}
}

function fetchReturning(body: string, contentType: string): OpenAiFetch {
	return async () =>
		await Promise.resolve(
			new Response(body, { status: 200, headers: { 'content-type': contentType } }),
		);
}

function buildModel(
	fetchImpl: OpenAiFetch,
	streaming: boolean,
	callbacks: BaseCallbackHandler[],
): ChatOpenAI {
	return new ChatOpenAI({
		apiKey: 'test-api-key',
		model: 'gpt-4o',
		useResponsesApi: true,
		streaming,
		configuration: { fetch: fetchImpl },
		callbacks,
	});
}

function isChatGeneration(generation: Generation): generation is ChatGeneration {
	return 'message' in generation;
}

function hasUsageMetadata(message: unknown): message is {
	usage_metadata?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
} {
	return typeof message === 'object' && message !== null && 'usage_metadata' in message;
}

function readGenerationUsage(
	result: LLMResult,
): { input_tokens?: number; output_tokens?: number; total_tokens?: number } | undefined {
	const generation = result.generations[0]?.[0];
	if (!generation || !isChatGeneration(generation)) return undefined;

	const { message } = generation;
	return hasUsageMetadata(message) ? message.usage_metadata : undefined;
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstEmittedJson(addOutputData: {
	mock: { calls: ReadonlyArray<readonly unknown[]> };
}): Record<string, unknown> {
	const call = addOutputData.mock.calls[0];
	const runData = call[2];
	if (!Array.isArray(runData) || !Array.isArray(runData[0])) {
		throw new Error('expected emitted run data');
	}

	const entry: unknown = runData[0][0];
	if (!isJsonRecord(entry) || !('json' in entry) || !isJsonRecord(entry.json)) {
		throw new Error('expected an emitted json payload');
	}

	return entry.json;
}

const node: INode = {
	id: 'test-node',
	name: 'OpenAI Chat Model',
	type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
	typeVersion: 1.3,
	position: [0, 0],
	parameters: {},
};

/** Same mock shape as the unit tests, so the tracer can run against the real producer output. */
function createExecutionFunctions(): Mocked<ISupplyDataFunctions> {
	return {
		getNode: vi.fn().mockReturnValue(node),
		addOutputData: vi.fn(),
		addInputData: vi.fn().mockReturnValue({ index: 0 }),
		getNextRunIndex: vi.fn().mockReturnValue(0),
		setMetadata: vi.fn(),
	} as unknown as Mocked<ISupplyDataFunctions>;
}

describe('OpenAI ChatOpenAI Responses producer', () => {
	it('carries provider usage on the message for a non-streaming Responses call', async () => {
		const recorder = new RecordingHandler();
		const model = buildModel(
			fetchReturning(JSON.stringify(responsesFixture), 'application/json'),
			false,
			[recorder],
		);

		const result = await model.generate([[new HumanMessage('hi')]]);

		// The returned generation and the handler input both carry the provider counts.
		expect(readGenerationUsage(result)).toMatchObject(MESSAGE_USAGE);

		const captured = recorder.results[0];
		expect(readGenerationUsage(captured)).toMatchObject(MESSAGE_USAGE);
		expect(openAiTokensUsageParser(captured)).toEqual(PARSED_USAGE);
		// The same numbers are also mirrored here, under a key the default parser ignores.
		expect(captured.llmOutput?.estimatedTokenUsage).toMatchObject(PARSED_USAGE);
	});

	it('aggregates provider usage onto the message for a streaming Responses call', async () => {
		const recorder = new RecordingHandler();
		const model = buildModel(fetchReturning(STREAM_FIXTURE, 'text/event-stream'), true, [recorder]);

		const result = await model.generate([[new HumanMessage('hi')]]);

		expect(readGenerationUsage(result)).toMatchObject(MESSAGE_USAGE);

		const captured = recorder.results[0];
		expect(readGenerationUsage(captured)).toMatchObject(MESSAGE_USAGE);

		// The fixture's response text is one token long. A local estimate would return
		// single-digit counts, not 100/40/140. The provider numbers in the assertion
		// therefore prove the parser read response.completed.usage, not an estimator.
		// This is the direct rebuttal to the concern that usage_metadata could be
		// locally estimated on the Responses path.
		expect(openAiTokensUsageParser(captured)).toEqual(PARSED_USAGE);
	});

	it('records the provider usage through N8nLlmTracing', async () => {
		const executionFunctions = createExecutionFunctions();
		const tracer = new N8nLlmTracing(executionFunctions, {
			tokensUsageParser: openAiTokensUsageParser,
		});
		const model = buildModel(
			fetchReturning(JSON.stringify(responsesFixture), 'application/json'),
			false,
			[tracer],
		);

		await model.generate([[new HumanMessage('hi')]]);

		const emitted = firstEmittedJson(executionFunctions.addOutputData);
		expect(emitted.tokenUsage).toEqual(PARSED_USAGE);
		expect(emitted.tokenUsageEstimate).toBeUndefined();
	});
});
