import {
	DEFAULT_EPISODIC_MEMORY_EMBEDDING_MODEL,
	DEFAULT_EPISODIC_MEMORY_EXTRACTION_PROMPT,
	DEFAULT_EPISODIC_MEMORY_REFLECTION_PROMPT,
	buildEpisodicMemoryExtractorPrompt,
	buildEpisodicMemoryReflectorPrompt,
} from '../episodic-memory-defaults';

describe('episodic memory defaults', () => {
	it('defines the default extraction and reflection policy', () => {
		expect(DEFAULT_EPISODIC_MEMORY_EMBEDDING_MODEL).toBe('openai/text-embedding-3-small');
		expect(DEFAULT_EPISODIC_MEMORY_EXTRACTION_PROMPT).toContain('Return JSON only');
		expect(DEFAULT_EPISODIC_MEMORY_EXTRACTION_PROMPT).toContain('"sources"');
		expect(DEFAULT_EPISODIC_MEMORY_EXTRACTION_PROMPT).toContain('"observationId"');
		expect(DEFAULT_EPISODIC_MEMORY_EXTRACTION_PROMPT).toContain(
			'Only store assistant-proposed material when the user adopts',
		);
		expect(DEFAULT_EPISODIC_MEMORY_EXTRACTION_PROMPT).not.toContain('supersedes');
		expect(DEFAULT_EPISODIC_MEMORY_REFLECTION_PROMPT).toContain('Return JSON only');
		expect(DEFAULT_EPISODIC_MEMORY_REFLECTION_PROMPT).toContain('"drop"');
		expect(DEFAULT_EPISODIC_MEMORY_REFLECTION_PROMPT).toContain('"merge"');
		expect(DEFAULT_EPISODIC_MEMORY_REFLECTION_PROMPT).toContain('Similar but distinct');
	});

	it('builds extractor and reflector prompts from runtime inputs', () => {
		const now = new Date('2026-05-12T15:00:00.000Z');
		const createdAt = new Date('2026-05-12T14:30:00.000Z');
		const entry = {
			id: 'mem-1',
			agentId: 'agent-1',
			resourceId: 'user-1',
			content: 'User planned SQLite for local-first memory storage.',
			contentHash: 'hash-1',
			status: 'active' as const,
			supersededBy: null,
			metadata: null,
			createdAt,
			updatedAt: createdAt,
			lastSeenAt: createdAt,
			lexicalScore: 1,
			vectorScore: 1,
			rrfScore: 1,
			recencyFactor: 1,
			finalScore: 1,
		};

		const extractorPrompt = buildEpisodicMemoryExtractorPrompt({
			scope: { agentId: 'agent-1', resourceId: 'user-1' },
			observationScope: {
				scopeKind: 'thread',
				scopeId: 'thread:thread-1:resource:user-1',
			},
			now,
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
					createdAt,
				},
			],
			renderedObservations: '',
			existingEntries: [entry],
		});
		const reflectorPrompt = buildEpisodicMemoryReflectorPrompt({
			scope: { agentId: 'agent-1', resourceId: 'user-1' },
			now,
			seedEntryIds: ['mem-1'],
			entries: [entry],
			sources: [
				{
					id: 'source-1',
					memoryEntryId: 'mem-1',
					observationId: 'obs-1',
					threadId: 'thread-1',
					evidenceText: 'User planned SQLite',
					createdAt,
				},
			],
		});

		expect(extractorPrompt).toContain('Scope: agent:agent-1:resource:user-1');
		expect(extractorPrompt).toContain('[obs-1] CRITICAL 2026-05-12T14:30:00.000Z');
		expect(extractorPrompt).toContain(
			'[mem-1] User planned SQLite for local-first memory storage.',
		);
		expect(reflectorPrompt).toContain('Seed entry IDs: mem-1');
		expect(reflectorPrompt).toContain('source observation obs-1');
		expect(reflectorPrompt).toContain('User planned SQLite');
	});
});
