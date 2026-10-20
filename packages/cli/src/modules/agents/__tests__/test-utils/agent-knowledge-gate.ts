import { makeKnowledgeAvailability } from '@/modules/knowledge/__tests__/test-utils/knowledge-availability';

import { AgentKnowledgeGate } from '../../agent-knowledge-gate';

/** A real gate over a real `KnowledgeAvailability` with mocked settings. Both inputs default to on. */
export function makeAgentKnowledgeGate(
	options: { sandboxEnabled?: boolean; knowledgeActive?: boolean } = {},
): AgentKnowledgeGate {
	return new AgentKnowledgeGate(makeKnowledgeAvailability(options));
}
