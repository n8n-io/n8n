import { createTestingPinia } from '@pinia/testing';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, isVNode, nextTick, ref, type VNode } from 'vue';

import { agentsEventBus } from '../../agents.eventBus';
import { useAgentEvalsStore } from '../../agentEvals.store';
import { useAgentEvalFixHandoff, type AgentEvalFixHandoffOptions } from '../useAgentEvalFixHandoff';

const { showMessage, showError, close } = vi.hoisted(() => ({
	showMessage: vi.fn(),
	showError: vi.fn(),
	close: vi.fn(),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError }),
}));

const request = {
	projectId: 'p1',
	agentId: 'a1',
	prompt: 'Fix the 2 checks that need work.',
	datasetId: 'ds-1',
	checkCount: 4,
};

function setup(overrides: Partial<AgentEvalFixHandoffOptions> = {}) {
	const pinia = createTestingPinia({ stubActions: true });
	const store = useAgentEvalsStore();
	const instructions = ref('Be brief.');
	const building = ref(false);
	const shown = ref(false);
	const options: AgentEvalFixHandoffOptions = {
		projectId: ref('p1'),
		agentId: ref('a1'),
		enabled: () => true,
		assistantBuilding: building,
		assistantShown: shown,
		handoff: vi.fn(async (_draft, onAccepted: () => void) => {
			onAccepted();
			return true;
		}),
		saveEdits: vi.fn(async () => undefined),
		refreshConfig: vi.fn(async () => undefined),
		readInstructions: () => instructions.value,
		readConfigHash: () => 'hash-1',
		writeInstructions: vi.fn(async () => true),
		...overrides,
	};
	const wrapper = mount(
		defineComponent({
			setup() {
				useAgentEvalFixHandoff(options);
				return () => null;
			},
		}),
		{ global: { plugins: [pinia] } },
	);
	return { wrapper, store, options, instructions, building, shown };
}

/** The toast's text, and its undo button's click handler when it has one. */
function readToast(call: number) {
	const [{ message }] = showMessage.mock.calls[call] as [{ message: VNode }];
	const children = isVNode(message) && Array.isArray(message.children) ? message.children : [];
	const text = children
		.filter(isVNode)
		.map((child) => (typeof child.children === 'string' ? child.children : ''))
		.join('');
	const undo = children.filter(isVNode).find((child) => child.props?.onClick);
	return { text, undo: undo?.props?.onClick as (() => void) | undefined };
}

describe('useAgentEvalFixHandoff', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		showMessage.mockReturnValue({ close });
	});

	it('puts the prompt in the Assistant composer and hides the fix action meanwhile', async () => {
		const { wrapper, store, options } = setup();

		agentsEventBus.emit('evalFixRequested', request);
		await flushPromises();

		expect(options.saveEdits).toHaveBeenCalled();
		expect(options.handoff).toHaveBeenCalledWith(
			{ text: request.prompt, prefillType: 'handoff_agent_change_request' },
			expect.any(Function),
		);
		expect(store.setEvalFixInAssistant).toHaveBeenCalledWith('a1', true);
		wrapper.unmount();
	});

	it('ignores a request for another agent, and one made where there is no panel', async () => {
		const { wrapper, options } = setup();
		agentsEventBus.emit('evalFixRequested', { ...request, agentId: 'other' });
		await flushPromises();
		wrapper.unmount();

		const blocked = setup({ enabled: () => false });
		agentsEventBus.emit('evalFixRequested', request);
		await flushPromises();

		expect(options.handoff).not.toHaveBeenCalled();
		expect(blocked.options.handoff).not.toHaveBeenCalled();
		blocked.wrapper.unmount();
	});

	it('runs the checks again once the Assistant has changed the instructions, and offers undo', async () => {
		const { wrapper, store, options, instructions, building } = setup();
		agentsEventBus.emit('evalFixRequested', request);
		await flushPromises();

		building.value = true;
		await nextTick();
		instructions.value = 'Be brief. Decline off-topic requests.';
		building.value = false;
		await flushPromises();

		expect(options.refreshConfig).toHaveBeenCalled();
		expect(store.startRun).toHaveBeenCalledWith('p1', 'a1', 'ds-1');
		const toast = readToast(0);
		expect(toast.text).toBe('Updated your instructions. Running all 4 checks again.');
		expect(toast.undo).toBeDefined();

		toast.undo?.();
		await flushPromises();

		expect(close).toHaveBeenCalled();
		expect(options.writeInstructions).toHaveBeenCalledWith('Be brief.');
		expect(store.startRun).toHaveBeenCalledTimes(2);
		expect(readToast(1).text).toBe('Put your instructions back. Running all 4 checks again.');
		wrapper.unmount();
	});

	it('runs the checks again without undo when the instructions did not change', async () => {
		const { wrapper, store, building } = setup();
		agentsEventBus.emit('evalFixRequested', request);
		await flushPromises();

		building.value = true;
		await nextTick();
		building.value = false;
		await flushPromises();

		expect(store.startRun).toHaveBeenCalledTimes(1);
		const toast = readToast(0);
		expect(toast.text).toBe('Running all 4 checks again.');
		expect(toast.undo).toBeUndefined();
		wrapper.unmount();
	});

	it('runs nothing after a build that no hand-off asked for', async () => {
		const { wrapper, store, building } = setup();

		building.value = true;
		await nextTick();
		building.value = false;
		await flushPromises();

		expect(store.startRun).not.toHaveBeenCalled();
		wrapper.unmount();
	});

	it('does not run again when the undo could not be saved', async () => {
		const { wrapper, store, instructions, building } = setup({
			writeInstructions: vi.fn(async () => false),
		});
		agentsEventBus.emit('evalFixRequested', request);
		await flushPromises();
		building.value = true;
		await nextTick();
		instructions.value = 'Changed.';
		building.value = false;
		await flushPromises();

		readToast(0).undo?.();
		await flushPromises();

		expect(showError).toHaveBeenCalledWith(expect.any(Error), 'Couldn’t undo the change');
		expect(store.startRun).toHaveBeenCalledTimes(1);
		wrapper.unmount();
	});

	it('offers the fix action again once the Assistant panel closes', async () => {
		const { wrapper, store, shown } = setup();
		shown.value = true;
		await nextTick();
		shown.value = false;
		await nextTick();

		expect(store.setEvalFixInAssistant).toHaveBeenCalledWith('a1', false);
		wrapper.unmount();
	});
});
