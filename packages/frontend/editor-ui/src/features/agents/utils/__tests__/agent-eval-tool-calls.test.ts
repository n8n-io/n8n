import { TOOL_CALL_STATE } from '@/features/ai/shared/agentsChat/constants';

import { toDisplayToolCalls } from '../agent-eval-tool-calls';

describe('toDisplayToolCalls', () => {
	describe('malformed input', () => {
		test.each([
			['null', null],
			['undefined', undefined],
			['an empty object', {}],
			['a null calls key', { calls: null }],
			['a string calls key', { calls: 'nope' }],
			['an object calls key', { calls: {} }],
		])('returns an empty list for %s', (_label, input) => {
			expect(toDisplayToolCalls(input)).toEqual([]);
		});

		it('drops entries that are not tool-call records, keeping the valid one', () => {
			const toolCalls = {
				calls: [null, 42, 'lookup', {}, { tool: 7 }, { tool: 'search' }],
			};

			const result = toDisplayToolCalls(toolCalls);

			expect(result).toHaveLength(1);
			expect(result[0].tool).toBe('search');
		});
	});

	describe('identity', () => {
		it('gives repeated calls to the same tool distinct ids', () => {
			const toolCalls = {
				calls: [{ tool: 'search' }, { tool: 'search' }],
			};

			expect(toDisplayToolCalls(toolCalls).map((call) => call.toolCallId)).toEqual([
				'0-search',
				'1-search',
			]);
		});

		it('is deterministic across invocations on the same input', () => {
			const toolCalls = {
				calls: [{ tool: 'search' }, { tool: 'book' }],
			};

			expect(toDisplayToolCalls(toolCalls)).toEqual(toDisplayToolCalls(toolCalls));
		});
	});

	describe('state', () => {
		it.each([
			['no error', undefined, TOOL_CALL_STATE.DONE],
			['a canceled error', 'canceled', TOOL_CALL_STATE.CANCELLED],
			['any other error', 'the tool exploded', TOOL_CALL_STATE.ERROR],
		])('maps %s to %s', (_label, error, expected) => {
			const toolCalls = { calls: [{ tool: 'search', error }] };

			expect(toDisplayToolCalls(toolCalls)[0].state).toBe(expected);
		});
	});

	describe('payload', () => {
		it('passes input and output through untouched', () => {
			const input = { query: 'hotels in Tokyo' };
			const output = { results: [{ name: 'The Gracery' }] };
			const toolCalls = { calls: [{ tool: 'search', input, output }] };

			const [call] = toDisplayToolCalls(toolCalls);

			expect(call.input).toEqual(input);
			expect(call.output).toEqual(output);
		});

		it('leaves output undefined when the record has none', () => {
			const toolCalls = { calls: [{ tool: 'search' }] };

			expect(toDisplayToolCalls(toolCalls)[0].output).toBeUndefined();
		});

		// The error text is an internal diagnostic; surfacing it as the tool's
		// output would leak it into the reviewer-facing card.
		it('does not copy the error message into output', () => {
			const toolCalls = {
				calls: [{ tool: 'search', error: 'Not attributed to a reported tool call' }],
			};

			const [call] = toDisplayToolCalls(toolCalls);

			expect(call.state).toBe(TOOL_CALL_STATE.ERROR);
			expect(call.output).toBeUndefined();
		});
	});
});
