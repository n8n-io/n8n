import { AgentRun } from '../run';
import type { AgentResult } from '../types';

const makeResult = (text = 'ok'): AgentResult => ({
	text,
	toolCalls: [],
	tokens: { input: 0, output: 0 },
	steps: 0,
});

describe('AgentRun', () => {
	it('should start in running state', () => {
		const run = new AgentRun(Promise.resolve(makeResult()));
		expect(run.state).toBe('running');
	});

	it('should transition to completed when result resolves', async () => {
		const run = new AgentRun(Promise.resolve(makeResult('done')));
		const result = await run.result;
		expect(result.text).toBe('done');
		expect(run.state).toBe('completed');
	});

	it('should transition to failed when result rejects', async () => {
		const run = new AgentRun(Promise.reject(new Error('boom')));
		await expect(run.result).rejects.toThrow('boom');
		expect(run.state).toBe('failed');
	});

	it('should emit stateChange events on completion', async () => {
		const handler = jest.fn();
		const run = new AgentRun(Promise.resolve(makeResult()));
		run.on('stateChange', handler);
		await run.result;
		expect(handler).toHaveBeenCalledWith(
			expect.objectContaining({ from: 'running', to: 'completed' }),
		);
	});

	it('should emit step events', () => {
		const handler = jest.fn();
		const run = new AgentRun(new Promise(() => {}));
		run.on('step', handler);
		run.emitStep({ step: 1, toolCalls: [], tokens: { input: 10, output: 5 } });
		expect(handler).toHaveBeenCalledWith({
			step: 1,
			toolCalls: [],
			tokens: { input: 10, output: 5 },
		});
	});

	it('should emit toolCall events', () => {
		const handler = jest.fn();
		const run = new AgentRun(new Promise(() => {}));
		run.on('toolCall', handler);
		run.emitToolCall({
			tool: 'search',
			input: { q: 'test' },
			output: { results: [] },
			duration: 100,
		});
		expect(handler).toHaveBeenCalledWith(
			expect.objectContaining({ tool: 'search', duration: 100 }),
		);
	});

	it('should emit message events', () => {
		const handler = jest.fn();
		const run = new AgentRun(new Promise(() => {}));
		run.on('message', handler);
		run.emitMessage({ role: 'assistant', content: 'hello' });
		expect(handler).toHaveBeenCalledWith({ role: 'assistant', content: 'hello' });
	});

	it('should emit eval events', () => {
		const handler = jest.fn();
		const run = new AgentRun(new Promise(() => {}));
		run.on('eval', handler);
		run.emitEval({ scorer: 'relevancy', score: 0.95, reasoning: 'Highly relevant' });
		expect(handler).toHaveBeenCalledWith(
			expect.objectContaining({ scorer: 'relevancy', score: 0.95 }),
		);
	});

	it('should emit error events', () => {
		const handler = jest.fn();
		const run = new AgentRun(new Promise(() => {}));
		run.on('error', handler);
		run.emitError({ error: new Error('oops'), step: 2, recoverable: true });
		expect(handler).toHaveBeenCalledWith(expect.objectContaining({ step: 2, recoverable: true }));
	});

	it('should support abort', () => {
		const stateHandler = jest.fn();
		const run = new AgentRun(new Promise(() => {}));
		run.on('stateChange', stateHandler);

		run.abort('user cancelled');

		expect(run.state).toBe('failed');
		expect(stateHandler).toHaveBeenCalledWith(
			expect.objectContaining({
				from: 'running',
				to: 'failed',
				context: { reason: 'user cancelled' },
			}),
		);
	});

	it('should support approve', async () => {
		const stateHandler = jest.fn();
		const run = new AgentRun(new Promise(() => {}));
		run.on('stateChange', stateHandler);

		await run.approve('approval-123');

		expect(run.state).toBe('running');
		// No state change emitted because running -> running is a no-op
		expect(stateHandler).not.toHaveBeenCalled();
	});

	it('should support deny', async () => {
		const stateHandler = jest.fn();
		const run = new AgentRun(new Promise(() => {}));
		run.on('stateChange', stateHandler);

		await run.deny('approval-123', 'Not authorized');

		expect(run.state).toBe('failed');
		expect(stateHandler).toHaveBeenCalledWith(
			expect.objectContaining({ from: 'running', to: 'failed' }),
		);
	});

	it('should support multiple handlers for same event', () => {
		const handler1 = jest.fn();
		const handler2 = jest.fn();
		const run = new AgentRun(new Promise(() => {}));
		run.on('step', handler1);
		run.on('step', handler2);
		run.emitStep({ step: 1, toolCalls: [], tokens: { input: 0, output: 0 } });
		expect(handler1).toHaveBeenCalled();
		expect(handler2).toHaveBeenCalled();
	});
});
