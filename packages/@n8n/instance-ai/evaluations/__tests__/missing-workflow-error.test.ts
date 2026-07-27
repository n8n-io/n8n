import { summarizeMissingWorkflowError } from '../harness/runner';
import type { CapturedEvent } from '../types';

function event(type: string, data: Record<string, unknown>): CapturedEvent {
	return { timestamp: 0, type, data: { type, ...data } };
}

describe('summarizeMissingWorkflowError', () => {
	it('surfaces a run-level error event (terminal-fallback) instead of a blank message', () => {
		const events = [
			event('run-start', {}),
			event('error', {
				payload: { content: 'Total disk limit exceeded. Maximum allowed: 30GiB.' },
			}),
			event('run-finish', {}),
		];
		expect(summarizeMissingWorkflowError(events)).toBe(
			'Agent error: Total disk limit exceeded. Maximum allowed: 30GiB.',
		);
	});

	it('reads error content from `error`/`message` payload keys as well as `content`', () => {
		expect(summarizeMissingWorkflowError([event('error', { payload: { error: 'boom' } })])).toBe(
			'Agent error: boom',
		);
		expect(summarizeMissingWorkflowError([event('error', { payload: { message: 'kaput' } })])).toBe(
			'Agent error: kaput',
		);
	});

	it('prefers tool errors over run-level errors over agent text', () => {
		const events = [
			event('tool-error', { payload: { error: 'node failed' } }),
			event('error', { payload: { content: 'terminal fallback' } }),
			event('text-delta', { payload: { text: 'some narration' } }),
		];
		expect(summarizeMissingWorkflowError(events)).toBe('Tool errors: node failed');
	});

	it('falls back to agent text when there are no error events', () => {
		const events = [event('text-delta', { payload: { text: 'I could not find a node.' } })];
		expect(summarizeMissingWorkflowError(events)).toBe('Agent response: I could not find a node.');
	});

	it('returns the no-details message only when nothing useful was captured', () => {
		expect(summarizeMissingWorkflowError([event('run-start', {}), event('run-finish', {})])).toBe(
			'No workflow produced — no error details captured',
		);
	});
});
