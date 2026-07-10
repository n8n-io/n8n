import {
	AgentJsonConfigSchema,
	findVectorStoreToolNameCollisions,
} from '../agent-json-config.schema';

const minimalConfig = {
	name: 'test-agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Help the user.',
};

describe('AgentJsonConfigSchema — tools', () => {
	describe('custom tool id field', () => {
		it('accepts a valid alphanumeric id', () => {
			const result = AgentJsonConfigSchema.safeParse({
				...minimalConfig,
				tools: [{ type: 'custom', id: 'my_tool' }],
			});
			expect(result.success).toBe(true);
		});

		it('accepts an id with underscores', () => {
			const result = AgentJsonConfigSchema.safeParse({
				...minimalConfig,
				tools: [{ type: 'custom', id: 'my_tool_v2' }],
			});
			expect(result.success).toBe(true);
		});

		it('rejects an id with hyphens', () => {
			const result = AgentJsonConfigSchema.safeParse({
				...minimalConfig,
				tools: [{ type: 'custom', id: 'my-tool' }],
			});
			expect(result.success).toBe(false);
		});

		it('rejects an id with spaces', () => {
			const result = AgentJsonConfigSchema.safeParse({
				...minimalConfig,
				tools: [{ type: 'custom', id: 'my tool' }],
			});
			expect(result.success).toBe(false);
		});

		it('rejects an id with special characters', () => {
			const result = AgentJsonConfigSchema.safeParse({
				...minimalConfig,
				tools: [{ type: 'custom', id: 'tool!' }],
			});
			expect(result.success).toBe(false);
		});

		it('rejects an empty id', () => {
			const result = AgentJsonConfigSchema.safeParse({
				...minimalConfig,
				tools: [{ type: 'custom', id: '' }],
			});
			expect(result.success).toBe(false);
		});
	});

	describe('custom tool id uniqueness refine', () => {
		it('accepts multiple custom tools with distinct ids', () => {
			const result = AgentJsonConfigSchema.safeParse({
				...minimalConfig,
				tools: [
					{ type: 'custom', id: 'tool_a' },
					{ type: 'custom', id: 'tool_b' },
				],
			});
			expect(result.success).toBe(true);
		});

		it('rejects multiple custom tools with the same id', () => {
			const result = AgentJsonConfigSchema.safeParse({
				...minimalConfig,
				tools: [
					{ type: 'custom', id: 'duplicate' },
					{ type: 'custom', id: 'duplicate' },
				],
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.errors[0].message).toBe('Duplicate custom tool id: "duplicate"');
			}
		});

		it('does not apply the uniqueness check to non-custom tool types', () => {
			const result = AgentJsonConfigSchema.safeParse({
				...minimalConfig,
				tools: [
					{ type: 'custom', id: 'unique_custom' },
					{ type: 'workflow', workflow: 'My Workflow' },
					{ type: 'workflow', workflow: 'My Workflow' },
				],
			});
			expect(result.success).toBe(true);
		});

		it('accepts an empty tools array', () => {
			const result = AgentJsonConfigSchema.safeParse({ ...minimalConfig, tools: [] });
			expect(result.success).toBe(true);
		});
	});
});

describe('AgentJsonConfigSchema — personalisation', () => {
	it('accepts an icon with a persisted gradient', () => {
		const result = AgentJsonConfigSchema.safeParse({
			...minimalConfig,
			personalisation: {
				icon: 'bot',
				gradient: {
					from: '#FF1500',
					to: '#FF6900',
					angle: 42,
					fromStop: 12,
					toStop: 88,
				},
			},
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.personalisation).toEqual({
				icon: 'bot',
				gradient: {
					from: '#FF1500',
					to: '#FF6900',
					angle: 42,
					fromStop: 12,
					toStop: 88,
				},
			});
		}
	});

	it('adds the default gradient when only the icon is provided', () => {
		const result = AgentJsonConfigSchema.safeParse({
			...minimalConfig,
			personalisation: {
				icon: 'mail',
			},
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.personalisation).toEqual({
				icon: 'mail',
				gradient: {
					from: '#FF1500',
					to: '#FF6900',
					angle: 135,
					fromStop: 0,
					toStop: 100,
				},
			});
		}
	});

	it('rejects invalid gradient colors', () => {
		const result = AgentJsonConfigSchema.safeParse({
			...minimalConfig,
			personalisation: {
				icon: 'bot',
				gradient: {
					from: 'red',
					to: '#FF6900',
				},
			},
		});

		expect(result.success).toBe(false);
	});
});

describe('AgentJsonConfigSchema — config.promptCaching', () => {
	it.each([true, false])('accepts promptCaching with enabled=%s', (enabled) => {
		const result = AgentJsonConfigSchema.safeParse({
			...minimalConfig,
			config: { promptCaching: { enabled } },
		});
		expect(result.success).toBe(true);
	});

	it('rejects promptCaching without an enabled field', () => {
		const result = AgentJsonConfigSchema.safeParse({
			...minimalConfig,
			config: { promptCaching: {} },
		});
		expect(result.success).toBe(false);
	});

	it.each(['5m', '1h'] as const)('accepts an Anthropic ttl of %s', (ttl) => {
		const result = AgentJsonConfigSchema.safeParse({
			...minimalConfig,
			config: { promptCaching: { enabled: true, anthropic: { ttl } } },
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.config?.promptCaching).toEqual({ enabled: true, anthropic: { ttl } });
		}
	});

	it('accepts an anthropic sub-object with no ttl', () => {
		const result = AgentJsonConfigSchema.safeParse({
			...minimalConfig,
			config: { promptCaching: { enabled: true, anthropic: {} } },
		});
		expect(result.success).toBe(true);
	});

	it('rejects an invalid Anthropic ttl value', () => {
		const result = AgentJsonConfigSchema.safeParse({
			...minimalConfig,
			config: { promptCaching: { enabled: true, anthropic: { ttl: '1d' } } },
		});
		expect(result.success).toBe(false);
	});

	it('strips unknown keys (e.g. legacy openai sub-config) from promptCaching', () => {
		const result = AgentJsonConfigSchema.safeParse({
			...minimalConfig,
			config: {
				promptCaching: { enabled: true, anthropic: { ttl: '1h' }, openai: { promptCacheKey: 'x' } },
			},
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.config?.promptCaching).toEqual({
				enabled: true,
				anthropic: { ttl: '1h' },
			});
		}
	});
});

describe('AgentJsonConfigSchema — vectorStores', () => {
	const embedding = { model: 'openai/text-embedding-3-small', credential: 'embed-cred' };

	it('accepts a valid pinecone connection', () => {
		const result = AgentJsonConfigSchema.safeParse({
			...minimalConfig,
			vectorStores: [
				{
					provider: 'pinecone',
					name: 'product_docs',
					credential: 'pinecone-cred',
					useWhen: 'Search when the user asks about product documentation.',
					embedding,
					indexName: 'product-docs',
					namespace: 'prod',
				},
			],
		});
		expect(result.success).toBe(true);
	});

	it('accepts a valid qdrant connection', () => {
		const result = AgentJsonConfigSchema.safeParse({
			...minimalConfig,
			vectorStores: [
				{
					provider: 'qdrant',
					name: 'product_docs',
					credential: 'qdrant-cred',
					useWhen: 'Search when the user asks about product documentation.',
					embedding,
					collectionName: 'product-docs',
				},
			],
		});
		expect(result.success).toBe(true);
	});

	it('accepts a valid supabase connection', () => {
		const result = AgentJsonConfigSchema.safeParse({
			...minimalConfig,
			vectorStores: [
				{
					provider: 'supabase',
					name: 'product_docs',
					credential: 'supabase-cred',
					useWhen: 'Search when the user asks about product documentation.',
					embedding,
					tableName: 'documents',
					queryName: 'match_documents',
				},
			],
		});
		expect(result.success).toBe(true);
	});

	it('accepts a valid postgres connection', () => {
		const result = AgentJsonConfigSchema.safeParse({
			...minimalConfig,
			vectorStores: [
				{
					provider: 'postgres',
					name: 'product_docs',
					credential: 'postgres-cred',
					useWhen: 'Search when the user asks about product documentation.',
					embedding,
					tableName: 'documents',
				},
			],
		});
		expect(result.success).toBe(true);
	});

	it('rejects multiple vector stores with the same name', () => {
		const result = AgentJsonConfigSchema.safeParse({
			...minimalConfig,
			vectorStores: [
				{
					provider: 'qdrant',
					name: 'duplicate',
					credential: 'qdrant-cred',
					useWhen: 'Use A',
					embedding,
					collectionName: 'a',
				},
				{
					provider: 'postgres',
					name: 'duplicate',
					credential: 'postgres-cred',
					useWhen: 'Use B',
					embedding,
					tableName: 'b',
				},
			],
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.errors[0].message).toBe(
				'Vector store names must be unique within an agent',
			);
		}
	});

	it('rejects vector store names that collide after sanitization (- vs _)', () => {
		const result = AgentJsonConfigSchema.safeParse({
			...minimalConfig,
			vectorStores: [
				{
					provider: 'qdrant',
					name: 'docs-a',
					credential: 'qdrant-cred',
					useWhen: 'Use A',
					embedding,
					collectionName: 'a',
				},
				{
					provider: 'postgres',
					name: 'docs_a',
					credential: 'postgres-cred',
					useWhen: 'Use B',
					embedding,
					tableName: 'b',
				},
			],
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.errors[0].message).toBe(
				'Vector store names must be unique within an agent',
			);
		}
	});

	it('rejects a useWhen longer than the max length', () => {
		const result = AgentJsonConfigSchema.safeParse({
			...minimalConfig,
			vectorStores: [
				{
					provider: 'qdrant',
					name: 'product_docs',
					credential: 'qdrant-cred',
					useWhen: 'a'.repeat(513),
					embedding,
					collectionName: 'product-docs',
				},
			],
		});
		expect(result.success).toBe(false);
	});

	it('rejects an empty useWhen', () => {
		const result = AgentJsonConfigSchema.safeParse({
			...minimalConfig,
			vectorStores: [
				{
					provider: 'qdrant',
					name: 'product_docs',
					credential: 'qdrant-cred',
					useWhen: '',
					embedding,
					collectionName: 'product-docs',
				},
			],
		});
		expect(result.success).toBe(false);
	});

	it('rejects a pinecone connection missing indexName', () => {
		const result = AgentJsonConfigSchema.safeParse({
			...minimalConfig,
			vectorStores: [
				{
					provider: 'pinecone',
					name: 'product_docs',
					credential: 'pinecone-cred',
					useWhen: 'Search when the user asks about product documentation.',
					embedding,
				},
			],
		});
		expect(result.success).toBe(false);
	});

	it('rejects an unknown provider', () => {
		const result = AgentJsonConfigSchema.safeParse({
			...minimalConfig,
			vectorStores: [
				{
					provider: 'weaviate',
					name: 'product_docs',
					credential: 'cred',
					useWhen: 'Use it',
					embedding,
				},
			],
		});
		expect(result.success).toBe(false);
	});

	it('accepts an empty vectorStores array', () => {
		const result = AgentJsonConfigSchema.safeParse({ ...minimalConfig, vectorStores: [] });
		expect(result.success).toBe(true);
	});

	describe('findVectorStoreToolNameCollisions', () => {
		const vectorStore = {
			provider: 'qdrant' as const,
			name: 'product_docs',
			credential: 'qdrant-cred',
			useWhen: 'Search product docs',
			embedding,
			collectionName: 'product-docs',
		};

		it('flags a collision with a custom tool id', () => {
			const collisions = findVectorStoreToolNameCollisions({
				tools: [{ type: 'custom', id: 'search_product_docs' }],
				vectorStores: [vectorStore],
			});
			expect(collisions).toEqual(['search_product_docs']);
		});

		it('flags a collision with an explicit workflow tool name', () => {
			const collisions = findVectorStoreToolNameCollisions({
				tools: [{ type: 'workflow', workflow: 'wf-1', name: 'search_product_docs' }],
				vectorStores: [vectorStore],
			});
			expect(collisions).toEqual(['search_product_docs']);
		});

		it('accounts for hyphen-to-underscore sanitization', () => {
			const collisions = findVectorStoreToolNameCollisions({
				tools: [{ type: 'custom', id: 'search_docs_a' }],
				vectorStores: [{ ...vectorStore, name: 'docs-a' }],
			});
			expect(collisions).toEqual(['search_docs_a']);
		});

		it('returns no collisions when tool names differ', () => {
			const collisions = findVectorStoreToolNameCollisions({
				tools: [{ type: 'custom', id: 'unrelated_tool' }],
				vectorStores: [vectorStore],
			});
			expect(collisions).toEqual([]);
		});

		it('returns no collisions when there are no vector stores', () => {
			expect(
				findVectorStoreToolNameCollisions({
					tools: [{ type: 'custom', id: 'search_product_docs' }],
				}),
			).toEqual([]);
		});
	});
});

describe('AgentJsonConfigSchema — skills', () => {
	it('rejects multiple skill refs with the same id', () => {
		const result = AgentJsonConfigSchema.safeParse({
			...minimalConfig,
			skills: [
				{ type: 'skill', id: 'summarize_notes' },
				{ type: 'skill', id: 'summarize_notes' },
			],
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.errors[0].message).toBe('Duplicate skill id: "summarize_notes"');
		}
	});
});
