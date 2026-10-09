import type { AgentPersistedMessageContentPart } from '@n8n/api-types';
import fc from 'fast-check';

import {
	isResultRecord,
	isTerminalToolCallPart,
	isToolCallWithId,
	toolCallKey,
	type ToolCallContentPart,
} from '../utils/tool-call-parts';

type Part = AgentPersistedMessageContentPart;

const call = (overrides: Partial<Part> = {}): Part => ({
	type: 'tool-call',
	toolName: 'lookup',
	toolCallId: 'toolu_1',
	input: { id: 1 },
	...overrides,
});

const withId = (toolCallId: string, toolName?: string): ToolCallContentPart => ({
	type: 'tool-call',
	toolCallId,
	...(toolName !== undefined && { toolName }),
});

describe('isToolCallWithId', () => {
	it('accepts a tool call with an id', () => {
		expect(isToolCallWithId(call())).toBe(true);
	});

	it.each<[string, Part]>([
		['an empty id', call({ toolCallId: '' })],
		['no id', call({ toolCallId: undefined })],
		['a text part with a tool call id', { type: 'text', text: 'Hi', toolCallId: 'toolu_1' }],
	])('rejects %s', (_name, part) => {
		expect(isToolCallWithId(part)).toBe(false);
	});
});

describe('isTerminalToolCallPart', () => {
	it.each<[string, Partial<Part>]>([
		['a resolved state', { state: 'resolved' }],
		['a rejected state', { state: 'rejected' }],
		['a cancellation', { canceled: true }],
		['an output', { output: 'done' }],
		['a null output', { output: null }],
		['an error', { error: 'Failed' }],
		['an empty error', { error: '' }],
	])('treats a call with %s as settled', (_name, overrides) => {
		expect(isTerminalToolCallPart(call(overrides))).toBe(true);
	});

	it.each<[string, Partial<Part>]>([
		['no state', {}],
		['a pending state', { state: 'pending' }],
		['canceled set to false', { canceled: false }],
		['a suspend payload only', { suspendPayload: { message: 'Run?' } }],
	])('treats a call with %s as open', (_name, overrides) => {
		expect(isTerminalToolCallPart(call(overrides))).toBe(false);
	});

	it('treats a part that is not a tool call as not settled', () => {
		expect(isTerminalToolCallPart({ type: 'text', state: 'resolved', output: 'x' })).toBe(false);
	});
});

describe('isResultRecord', () => {
	it('accepts a settled call without an input', () => {
		expect(isResultRecord(call({ input: undefined, state: 'resolved', output: 'ok' }))).toBe(true);
		expect(isResultRecord(call({ input: undefined, state: 'rejected', error: 'No' }))).toBe(true);
	});

	it.each<[string, Partial<Part>]>([
		['a settled call with an input', { state: 'resolved', output: 'ok' }],
		['a settled call with a null input', { input: null, state: 'resolved', output: 'ok' }],
		['a settled call with an empty input', { input: {}, state: 'resolved', output: 'ok' }],
		['an open call without an input', { input: undefined }],
	])('rejects %s', (_name, overrides) => {
		expect(isResultRecord(call(overrides))).toBe(false);
	});
});

describe('toolCallKey', () => {
	it('gives the same key to the same id and tool', () => {
		expect(toolCallKey(withId('toolu_1', 'lookup'))).toBe(toolCallKey(withId('toolu_1', 'lookup')));
	});

	it('gives another key to another tool with the same id', () => {
		expect(toolCallKey(withId('toolu_1', 'lookup'))).not.toBe(
			toolCallKey(withId('toolu_1', 'propose_automation')),
		);
	});

	it('tells a call without a tool name from a call with an empty tool name', () => {
		expect(toolCallKey(withId('toolu_1'))).not.toBe(toolCallKey(withId('toolu_1', '')));
	});

	it('gives the same key only to the same id and tool name (property)', () => {
		// Separator-like characters make a collision likely if the key joins the two values.
		const textArb = fc.oneof(
			fc.constantFrom('', '/', ',', '"', '[', 'a', 'a/b', 'null'),
			fc.string({ maxLength: 4 }),
		);
		const callArb = fc.record({
			id: textArb.filter((id) => id !== ''),
			name: fc.option(textArb, { nil: undefined }),
		});
		fc.assert(
			fc.property(callArb, callArb, (first, second) => {
				const sameCall = first.id === second.id && first.name === second.name;
				expect(
					toolCallKey(withId(first.id, first.name)) === toolCallKey(withId(second.id, second.name)),
				).toBe(sameCall);
			}),
		);
	});
});
