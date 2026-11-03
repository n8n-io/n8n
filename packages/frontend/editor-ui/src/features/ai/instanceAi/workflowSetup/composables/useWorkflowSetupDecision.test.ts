import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';

import type { WorkflowSetupOutcome } from '../workflowSetup.types';
import { useWorkflowSetupDecision } from './useWorkflowSetupDecision';

function setup() {
	const outcome = ref<WorkflowSetupOutcome>();
	const emitApply = vi.fn();
	const emitDefer = vi.fn();
	let decision!: ReturnType<typeof useWorkflowSetupDecision>;
	const wrapper = mount(
		defineComponent({
			setup() {
				decision = useWorkflowSetupDecision({ outcome, emitApply, emitDefer });
				return () => h('div');
			},
		}),
	);
	return { outcome, emitApply, emitDefer, decision, wrapper };
}

describe('useWorkflowSetupDecision', () => {
	it('hands the apply to the parent and waits for its outcome', async () => {
		const { outcome, emitApply, decision } = setup();
		const payload = { nodeCredentials: { Slack: { slackApi: 'cred-1' } } };

		const applied = decision.apply(payload);
		expect(emitApply).toHaveBeenCalledWith(payload);
		expect(decision.terminalState.value).toBe('applying');

		outcome.value = { state: 'partial', result: { success: true, partial: true } };
		await expect(applied).resolves.toEqual({ success: true, partial: true });
		expect(decision.terminalState.value).toBe('partial');
	});

	it('opens the wizard again when the parent reports a failure', async () => {
		const { outcome, decision } = setup();

		const applied = decision.apply({});
		outcome.value = { state: 'failed' };

		await expect(applied).resolves.toBeUndefined();
		expect(decision.terminalState.value).toBeNull();
	});

	it('settles the next answer after a second failure', async () => {
		const { outcome, emitApply, decision } = setup();

		const first = decision.apply({});
		outcome.value = { state: 'failed' };
		await first;

		const second = decision.apply({});
		expect(emitApply).toHaveBeenCalledTimes(2);
		outcome.value = { state: 'failed' };
		await expect(second).resolves.toBeUndefined();
	});

	it('ignores a second apply while one is in progress', () => {
		const { emitApply, decision } = setup();

		void decision.apply({});
		void decision.apply({});

		expect(emitApply).toHaveBeenCalledTimes(1);
	});

	it('hands the defer to the parent and settles as deferred', async () => {
		const { outcome, emitDefer, decision } = setup();

		const deferred = decision.defer();
		expect(emitDefer).toHaveBeenCalledTimes(1);

		outcome.value = { state: 'deferred' };
		await deferred;
		expect(decision.terminalState.value).toBe('deferred');
	});

	it('settles a pending answer when the card unmounts', async () => {
		const { decision, wrapper } = setup();

		const applied = decision.apply({});
		wrapper.unmount();
		await nextTick();

		await expect(applied).resolves.toBeUndefined();
	});
});
