import { describe, expect, it } from 'vitest';

import { setupTaskDefinitions, type SetupContext } from './agentSetupTasks.registry';

function makeContext(overrides?: Partial<SetupContext>): SetupContext {
	return {
		config: {
			loaded: true,
			isRunnable: true,
			model: 'openai:gpt-4.1',
			instructions: 'Help the user',
			toolCount: 0,
			scheduleCount: 0,
		},
		channels: { loaded: true, ids: [] },
		publication: { loaded: true, canPublish: true, activeVersionId: null },
		sessions: { loaded: true, count: 0 },
		showTriggerStep: false,
		...overrides,
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

describe('add-trigger setup task', () => {
	it('is hidden when the experiment is disabled', () => {
		const context = makeContext({ showTriggerStep: false });

		expect(setupTaskDefinitions['add-trigger'].getVisible(context)).toBe(false);
		expect(setupTaskDefinitions['add-trigger'].getState(context)).toBe('todo');
	});

	it('shows immediately when the experiment is enabled', () => {
		const context = makeContext({ showTriggerStep: true });
		context.config.isRunnable = false;

		expect(setupTaskDefinitions['add-trigger'].getVisible(context)).toBe(true);
		expect(setupTaskDefinitions['add-trigger'].getState(context)).toBe('todo');
	});

	it('completes when a channel is connected', () => {
		const context = makeContext({ showTriggerStep: true });
		context.channels.ids = ['n8n_chat'];

		expect(setupTaskDefinitions['add-trigger'].getState(context)).toBe('complete');
	});

	it('completes when an enabled schedule exists', () => {
		const context = makeContext({ showTriggerStep: true });
		context.config.scheduleCount = 1;

		expect(setupTaskDefinitions['add-trigger'].getState(context)).toBe('complete');
	});

	it('keeps the state unknown until channels and config load', () => {
		const channelsLoading = makeContext({ showTriggerStep: true });
		channelsLoading.channels.loaded = false;
		expect(setupTaskDefinitions['add-trigger'].getState(channelsLoading)).toBe('unknown');

		const configLoading = makeContext({ showTriggerStep: true });
		configLoading.config.loaded = false;
		expect(setupTaskDefinitions['add-trigger'].getState(configLoading)).toBe('unknown');
	});
});

describe('publish-agent setup task', () => {
	it('shows after testing in control even without a trigger', () => {
		const context = makeContext({ showTriggerStep: false });
		context.sessions.count = 1;

		expect(setupTaskDefinitions['publish-agent'].getVisible(context)).toBe(true);
	});

	it('stays hidden until a trigger is configured when the experiment is enabled', () => {
		const context = makeContext({ showTriggerStep: true });
		context.sessions.count = 1;

		expect(setupTaskDefinitions['publish-agent'].getVisible(context)).toBe(false);

		context.channels.ids = ['slack'];
		expect(setupTaskDefinitions['publish-agent'].getVisible(context)).toBe(true);
	});

	it('shows when a schedule satisfies the trigger step', () => {
		const context = makeContext({ showTriggerStep: true });
		context.sessions.count = 1;
		context.config.scheduleCount = 1;

		expect(setupTaskDefinitions['publish-agent'].getVisible(context)).toBe(true);
	});
});
