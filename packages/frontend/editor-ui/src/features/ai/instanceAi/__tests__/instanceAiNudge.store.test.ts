import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	isInstanceAiAvailable: { value: true },
	track: vi.fn(),
}));

vi.mock('../composables/useInstanceAiAvailability', () => ({
	useInstanceAiAvailable: () => mocks.isInstanceAiAvailable,
}));
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: mocks.track }),
}));

import {
	INSTANCE_AI_NUDGE_SHOW_DELAY_MS,
	useInstanceAiNudgeStore,
} from '../nudge/instanceAiNudge.store';

describe('useInstanceAiNudgeStore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		mocks.isInstanceAiAvailable.value = true;
		setActivePinia(createPinia());
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows the nudge after the delay and tracks it when Instance AI is available', () => {
		const store = useInstanceAiNudgeStore();

		store.showNudge('workflow_created');

		expect(store.activeTrigger).toBeNull();

		vi.advanceTimersByTime(INSTANCE_AI_NUDGE_SHOW_DELAY_MS);

		expect(store.activeTrigger).toBe('workflow_created');
		expect(mocks.track).toHaveBeenCalledWith('Instance AI nudge shown', {
			trigger: 'workflow_created',
		});
	});

	it('does not show the nudge when Instance AI is unavailable', () => {
		mocks.isInstanceAiAvailable.value = false;
		const store = useInstanceAiNudgeStore();

		store.showNudge('workflow_created');
		vi.advanceTimersByTime(INSTANCE_AI_NUDGE_SHOW_DELAY_MS);

		expect(store.activeTrigger).toBeNull();
		expect(mocks.track).not.toHaveBeenCalled();
	});

	it('shows and tracks only once for repeated calls with the same trigger', () => {
		const store = useInstanceAiNudgeStore();

		store.showNudge('workflow_created');
		store.showNudge('workflow_created');
		vi.advanceTimersByTime(INSTANCE_AI_NUDGE_SHOW_DELAY_MS);
		store.showNudge('workflow_created');
		vi.advanceTimersByTime(INSTANCE_AI_NUDGE_SHOW_DELAY_MS);

		expect(mocks.track).toHaveBeenCalledTimes(1);
	});

	it('blocks re-showing a dismissed trigger for the rest of the session', () => {
		const store = useInstanceAiNudgeStore();

		store.showNudge('workflow_created');
		vi.advanceTimersByTime(INSTANCE_AI_NUDGE_SHOW_DELAY_MS);
		store.dismissNudge();

		expect(store.activeTrigger).toBeNull();

		store.showNudge('workflow_created');
		vi.advanceTimersByTime(INSTANCE_AI_NUDGE_SHOW_DELAY_MS);

		expect(store.activeTrigger).toBeNull();
		expect(mocks.track).toHaveBeenCalledTimes(1);
	});

	it('ignores dismiss when no nudge is active', () => {
		const store = useInstanceAiNudgeStore();

		store.dismissNudge();

		expect(store.activeTrigger).toBeNull();
		expect(store.dismissedTriggers.size).toBe(0);
	});
});
