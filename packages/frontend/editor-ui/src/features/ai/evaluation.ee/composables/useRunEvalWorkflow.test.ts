import { describe, it, expect, vi, beforeEach } from 'vitest';

import { nodeViewEventBus } from '@/app/event-bus';
import { CHAT_TRIGGER_NODE_TYPE } from '@/app/constants';

type MockNode = { name: string; type: string; disabled?: boolean };

const { mocks } = vi.hoisted(() => ({
	mocks: {
		allNodes: [] as MockNode[],
		runEntireWorkflow: vi.fn(),
	},
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => ({
		value: {
			get allNodes() {
				return mocks.allNodes;
			},
		},
	}),
}));

vi.mock('@/app/composables/useRunWorkflow', () => ({
	useRunWorkflow: () => ({ runEntireWorkflow: mocks.runEntireWorkflow }),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		isTriggerNode: (type: string) => type.toLowerCase().includes('trigger'),
	}),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRouter: () => ({ push: vi.fn() }),
}));

import { useRunEvalWorkflow } from './useRunEvalWorkflow';

describe('useRunEvalWorkflow', () => {
	beforeEach(() => {
		mocks.allNodes = [];
		mocks.runEntireWorkflow.mockReset();
		vi.restoreAllMocks();
	});

	it('runs the workflow directly when there is no chat trigger', () => {
		const emitSpy = vi.spyOn(nodeViewEventBus, 'emit');
		mocks.allNodes = [{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' }];

		const { runWorkflow } = useRunEvalWorkflow();
		runWorkflow();

		expect(mocks.runEntireWorkflow).toHaveBeenCalledWith('main');
		expect(emitSpy).not.toHaveBeenCalledWith('openChat');
	});

	it('opens the chat panel instead of executing for chat-trigger workflows', () => {
		const emitSpy = vi.spyOn(nodeViewEventBus, 'emit');
		mocks.allNodes = [{ name: 'When chat message received', type: CHAT_TRIGGER_NODE_TYPE }];

		const { runWorkflow } = useRunEvalWorkflow();
		runWorkflow();

		expect(emitSpy).toHaveBeenCalledWith('openChat');
		expect(mocks.runEntireWorkflow).not.toHaveBeenCalled();
	});

	it('ignores a disabled chat trigger and runs the workflow', () => {
		const emitSpy = vi.spyOn(nodeViewEventBus, 'emit');
		mocks.allNodes = [
			{ name: 'When chat message received', type: CHAT_TRIGGER_NODE_TYPE, disabled: true },
			{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' },
		];

		const { runWorkflow } = useRunEvalWorkflow();
		runWorkflow();

		expect(mocks.runEntireWorkflow).toHaveBeenCalledWith('main');
		expect(emitSpy).not.toHaveBeenCalledWith('openChat');
	});

	it('lists enabled trigger nodes', () => {
		mocks.allNodes = [
			{ name: 'Trigger A', type: 'n8n-nodes-base.manualTrigger' },
			{ name: 'Disabled', type: 'n8n-nodes-base.scheduleTrigger', disabled: true },
			{ name: 'Not a trigger', type: 'n8n-nodes-base.set' },
			{ name: 'Trigger B', type: 'n8n-nodes-base.chatTrigger' },
		];

		const { triggerNodes } = useRunEvalWorkflow();

		expect(triggerNodes.value.map((t) => t.name)).toEqual(['Trigger A', 'Trigger B']);
	});

	it('runs a specific trigger node directly', () => {
		const emitSpy = vi.spyOn(nodeViewEventBus, 'emit');
		const { runTriggerNode } = useRunEvalWorkflow();

		runTriggerNode({ name: 'Trigger A', type: 'n8n-nodes-base.manualTrigger' });

		expect(mocks.runEntireWorkflow).toHaveBeenCalledWith('node', 'Trigger A');
		expect(emitSpy).not.toHaveBeenCalledWith('openChat');
	});

	it('opens the chat panel when the chosen trigger is a chat trigger', () => {
		const emitSpy = vi.spyOn(nodeViewEventBus, 'emit');
		const { runTriggerNode } = useRunEvalWorkflow();

		runTriggerNode({ name: 'When chat message received', type: CHAT_TRIGGER_NODE_TYPE });

		expect(emitSpy).toHaveBeenCalledWith('openChat');
		expect(mocks.runEntireWorkflow).not.toHaveBeenCalled();
	});
});
