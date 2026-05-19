import type { AgentKnowledgeEntry } from '@n8n/api-types';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAgentKnowledgeStore } from '../agentKnowledge.store';
import { getAgentKnowledge } from '../composables/useAgentApi';
import {
	areKnowledgeEntriesEquivalent,
	doesKnowledgeEntryMatchSearch,
} from '../utils/agent-knowledge';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

vi.mock('../composables/useAgentApi', () => ({
	getAgentKnowledge: vi.fn(),
}));

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

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((resolver) => {
		resolve = resolver;
	});
	return { promise, resolve };
}

describe('agent knowledge', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.mocked(getAgentKnowledge).mockReset();
	});

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

	it('clears visible loading when a silent fetch supersedes it', async () => {
		type KnowledgeResponse = Awaited<ReturnType<typeof getAgentKnowledge>>;
		const visibleFetch = deferred<KnowledgeResponse>();
		const silentFetch = deferred<KnowledgeResponse>();
		vi.mocked(getAgentKnowledge)
			.mockReturnValueOnce(visibleFetch.promise)
			.mockReturnValueOnce(silentFetch.promise);
		const store = useAgentKnowledgeStore();

		const visiblePromise = store.fetchKnowledge('project-1', 'agent-1');
		expect(store.loading).toBe(true);

		const silentPromise = store.fetchKnowledge('project-2', 'agent-2', { silent: true });
		silentFetch.resolve({ enabled: true, entries: [makeEntry({ id: 'entry-2' })] });
		await silentPromise;

		expect(store.loading).toBe(false);

		visibleFetch.resolve({ enabled: true, entries: [makeEntry({ id: 'entry-1' })] });
		await visiblePromise;
		expect(store.entries).toEqual([makeEntry({ id: 'entry-2' })]);
	});
});
