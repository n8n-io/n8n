import {
	buildN8nEpisodicMemoryExtractorPrompt,
	buildN8nEpisodicMemoryReflectorPrompt,
	DEFAULT_EPISODIC_MEMORY_EMBEDDING_MODEL,
	DEFAULT_EPISODIC_MEMORY_EXTRACTION_PROMPT,
	DEFAULT_EPISODIC_MEMORY_REFLECTION_PROMPT,
} from '../episodic-memory';

describe('n8n episodic memory policy', () => {
	it('uses the n8n episodic memory defaults', () => {
		expect(DEFAULT_EPISODIC_MEMORY_EMBEDDING_MODEL).toBe('openai/text-embedding-3-small');
		expect(DEFAULT_EPISODIC_MEMORY_EXTRACTION_PROMPT).toContain('Return JSON only');
		expect(DEFAULT_EPISODIC_MEMORY_EXTRACTION_PROMPT).toContain('"sources"');
		expect(DEFAULT_EPISODIC_MEMORY_EXTRACTION_PROMPT).toContain('"observationId"');
		expect(DEFAULT_EPISODIC_MEMORY_EXTRACTION_PROMPT).toContain(
			'separate sources with the exact evidence from each observation',
		);
		expect(DEFAULT_EPISODIC_MEMORY_EXTRACTION_PROMPT).toContain(
			'Do not extract failed memory lookups',
		);
		expect(DEFAULT_EPISODIC_MEMORY_EXTRACTION_PROMPT).toContain(
			'Only store assistant-proposed material when the user adopts',
		);
		expect(DEFAULT_EPISODIC_MEMORY_EXTRACTION_PROMPT).toContain(
			'Similar but distinct cases stay separate',
		);
		expect(DEFAULT_EPISODIC_MEMORY_EXTRACTION_PROMPT).toContain('assistant proposed');
		expect(DEFAULT_EPISODIC_MEMORY_EXTRACTION_PROMPT).not.toContain('supersedes');
		expect(DEFAULT_EPISODIC_MEMORY_EXTRACTION_PROMPT).not.toContain('supersession');
	});

	it('builds the extractor prompt from observations and existing entries', () => {
		const prompt = buildN8nEpisodicMemoryExtractorPrompt({
			scope: { resourceId: 'user-1' },
			observationScope: {
				scopeKind: 'thread',
				scopeId: 'thread:thread-1:resource:user-1',
			},
			now: new Date('2026-05-12T15:00:00.000Z'),
			observations: [
				{
					id: 'obs-1',
					scopeKind: 'thread',
					scopeId: 'thread:thread-1:resource:user-1',
					marker: 'critical',
					text: 'User switched memory store choice to Postgres.',
					parentId: null,
					tokenCount: 12,
					status: 'active',
					supersededBy: null,
					createdAt: new Date('2026-05-12T14:30:00.000Z'),
				},
			],
			renderedObservations: '',
			existingEntries: [
				{
					id: 'mem-1',
					resourceId: 'user-1',
					content: 'User planned SQLite for local-first memory storage.',
					contentHash: 'hash-1',
					status: 'active',
					supersededBy: null,
					metadata: null,
					createdAt: new Date('2026-05-11T10:00:00.000Z'),
					updatedAt: new Date('2026-05-11T10:00:00.000Z'),
					lastSeenAt: new Date('2026-05-11T10:00:00.000Z'),
					lexicalScore: 1,
					vectorScore: 1,
					rrfScore: 1,
					finalScore: 1,
				},
			],
		});

		expect(prompt).toContain('Current timestamp: 2026-05-12T15:00:00.000Z');
		expect(prompt).toContain('Scope: resource:user-1');
		expect(prompt).toContain('[obs-1] CRITICAL 2026-05-12T14:30:00.000Z');
		expect(prompt).toContain('User switched memory store choice to Postgres.');
		expect(prompt).toContain('[mem-1] User planned SQLite for local-first memory storage.');
	});

	it('uses an episodic memory reflection prompt for lifecycle decisions', () => {
		expect(DEFAULT_EPISODIC_MEMORY_REFLECTION_PROMPT).toContain('Return JSON only');
		expect(DEFAULT_EPISODIC_MEMORY_REFLECTION_PROMPT).toContain('"drop"');
		expect(DEFAULT_EPISODIC_MEMORY_REFLECTION_PROMPT).toContain('"merge"');
		expect(DEFAULT_EPISODIC_MEMORY_REFLECTION_PROMPT).toContain('same case');
		expect(DEFAULT_EPISODIC_MEMORY_REFLECTION_PROMPT).toContain('Similar but distinct');
		expect(DEFAULT_EPISODIC_MEMORY_REFLECTION_PROMPT).toContain('conservative');
	});

	it('builds the reflector prompt from active entries and source evidence', () => {
		const prompt = buildN8nEpisodicMemoryReflectorPrompt({
			scope: { resourceId: 'user-1' },
			now: new Date('2026-05-12T15:00:00.000Z'),
			seedEntryIds: ['mem-2'],
			entries: [
				{
					id: 'mem-1',
					resourceId: 'user-1',
					content: 'User planned SQLite for local-first memory storage.',
					contentHash: 'hash-1',
					status: 'active',
					supersededBy: null,
					metadata: null,
					createdAt: new Date('2026-05-11T10:00:00.000Z'),
					updatedAt: new Date('2026-05-11T10:00:00.000Z'),
					lastSeenAt: new Date('2026-05-11T10:00:00.000Z'),
					lexicalScore: 1,
					vectorScore: 1,
					rrfScore: 1,
					finalScore: 1,
				},
			],
			sources: [
				{
					id: 'source-1',
					memoryEntryId: 'mem-1',
					observationId: 'obs-1',
					threadId: 'thread-1',
					evidenceText: 'User planned SQLite',
					createdAt: new Date('2026-05-11T10:00:00.000Z'),
				},
			],
		});

		expect(prompt).toContain('Current timestamp: 2026-05-12T15:00:00.000Z');
		expect(prompt).toContain('Scope: resource:user-1');
		expect(prompt).toContain('Seed entry IDs: mem-2');
		expect(prompt).toContain('[mem-1] User planned SQLite for local-first memory storage.');
		expect(prompt).toContain('source observation obs-1');
		expect(prompt).toContain('User planned SQLite');
	});
});
