import {
	AGENT_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	ZENDESK_TRIGGER_NODE_TYPE,
} from '@/constants';
import { adjustNewNodes } from '@/utils/connectionNodeUtils';
import { createPinia, setActivePinia } from 'pinia';

const getsourceNodesByDepth = vi.fn();
const getNode = vi.fn();
vi.mock('@/stores/workflow.store', () => ({
	useWorkflowsStore: vi.fn(() => ({
		getsourceNodesByDepth,
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
		const source = { type: CHAT_TRIGGER_NODE_TYPE };
		const target = { type: AGENT_NODE_TYPE };

		adjustNewNodes(source, target, { sourceIsNew: false });

		expect(target).toEqual({
			type: AGENT_NODE_TYPE,
			parameters: {
				promptType: 'auto',
				text: '={{ $json.chatInput }}',
			},
		});
	});

	it('modifies promptType with new ChatTrigger->new Agent', () => {
		const source = { type: CHAT_TRIGGER_NODE_TYPE };
		const target = { type: AGENT_NODE_TYPE };

		adjustNewNodes(source, target);

		expect(target).toEqual({
			type: AGENT_NODE_TYPE,
			parameters: {
				promptType: 'auto',
				text: '={{ $json.chatInput }}',
			},
		});
	});

	it('does not modify promptType with ManualTrigger->new Agent', () => {
		const source = { type: MANUAL_TRIGGER_NODE_TYPE };
		const target = { type: AGENT_NODE_TYPE };

		adjustNewNodes(source, target, { sourceIsNew: false });

		expect(target).toEqual({
			type: AGENT_NODE_TYPE,
		});
	});

	it('does not modify promptType with OtherTrigger->new Agent', () => {
		const source = { type: ZENDESK_TRIGGER_NODE_TYPE };
		const target = { type: AGENT_NODE_TYPE };

		adjustNewNodes(source, target, { sourceIsNew: false });

		expect(target).toEqual({
			type: AGENT_NODE_TYPE,
		});
	});

	it('does not modify sessionId with ChatTrigger->(new Memory->Agent)', () => {
		const trigger = { type: CHAT_TRIGGER_NODE_TYPE, name: 'trigger' };
		getsourceNodesByDepth.mockReturnValue([{ name: trigger.name }]);
		getNode.mockReturnValue({ type: trigger.type });

		const target = { type: AGENT_NODE_TYPE };
		const source = { type: '@n8n/n8n-nodes-langchain.memoryBufferWindow' };

		adjustNewNodes(source, target, { targetIsNew: false });

		expect(source).toEqual({
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
		});
	});

	it('does modify sessionId with ManualTrigger->(new Memory->Agent)', () => {
		const trigger = { type: MANUAL_TRIGGER_NODE_TYPE, name: 'trigger' };
		getsourceNodesByDepth.mockReturnValue([{ name: trigger.name }]);
		getNode.mockReturnValue({ type: trigger.type });

		const target = { type: AGENT_NODE_TYPE, name: 'myAgent' };
		const source = { type: '@n8n/n8n-nodes-langchain.memoryBufferWindow' };

		adjustNewNodes(source, target, { targetIsNew: false });

		expect(source).toEqual({
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			parameters: { sessionIdType: 'customKey' },
		});
	});

	it('does modify sessionId with OtherTrigger->(new Memory->Agent)', () => {
		const trigger = { type: ZENDESK_TRIGGER_NODE_TYPE, name: 'trigger' };
		getsourceNodesByDepth.mockReturnValue([{ name: trigger.name }]);
		getNode.mockReturnValue({ type: trigger.type });

		const target = { type: AGENT_NODE_TYPE, name: 'myAgent' };
		const source = { type: '@n8n/n8n-nodes-langchain.memoryBufferWindow' };

		adjustNewNodes(source, target, { targetIsNew: false });

		expect(source).toEqual({
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			parameters: { sessionIdType: 'customKey' },
		});
	});
});
