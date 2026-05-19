import { describe, expect, it } from 'vitest';
import type { AgentKnowledgeEntry } from '@n8n/api-types';

import {
	areKnowledgeEntriesEquivalent,
	doesKnowledgeEntryMatchSearch,
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
	it('detects unchanged knowledge entries', () => {
		const entry = makeEntry();

		expect(areKnowledgeEntriesEquivalent([], [])).toBe(true);
		expect(areKnowledgeEntriesEquivalent([entry], [makeEntry()])).toBe(true);
		expect(
			areKnowledgeEntriesEquivalent(
				[entry],
				[makeEntry({ lastSeenAt: '2026-05-19T11:00:00.000Z' })],
			),
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
