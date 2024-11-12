import { AGENT_NODE_TYPE, CHAT_TRIGGER_NODE_TYPE, MANUAL_TRIGGER_NODE_TYPE } from '@/constants';
import { adjustNewlyConnectedNodes } from './connectionNodeUtils';

describe('adjustNewlyConnectedNodes', () => {
	it('modifies promptType with ChatTrigger->Agent', () => {
		const parent = { type: CHAT_TRIGGER_NODE_TYPE };
		const child = { type: AGENT_NODE_TYPE };
		adjustNewlyConnectedNodes(parent, child);
		expect(child).toEqual({
			type: AGENT_NODE_TYPE,
		});
	});
	it('does not modify promptType with ManualTrigger->Agent', () => {
		const parent = { type: MANUAL_TRIGGER_NODE_TYPE };
		const child = { type: AGENT_NODE_TYPE };
		adjustNewlyConnectedNodes(parent, child);
		expect(child).toEqual({
			type: AGENT_NODE_TYPE,
			parameters: { promptType: 'define' },
		});
	});

	it('modifies sessionId with ChatTrigger->Memory', () => {
		const parent = { type: CHAT_TRIGGER_NODE_TYPE };
		const child = { type: '@n8n/n8n-nodes-langchain.memoryBufferWindow' };
		adjustNewlyConnectedNodes(parent, child);
		expect(child).toEqual({
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
		});
	});

	it('does not modify sessionId with ManualTrigger->Memory', () => {
		const parent = { type: MANUAL_TRIGGER_NODE_TYPE };
		const child = { type: '@n8n/n8n-nodes-langchain.memoryBufferWindow' };
		adjustNewlyConnectedNodes(parent, child);
		expect(child).toEqual({
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			parameters: { sessionIdType: 'customKey' },
		});
	});
});
