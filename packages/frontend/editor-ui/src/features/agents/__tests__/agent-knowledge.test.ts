import { describe, expect, it } from 'vitest';
import type { AgentKnowledgeEntry } from '@n8n/api-types';

import type { AgentJsonConfig } from '../types';
import {
	doesKnowledgeEntryMatchSearch,
	isEpisodicKnowledgeEnabled,
} from '../utils/agent-knowledge';

function makeEntry(overrides: Partial<AgentKnowledgeEntry> = {}): AgentKnowledgeEntry {
	return {
		id: 'entry-1',
		content: 'The launch package is called Launch Concierge.',
		createdAt: '2026-05-19T09:00:00.000Z',
		updatedAt: '2026-05-19T10:00:00.000Z',
		lastSeenAt: '2026-05-19T10:00:00.000Z',
		sourceCount: 1,
		sources: [
			{
				id: 'source-1',
				threadId: 'thread-1',
				threadTitle: 'Launch naming',
				threadSessionNumber: 7,
				observationId: 'observation-1',
				observationMarker: 'critical',
				observationText: 'User named the launch package Launch Concierge.',
				observationCreatedAt: '2026-05-19T09:04:00.000Z',
				evidenceText: 'We are calling this package Launch Concierge.',
				createdAt: '2026-05-19T09:05:00.000Z',
			},
		],
		...overrides,
	};
}

describe('agent knowledge', () => {
	it('is enabled only when session memory and episodic memory are both enabled', () => {
		expect(
			isEpisodicKnowledgeEnabled({
				memory: {
					enabled: true,
					storage: 'n8n',
					episodicMemory: { enabled: true, credential: 'credential-1' },
				},
			} as AgentJsonConfig),
		).toBe(true);

		expect(
			isEpisodicKnowledgeEnabled({
				memory: {
					enabled: true,
					storage: 'n8n',
					episodicMemory: { enabled: false },
				},
			} as AgentJsonConfig),
		).toBe(false);

		expect(
			isEpisodicKnowledgeEnabled({
				memory: {
					enabled: false,
					storage: 'n8n',
					episodicMemory: { enabled: true, credential: 'credential-1' },
				},
			} as AgentJsonConfig),
		).toBe(false);
	});

	it('matches knowledge entries by content and trace text', () => {
		const entry = makeEntry();

		expect(doesKnowledgeEntryMatchSearch(entry, 'launch package')).toBe(true);
		expect(doesKnowledgeEntryMatchSearch(entry, 'launch naming')).toBe(true);
		expect(doesKnowledgeEntryMatchSearch(entry, 'calling this package')).toBe(true);
		expect(doesKnowledgeEntryMatchSearch(entry, 'invoice routing')).toBe(false);
	});
});
