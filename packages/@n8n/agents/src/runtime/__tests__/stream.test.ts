import type { TextStreamPart, ToolSet } from 'ai';

import { convertChunk } from '../stream';

type ToolCallChunk = Extract<TextStreamPart<ToolSet>, { type: 'tool-call' }>;

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
