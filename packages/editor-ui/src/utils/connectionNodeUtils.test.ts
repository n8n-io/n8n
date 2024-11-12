import { AGENT_NODE_TYPE, CHAT_TRIGGER_NODE_TYPE, MANUAL_TRIGGER_NODE_TYPE } from '@/constants';
import { adjustNewlyConnectedNodes } from './connectionNodeUtils';

describe('adjustNewlyConnectedNodes', () => {
	it('modifies promptType with ChatTrigger->Agent', () => {
		const parent = { type: CHAT_TRIGGER_NODE_TYPE };
		const child = { type: AGENT_NODE_TYPE };
		adjustNewlyConnectedNodes(parent, child);
		expect(child).toEqual({
			type: AGENT_NODE_TYPE,
			parameters: { promptType: 'define' },
		});
	});
	it('does not modify promptType with ManualTrigger->Agent', () => {
		const parent = { type: MANUAL_TRIGGER_NODE_TYPE };
		const child = { type: AGENT_NODE_TYPE };
		adjustNewlyConnectedNodes(parent, child);
		expect(child).toEqual({
			type: AGENT_NODE_TYPE,
		});
	});

	it('modifies sessionId with ChatTrigger->Memory', () => {
		const parent = { type: CHAT_TRIGGER_NODE_TYPE };
		const child = { type: 'memoryBufferWindow' };
		adjustNewlyConnectedNodes(parent, child);
		expect(child).toEqual({
			type: 'memoryBufferWindow',
		});
	});

	it('does not modify sessionId with ManualTrigger->Memory', () => {
		const parent = { type: MANUAL_TRIGGER_NODE_TYPE };
		const child = { type: 'memoryBufferWindow' };
		adjustNewlyConnectedNodes(parent, child);
		expect(child).toEqual({
			type: 'memoryBufferWindow',
			parameters: { sessionIdType: 'customKey' },
		});
	});
});
