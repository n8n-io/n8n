import type { AgentMessage } from '../../types/sdk/message';
import { isEmptyModelTurn } from '../loop/runtime-helpers';

function assistant(content: unknown[]): AgentMessage {
	return { role: 'assistant', content } as AgentMessage;
}

describe('isEmptyModelTurn', () => {
	it('is true for a stop turn with no messages', () => {
		expect(isEmptyModelTurn({ aiFinishReason: 'stop', newMessages: [] })).toBe(true);
	});

	it('is true for a stop turn with only whitespace text', () => {
		expect(
			isEmptyModelTurn({
				aiFinishReason: 'stop',
				newMessages: [assistant([{ type: 'text', text: '  \n' }])],
			}),
		).toBe(true);
	});

	it('is true for a reasoning-only stop turn', () => {
		expect(
			isEmptyModelTurn({
				aiFinishReason: 'stop',
				newMessages: [assistant([{ type: 'reasoning', text: 'thinking…' }])],
			}),
		).toBe(true);
	});

	it('is false when the turn has text', () => {
		expect(
			isEmptyModelTurn({
				aiFinishReason: 'stop',
				newMessages: [assistant([{ type: 'text', text: 'done' }])],
			}),
		).toBe(false);
	});

	it('is false when the turn has a tool call', () => {
		expect(
			isEmptyModelTurn({
				aiFinishReason: 'stop',
				newMessages: [
					assistant([
						{ type: 'tool-call', toolCallId: 'tc-1', toolName: 'foo', input: {}, state: 'pending' },
					]),
				],
			}),
		).toBe(false);
	});

	it('is false for a tool-calls turn', () => {
		expect(isEmptyModelTurn({ aiFinishReason: 'tool-calls', newMessages: [] })).toBe(false);
	});

	it('is true for a truncated turn with no content', () => {
		expect(isEmptyModelTurn({ aiFinishReason: 'length', newMessages: [] })).toBe(true);
	});

	it('is true for a reasoning-only turn whose stream died before its terminal chunk', () => {
		expect(
			isEmptyModelTurn({
				aiFinishReason: 'other',
				newMessages: [assistant([{ type: 'reasoning', text: 'thinking…' }])],
			}),
		).toBe(true);
	});

	it('is false when the provider blocked the prompt', () => {
		expect(
			isEmptyModelTurn({
				aiFinishReason: 'other',
				newMessages: [],
				errorReason: { type: 'prompt_blocked', message: 'blocked: PROHIBITED_CONTENT' },
			}),
		).toBe(false);
	});

	it('is false when structured output was produced', () => {
		expect(
			isEmptyModelTurn({ aiFinishReason: 'stop', newMessages: [], structuredOutput: { a: 1 } }),
		).toBe(false);
	});
});
