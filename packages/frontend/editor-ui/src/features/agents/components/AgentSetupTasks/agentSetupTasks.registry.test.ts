import { describe, expect, it } from 'vitest';

import { setupTaskDefinitions, type SetupContext } from './agentSetupTasks.registry';

function makeContext(): SetupContext {
	return {
		config: {
			loaded: true,
			isRunnable: true,
			model: 'openai:gpt-4.1',
			instructions: 'Help the user',
			toolCount: 0,
		},
		channels: { loaded: true, ids: [] },
		publication: { loaded: true, canPublish: true, activeVersionId: null },
		sessions: { loaded: true, count: 0 },
	};
}

describe('test-agent setup task', () => {
	it('hides the task when the agent cannot run despite having model, instructions, and tools', () => {
		const context = makeContext();
		context.config.isRunnable = false;
		context.config.toolCount = 1;

		expect(setupTaskDefinitions['test-agent'].getVisible(context)).toBe(false);
	});

	it('shows the task for a runnable agent without tools', () => {
		expect(setupTaskDefinitions['test-agent'].getVisible(makeContext())).toBe(true);
	});
});

describe('add-channel setup task', () => {
	it('does not require a channel to publish an agent', () => {
		expect(setupTaskDefinitions['add-channel'].required).toBe(false);
	});

	it('stays hidden when no channel is configured', () => {
		const context = makeContext();

		expect(setupTaskDefinitions['add-channel'].getVisible()).toBe(false);
		expect(setupTaskDefinitions['add-channel'].getState(context)).toBe('todo');
	});

	it('keeps the channel completion state', () => {
		const context = makeContext();
		context.channels.ids = ['n8n_chat'];

		expect(setupTaskDefinitions['add-channel'].getState(context)).toBe('complete');
	});

	it('keeps the state unknown until channels load', () => {
		const context = makeContext();
		context.channels.loaded = false;

		expect(setupTaskDefinitions['add-channel'].getState(context)).toBe('unknown');
	});
});
