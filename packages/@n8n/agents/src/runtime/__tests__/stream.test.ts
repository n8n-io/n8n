import type { TextStreamPart, ToolSet } from 'ai';

import { convertChunk, toTokenUsage } from '../streaming/stream';

type ToolCallChunk = Extract<TextStreamPart<ToolSet>, { type: 'tool-call' }>;
type ToolErrorChunk = Extract<TextStreamPart<ToolSet>, { type: 'tool-error' }>;
type ToolResultChunk = Extract<TextStreamPart<ToolSet>, { type: 'tool-result' }>;

describe('toTokenUsage — input token details', () => {
	it('maps noCacheTokens to inputTokenDetails.noCache', () => {
		const result = toTokenUsage({
			inputTokens: 16718,
			outputTokens: 200,
			totalTokens: 16918,
			inputTokenDetails: {
				noCacheTokens: 1,
				cacheReadTokens: 15252,
				cacheWriteTokens: 15465,
			},
		});

		expect(result?.inputTokenDetails).toEqual({
			noCache: 1,
			cacheRead: 15252,
			cacheWrite: 15465,
		});
	});

	it('includes noCache even when cache tokens are absent', () => {
		const result = toTokenUsage({
			inputTokens: 100,
			outputTokens: 10,
			totalTokens: 110,
			inputTokenDetails: { noCacheTokens: 100 },
		});

		expect(result?.inputTokenDetails).toEqual({ noCache: 100 });
	});
});

describe('convertChunk — tool-call invalid/error handling', () => {
	it('returns a tool-result with isError when c.invalid is true', () => {
		const error = new Error('JSON parse failed');
		const chunk = {
			type: 'tool-call',
			toolCallId: 'tc-1',
			toolName: 'myTool',
			input: {},
			dynamic: true,
			invalid: true,
			error,
		} as unknown as ToolCallChunk;

		expect(convertChunk(chunk)).toEqual({
			type: 'tool-result',
			toolCallId: 'tc-1',
			toolName: 'myTool',
			output: error,
			isError: true,
		});
	});

	it('returns a tool-result with isError when c.error is set (invalid is falsy)', () => {
		const error = new Error('no such tool');
		const chunk = {
			type: 'tool-call',
			toolCallId: 'tc-2',
			toolName: 'unknownTool',
			input: {},
			dynamic: true,
			invalid: false,
			error,
		} as unknown as ToolCallChunk;

		expect(convertChunk(chunk)).toEqual({
			type: 'tool-result',
			toolCallId: 'tc-2',
			toolName: 'unknownTool',
			output: error,
			isError: true,
		});
	});

	it('falls through to normal tool-call when neither invalid nor error is set', () => {
		const chunk = {
			type: 'tool-call',
			toolCallId: 'tc-3',
			toolName: 'lookup',
			input: { q: 'test' },
		} as unknown as ToolCallChunk;

		expect(convertChunk(chunk)).toEqual({
			type: 'tool-call',
			toolCallId: 'tc-3',
			toolName: 'lookup',
			input: { q: 'test' },
		});
	});

	it('uses empty string for toolName when toolName is absent on an errored chunk', () => {
		const chunk = {
			type: 'tool-call',
			toolCallId: 'tc-4',
			toolName: undefined,
			input: {},
			dynamic: true,
			invalid: true,
			error: 'no-such-tool',
		} as unknown as ToolCallChunk;

		const result = convertChunk(chunk);
		expect(result).toMatchObject({ type: 'tool-result', toolName: '', isError: true });
	});
});

describe('convertChunk — tool-result output passthrough', () => {
	it('passes a raw array output through verbatim (e.g. native web search results)', () => {
		const output = [
			{ title: 'n8n', url: 'https://n8n.io' },
			{ title: 'Docs', url: 'https://docs.n8n.io' },
		];
		const chunk = {
			type: 'tool-result',
			toolCallId: 'tc-1',
			toolName: 'anthropic.web_search_20250305',
			input: { query: 'n8n' },
			output,
			providerExecuted: true,
		} as unknown as ToolResultChunk;

		expect(convertChunk(chunk)).toEqual({
			type: 'tool-result',
			toolCallId: 'tc-1',
			toolName: 'anthropic.web_search_20250305',
			output,
		});
	});

	it('passes a raw object output through verbatim without unwrapping a coincidental "value" key', () => {
		const output = { value: 42, unit: 'C' };
		const chunk = {
			type: 'tool-result',
			toolCallId: 'tc-2',
			toolName: 'get_temperature',
			input: {},
			output,
		} as unknown as ToolResultChunk;

		expect(convertChunk(chunk)).toEqual({
			type: 'tool-result',
			toolCallId: 'tc-2',
			toolName: 'get_temperature',
			output,
		});
	});

	it('falls back to empty strings when toolCallId and toolName are absent', () => {
		const chunk = {
			type: 'tool-result',
			toolCallId: undefined,
			toolName: undefined,
			input: {},
			output: 'plain text result',
		} as unknown as ToolResultChunk;

		expect(convertChunk(chunk)).toEqual({
			type: 'tool-result',
			toolCallId: '',
			toolName: '',
			output: 'plain text result',
		});
	});
});

describe('convertChunk — tool-error handling', () => {
	it('maps provider-executed tool-error to tool-result with isError', () => {
		const error = new Error('search failed');
		const chunk = {
			type: 'tool-error',
			toolCallId: 'tc-err',
			toolName: 'web_search',
			input: { query: 'n8n' },
			error,
			providerExecuted: true,
		} as unknown as ToolErrorChunk;

		expect(convertChunk(chunk)).toEqual({
			type: 'tool-result',
			toolCallId: 'tc-err',
			toolName: 'web_search',
			output: error,
			isError: true,
		});
	});
});
