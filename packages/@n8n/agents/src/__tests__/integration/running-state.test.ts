import { it, expect } from 'vitest';

import { describeIf, collectStreamChunks, getModel } from './helpers';
import { Agent } from '../../index';

const describe = describeIf('anthropic');

describe('running state', () => {
	it('status is idle before first run', () => {
		const agent = new Agent('state-test')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be very concise.');

		expect(agent.getState().status).toBe('idle');
	});

	it('status transitions idle → success for a generate() call', async () => {
		const agent = new Agent('state-test')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be very concise.');

		expect(agent.getState().status).toBe('idle');

		const result = await agent.generate('Say exactly the word "hello".');

		expect(agent.getState().status).toBe('success');
		expect(result.runId).toBeTruthy();
	});

	it('status transitions idle → running → success for a stream() call', async () => {
		const agent = new Agent('state-test')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be very concise.');

		expect(agent.getState().status).toBe('idle');

		const { stream } = await agent.stream('Say exactly the word "hello".');

		// After stream() resolves the state is already running.
		expect(agent.getState().status).toBe('running');

		await collectStreamChunks(stream);

		expect(agent.getState().status).toBe('success');
	});

	it('isAgentRunning() returns true while streaming and false before and after', async () => {
		const agent = new Agent('state-test')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be very concise.');

		const isRunning = () => agent.getState().status === 'running';

		expect(isRunning()).toBe(false);

		const { stream } = await agent.stream('Say exactly the word "hello".');

		expect(isRunning()).toBe(true);

		await collectStreamChunks(stream);

		expect(isRunning()).toBe(false);
	});
});
