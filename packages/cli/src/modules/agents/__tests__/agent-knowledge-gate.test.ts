import { NotFoundError } from '@n8n/errors';

import { makeAgentKnowledgeGate } from './test-utils/agent-knowledge-gate';

describe('AgentKnowledgeGate', () => {
	it('mirrors the knowledge module file-knowledge availability', () => {
		expect(makeAgentKnowledgeGate().isEnabled()).toBe(true);
		expect(makeAgentKnowledgeGate({ sandboxEnabled: false }).isEnabled()).toBe(false);
		expect(makeAgentKnowledgeGate({ knowledgeActive: false }).isEnabled()).toBe(false);
	});

	it('rejects with the pre-existing sandbox gate message when either input is off', () => {
		expect(() => makeAgentKnowledgeGate().assertEnabled()).not.toThrow();

		for (const gate of [
			makeAgentKnowledgeGate({ sandboxEnabled: false }),
			makeAgentKnowledgeGate({ knowledgeActive: false }),
		]) {
			expect(() => gate.assertEnabled()).toThrow(NotFoundError);
			expect(() => gate.assertEnabled()).toThrow('Agent knowledge base is not enabled');
		}
	});
});
