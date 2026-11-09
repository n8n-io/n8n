import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';

import { createThreadComponentRenderer } from '../__tests__/createThreadComponentRenderer';
import type { TerminalState } from './workflowSetup.types';
import InstanceAiThreadWorkflowSetup from './InstanceAiThreadWorkflowSetup.vue';

const applyMachine = vi.hoisted(() => ({
	apply: vi.fn(),
	defer: vi.fn(),
	terminalState: { value: null as TerminalState | null },
}));

vi.mock('./composables/useWorkflowSetupApply', () => ({
	useWorkflowSetupApply: () => ({
		apply: applyMachine.apply,
		defer: applyMachine.defer,
		terminalState: applyMachine.terminalState,
	}),
}));

// The card itself has its own tests. The stub shows the outcome that the wrapper passes.
vi.mock('./InstanceAiWorkflowSetup.vue', () => ({
	default: {
		props: ['requestId', 'threadId', 'inputThreadId', 'outcome'],
		emits: ['apply', 'defer'],
		template: `<div>
			<button data-test-id="stub-apply" @click="$emit('apply', { nodeCredentials: { Slack: { slackApi: 'cred-1' } } })" />
			<button data-test-id="stub-defer" @click="$emit('defer')" />
			<span data-test-id="stub-thread">{{ threadId }}</span>
			<span data-test-id="stub-outcome">{{ outcome ? outcome.state + ':' + JSON.stringify(outcome.result ?? null) : '' }}</span>
		</div>`,
	},
}));

// Real store actions, so the renderer can create the thread runtime that it provides.
const renderComponent = createThreadComponentRenderer(InstanceAiThreadWorkflowSetup, {
	pinia: createTestingPinia({ stubActions: false }),
});

const props = { requestId: 'req-setup', setupRequests: [] };

describe('InstanceAiThreadWorkflowSetup', () => {
	beforeEach(() => {
		applyMachine.apply.mockReset();
		applyMachine.defer.mockReset();
		applyMachine.terminalState.value = null;
	});

	it('applies through the thread and settles the card with the tool result', async () => {
		applyMachine.apply.mockImplementation(async () => {
			applyMachine.terminalState.value = 'applied';
			return { success: true };
		});

		const { getByTestId } = renderComponent({ props });
		expect(getByTestId('stub-thread')).toHaveTextContent('thread-1');
		await fireEvent.click(getByTestId('stub-apply'));
		await flushPromises();

		expect(applyMachine.apply).toHaveBeenCalledWith({
			nodeCredentials: { Slack: { slackApi: 'cred-1' } },
		});
		expect(getByTestId('stub-outcome')).toHaveTextContent('applied:{"success":true}');
	});

	it('reports a failure when the apply did not settle, so the card opens again', async () => {
		applyMachine.apply.mockResolvedValue(undefined);

		const { getByTestId } = renderComponent({ props });
		await fireEvent.click(getByTestId('stub-apply'));
		await flushPromises();

		expect(getByTestId('stub-outcome')).toHaveTextContent('failed:null');
	});

	it('defers through the thread and settles the card as deferred', async () => {
		applyMachine.defer.mockImplementation(async () => {
			applyMachine.terminalState.value = 'deferred';
		});

		const { getByTestId } = renderComponent({ props });
		await fireEvent.click(getByTestId('stub-defer'));
		await flushPromises();

		expect(applyMachine.defer).toHaveBeenCalledTimes(1);
		expect(getByTestId('stub-outcome')).toHaveTextContent('deferred:null');
	});
});
