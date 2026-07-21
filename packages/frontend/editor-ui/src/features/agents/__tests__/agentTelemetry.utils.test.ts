import { describe, it, expect } from 'vitest';
import {
	buildAgentConfigFingerprint,
	deriveAgentStatus,
	taskIdentifiersFromConfig,
} from '../composables/agentTelemetry.utils';
import type { AgentJsonConfig, AgentResource } from '../types';

describe('buildAgentConfigFingerprint', () => {
	const baseConfig: AgentJsonConfig = {
		name: 'x',
		model: 'gpt-4',
		instructions: 'do things',
		tools: [
			{
				type: 'node',
				name: 'zulu',
				node: {
					nodeType: 'n8n-nodes-base.zulu',
					nodeTypeVersion: 1,
					nodeParameters: {},
					credentials: {},
				},
			},
			{ type: 'custom', id: 'alpha' },
		],
		skills: [{ type: 'skill', id: 'summarize_notes' }],
		tasks: [{ type: 'task', id: 'daily_digest', enabled: true }],
		vectorStores: [
			{
				provider: 'pinecone',
				name: 'docs',
				credential: 'cred-1',
				indexName: 'docs-index',
				useWhen: 'search docs',
				embedding: { model: 'openai/text-embedding-3-small', credential: 'cred-2' },
			},
		],
		memory: { enabled: true, storage: 'n8n' },
	};

	it('produces a 16-char hex config_version and includes the raw instructions', async () => {
		const fp = await buildAgentConfigFingerprint(baseConfig, ['slack']);
		expect(fp.config_version).toMatch(/^[0-9a-f]{16}$/);
		expect(fp.instructions).toBe('do things');
	});

	it('sorts tools and triggers alphabetically', async () => {
		const fp = await buildAgentConfigFingerprint(baseConfig, ['telegram', 'slack']);
		expect(fp.tools).toEqual(['alpha', 'zulu']);
		expect(fp.skills).toEqual(['summarize_notes']);
		expect(fp.tasks).toEqual(['daily_digest']);
		expect(fp.triggers).toEqual(['slack', 'telegram']);
		expect(fp.vector_stores).toEqual(['pinecone:docs']);
	});

	it('returns the same config_version for trigger inputs in different orders', async () => {
		const a = await buildAgentConfigFingerprint(baseConfig, ['slack', 'telegram']);
		const b = await buildAgentConfigFingerprint(baseConfig, ['telegram', 'slack']);
		expect(a.config_version).toBe(b.config_version);
	});

	it('returns the same config_version for vector stores in different orders', async () => {
		const second: AgentJsonConfig['vectorStores'] = [
			{
				provider: 'qdrant',
				name: 'notes',
				credential: 'cred-3',
				collectionName: 'notes-collection',
				useWhen: 'search notes',
				embedding: { model: 'openai/text-embedding-3-small', credential: 'cred-2' },
			},
		];
		const stores = [...(baseConfig.vectorStores ?? []), ...(second ?? [])];
		const a = await buildAgentConfigFingerprint({ ...baseConfig, vectorStores: stores }, []);
		const b = await buildAgentConfigFingerprint(
			{ ...baseConfig, vectorStores: [...stores].reverse() },
			[],
		);
		expect(a.config_version).toBe(b.config_version);
	});

	it('changes config_version when instructions change', async () => {
		const a = await buildAgentConfigFingerprint(baseConfig, []);
		const b = await buildAgentConfigFingerprint({ ...baseConfig, instructions: 'other' }, []);
		expect(a.config_version).not.toBe(b.config_version);
	});

	it('changes config_version when a tool is added', async () => {
		const a = await buildAgentConfigFingerprint(baseConfig, []);
		const withExtra: AgentJsonConfig = {
			...baseConfig,
			tools: [
				...(baseConfig.tools ?? []),
				{
					type: 'node',
					name: 'new-tool',
					node: {
						nodeType: 'n8n-nodes-base.new-tool',
						nodeTypeVersion: 1,
						nodeParameters: {},
						credentials: {},
					},
				},
			],
		};
		expect((await buildAgentConfigFingerprint(withExtra, [])).config_version).not.toBe(
			a.config_version,
		);
	});

	it('changes config_version when a skill is added', async () => {
		const a = await buildAgentConfigFingerprint(baseConfig, []);
		const withExtra: AgentJsonConfig = {
			...baseConfig,
			skills: [...(baseConfig.skills ?? []), { type: 'skill', id: 'write_like_brand' }],
		};
		expect((await buildAgentConfigFingerprint(withExtra, [])).config_version).not.toBe(
			a.config_version,
		);
	});

	it('changes config_version when a task is added', async () => {
		const a = await buildAgentConfigFingerprint(baseConfig, []);
		const withExtra: AgentJsonConfig = {
			...baseConfig,
			tasks: [...(baseConfig.tasks ?? []), { type: 'task', id: 'weekly_report', enabled: true }],
		};
		expect((await buildAgentConfigFingerprint(withExtra, [])).config_version).not.toBe(
			a.config_version,
		);
	});

	it('changes config_version when a task is removed', async () => {
		const a = await buildAgentConfigFingerprint(baseConfig, []);
		const withoutTasks: AgentJsonConfig = {
			...baseConfig,
			tasks: [],
		};
		expect((await buildAgentConfigFingerprint(withoutTasks, [])).config_version).not.toBe(
			a.config_version,
		);
	});

	it('changes config_version when a vector store is added', async () => {
		const a = await buildAgentConfigFingerprint(baseConfig, []);
		const withExtra: AgentJsonConfig = {
			...baseConfig,
			vectorStores: [
				...(baseConfig.vectorStores ?? []),
				{
					provider: 'qdrant',
					name: 'notes',
					credential: 'cred-3',
					collectionName: 'notes-collection',
					useWhen: 'search notes',
					embedding: { model: 'openai/text-embedding-3-small', credential: 'cred-2' },
				},
			],
		};
		expect((await buildAgentConfigFingerprint(withExtra, [])).config_version).not.toBe(
			a.config_version,
		);
	});

	it('changes config_version when a vector store is removed', async () => {
		const a = await buildAgentConfigFingerprint(baseConfig, []);
		const withoutVectorStores: AgentJsonConfig = {
			...baseConfig,
			vectorStores: [],
		};
		expect((await buildAgentConfigFingerprint(withoutVectorStores, [])).config_version).not.toBe(
			a.config_version,
		);
	});

	it('changes config_version when the model changes', async () => {
		const a = await buildAgentConfigFingerprint(baseConfig, []);
		const b = await buildAgentConfigFingerprint({ ...baseConfig, model: 'gpt-5' }, []);
		expect(a.config_version).not.toBe(b.config_version);
	});

	it('returns null memory when config.memory is undefined', async () => {
		const fp = await buildAgentConfigFingerprint({ ...baseConfig, memory: undefined }, []);
		expect(fp.memory).toBeNull();
	});

	it('handles null config', async () => {
		const fp = await buildAgentConfigFingerprint(null, []);
		expect(fp.instructions).toBe('');
		expect(fp.tools).toEqual([]);
		expect(fp.skills).toEqual([]);
		expect(fp.tasks).toEqual([]);
		expect(fp.vector_stores).toEqual([]);
		expect(fp.model).toBeNull();
	});
});

describe('taskIdentifiersFromConfig', () => {
	it('sorts and dedupes task ids', () => {
		expect(
			taskIdentifiersFromConfig({
				name: 'x',
				model: 'gpt-4',
				instructions: 'do things',
				tasks: [
					{ type: 'task', id: 'z-task', enabled: true },
					{ type: 'task', id: 'a-task', enabled: true },
					{ type: 'task', id: 'z-task', enabled: false },
				],
			}),
		).toEqual(['a-task', 'z-task']);
	});
});

describe('deriveAgentStatus', () => {
	it('returns draft when agent has no active version', () => {
		const agent = { activeVersionId: null, versionId: 'v1' } as unknown as AgentResource;
		expect(deriveAgentStatus(agent)).toBe('draft');
	});

	it('returns draft when active version differs from current versionId', () => {
		const agent = {
			versionId: 'v2',
			activeVersionId: 'v1',
		} as unknown as AgentResource;
		expect(deriveAgentStatus(agent)).toBe('draft');
	});

	it('returns production when current versionId matches active version', () => {
		const agent = {
			versionId: 'v1',
			activeVersionId: 'v1',
		} as unknown as AgentResource;
		expect(deriveAgentStatus(agent)).toBe('production');
	});

	it('returns draft when agent is null', () => {
		expect(deriveAgentStatus(null)).toBe('draft');
	});
});
