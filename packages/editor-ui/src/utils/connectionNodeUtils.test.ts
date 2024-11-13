import { useWorkflowsStore } from '@/stores/workflows.store';
import { AGENT_NODE_TYPE, CHAT_TRIGGER_NODE_TYPE, MANUAL_TRIGGER_NODE_TYPE } from '@/constants';
import { adjustNewNodes } from '@/utils/connectionNodeUtils';
import { createPinia, setActivePinia } from 'pinia';

const getParentNodesByDepth = vi.fn();
const getNode = vi.fn();
vi.mock('@/stores/workflow.store', () => ({
	useWorkflowsStore: vi.fn(() => ({
		getParentNodesByDepth,
		getNode,
	})),
}));

describe('adjustNewlyConnectedNodes', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('modifies promptType with ChatTrigger->new Agent', () => {
		const parent = { type: CHAT_TRIGGER_NODE_TYPE };
		const child = { type: AGENT_NODE_TYPE };
		adjustNewNodes(parent, child, { parentIsNew: false });
		expect(child).toEqual({
			type: AGENT_NODE_TYPE,
		});
	});

	it('modifies promptType with new ChatTrigger->new Agent', () => {
		const parent = { type: CHAT_TRIGGER_NODE_TYPE };
		const child = { type: AGENT_NODE_TYPE };
		adjustNewNodes(parent, child);
		expect(child).toEqual({
			type: AGENT_NODE_TYPE,
		});
	});

	it('does not modify promptType with ManualTrigger->new Agent', () => {
		const parent = { type: MANUAL_TRIGGER_NODE_TYPE };
		const child = { type: AGENT_NODE_TYPE };
		adjustNewNodes(parent, child, { parentIsNew: false });
		expect(child).toEqual({
			type: AGENT_NODE_TYPE,
			parameters: { promptType: 'define' },
		});
	});

	it('modifies sessionId with ChatTrigger->(new Memory->Agent)', () => {
		const trigger = { type: CHAT_TRIGGER_NODE_TYPE, name: 'trigger' };
		getParentNodesByDepth.mockReturnValue([{ name: trigger.name }]);
		getNode.mockReturnValue({ type: trigger.type });

		const child = { type: AGENT_NODE_TYPE };
		const parent = { type: '@n8n/n8n-nodes-langchain.memoryBufferWindow' };
		adjustNewNodes(parent, child, { childIsNew: false });
		expect(parent).toEqual({
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
		});
	});

	it('does not modify sessionId with ManualTrigger->(new Memory->Agent)', () => {
		const trigger = { type: MANUAL_TRIGGER_NODE_TYPE, name: 'trigger' };
		getParentNodesByDepth.mockReturnValue([{ name: trigger.name }]);
		getNode.mockReturnValue({ type: trigger.type });

		const child = { type: AGENT_NODE_TYPE, name: 'myAgent' };
		const parent = { type: '@n8n/n8n-nodes-langchain.memoryBufferWindow' };
		adjustNewNodes(parent, child, { childIsNew: false });
		expect(parent).toEqual({
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			parameters: { sessionIdType: 'customKey' },
		});
	});
});
